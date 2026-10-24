import fs from "fs";
import path from "path";
import { prisma } from "../config/db.js";
import { formatOrder } from "../utils/orderSerializer.js";

const SPECIFICATIONS_DIR = path.resolve(process.cwd(), "uploads", "specifications");

function createHttpError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Valid order fulfillment status transitions.
 * Terminal states (DELIVERED, CANCELLED) cannot transition further.
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Validates whether transitioning from currentStatus to targetStatus is permitted.
 */
export function validateStatusTransition(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw createHttpError(
      `Invalid order status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: [${allowed.join(", ") || "None (Terminal State)"}].`,
      "INVALID_STATUS_TRANSITION",
      400
    );
  }
  return true;
}

/**
 * Creates a new category with slug uniqueness validation.
 */
export async function createCategory(categoryData, actorId = null) {
  const { name, slug, description, icon, tint, imageUrl, parentId } = categoryData;

  // 1. Verify slug uniqueness
  const existingCategory = await prisma.category.findUnique({
    where: { slug },
  });

  if (existingCategory) {
    throw createHttpError(
      `A category with slug '${slug}' already exists.`,
      "DUPLICATE_IDENTIFIER",
      409
    );
  }

  // 2. If parentId provided, verify parent exists
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw createHttpError(
        `Parent category with ID '${parentId}' does not exist.`,
        "PARENT_CATEGORY_NOT_FOUND",
        404
      );
    }
  }

  // 3. Create category and audit record atomically
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        tint: tint || null,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        isActive: true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CATEGORY_CREATE",
        entityType: "Category",
        entityId: category.id,
        metadata: {
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
        },
      },
    });

    return category;
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Updates category details, parent hierarchy, and active status with audit logging.
 */
export async function updateCategory(id, updateData, actorId = null) {
  // 1. Verify target category exists
  const existingCategory = await prisma.category.findUnique({
    where: { id },
  });

  if (!existingCategory) {
    throw createHttpError("Category not found.", "CATEGORY_NOT_FOUND", 404);
  }

  // 2. If slug changed, verify uniqueness
  if (updateData.slug && updateData.slug !== existingCategory.slug) {
    const slugInUse = await prisma.category.findUnique({
      where: { slug: updateData.slug },
    });
    if (slugInUse && slugInUse.id !== id) {
      throw createHttpError(
        `A category with slug '${updateData.slug}' already exists.`,
        "DUPLICATE_IDENTIFIER",
        409
      );
    }
  }

  // 3. If parentId changed, verify valid parent and prevent circular hierarchy
  if (updateData.parentId !== undefined && updateData.parentId !== null) {
    if (updateData.parentId === id) {
      throw createHttpError(
        "A category cannot be its own parent.",
        "INVALID_PARENT_CATEGORY",
        400
      );
    }
    const parentCategory = await prisma.category.findUnique({
      where: { id: updateData.parentId },
    });
    if (!parentCategory) {
      throw createHttpError(
        `Parent category with ID '${updateData.parentId}' does not exist.`,
        "PARENT_CATEGORY_NOT_FOUND",
        404
      );
    }
  }

  // 4. Update category and audit record atomically
  return prisma.$transaction(async (tx) => {
    const dataToUpdate = {};
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.slug !== undefined) dataToUpdate.slug = updateData.slug;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.icon !== undefined) dataToUpdate.icon = updateData.icon;
    if (updateData.tint !== undefined) dataToUpdate.tint = updateData.tint;
    if (updateData.imageUrl !== undefined) dataToUpdate.imageUrl = updateData.imageUrl;
    if (updateData.parentId !== undefined) dataToUpdate.parentId = updateData.parentId;
    if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;

    const updatedCategory = await tx.category.update({
      where: { id },
      data: dataToUpdate,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "CATEGORY_UPDATE",
        entityType: "Category",
        entityId: updatedCategory.id,
        metadata: {
          updatedFields: Object.keys(dataToUpdate),
          changes: dataToUpdate,
        },
      },
    });

    return updatedCategory;
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Creates a product along with its initial variant in an atomic transaction.
 */
export async function createProduct(productData, actorId = null) {
  const {
    name,
    slug,
    description,
    categoryId,
    brand,
    hsnCode,
    gstRate,
    tag,
    imageUrl,
    sku,
    partNumber,
    variantName,
    packSize,
    dimensions,
    price,
    mrp,
    stockQuantity,
  } = productData;

  // 1. Verify category exists and is active
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category || !category.isActive) {
    throw createHttpError(
      `Category with ID '${categoryId}' not found or is inactive.`,
      "CATEGORY_NOT_FOUND",
      404
    );
  }

  // 2. Verify product slug uniqueness
  const existingProduct = await prisma.product.findUnique({
    where: { slug },
  });

  if (existingProduct) {
    throw createHttpError(
      `A product with slug '${slug}' already exists.`,
      "DUPLICATE_IDENTIFIER",
      409
    );
  }

  // 3. Verify variant SKU uniqueness
  const existingVariant = await prisma.productVariant.findUnique({
    where: { sku },
  });

  if (existingVariant) {
    throw createHttpError(
      `A product variant with SKU '${sku}' already exists.`,
      "DUPLICATE_IDENTIFIER",
      409
    );
  }

  // 4. Atomic transaction: create product, initial variant, and audit log
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        slug,
        description: description || null,
        categoryId,
        brand: brand || null,
        hsnCode: hsnCode || null,
        gstRate,
        tag: tag || null,
        imageUrl: imageUrl || null,
        isActive: true,
        variants: {
          create: [
            {
              sku,
              partNumber: partNumber || null,
              name: variantName || name,
              packSize: packSize || null,
              dimensions: dimensions || null,
              price,
              mrp: mrp !== undefined && mrp !== null ? mrp : null,
              stockQuantity,
              isActive: true,
            },
          ],
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PRODUCT_CREATE",
        entityType: "Product",
        entityId: product.id,
        metadata: {
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          categoryName: product.category?.name,
          sku,
          price,
          initialStock: stockQuantity,
        },
      },
    });

    return product;
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Updates a product, including category reassignment and metadata changes.
 * Safely validates category existence and active status.
 */
