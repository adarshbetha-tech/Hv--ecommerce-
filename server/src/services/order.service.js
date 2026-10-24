import { prisma } from "../config/db.js";
import { formatOrder } from "../utils/orderSerializer.js";

// GST Configuration Toggle (Temporary suspension of GST charges)
// Set to true when GST charges are re-enabled
export const GST_ENABLED = false;

/**
 * Calculates order financial breakdown given subtotal and shipping fee.
 * When GST_ENABLED is false, taxAmount is 0.0 and totalAmount = subtotal + shippingFee.
 */
export function calculateOrderTotals(subtotal, shippingFee = 0.0, gstRate = 18.0) {
  const cleanSubtotal = Number(Number(subtotal || 0).toFixed(2));
  const cleanShipping = Number(Number(shippingFee || 0).toFixed(2));
  const taxAmount = GST_ENABLED ? Number((cleanSubtotal * (gstRate / 100)).toFixed(2)) : 0.0;
  const totalAmount = Number((cleanSubtotal + taxAmount + cleanShipping).toFixed(2));
  return {
    subtotal: cleanSubtotal,
    taxAmount,
    shippingFee: cleanShipping,
    totalAmount,
    gstEnabled: GST_ENABLED,
  };
}

/**
 * Generates a human-friendly unique order number: VTX-YYYYMMDD-XXXXX
 */
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `VTX-${dateStr}-${randomSuffix}`;
}

/**
 * Creates an order from the user's current persistent cart.
 * Enforces:
 * - Cart non-empty verification.
 * - Address ownership validation.
 * - Server-side price recalculation (never trust client prices).
 * - Concurrency-safe atomic transaction for stock validation and decrement.
 * - Automatic rollback on failure.
 * - Safe idempotency deduplication.
 * - Clearing the cart only upon successful order creation.
 * - Safe payment boundary (orderStatus and paymentStatus remain PENDING).
 */
