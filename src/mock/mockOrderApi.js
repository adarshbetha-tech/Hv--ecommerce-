/**
 * VERTEX Mock Order & Address API Service
 * 
 * Provides simulated checkout, order placement, and address book management.
 * Explicitly labels all mock orders and operations as simulated development mode.
 */

import { MOCK_ADDRESSES, MOCK_ORDERS } from "./mockData";
import { clearCart } from "./mockCartApi";

const ADDRESS_STORAGE_KEY = "vertex_mock_addresses";
const ORDERS_STORAGE_KEY = "vertex_mock_orders";

// GST Configuration Toggle (Temporary suspension of GST charges)
// Set to true when GST charges are re-enabled
export const GST_ENABLED = false;

function getStoredAddresses() {
  if (typeof window === "undefined" || !window.localStorage) return [...MOCK_ADDRESSES];
  try {
    const raw = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(MOCK_ADDRESSES));
      return [...MOCK_ADDRESSES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...MOCK_ADDRESSES];
  } catch {
    return [...MOCK_ADDRESSES];
  }
}

function saveStoredAddresses(addresses) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // Ignore
  }
}

function getStoredOrders() {
  if (typeof window === "undefined" || !window.localStorage) return [...MOCK_ORDERS];
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(MOCK_ORDERS));
      return [...MOCK_ORDERS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...MOCK_ORDERS];
  } catch {
    return [...MOCK_ORDERS];
  }
}

function saveStoredOrders(orders) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Ignore
  }
}

export async function getAddresses() {
  await new Promise((r) => setTimeout(r, 40));
  const addresses = getStoredAddresses();
  return {
    success: true,
    addresses,
  };
}

export async function saveAddress(addressData) {
  await new Promise((r) => setTimeout(r, 50));
  const addresses = getStoredAddresses();
  const isDefault = addressData.isDefault || addresses.length === 0;

  if (isDefault) {
    addresses.forEach((a) => (a.isDefault = false));
  }

  const newAddress = {
    id: `mock-addr-${Date.now()}`,
    userId: "mock-user-customer-1",
    recipientName: addressData.recipientName || "Valued Customer",
    phone: addressData.phone || "+91 98765 43210",
    line1: addressData.line1 || "",
    line2: addressData.line2 || "",
    city: addressData.city || "",
    state: addressData.state || "",
    postalCode: addressData.postalCode || "",
    country: addressData.country || "India",
    isDefault,
    createdAt: new Date().toISOString(),
  };

  addresses.push(newAddress);
  saveStoredAddresses(addresses);

  return {
    success: true,
    address: newAddress,
  };
}

export async function deleteAddress(addressId) {
  await new Promise((r) => setTimeout(r, 40));
  let addresses = getStoredAddresses();
  addresses = addresses.filter((a) => a.id !== addressId);
  saveStoredAddresses(addresses);
  return {
    success: true,
    message: "Address deleted successfully.",
  };
}

export async function placeOrder({
  addressId,
  shippingAddress,
  paymentMethod = "COD",
  paymentId,
  notes = "",
  idempotencyKey,
}) {
  await new Promise((r) => setTimeout(r, 100));

  // Determine delivery address
  let targetAddress = shippingAddress;
  if (!targetAddress && addressId) {
    const addresses = getStoredAddresses();
    targetAddress = addresses.find((a) => a.id === addressId);
  }
  if (!targetAddress) {
    targetAddress = {
      recipientName: "Demo Developer (Mock)",
      phone: "+91 98765 43210",
      line1: "Sample Engineering Lab, Tech Park",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "India",
    };
  }

  // Clear mock cart upon successful order
  await clearCart();

  const mockOrderNumber = `MOCK-${Math.floor(100000 + Math.random() * 900000)}`;
  const subtotal = 1299.0;
  const shippingFee = 0.0;
  const taxAmount = GST_ENABLED ? 233.82 : 0.0;
  const totalAmount = Number((subtotal + taxAmount + shippingFee).toFixed(2));
  const order = {
    id: `mock-order-${Date.now()}`,
    orderNumber: mockOrderNumber,
    userId: "mock-user-customer-1",
    status: "PENDING",
    orderStatus: "PENDING",
    paymentMethod,
    paymentId: paymentId || null,
    paymentStatus: "PENDING (Mock Dev Mode)",
    subtotal,
    shippingFee,
    taxTotal: taxAmount,
    taxAmount,
    totalAmount,
    notes: `[MOCK DEV MODE - SIMULATED ORDER] ${notes || ""}`.trim(),
    createdAt: new Date().toISOString(),
    shippingAddress: targetAddress,
    items: [],
    idempotencyKey: idempotencyKey || null,
  };

  const orders = getStoredOrders();
  orders.unshift(order);
  saveStoredOrders(orders);

  return {
    success: true,
    order,
  };
}