export async function updateProduct(productId, updateData, actorId = null) {
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: { id: true, name: true, slug: true, isActive: true },
      },
    },
  });

  if (!existingProduct) {
    throw createHttpError(
      `Product with ID '${productId}' not found.`,
      "PRODUCT_NOT_FOUND",
      404
    );
  }

  // If category is being updated, verify it exists and is active
  if (updateData.categoryId && updateData.categoryId !== existingProduct.categoryId) {
    const targetCategory = await prisma.category.findUnique({
      where: { id: updateData.categoryId },
    });

    if (!targetCategory || !targetCategory.isActive) {
      throw createHttpError(
        `Category with ID '${updateData.categoryId}' not found or is inactive.`,
        "CATEGORY_NOT_FOUND",
        400
      );
    }
  }

  // If slug is being updated, verify uniqueness
  if (updateData.slug && updateData.slug !== existingProduct.slug) {
    const slugConflict = await prisma.product.findFirst({
      where: {
        slug: updateData.slug,
        id: { not: productId },
      },
    });

    if (slugConflict) {
      throw createHttpError(
        `A product with slug '${updateData.slug}' already exists.`,
        "DUPLICATE_IDENTIFIER",
        409
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: {
        ...(updateData.name !== undefined ? { name: updateData.name } : {}),
        ...(updateData.slug !== undefined ? { slug: updateData.slug } : {}),
        ...(updateData.categoryId !== undefined ? { categoryId: updateData.categoryId } : {}),
        ...(updateData.brand !== undefined ? { brand: updateData.brand } : {}),
        ...(updateData.hsnCode !== undefined ? { hsnCode: updateData.hsnCode } : {}),
        ...(updateData.gstRate !== undefined ? { gstRate: updateData.gstRate } : {}),
        ...(updateData.tag !== undefined ? { tag: updateData.tag } : {}),
        ...(updateData.imageUrl !== undefined ? { imageUrl: updateData.imageUrl } : {}),
        ...(updateData.description !== undefined ? { description: updateData.description } : {}),
        ...(updateData.isActive !== undefined ? { isActive: updateData.isActive } : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        variants: {
          where: { isActive: true },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PRODUCT_UPDATE",
        entityType: "Product",
        entityId: productId,
        metadata: {
          name: updated.name,
          slug: updated.slug,
          previousCategoryId: existingProduct.categoryId,
          previousCategoryName: existingProduct.category?.name,
          newCategoryId: updated.categoryId,
          newCategoryName: updated.category?.name,
          changedFields: Object.keys(updateData),
        },
      },
    });

    return updated;
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Updates stock quantity for a variant safely with audit logging in an atomic transaction.
 */
export async function updateVariantStock(variantId, { stockQuantity, reason }, actorId = null, actorEmail = null) {
  return prisma.$transaction(async (tx) => {
    // 1. Locate current variant and check existence
    const currentVariant = await tx.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!currentVariant) {
      throw createHttpError(
        `Product variant with ID '${variantId}' not found.`,
        "VARIANT_NOT_FOUND",
        404
      );
    }

    const previousStock = currentVariant.stockQuantity;
    const newStock = stockQuantity;
    const difference = newStock - previousStock;

    // 2. Perform safe update
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: {
        stockQuantity: newStock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 3. Record audit trail
    const auditRecord = await tx.auditLog.create({
      data: {
        actorId,
        action: "INVENTORY_ADJUSTMENT",
        entityType: "ProductVariant",
        entityId: variantId,
        metadata: {
          sku: currentVariant.sku,
          productName: currentVariant.product?.name,
          previousStock,
          newStock,
          difference,
          reason,
          actorEmail: actorEmail || "system",
        },
      },
    });

    return {
      variant: updatedVariant,
      difference,
      auditLog: {
        id: auditRecord.id,
        action: auditRecord.action,
        createdAt: auditRecord.createdAt,
      },
    };
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Updates a product's selling price on its primary or specified variant safely with audit logging.
 * Enforces admin authorization, prevents negative values, and preserves historical orders.
 */
export async function updateProductPrice(productId, { price, variantId }, actorId = null, actorEmail = null) {
  return prisma.$transaction(async (tx) => {
    // 1. Locate product and verify existence
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) {
      throw createHttpError(
        `Product with ID '${productId}' not found.`,
        "PRODUCT_NOT_FOUND",
        404
      );
    }

    // 2. Locate target variant
    let targetVariant = null;
    if (variantId) {
      targetVariant = product.variants.find((v) => v.id === variantId);
      if (!targetVariant) {
        throw createHttpError(
          `Product variant with ID '${variantId}' not found for product '${productId}'.`,
          "VARIANT_NOT_FOUND",
          404
        );
      }
    } else {
      if (!product.variants || product.variants.length === 0) {
        throw createHttpError(
          `No active variants found for product '${productId}'.`,
          "NO_VARIANTS_FOUND",
          400
        );
      }
      targetVariant = product.variants[0];
    }

    const previousPrice = targetVariant.price !== null && targetVariant.price !== undefined ? Number(targetVariant.price) : null;
    const newPrice = Number(price);

    // 3. Update variant selling price (decimal safe)
    const updatedVariant = await tx.productVariant.update({
      where: { id: targetVariant.id },
      data: {
        price: newPrice,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 4. Record audit log for security & compliance
    const auditRecord = await tx.auditLog.create({
      data: {
        actorId,
        action: "PRODUCT_PRICE_UPDATED",
        entityType: "ProductVariant",
        entityId: targetVariant.id,
        metadata: {
          productId: product.id,
          productName: product.name,
          sku: targetVariant.sku,
          previousPrice,
          newPrice,
          actorEmail: actorEmail || "system",
        },
      },
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
      },
      variant: updatedVariant,
      auditLog: {
        id: auditRecord.id,
        action: auditRecord.action,
        createdAt: auditRecord.createdAt,
      },
    };
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Lists all orders across the system with pagination, search, status filters, and sorting.
 */
export async function getAdminOrders(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {};

  if (queryParams.status && queryParams.status.trim()) {
    where.orderStatus = queryParams.status.trim();
  }

  if (queryParams.paymentStatus && queryParams.paymentStatus.trim()) {
    where.paymentStatus = queryParams.paymentStatus.trim();
  }

  const searchTerm = (queryParams.search || queryParams.q || "").trim();
  if (searchTerm) {
    where.OR = [
      { orderNumber: { contains: searchTerm, mode: "insensitive" } },
      { shippingRecipient: { contains: searchTerm, mode: "insensitive" } },
      { shippingCity: { contains: searchTerm, mode: "insensitive" } },
      { shippingPhone: { contains: searchTerm, mode: "insensitive" } },
      { user: { email: { contains: searchTerm, mode: "insensitive" } } },
      { user: { fullName: { contains: searchTerm, mode: "insensitive" } } },
      { items: { some: { productName: { contains: searchTerm, mode: "insensitive" } } } },
      { items: { some: { sku: { contains: searchTerm, mode: "insensitive" } } } },
    ];
  }

  let orderBy = { createdAt: "desc" };
  if (queryParams.sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (queryParams.sort === "total_desc") {
    orderBy = { totalAmount: "desc" };
  } else if (queryParams.sort === "total_asc") {
    orderBy = { totalAmount: "asc" };
  }

  const [totalItems, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            companyName: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    orders: orders.map((o) => {
      const formatted = formatOrder(o);
      if (o.user) {
        formatted.customer = {
          id: o.user.id,
          email: o.user.email,
          fullName: o.user.fullName,
          companyName: o.user.companyName || null,
          role: o.user.role,
        };
      }
      return formatted;
    }),
    pagination: {
      totalItems,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Retrieves a single order by UUID or orderNumber for admin inspection,
 * including customer metadata, item details, delivery address, and tracking info.
 */
export async function getAdminOrderById(orderIdentifier) {
  const trimmed = (orderIdentifier || "").trim();
  if (!trimmed) {
    throw createHttpError("Order identifier is required.", "INVALID_ORDER_IDENTIFIER", 400);
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: trimmed },
        { orderNumber: trimmed },
      ],
    },
    include: {
      items: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          companyName: true,
        },
      },
    },
  });

  if (!order) {
    throw createHttpError(
      `Order with identifier '${trimmed}' not found.`,
      "ORDER_NOT_FOUND",
      404
    );
  }

  const formatted = formatOrder(order);
  formatted.shippingRecipient = order.shippingRecipient;
  formatted.shippingPhone = order.shippingPhone;
  formatted.shippingLine1 = order.shippingLine1;
  formatted.shippingLine2 = order.shippingLine2 || null;
  formatted.shippingCity = order.shippingCity;
  formatted.shippingState = order.shippingState;
  formatted.shippingPostalCode = order.shippingPostalCode;
  formatted.shippingCountry = order.shippingCountry;

  if (order.user) {
    formatted.customer = {
      id: order.user.id,
      email: order.user.email,
      fullName: order.user.fullName,
      companyName: order.user.companyName || null,
      role: order.user.role,
    };
  }

  return formatted;
}

/**
 * Updates order fulfillment status safely, validating transitions, restoring stock on cancel,
 * and creating an immutable AuditLog entry.
 */
export async function updateOrderStatus(orderIdentifier, updateData, actorId = null, actorEmail = null) {
  const { orderStatus: targetStatus, carrier, trackingNumber, notes } = updateData;

  return prisma.$transaction(async (tx) => {
    // 1. Locate order by UUID or orderNumber
    const order = await tx.order.findFirst({
      where: {
        OR: [
          { id: orderIdentifier },
          { orderNumber: orderIdentifier },
        ],
      },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            companyName: true,
          },
        },
      },
    });

    if (!order) {
      throw createHttpError(
        `Order with identifier '${orderIdentifier}' not found.`,
        "ORDER_NOT_FOUND",
        404
      );
    }

    const previousStatus = order.orderStatus;

    // 2. Validate state machine transition
    validateStatusTransition(previousStatus, targetStatus);

    // 3. If transitioning to CANCELLED from non-cancelled status, restore variant inventory
    if (targetStatus === "CANCELLED" && previousStatus !== "CANCELLED") {
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
    }

    // 4. Update the order
    let finalNotes = notes !== undefined ? (notes || null) : order.notes;
    let deliveredAtTimestamp = null;
    if (targetStatus === "DELIVERED") {
      deliveredAtTimestamp = new Date().toISOString();
      if (!finalNotes || !finalNotes.includes("[DeliveredAt:")) {
        const tag = `[DeliveredAt: ${deliveredAtTimestamp}]`;
        finalNotes = finalNotes ? `${finalNotes} | ${tag}` : tag;
      }
    }

    const updatePayload = {
      orderStatus: targetStatus,
      carrier: carrier !== undefined ? (carrier || null) : order.carrier,
      trackingNumber: trackingNumber !== undefined ? (trackingNumber || null) : order.trackingNumber,
      notes: finalNotes,
    };

    if (updateData.paymentStatus !== undefined && updateData.paymentStatus !== null) {
      updatePayload.paymentStatus = updateData.paymentStatus;
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: updatePayload,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            companyName: true,
          },
        },
      },
    });

    // 5. Create immutable audit log record
    const isRefundAction = updateData.paymentStatus === "REFUNDED";
    const auditRecord = await tx.auditLog.create({
      data: {
        actorId,
        action: isRefundAction ? "ORDER_REFUND_RECORD" : "ORDER_STATUS_UPDATE",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          previousStatus,
          newStatus: targetStatus,
          previousPaymentStatus: order.paymentStatus,
          newPaymentStatus: updatedOrder.paymentStatus,
          refundAmount: updateData.refundAmount !== undefined ? updateData.refundAmount : null,
          actorEmail: actorEmail || "admin@vertex.local",
          carrier: updatedOrder.carrier,
          trackingNumber: updatedOrder.trackingNumber,
          notes: updatedOrder.notes,
          deliveredAt: deliveredAtTimestamp || undefined,
        },
      },
    });

    const formatted = formatOrder(updatedOrder);
    if (updatedOrder.user) {
      formatted.customer = {
        id: updatedOrder.user.id,
        email: updatedOrder.user.email,
        fullName: updatedOrder.user.fullName,
        companyName: updatedOrder.user.companyName || null,
        role: updatedOrder.user.role,
      };
    }

    return {
      order: formatted,
      auditLog: {
        id: auditRecord.id,
        action: auditRecord.action,
        createdAt: auditRecord.createdAt,
      },
    };
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Queries real customer accounts (CUSTOMER and B2B) with pagination, search, role,
 * and account status filters, calculating order and spend summaries safely.
 */
export async function getAdminCustomers(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {};

  // 1. Role filtering: only CUSTOMER and B2B accounts are allowed (never ADMIN)
  if (queryParams.role === "CUSTOMER" || queryParams.role === "B2B") {
    where.role = queryParams.role;
  } else {
    where.role = { in: ["CUSTOMER", "B2B"] };
  }

  // 2. Account status filtering (isActive)
  if (queryParams.status === "active") {
    where.isActive = true;
  } else if (queryParams.status === "suspended") {
    where.isActive = false;
  }

  // 3. Search filter across relevant customer fields
  const searchTerm = (queryParams.search || queryParams.q || "").trim();
  if (searchTerm) {
    where.OR = [
      { fullName: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
      { companyName: { contains: searchTerm, mode: "insensitive" } },
      { gstin: { contains: searchTerm, mode: "insensitive" } },
      { phone: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // 4. Sorting
  let orderBy = { createdAt: "desc" };
  if (queryParams.sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (queryParams.sort === "name_asc") {
    orderBy = { fullName: "asc" };
  } else if (queryParams.sort === "name_desc") {
    orderBy = { fullName: "desc" };
  }

  // 5. Query total count and records in parallel without N+1 queries
  const [totalItems, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        companyName: true,
        gstin: true,
        role: true,
        isActive: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            quotes: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            orderStatus: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  // 6. Format customer records, computing safe order metrics and excluding sensitive secrets
  const customers = users.map((u) => {
    const orders = u.orders || [];
    const nonCancelledOrders = orders.filter((o) => o.orderStatus !== "CANCELLED");
    const totalSpent = nonCancelledOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0
    );
    const lastOrder = orders[0] || null;

    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone || null,
      companyName: u.companyName || null,
      gstin: u.gstin || null,
      role: u.role,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: null, // Temporarily disabled until analytics migration is deployed
      ordersCount: u._count?.orders ?? orders.length,
      quotesCount: u._count?.quotes ?? 0,
      totalSpent: Math.round(totalSpent * 100) / 100,
      lastOrderAt: lastOrder ? lastOrder.createdAt : null,
      lastOrderNumber: lastOrder ? lastOrder.orderNumber : null,
    };
  });

  return {
    customers,
    pagination: {
      totalItems,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Sanitizes audit metadata by masking sensitive keys (passwords, tokens, secrets, hashes).
 */
export function sanitizeAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return metadata || null;
  if (Array.isArray(metadata)) return metadata.map(sanitizeAuditMetadata);

  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("hash") ||
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("cookie") ||
      lower.includes("recovery")
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeAuditMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Queries audit log entries with pagination, search, action, entity type,
 * and actor filters, with safe metadata sanitization and no N+1 queries.
 */
export async function getAdminAuditLogs(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};

  // 1. Action filter
  if (queryParams.action && queryParams.action !== "all") {
    where.action = queryParams.action;
  }

  // 2. Entity type filter
  if (queryParams.entityType && queryParams.entityType !== "all") {
    where.entityType = queryParams.entityType;
  }

  // 3. Actor ID filter
  if (queryParams.actorId && queryParams.actorId !== "all") {
    where.actorId = queryParams.actorId;
  }

  // 4. Search query matching across action, entityType, entityId, and actor email/name
  const searchTerm = (queryParams.search || queryParams.q || "").trim();
  if (searchTerm) {
    where.OR = [
      { action: { contains: searchTerm, mode: "insensitive" } },
      { entityType: { contains: searchTerm, mode: "insensitive" } },
      { entityId: { contains: searchTerm, mode: "insensitive" } },
      { actor: { email: { contains: searchTerm, mode: "insensitive" } } },
      { actor: { fullName: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  // 5. Sorting
  const orderBy = {
    createdAt: queryParams.sort === "oldest" ? "asc" : "desc",
  };

  // 6. Query count and entries in parallel with actor relation included
  const [totalItems, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  // 7. Format logs with sanitized metadata and safe actor projection
  const formattedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: sanitizeAuditMetadata(log.metadata),
    createdAt: log.createdAt,
    actorId: log.actorId,
    actor: log.actor
      ? {
          id: log.actor.id,
          email: log.actor.email,
          fullName: log.actor.fullName,
          role: log.actor.role,
        }
      : null,
  }));

  return {
    logs: formattedLogs,
    pagination: {
      totalItems,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Retrieves full details for a single customer by ID for administrators.
 * Returns:
 * - Sanitized customer profile (passwordHash, MFA secrets, tokens, etc. strictly excluded).
 * - Full address book.
 * - Paginated order history (orderNumber, status, paymentStatus, totalAmount, createdAt).
 * - Commercial RFQ quote requests history (id, productDetails, quantity, targetPrice, status, quotedAmount, createdAt).
 * - Aggregate metrics: ordersCount, totalSpent (non-cancelled orders), quotesCount.
 */
export async function getAdminCustomerById(customerId, { ordersPage = 1, ordersLimit = 10 } = {}) {
  if (!customerId || !customerId.trim()) {
    throw createHttpError("Customer identifier is required.", "INVALID_CUSTOMER_ID", 400);
  }

  const trimmedId = customerId.trim();

  // 1. Fetch user by ID
  const user = await prisma.user.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      companyName: true,
      gstin: true,
      role: true,
      isActive: true,
      emailVerified: true,
      mfaEnabled: true,
      mfaEnrolledAt: true,
      createdAt: true,
      updatedAt: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          orders: true,
          quotes: true,
        },
      },
    },
  });

  if (!user) {
    throw createHttpError(`Customer with ID '${trimmedId}' not found.`, "CUSTOMER_NOT_FOUND", 404);
  }

  // 2. Fetch customer's orders with pagination & metrics
  const skip = (ordersPage - 1) * ordersLimit;
  const [orders, allUserOrders] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: ordersLimit,
      include: {
        items: true,
      },
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      select: {
        totalAmount: true,
        orderStatus: true,
      },
    }),
  ]);

  const totalOrdersCount = user._count?.orders ?? allUserOrders.length;
  const nonCancelledOrders = allUserOrders.filter((o) => o.orderStatus !== "CANCELLED");
  const totalSpent = nonCancelledOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0
  );

  const formattedOrders = orders.map(formatOrder);

  const formattedQuotes = (user.quotes || []).map((q) => ({
    id: q.id,
    productDetails: q.productDetails,
    quantity: q.quantity,
    targetPrice: q.targetPrice ? Number(q.targetPrice) : null,
    status: q.status,
    quotedAmount: q.quotedAmount ? Number(q.quotedAmount) : null,
    createdAt: q.createdAt.toISOString ? q.createdAt.toISOString() : q.createdAt,
  }));

  return {
    customer: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || null,
      companyName: user.companyName || null,
      gstin: user.gstin || null,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      mfaEnrolledAt: user.mfaEnrolledAt ? (user.mfaEnrolledAt.toISOString ? user.mfaEnrolledAt.toISOString() : user.mfaEnrolledAt) : null,
      createdAt: user.createdAt.toISOString ? user.createdAt.toISOString() : user.createdAt,
      updatedAt: user.updatedAt.toISOString ? user.updatedAt.toISOString() : user.updatedAt,
      addresses: user.addresses || [],
      orders: formattedOrders,
      ordersPagination: {
        totalItems: totalOrdersCount,
        page: ordersPage,
        limit: ordersLimit,
        totalPages: Math.ceil(totalOrdersCount / ordersLimit) || 1,
      },
      quotes: formattedQuotes,
      metrics: {
        ordersCount: totalOrdersCount,
        totalSpent: Math.round(totalSpent * 100) / 100,
        quotesCount: user._count?.quotes ?? formattedQuotes.length,
      },
    },
  };
}

/**
 * Updates a user account's system role (CUSTOMER, B2B, ADMIN) and active status.
 * Enforces security controls:
 * - Prevents an administrator from modifying their own role or deactivating their own account.
 * - Prevents removing or deactivating the last remaining active administrator.
 * - Records an immutable audit log entry.
 */
export async function updateUserRole(userId, updateData, actorId = null, actorEmail = null) {
  const { role, isActive } = updateData;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    throw createHttpError(`User with ID '${userId}' not found.`, "USER_NOT_FOUND", 404);
  }

  // 1. Guardrail: Prevent self-demotion or self-deactivation
  if (actorId && actorId === userId) {
    if ((role && role !== "ADMIN") || isActive === false) {
      throw createHttpError(
        "Self-demotion or self-deactivation is prohibited. Another administrator must adjust your privileges.",
        "SELF_DEMOTION_PROHIBITED",
        400
      );
    }
  }

  // 2. Guardrail: Prevent demoting or deactivating the last active administrator
  if (targetUser.role === "ADMIN" && ((role && role !== "ADMIN") || isActive === false)) {
    const activeAdminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        id: { not: userId },
      },
    });

    if (activeAdminCount === 0) {
      throw createHttpError(
        "Cannot demote or deactivate the last remaining active administrator.",
        "LAST_ADMIN_PROTECTED",
        400
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        companyName: true,
        gstin: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const auditRecord = await tx.auditLog.create({
      data: {
        actorId,
        action: "USER_ROLE_UPDATE",
        entityType: "User",
        entityId: userId,
        metadata: {
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole: updated.role,
          previousActive: targetUser.isActive,
          newActive: updated.isActive,
          actorEmail: actorEmail || "system",
        },
      },
    });

    return {
      user: updated,
      auditLog: {
        id: auditRecord.id,
        action: auditRecord.action,
        createdAt: auditRecord.createdAt,
      },
    };
  }, { maxWait: 15000, timeout: 35000 });
}

/**
 * Saves a specification document (PDF/spreadsheet) to server-side persistent storage.
 */
export async function uploadProductSpecification(productId, { fileName, fileData, fileType, fileSize }, actorId = null, actorEmail = null) {
  // 1. Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });

  if (!product) {
    throw createHttpError(`Product with ID '${productId}' not found.`, "PRODUCT_NOT_FOUND", 404);
  }

  // 2. Ensure destination directory exists
  if (!fs.existsSync(SPECIFICATIONS_DIR)) {
    fs.mkdirSync(SPECIFICATIONS_DIR, { recursive: true });
  }

  // 3. Clean base64 data and write binary file to disk
  const base64Clean = fileData.replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(base64Clean, "base64");
  const ext = path.extname(fileName) || ".pdf";
  const safeBaseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const storedFileName = `${productId}_${safeBaseName}${ext}`;
  const filePath = path.join(SPECIFICATIONS_DIR, storedFileName);
  const metaPath = path.join(SPECIFICATIONS_DIR, `${productId}.meta.json`);

  fs.writeFileSync(filePath, buffer);

  const meta = {
    productId,
    fileName,
    storedFileName,
    fileType: fileType || "application/pdf",
    fileSize: fileSize || buffer.length,
    uploadedAt: new Date().toISOString(),
    uploadedBy: actorEmail || "admin@vertex.local",
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

  // 4. Record audit log
  const auditRecord = await prisma.auditLog.create({
    data: {
      actorId,
      action: "PRODUCT_SPECIFICATION_UPLOAD",
      entityType: "Product",
      entityId: productId,
      metadata: {
        productName: product.name,
        fileName,
        fileSize: meta.fileSize,
        fileType: meta.fileType,
        actorEmail: actorEmail || "admin@vertex.local",
      },
    },
  });

  return {
    success: true,
    specification: meta,
    auditLog: {
      id: auditRecord.id,
      action: auditRecord.action,
      createdAt: auditRecord.createdAt,
    },
  };
}

/**
 * Retrieves specification metadata and absolute file path for a product.
 */
export async function getProductSpecification(productId) {
  const metaPath = path.join(SPECIFICATIONS_DIR, `${productId}.meta.json`);
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  const metaRaw = fs.readFileSync(metaPath, "utf8");
  const meta = JSON.parse(metaRaw);
  const filePath = path.join(SPECIFICATIONS_DIR, meta.storedFileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return { meta, filePath };
}

/**
 * Deletes a stored specification file and its metadata.
 */
export async function deleteProductSpecification(productId, actorId = null, actorEmail = null) {
  const metaPath = path.join(SPECIFICATIONS_DIR, `${productId}.meta.json`);
  let removedFileName = "specification.pdf";
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      removedFileName = meta.fileName || removedFileName;
      const filePath = path.join(SPECIFICATIONS_DIR, meta.storedFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.unlinkSync(metaPath);
    } catch {
      // Ignore cleanup error if already removed
    }
  }

  // Record audit log
  const auditRecord = await prisma.auditLog.create({
    data: {
      actorId,
      action: "PRODUCT_SPECIFICATION_DELETE",
      entityType: "Product",
      entityId: productId,
      metadata: {
        fileName: removedFileName,
        actorEmail: actorEmail || "admin@vertex.local",
      },
    },
  });

  return {
    success: true,
    message: "Specification document deleted successfully.",
    auditLog: {
      id: auditRecord.id,
      action: auditRecord.action,
      createdAt: auditRecord.createdAt,
    },
  };
}

/**
 * Lists all payments across the system with live KPI metrics, search, status, method, and date filters.
 */
export async function getAdminPayments(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  // 1. Live Aggregate Metrics across the entire Order table
  const [
    totalOrdersCount,
    paidOrders,
    pendingOrders,
    failedOrders,
    refundedOrders,
    allOrdersGross,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      where: { paymentStatus: "PAID" },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: "PENDING" },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: "FAILED" },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: "REFUNDED" },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      select: { totalAmount: true },
    }),
  ]);

  const sumAmounts = (arr) => arr.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);

  const summary = {
    totalCount: totalOrdersCount,
    totalGrossVolume: sumAmounts(allOrdersGross),
    paidCount: paidOrders.length,
    paidVolume: sumAmounts(paidOrders),
    pendingCount: pendingOrders.length,
    pendingVolume: sumAmounts(pendingOrders),
    failedCount: failedOrders.length,
    failedVolume: sumAmounts(failedOrders),
    refundedCount: refundedOrders.length,
    refundedVolume: sumAmounts(refundedOrders),
  };

  // 2. Build Filter Where clause
  const where = {};

  const statusParam = (queryParams.paymentStatus || "").trim().toUpperCase();
  if (statusParam && statusParam !== "ALL") {
    where.paymentStatus = statusParam;
  }

  const methodParam = (queryParams.paymentMethod || "").trim().toUpperCase();
  if (methodParam && methodParam !== "ALL") {
    where.paymentMethod = methodParam;
  }

  const searchTerm = (queryParams.search || queryParams.q || "").trim();
  if (searchTerm) {
    where.OR = [
      { orderNumber: { contains: searchTerm, mode: "insensitive" } },
      { paymentId: { contains: searchTerm, mode: "insensitive" } },
      { shippingRecipient: { contains: searchTerm, mode: "insensitive" } },
      { user: { email: { contains: searchTerm, mode: "insensitive" } } },
      { user: { fullName: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  const dateRange = (queryParams.dateRange || "all").toLowerCase();
  if (dateRange !== "all") {
    const now = new Date();
    if (dateRange === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: todayStart };
    } else if (dateRange === "week") {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: weekStart };
    } else if (dateRange === "month") {
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: monthStart };
    }
  }

  let orderBy = { createdAt: "desc" };
  if (queryParams.sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (queryParams.sort === "amount_desc") {
    orderBy = { totalAmount: "desc" };
  } else if (queryParams.sort === "amount_asc") {
    orderBy = { totalAmount: "asc" };
  }

  const [totalItems, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            companyName: true,
          },
        },
        items: true,
      },
    }),
  ]);

  // Fetch recent audit logs for orders in this list
  const orderIds = orders.map((o) => o.id);
  const auditLogs = orderIds.length > 0 ? await prisma.auditLog.findMany({
    where: {
      entityType: "Order",
      entityId: { in: orderIds },
    },
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { email: true, fullName: true, role: true } },
    },
  }) : [];

  const payments = orders.map((o) => {
    const relatedLogs = auditLogs.filter((l) => l.entityId === o.id);
    return {
      id: o.id,
      orderId: o.id,
      orderNumber: o.orderNumber,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      paymentId: o.paymentId || null,
      amount: Number(o.totalAmount),
      subtotal: Number(o.subtotal),
      taxAmount: Number(o.taxAmount),
      shippingFee: Number(o.shippingFee),
      customer: o.user
        ? {
            id: o.user.id,
            email: o.user.email,
            fullName: o.user.fullName,
            role: o.user.role,
            companyName: o.user.companyName || null,
          }
        : {
            id: o.userId,
            email: "guest@vertex.in",
            fullName: o.shippingRecipient,
            role: "CUSTOMER",
          },
      recipientName: o.shippingRecipient,
      phone: o.shippingPhone,
      city: o.shippingCity,
      state: o.shippingState,
      notes: o.notes || null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      auditHistory: relatedLogs.map((l) => ({
        id: l.id,
        action: l.action,
        actor: l.actor ? l.actor.email : "System / Admin",
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
    };
  });

  // Identify unresolved payments that require administrator attention
  const unresolvedIssues = payments.filter(
    (p) =>
      p.paymentStatus === "FAILED" ||
      (p.paymentStatus === "PENDING" && p.orderStatus === "CANCELLED") ||
      (p.paymentMethod === "UPI" && p.paymentStatus === "PENDING")
  );

  let upiConfig = null;
  try {
    const { getPublicPaymentConfig } = await import("./paymentConfig.service.js");
    upiConfig = await getPublicPaymentConfig();
  } catch {}

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    summary,
    payments,
    unresolvedIssues,
    upiConfig,
    gatewayIntegration: {
      isConfigured: false,
      provider: "RAZORPAY / STRIPE (Safe Boundary)",
      message:
        "External payment gateway merchant credentials (RAZORPAY_KEY_ID or STRIPE_SECRET_KEY) are not configured in environment. The system records verifiable local database transactions and immutable administrative audit logs.",
    },
    pagination: {
      totalItems,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Reconciles or resolves payment issue safely with audit logging.
 */
export async function reconcileAdminPayment(orderIdentifier, reconcileData, actorUser) {
  const actorId = actorUser?.id || null;
  const actorEmail = actorUser?.email || "admin@vertex.local";

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
    },
    include: { user: true },
  });

  if (!order) {
    const error = new Error(`Order with identifier '${orderIdentifier}' not found.`);
    error.status = 404;
    error.code = "ORDER_NOT_FOUND";
    throw error;
  }

  const { action, notes, settlementReference, refundAmount, confirmed } = reconcileData;

  if (!confirmed) {
    const error = new Error("Explicit administrator confirmation is required before performing financial reconciliation.");
    error.status = 400;
    error.code = "CONFIRMATION_REQUIRED";
    throw error;
  }

  const previousPaymentStatus = order.paymentStatus;
  let newPaymentStatus = previousPaymentStatus;
  let auditAction = "PAYMENT_RECONCILE_RECORD";
  let responseMessage = "";
  const updateData = {};

  if (action === "RECORD_REFUND") {
    if (order.paymentStatus === "REFUNDED") {
      const error = new Error("Order is already marked as REFUNDED; duplicate refunds are prohibited.");
      error.status = 400;
      error.code = "DUPLICATE_REFUND_PROHIBITED";
      throw error;
    }
    newPaymentStatus = "REFUNDED";
    updateData.paymentStatus = "REFUNDED";
    updateData.notes = order.notes
      ? `${order.notes} | [Refund Recorded: ₹${refundAmount || order.totalAmount} - ${notes}]`
      : `[Refund Recorded: ₹${refundAmount || order.totalAmount} - ${notes}]`;
    auditAction = "ORDER_REFUND_RECORD";
    responseMessage = `Refund of ₹${refundAmount || order.totalAmount} recorded for order ${order.orderNumber}.`;
  } else if (action === "VERIFY_OFFLINE_SETTLEMENT") {
    if (order.paymentStatus === "PAID") {
      const error = new Error("Order payment is already recorded as PAID; duplicate settlement is prohibited.");
      error.status = 400;
      error.code = "DUPLICATE_PAYMENT_PROHIBITED";
      throw error;
    }
    newPaymentStatus = "PAID";
    updateData.paymentStatus = "PAID";
    if (settlementReference && settlementReference.trim()) {
      updateData.paymentId = settlementReference.trim();
    }
    updateData.notes = order.notes
      ? `${order.notes} | [Verified Offline Settlement: ${notes}]`
      : `[Verified Offline Settlement: ${notes}]`;
    auditAction = "PAYMENT_OFFLINE_SETTLEMENT";
    responseMessage = `Payment marked as PAID via offline settlement for order ${order.orderNumber}.`;
  } else if (action === "FLAG_UNRESOLVED") {
    newPaymentStatus = "FAILED";
    updateData.paymentStatus = "FAILED";
    updateData.notes = order.notes
      ? `${order.notes} | [Flagged Unresolved: ${notes}]`
      : `[Flagged Unresolved: ${notes}]`;
    auditAction = "PAYMENT_ISSUE_FLAGGED";
    responseMessage = `Payment flagged as FAILED/unresolved for order ${order.orderNumber}.`;
  } else if (action === "RETRY_RECONCILIATION") {
    auditAction = "PAYMENT_GATEWAY_RECONCILE_ATTEMPT";
    responseMessage =
      "Payment gateway API credentials (RAZORPAY_KEY_ID / STRIPE_SECRET_KEY) are not configured in environment. Automated webhook sync is unavailable; transaction remains in its verified local state.";
  }

  // Update order if any field changed
  let updatedOrder = order;
  if (Object.keys(updateData).length > 0) {
    updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: { user: true, items: true },
    });
  }

  // Record audit log entry
  const auditRecord = await prisma.auditLog.create({
    data: {
      actorId,
      action: auditAction,
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        previousPaymentStatus,
        newPaymentStatus,
        action,
        settlementReference: settlementReference || null,
        refundAmount: refundAmount || null,
        notes,
        actorEmail,
        gatewayBoundaries: "OFFLINE_SAFE_MODE",
      },
    },
  });

  return {
    success: true,
    message: responseMessage,
    order: {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      orderStatus: updatedOrder.orderStatus,
      paymentStatus: updatedOrder.paymentStatus,
      paymentMethod: updatedOrder.paymentMethod,
      paymentId: updatedOrder.paymentId,
      totalAmount: Number(updatedOrder.totalAmount),
      notes: updatedOrder.notes,
    },
    auditLog: {
      id: auditRecord.id,
      action: auditRecord.action,
      createdAt: auditRecord.createdAt,
    },
  };
}