export async function createOrder(userId, {
  addressId,
  shippingAddress,
  paymentMethod = "COD",
  paymentId,
  notes,
  idempotencyKey,
}) {
  // 1. Idempotency Check: if request was already processed, return existing order immediately
  if (idempotencyKey) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        notes: {
          contains: `[idempotency:${idempotencyKey}]`,
        },
      },
      include: {
        items: true,
      },
    });

    if (existingOrder) {
      return formatOrder(existingOrder);
    }
  }

  // 2. Fetch user's cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: true,
    },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    const error = new Error("Your cart is empty. Add products to your cart before proceeding to checkout.");
    error.code = "EMPTY_CART";
    error.status = 400;
    throw error;
  }

  // 3. Validate and resolve shipping address
  let resolvedAddress = null;
  if (addressId) {
    const savedAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!savedAddress) {
      const error = new Error("Selected delivery address not found.");
      error.code = "ADDRESS_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (savedAddress.userId !== userId) {
      const error = new Error("You do not have permission to use this address.");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    resolvedAddress = {
      recipientName: savedAddress.recipientName,
      phone: savedAddress.phone,
      line1: savedAddress.line1,
      line2: savedAddress.line2 || null,
      city: savedAddress.city,
      state: savedAddress.state,
      postalCode: savedAddress.postalCode,
      country: savedAddress.country || "India",
    };
  } else if (shippingAddress) {
    resolvedAddress = {
      recipientName: shippingAddress.recipientName,
      phone: shippingAddress.phone,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || "India",
    };
  } else {
    const error = new Error("A delivery address must be provided.");
    error.code = "ADDRESS_REQUIRED";
    error.status = 400;
    throw error;
  }

  // 4. Atomic transaction: stock check, price derivation, stock decrement, order creation, cart clear
  const createdOrder = await prisma.$transaction(
    async (tx) => {
      // a. Batch fetch all variants and their products in a single database roundtrip
      const variantIds = cart.items.map((it) => it.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      let subtotal = 0;
      let taxAmount = 0;
      const orderItemsData = [];

      for (const item of cart.items) {
        const variant = variantMap.get(item.variantId);

        if (!variant) {
          const error = new Error(`Product variant ${item.variantId} not found.`);
          error.code = "VARIANT_NOT_FOUND";
          error.status = 404;
          throw error;
        }

        if (!variant.isActive || !variant.product.isActive) {
          const error = new Error(
            `Product "${variant.product?.name || "Product"}" (${variant.sku}) is no longer available.`
          );
          error.code = "INACTIVE_PRODUCT_OR_VARIANT";
          error.status = 400;
          throw error;
        }

        // Revalidate price server-side: reject RFQ products (zero or unpriced)
        const unitPrice = variant.price !== null && variant.price !== undefined ? Number(variant.price) : 0;
        if (isNaN(unitPrice) || unitPrice <= 0) {
          const error = new Error(
            `Product "${variant.product?.name || "Product"}" (${variant.sku}) is available for Quote on Request only and cannot be purchased directly through retail checkout.`
          );
          error.code = "RFQ_ONLY_PRODUCT";
          error.status = 400;
          throw error;
        }

        if (variant.stockQuantity < item.quantity) {
          const error = new Error(
            `Insufficient stock for "${variant.product?.name || "Product"}" (${variant.sku}). Available: ${variant.stockQuantity}, Requested: ${item.quantity}.`
          );
          error.code = "INSUFFICIENT_STOCK";
          error.status = 400;
          throw error;
        }

        // Calculate server-authoritative line total and tax
        const lineSubtotal = Number((unitPrice * item.quantity).toFixed(2));
        const gstRate = Number(variant.product.gstRate || 18.0);
        const itemTax = GST_ENABLED ? Number((lineSubtotal * (gstRate / 100)).toFixed(2)) : 0.0;
        const lineTotal = Number((lineSubtotal + itemTax).toFixed(2));

        subtotal += lineSubtotal;
        taxAmount += itemTax;

        orderItemsData.push({
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name || variant.packSize || null,
          sku: variant.sku,
          packSize: variant.packSize || null,
          hsnCode: variant.product.hsnCode || null,
          gstRate: GST_ENABLED ? gstRate : 0.0,
          quantity: item.quantity,
          unitPrice,
          taxAmount: itemTax,
          lineTotal,
        });

        // Decrement inventory stock safely in this transaction
        try {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        } catch (updateErr) {
          if (
            updateErr.message?.includes("chk_variant_stock_non_negative") ||
            updateErr.code === "23514"
          ) {
            const error = new Error(
              `Insufficient stock for "${variant.product?.name || "Product"}" (${variant.sku}).`
            );
            error.code = "INSUFFICIENT_STOCK";
            error.status = 400;
            throw error;
          }
          throw updateErr;
        }
      }

      subtotal = Number(subtotal.toFixed(2));
      taxAmount = GST_ENABLED ? Number(taxAmount.toFixed(2)) : 0.0;
      const shippingFee = 0.0;
      const totalAmount = Number((subtotal + taxAmount + shippingFee).toFixed(2));

      // b. Generate unique orderNumber and construct notes
      const orderNumber = generateOrderNumber();
      const finalNotes = idempotencyKey
        ? `[idempotency:${idempotencyKey}] ${notes || ""}`.trim()
        : notes || null;

      // c. Create Order record with OrderItem snapshots
      // Explicit Payment Boundary: paymentStatus and orderStatus are initialized to PENDING.
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          orderStatus: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: paymentMethod || "COD",
          paymentId: paymentId ? String(paymentId).trim() : null,
          subtotal,
          taxAmount,
          shippingFee,
          totalAmount,
          shippingRecipient: resolvedAddress.recipientName,
          shippingPhone: resolvedAddress.phone,
          shippingLine1: resolvedAddress.line1,
          shippingLine2: resolvedAddress.line2 || null,
          shippingCity: resolvedAddress.city,
          shippingState: resolvedAddress.state,
          shippingPostalCode: resolvedAddress.postalCode,
          shippingCountry: resolvedAddress.country || "India",
          notes: finalNotes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // d. Clear the user's cart now that the order has been created
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    }
  );

  return formatOrder(createdOrder);
}