export async function getOrders() {
  await new Promise((r) => setTimeout(r, 40));
  const orders = getStoredOrders();
  return {
    success: true,
    orders,
  };
}

export async function getOrderById(orderIdentifier) {
  await new Promise((r) => setTimeout(r, 40));
  const orders = getStoredOrders();
  const order = orders.find(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (!order) {
    const error = new Error(`Order "${orderIdentifier}" not found.`);
    error.status = 404;
    error.code = "ORDER_NOT_FOUND";
    throw error;
  }

  return {
    success: true,
    order,
  };
}

export async function cancelOrder(orderIdentifier, { reason } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  const orders = getStoredOrders();
  const orderIndex = orders.findIndex(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (orderIndex === -1) {
    const error = new Error(`Order "${orderIdentifier}" not found.`);
    error.status = 404;
    error.code = "ORDER_NOT_FOUND";
    throw error;
  }

  const order = orders[orderIndex];
  const currentStatus = order.orderStatus || order.status;

  if (currentStatus === "CANCELLED") {
    const error = new Error("This order has already been cancelled.");
    error.status = 400;
    error.code = "ORDER_ALREADY_CANCELLED";
    throw error;
  }

  const CANCELLABLE_STATES = ["PENDING", "CONFIRMED"];
  if (!CANCELLABLE_STATES.includes(currentStatus)) {
    const error = new Error(
      `Cannot cancel order in '${currentStatus}' status. Orders that are processing, shipped, or delivered cannot be cancelled online.`
    );
    error.status = 400;
    error.code = "ORDER_NOT_CANCELLABLE";
    throw error;
  }

  const cancellationReason = reason && reason.trim() ? reason.trim() : null;
  const cancellationNote = cancellationReason
    ? `${order.notes ? order.notes + " | " : ""}Customer Cancellation: ${cancellationReason}`
    : order.notes;

  const updatedOrder = {
    ...order,
    status: "CANCELLED",
    orderStatus: "CANCELLED",
    notes: cancellationNote,
    updatedAt: new Date().toISOString(),
  };

  orders[orderIndex] = updatedOrder;
  saveStoredOrders(orders);

  return {
    success: true,
    message: "Order cancelled successfully.",
    order: updatedOrder,
  };
}

const MOCK_PAYMENT_CONFIG = {
  merchantUpiId: "billing.vertex@icici",
  merchantName: "VERTEX Industrial E-Commerce",
  upiEnabled: true,
  qrMode: "DYNAMIC",
  instructions:
    "1. Scan the QR code using any UPI app (GPay, PhonePe, Paytm, BHIM).\n2. Verify the recipient is VERTEX Industrial E-Commerce.\n3. Complete the transfer of the exact order amount.\n4. Enter the 12-digit UPI Reference / UTR Number from your bank receipt below.",
  hasStaticQr: false,
  staticQrImageUrl: null,
  supportsDynamicQr: true,
  availableMethods: ["COD", "UPI"],
};

export async function getPaymentConfig() {
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    config: { ...MOCK_PAYMENT_CONFIG },
  };
}

export async function generateUpiQr({ amount, orderNumber, notes }) {
  await new Promise((r) => setTimeout(r, 40));
  const upiUri = `upi://pay?pa=${MOCK_PAYMENT_CONFIG.merchantUpiId}&pn=${encodeURIComponent(
    MOCK_PAYMENT_CONFIG.merchantName
  )}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    orderNumber ? `Order ${orderNumber}` : notes || "VERTEX E-Commerce"
  )}`;

  // High-contrast mock SVG data URL for fast, reliable unit testing without binary dependency
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260"><rect width="260" height="260" fill="#ffffff"/><rect x="20" y="20" width="60" height="60" fill="#0b1f3a"/><rect x="30" y="30" width="40" height="40" fill="#ffffff"/><rect x="40" y="40" width="20" height="20" fill="#0b1f3a"/><rect x="180" y="20" width="60" height="60" fill="#0b1f3a"/><rect x="190" y="30" width="40" height="40" fill="#ffffff"/><rect x="200" y="40" width="20" height="20" fill="#0b1f3a"/><rect x="20" y="180" width="60" height="60" fill="#0b1f3a"/><rect x="30" y="190" width="40" height="40" fill="#ffffff"/><rect x="40" y="200" width="20" height="20" fill="#0b1f3a"/><rect x="100" y="100" width="60" height="60" fill="#ff7900"/><text x="130" y="240" font-size="12" text-anchor="middle" fill="#0b1f3a" font-family="sans-serif">₹${Number(amount).toFixed(2)}</text></svg>`;
  const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return {
    success: true,
    qrDataUrl,
    upiUri,
    merchantUpiId: MOCK_PAYMENT_CONFIG.merchantUpiId,
    merchantName: MOCK_PAYMENT_CONFIG.merchantName,
    amount: Number(amount),
    orderNumber: orderNumber || null,
    mode: "DYNAMIC",
  };
}

export async function submitPaymentReference(orderIdentifier, paymentReference) {
  await new Promise((r) => setTimeout(r, 60));
  const orders = getStoredOrders();
  const orderIndex = orders.findIndex(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (orderIndex === -1) {
    const error = new Error(`Order ${orderIdentifier} not found.`);
    error.status = 404;
    throw error;
  }

  const cleanRef = String(paymentReference).trim();
  const updatedOrder = {
    ...orders[orderIndex],
    paymentId: cleanRef,
    notes: `${orders[orderIndex].notes || ""} | [Customer Submitted UTR: ${cleanRef}]`.trim(),
  };

  orders[orderIndex] = updatedOrder;
  saveStoredOrders(orders);

  return {
    success: true,
    message: "Payment reference recorded successfully.",
    order: updatedOrder,
  };
}

const REPLACEMENTS_STORAGE_KEY = "vertex_mock_replacements";

export function getStoredReplacements() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(REPLACEMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredReplacements(replacements) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(REPLACEMENTS_STORAGE_KEY, JSON.stringify(replacements));
  } catch {
    // Ignore
  }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function resolveDeliveryDate(order) {
  if (!order || (order.orderStatus !== "DELIVERED" && order.status !== "DELIVERED")) {
    return null;
  }
  if (order.deliveredAt) {
    const parsed = new Date(order.deliveredAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (order.notes) {
    const match = order.notes.match(/\[DeliveredAt:\s*([^\]]+)\]/i);
    if (match && match[1]) {
      const parsed = new Date(match[1].trim());
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  if (order.updatedAt) {
    const parsed = new Date(order.updatedAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export async function requestOrderReplacement(orderIdentifier, requestData) {
  await new Promise((r) => setTimeout(r, 60));
  const orders = getStoredOrders();
  const order = orders.find(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (!order) {
    const err = new Error(`Order '${orderIdentifier}' not found.`);
    err.code = "ORDER_NOT_FOUND";
    err.status = 404;
    throw err;
  }

  const orderStatus = (order.orderStatus || order.status || "").toUpperCase();
  if (orderStatus !== "DELIVERED") {
    const err = new Error(
      `Cannot request replacement for order in '${orderStatus}' status. Replacements can only be requested for orders that have been successfully delivered.`
    );
    err.code = "ORDER_NOT_DELIVERED";
    err.status = 400;
    throw err;
  }

  const deliveryDate = resolveDeliveryDate(order);
  if (!deliveryDate) {
    const err = new Error(
      "The delivery date for this order could not be verified. Replacements cannot be processed automatically without a verified delivery timestamp. Please contact VERTEX Technical Support directly."
    );
    err.code = "MISSING_DELIVERY_DATE";
    err.status = 400;
    throw err;
  }

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

  const replacements = getStoredReplacements();
  const existingActive = replacements.find(
    (r) =>
      r.orderNumber === order.orderNumber &&
      ["PENDING_REVIEW", "IN_REVIEW", "APPROVED_FOR_DISPATCH"].includes(r.status)
  );

  if (existingActive) {
    const err = new Error(
      `A replacement request for Order #${order.orderNumber} is already active (${existingActive.status}). Duplicate requests are not permitted.`
    );
    err.code = "DUPLICATE_REPLACEMENT_REQUEST";
    err.status = 409;
    throw err;
  }

  const items = (requestData.items && requestData.items.length > 0)
    ? requestData.items
    : (order.items || []).map((it) => ({
        sku: it.sku || it.variant?.sku,
        productName: it.productName || it.name,
        quantity: it.quantity || 1,
        reason: requestData.reason,
      }));

  const newReplacement = {
    id: `mock-repl-${Date.now()}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerEmail: "customer@vertex.local",
    reason: requestData.reason,
    details: requestData.details,
    items,
    deliveryDate: deliveryDate.toISOString(),
    requestedAt: now.toISOString(),
    windowDeadline: new Date(deliveryTime + SEVEN_DAYS_MS).toISOString(),
    status: "PENDING_REVIEW",
    policy: "7-Day Replacement Only (Transit Damage, Defects, DOA)",
  };

  replacements.unshift(newReplacement);
  saveStoredReplacements(replacements);

  // Update order notes in storage
  const replacementTag = `[Replacement Requested: ${now.toISOString().slice(0, 10)} - ${requestData.reason}]`;
  order.notes = order.notes ? `${order.notes} | ${replacementTag}` : replacementTag;
  const orderIndex = orders.findIndex((o) => o.id === order.id);
  if (orderIndex !== -1) {
    orders[orderIndex] = order;
    saveStoredOrders(orders);
  }

  return {
    success: true,
    requestId: newReplacement.id,
    orderNumber: order.orderNumber,
    status: "PENDING_REVIEW",
    deliveryDate: deliveryDate.toISOString(),
    requestedAt: now.toISOString(),
    windowDeadline: newReplacement.windowDeadline,
    reason: requestData.reason,
    details: requestData.details,
    items,
    policy: "7-Day Replacement Only (Transit Damage, Defects, DOA)",
    message: "Replacement request submitted successfully. Our engineering desk will review the documentation and dispatch verified replacements.",
  };
}

export async function getOrderReplacements(orderIdentifier) {
  await new Promise((r) => setTimeout(r, 40));
  const orders = getStoredOrders();
  const order = orders.find(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (!order) {
    const err = new Error(`Order '${orderIdentifier}' not found.`);
    err.code = "ORDER_NOT_FOUND";
    err.status = 404;
    throw err;
  }

  const deliveryDate = resolveDeliveryDate(order);
  const now = new Date();
  const isWithinWindow = deliveryDate
    ? now.getTime() - deliveryDate.getTime() <= SEVEN_DAYS_MS && now.getTime() >= deliveryDate.getTime()
    : false;

  const replacements = getStoredReplacements().filter(
    (r) => r.orderNumber === order.orderNumber || r.orderId === order.id
  );

  return {
    success: true,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus || order.status,
    deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
    isEligibleForReplacement: (order.orderStatus || order.status) === "DELIVERED" && isWithinWindow,
    windowDeadline: deliveryDate ? new Date(deliveryDate.getTime() + SEVEN_DAYS_MS).toISOString() : null,
    replacements: replacements.map((r) => ({
      id: r.id,
      action: "CUSTOMER_REPLACEMENT_REQUESTED",
      createdAt: r.requestedAt,
      metadata: r,
    })),
  };
}