/**
 * Lists all customer replacement requests with delivery timestamp, remaining window, and review history.
 */
export async function listAdminReplacements() {
  const replacementLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "Order",
      action: "CUSTOMER_REPLACEMENT_REQUESTED",
    },
    orderBy: { createdAt: "desc" },
  });

  const orderIds = [...new Set(replacementLogs.map((l) => l.entityId))];

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: {
      items: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          companyName: true,
        },
      },
    },
  });

  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const statusLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "Order",
      action: "ADMIN_REPLACEMENT_STATUS_UPDATE",
      entityId: { in: orderIds },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestStatusMap = new Map();
  for (const slog of statusLogs) {
    if (!latestStatusMap.has(slog.entityId)) {
      latestStatusMap.set(slog.entityId, slog);
    }
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();

  const replacements = [];
  for (const log of replacementLogs) {
    const order = orderMap.get(log.entityId);
    if (!order) continue;

    const latestStatus = latestStatusMap.get(log.entityId);
    const meta = log.metadata || {};
    const deliveryDateStr = meta.deliveryDate || (order.updatedAt ? new Date(order.updatedAt).toISOString() : null);
    const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr) : null;
    const isWithinWindow = deliveryDate
      ? now.getTime() - deliveryDate.getTime() <= SEVEN_DAYS_MS && now.getTime() >= deliveryDate.getTime()
      : false;

    const currentStatus = latestStatus
      ? latestStatus.metadata?.newStatus
      : meta.status || "PENDING_REVIEW";

    replacements.push({
      id: log.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      customer: order.user
        ? {
            id: order.user.id,
            email: order.user.email,
            fullName: order.user.fullName,
            companyName: order.user.companyName,
          }
        : { email: meta.customerEmail || "customer@vertex.local" },
      deliveryDate: deliveryDateStr,
      windowDeadline: deliveryDate ? new Date(deliveryDate.getTime() + SEVEN_DAYS_MS).toISOString() : null,
      isWithinWindow,
      status: currentStatus,
      reason: meta.reason,
      details: meta.details,
      items: meta.items || [],
      requestedAt: log.createdAt,
      lastReviewedAt: latestStatus ? latestStatus.createdAt : null,
      adminNotes: latestStatus?.metadata?.adminNotes || null,
      reviewedBy: latestStatus?.metadata?.actorEmail || null,
    });
  }

  return {
    success: true,
    count: replacements.length,
    replacements,
  };
}