/**
 * Lists all orders belonging to the user.
 */
export async function listUserOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(formatOrder);
}

/**
 * Retrieves a single order by ID or order number, enforcing ownership.
 */
export async function getUserOrderById(userId, orderIdentifier) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderIdentifier },
        { orderNumber: orderIdentifier },
      ],
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    const error = new Error("Order not found.");
    error.code = "ORDER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (order.userId !== userId) {
    const error = new Error("You do not have permission to view this order.");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }

  return formatOrder(order);
}

/**
 * Permitted order statuses from which a customer may request self-service cancellation.
 */
export const CUSTOMER_CANCELLABLE_STATES = ["PENDING", "CONFIRMED"];

/**
 * Cancels an order owned by the customer.
 * Enforces:
 * - Server-authoritative ownership check.
 * - Allowed state machine check (only PENDING and CONFIRMED).
 * - Concurrency guard with updateMany to prevent double cancellation or race conditions.
 * - Concurrency-safe stock restoration exactly once.
 * - Audit logging (ORDER_CANCELLED_BY_CUSTOMER).
 * - Safe payment boundary (no refund claimed or initiated).
 */
export async function cancelUserOrder(userId, orderIdentifier, { reason } = {}, userEmail = null) {
  if (!orderIdentifier || !orderIdentifier.trim()) {
    const error = new Error("Order identifier is required.");
    error.code = "INVALID_ORDER_IDENTIFIER";
    error.status = 400;
    throw error;
  }

  const trimmedId = orderIdentifier.trim();

  return prisma.$transaction(
    async (tx) => {
      // 1. Locate order by UUID or orderNumber
      const order = await tx.order.findFirst({
        where: {
          OR: [{ id: trimmedId }, { orderNumber: trimmedId }],
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        const error = new Error(`Order '${trimmedId}' not found.`);
        error.code = "ORDER_NOT_FOUND";
        error.status = 404;
        throw error;
      }

      // 2. Enforce customer ownership
      if (order.userId !== userId) {
        const error = new Error("You do not have permission to cancel this order.");
        error.code = "FORBIDDEN";
        error.status = 403;
        throw error;
      }

      // 3. Status eligibility check
      if (order.orderStatus === "CANCELLED") {
        const error = new Error("This order has already been cancelled.");
        error.code = "ORDER_ALREADY_CANCELLED";
        error.status = 400;
        throw error;
      }

      if (!CUSTOMER_CANCELLABLE_STATES.includes(order.orderStatus)) {
        const error = new Error(
          `Cannot cancel order in '${order.orderStatus}' status. Orders that are processing, shipped, or delivered cannot be cancelled online.`
        );
        error.code = "ORDER_NOT_CANCELLABLE";
        error.status = 400;
        throw error;
      }

      // 4. Concurrency guard: update status atomically only if it is still in cancellable states
      const cancellationReason = reason && reason.trim() ? reason.trim() : null;
      const cancellationNote = cancellationReason
        ? `${order.notes ? order.notes + " | " : ""}Customer Cancellation: ${cancellationReason}`
        : order.notes;

      const updateResult = await tx.order.updateMany({
        where: {
          id: order.id,
          orderStatus: { in: CUSTOMER_CANCELLABLE_STATES },
        },
        data: {
          orderStatus: "CANCELLED",
          notes: cancellationNote,
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          "Order cancellation failed: the order status changed concurrently or was already processed."
        );
        error.code = "CONCURRENT_MODIFICATION";
        error.status = 409;
        throw error;
      }

      // 5. Restore reserved inventory exactly once
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // 6. Record audit log entry
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "ORDER_CANCELLED_BY_CUSTOMER",
          entityType: "Order",
          entityId: order.id,
          metadata: {
            orderNumber: order.orderNumber,
            previousStatus: order.orderStatus,
            newStatus: "CANCELLED",
            actorEmail: userEmail || null,
            reason: cancellationReason || null,
          },
        },
      });

      // 7. Return updated order
      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
        },
      });

      return formatOrder(updatedOrder);
    },
    {
      maxWait: 10000,
      timeout: 25000,
    }
  );
}

/**
 * Allows a customer to submit or update their UPI Transaction Reference (UTR) for a pending order.
 * Safe boundary:
 * - Order must exist and belong to the authenticated user.
 * - Payment status must be PENDING (cannot alter PAID/REFUNDED orders).
 * - Leaves paymentStatus strictly as PENDING (never marks as PAID without admin reconciliation).
 * - Records action in AuditLog for reconciliation audit trail.
 */
export async function submitOrderPaymentReference(orderIdentifier, paymentReference, userId) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
    },
  });

  if (!order) {
    const error = new Error(`Order with identifier '${orderIdentifier}' not found.`);
    error.status = 404;
    error.code = "ORDER_NOT_FOUND";
    throw error;
  }

  if (order.userId !== userId) {
    const error = new Error("You do not have permission to update payment details for this order.");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  if (order.paymentStatus === "PAID") {
    const error = new Error("This order's payment has already been verified and marked as PAID.");
    error.status = 400;
    error.code = "PAYMENT_ALREADY_SETTLED";
    throw error;
  }

  if (order.paymentStatus === "REFUNDED") {
    const error = new Error("This order has been marked as REFUNDED and cannot accept payment references.");
    error.status = 400;
    error.code = "ORDER_REFUNDED";
    throw error;
  }

  const cleanReference = String(paymentReference).trim();
  const updatedNotes = order.notes
    ? `${order.notes} | [Customer Submitted UTR: ${cleanReference}]`
    : `[Customer Submitted UTR: ${cleanReference}]`;

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentId: cleanReference,
      notes: updatedNotes,
    },
    include: {
      items: true,
    },
  });

  // Record audit log entry for the submission
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "CUSTOMER_PAYMENT_REFERENCE_SUBMITTED",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        previousPaymentId: order.paymentId || null,
        newPaymentId: cleanReference,
        paymentStatus: order.paymentStatus,
      },
    },
  });

  return formatOrder(updatedOrder);
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolves the authoritative delivery date for an order.
 * Safe rules:
 * - Order must be in DELIVERED status.
 * - Checks order.notes tag [DeliveredAt: <ISO>]
 * - Queries AuditLog for ORDER_STATUS_UPDATE to DELIVERED
 * - Checks order.updatedAt as fallback for DELIVERED orders
 * - If order is not DELIVERED or delivery date cannot be verified, returns null.
 */