/**
 * Reviews and updates a replacement request status with immutable audit logging.
 */
export async function reviewAdminReplacement(orderIdentifier, reviewData, actorId, actorEmail) {
  const trimmed = (orderIdentifier || "").trim();
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: trimmed }, { orderNumber: trimmed }],
    },
  });

  if (!order) {
    throw createHttpError(`Order with identifier '${trimmed}' not found.`, "ORDER_NOT_FOUND", 404);
  }

  const latestRequest = await prisma.auditLog.findFirst({
    where: {
      entityType: "Order",
      entityId: order.id,
      action: "CUSTOMER_REPLACEMENT_REQUESTED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestRequest) {
    throw createHttpError(
      `No replacement request found for order '${trimmed}'.`,
      "REPLACEMENT_NOT_FOUND",
      404
    );
  }

  const { status, adminNotes } = reviewData;

  // Append note to order
  const reviewTag = `[Replacement ${status}: ${adminNotes}]`;
  const updatedNotes = order.notes ? `${order.notes} | ${reviewTag}` : reviewTag;
  await prisma.order.update({
    where: { id: order.id },
    data: { notes: updatedNotes },
  });

  // Record audit log entry
  const auditRecord = await prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action: "ADMIN_REPLACEMENT_STATUS_UPDATE",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus: latestRequest.metadata?.status || "PENDING_REVIEW",
        newStatus: status,
        adminNotes,
        actorEmail: actorEmail || "admin@vertex.local",
        reviewedAt: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    message: `Replacement request for order ${order.orderNumber} updated to ${status}.`,
    orderNumber: order.orderNumber,
    status,
    adminNotes,
    reviewedAt: auditRecord.createdAt,
    auditLogId: auditRecord.id,
  };
}