export async function resolveOrderDeliveryDate(order, tx = prisma) {
  if (!order || order.orderStatus !== "DELIVERED") {
    return null;
  }

  // 1. Check notes for [DeliveredAt: <ISO>]
  if (order.notes) {
    const match = order.notes.match(/\[DeliveredAt:\s*([^\]]+)\]/i);
    if (match && match[1]) {
      const parsed = new Date(match[1].trim());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // 2. Query AuditLog for the delivery transition
  const deliveryAudit = await tx.auditLog.findFirst({
    where: {
      entityType: "Order",
      entityId: order.id,
      action: "ORDER_STATUS_UPDATE",
    },
    orderBy: { createdAt: "desc" },
  });

  if (deliveryAudit) {
    const meta = deliveryAudit.metadata || {};
    if (meta.newStatus === "DELIVERED") {
      if (meta.deliveredAt) {
        const parsed = new Date(meta.deliveredAt);
        if (!isNaN(parsed.getTime())) return parsed;
      }
      return new Date(deliveryAudit.createdAt);
    }
  }

  // 3. Fallback: if order is marked DELIVERED and updatedAt is recorded
  if (order.updatedAt) {
    const parsed = new Date(order.updatedAt);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/**
 * Allows a customer to submit a replacement request for an eligible delivered order.
 * Enforces:
 * - Customer ownership of the order.
 * - Order must be in DELIVERED status.
 * - Delivery date must be verifiable and within the 7-day window.
 * - Rejects expired requests (>7 days) with clear explanation.
 * - Validates item SKUs and quantities against the order.
 * - Prevents duplicate active replacement requests.
 * - Immutably logs request in AuditLog without altering payment or financial status.
 */
export async function requestOrderReplacement(userId, orderIdentifier, requestData, userEmail = null) {
  const trimmedId = String(orderIdentifier || "").trim();
  if (!trimmedId) {
    const err = new Error("Order identifier is required.");
    err.code = "INVALID_ORDER_IDENTIFIER";
    err.status = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    // 1. Fetch order
    const order = await tx.order.findFirst({
      where: {
        OR: [{ id: trimmedId }, { orderNumber: trimmedId }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      const err = new Error(`Order '${trimmedId}' not found.`);
      err.code = "ORDER_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    // 2. Enforce customer ownership
    if (order.userId !== userId) {
      const err = new Error("You do not have permission to request a replacement for this order.");
      err.code = "FORBIDDEN";
      err.status = 403;
      throw err;
    }

    // 3. Status eligibility: must be DELIVERED
    if (order.orderStatus !== "DELIVERED") {
      const err = new Error(
        `Cannot request replacement for order in '${order.orderStatus}' status. Replacements can only be requested for orders that have been successfully delivered.`
      );
      err.code = "ORDER_NOT_DELIVERED";
      err.status = 400;
      throw err;
    }

    // 4. Resolve delivery date
    const deliveryDate = await resolveOrderDeliveryDate(order, tx);
    if (!deliveryDate) {
      const err = new Error(
        "The delivery date for this order could not be verified. Replacements cannot be processed automatically without a verified delivery timestamp. Please contact VERTEX Technical Support directly."
      );
      err.code = "MISSING_DELIVERY_DATE";
      err.status = 400;
      throw err;
    }

    // 5. Enforce 7-Day Window
    const now = new Date();
    const deliveryTime = deliveryDate.getTime();
    const elapsedMs = now.getTime() - deliveryTime;

    if (elapsedMs < 0) {
      const err = new Error("Invalid delivery timestamp: delivery date is recorded in the future.");
      err.code = "INVALID_DELIVERY_DATE";
      err.status = 400;
      throw err;
    }

    if (elapsedMs > SEVEN_DAYS_MS) {
      const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
      const err = new Error(
        `The 7-day replacement window from the actual delivery date has expired (${elapsedDays} days since delivery on ${deliveryDate.toISOString().slice(0, 10)}). VERTEX customer policy strictly permits replacement requests within 7 days of delivery.`
      );
      err.code = "REPLACEMENT_WINDOW_EXPIRED";
      err.status = 400;
      throw err;
    }

    // 6. Check for active duplicate replacement request
    const existingReplacement = await tx.auditLog.findFirst({
      where: {
        entityType: "Order",
        entityId: order.id,
        action: "CUSTOMER_REPLACEMENT_REQUESTED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingReplacement) {
      const meta = existingReplacement.metadata || {};
      if (meta.status === "PENDING_REVIEW" || meta.status === "IN_REVIEW" || meta.status === "APPROVED_FOR_DISPATCH") {
        const err = new Error(
          `A replacement request for Order #${order.orderNumber} is already active (${meta.status}). Duplicate requests are not permitted.`
        );
        err.code = "DUPLICATE_REPLACEMENT_REQUEST";
        err.status = 409;
        throw err;
      }
    }

    // 7. Validate items
    const requestedItems = [];
    if (requestData.items && requestData.items.length > 0) {
      for (const reqItem of requestData.items) {
        const orderItem = order.items.find(
          (it) => it.sku === reqItem.sku || it.id === reqItem.sku
        );
        if (!orderItem) {
          const err = new Error(`Item SKU '${reqItem.sku}' was not found in Order #${order.orderNumber}.`);
          err.code = "ITEM_NOT_IN_ORDER";
          err.status = 400;
          throw err;
        }
        if (reqItem.quantity > orderItem.quantity) {
          const err = new Error(
            `Requested quantity (${reqItem.quantity}) for '${orderItem.productName}' exceeds ordered quantity (${orderItem.quantity}).`
          );
          err.code = "QUANTITY_EXCEEDED";
          err.status = 400;
          throw err;
        }
        requestedItems.push({
          sku: orderItem.sku,
          productName: orderItem.productName,
          quantity: reqItem.quantity,
          reason: reqItem.reason || requestData.reason,
        });
      }
    } else {
      // Default to all items if not itemized
      for (const item of order.items) {
        requestedItems.push({
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          reason: requestData.reason,
        });
      }
    }

    const windowDeadline = new Date(deliveryTime + SEVEN_DAYS_MS);

    // 8. Record in AuditLog
    const auditRecord = await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "CUSTOMER_REPLACEMENT_REQUESTED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          customerEmail: userEmail || null,
          reason: requestData.reason,
          details: requestData.details,
          items: requestedItems,
          deliveryDate: deliveryDate.toISOString(),
          requestedAt: now.toISOString(),
          windowDeadline: windowDeadline.toISOString(),
          status: "PENDING_REVIEW",
          policy: "7_DAY_REPLACEMENT_ONLY",
        },
      },
    });

    // 9. Append notice to order notes
    const replacementTag = `[Replacement Requested: ${now.toISOString().slice(0, 10)} - ${requestData.reason}]`;
    const updatedNotes = order.notes ? `${order.notes} | ${replacementTag}` : replacementTag;
    await tx.order.update({
      where: { id: order.id },
      data: { notes: updatedNotes },
    });

    return {
      success: true,
      requestId: auditRecord.id,
      orderNumber: order.orderNumber,
      status: "PENDING_REVIEW",
      deliveryDate: deliveryDate.toISOString(),
      requestedAt: now.toISOString(),
      windowDeadline: windowDeadline.toISOString(),
      reason: requestData.reason,
      details: requestData.details,
      items: requestedItems,
      policy: "7-Day Replacement Only (Transit Damage, Defects, DOA)",
      message: "Replacement request submitted successfully. Our engineering desk will review the documentation and dispatch verified replacements.",
    };
  });
}

/**
 * Retrieves replacement requests and delivery eligibility for a customer's order.
 */
export async function getOrderReplacements(userId, orderIdentifier) {
  const trimmedId = String(orderIdentifier || "").trim();
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: trimmedId }, { orderNumber: trimmedId }],
    },
    include: { items: true },
  });

  if (!order) {
    const err = new Error(`Order '${trimmedId}' not found.`);
    err.code = "ORDER_NOT_FOUND";
    err.status = 404;
    throw err;
  }

  if (order.userId !== userId) {
    const err = new Error("You do not have permission to view replacement details for this order.");
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: "Order",
      entityId: order.id,
      action: { in: ["CUSTOMER_REPLACEMENT_REQUESTED", "ADMIN_REPLACEMENT_STATUS_UPDATE"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const deliveryDate = await resolveOrderDeliveryDate(order);
  const now = new Date();
  const isWithinWindow = deliveryDate ? (now.getTime() - deliveryDate.getTime() <= SEVEN_DAYS_MS && now.getTime() >= deliveryDate.getTime()) : false;

  return {
    success: true,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
    isEligibleForReplacement: order.orderStatus === "DELIVERED" && isWithinWindow,
    windowDeadline: deliveryDate ? new Date(deliveryDate.getTime() + SEVEN_DAYS_MS).toISOString() : null,
    replacements: logs.map((l) => ({
      id: l.id,
      action: l.action,
      createdAt: l.createdAt,
      metadata: l.metadata,
    })),
  };
}


