/**
 * VERTEX Customer Storefront Order & Address API Service
 * 
 * Provides client methods to interact with authenticated order placement and address endpoints.
 * Enforces:
 * - credentials: "include" for HttpOnly session cookie transmission.
 * - X-Requested-With: "XMLHttpRequest" for strict CSRF protection.
 * - Standardized error handling and parameter formatting.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockOrderApi from "../mock/mockOrderApi";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const defaultHeaders = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

/**
 * Helper to process API responses safely
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      const error = new Error(`Server returned status ${response.status} (${response.statusText})`);
      error.status = response.status;
      throw error;
    }
    return { success: true };
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || "An unexpected error occurred.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Places a new order from the user's persistent cart.
 */
export async function placeOrder({
  addressId,
  shippingAddress,
  paymentMethod = "COD",
  paymentId,
  notes,
  idempotencyKey,
}) {
  if (isMockApiEnabled()) {
    return mockOrderApi.placeOrder({
      addressId,
      shippingAddress,
      paymentMethod,
      paymentId,
      notes,
      idempotencyKey,
    });
  }

  const headers = { ...defaultHeaders };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      addressId,
      shippingAddress,
      paymentMethod,
      paymentId,
      notes,
      idempotencyKey,
    }),
  });

  return handleResponse(response);
}

/**
 * Retrieves all orders placed by the current user.
 */
export async function getOrders() {
  if (isMockApiEnabled()) {
    return mockOrderApi.getOrders();
  }

  const response = await fetch(`${API_BASE}/api/orders`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Retrieves a single order by ID or orderNumber.
 */
export async function getOrderById(orderIdentifier) {
  if (isMockApiEnabled()) {
    return mockOrderApi.getOrderById(orderIdentifier);
  }

  const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderIdentifier)}`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Retrieves the saved addresses for the current user.
 */
export async function getAddresses() {
  if (isMockApiEnabled()) {
    return mockOrderApi.getAddresses();
  }

  const response = await fetch(`${API_BASE}/api/addresses`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Saves a new delivery address for the user.
 */
export async function saveAddress(addressData) {
  if (isMockApiEnabled()) {
    return mockOrderApi.saveAddress(addressData);
  }

  const response = await fetch(`${API_BASE}/api/addresses`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(addressData),
  });

  return handleResponse(response);
}

/**
 * Deletes a delivery address.
 */
export async function deleteAddress(addressId) {
  if (isMockApiEnabled()) {
    return mockOrderApi.deleteAddress(addressId);
  }

  const response = await fetch(`${API_BASE}/api/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Cancels an order owned by the current customer.
 * Only orders in PENDING or CONFIRMED state can be cancelled.
 */
export async function cancelOrder(orderIdentifier, { reason } = {}) {
  if (isMockApiEnabled()) {
    return mockOrderApi.cancelOrder(orderIdentifier, { reason });
  }

  const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderIdentifier)}/cancel`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ reason }),
  });

  return handleResponse(response);
}

/**
 * Retrieves public payment methods and UPI configuration for customer checkout.
 */
export async function getPaymentConfig() {
  if (isMockApiEnabled()) {
    return mockOrderApi.getPaymentConfig();
  }

  const response = await fetch(`${API_BASE}/api/payments/config`, {
    method: "GET",
    headers: defaultHeaders,
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Generates a dynamic transaction-specific UPI QR data URL for the cart total.
 */
export async function generateUpiQr({ amount, orderNumber, notes }) {
  if (isMockApiEnabled()) {
    return mockOrderApi.generateUpiQr({ amount, orderNumber, notes });
  }

  const response = await fetch(`${API_BASE}/api/payments/upi-qr`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ amount, orderNumber, notes }),
  });

  return handleResponse(response);
}

/**
 * Submits or updates customer payment transaction reference (UTR) for an order.
 */
export async function submitPaymentReference(orderIdentifier, paymentReference) {
  if (isMockApiEnabled()) {
    return mockOrderApi.submitPaymentReference(orderIdentifier, paymentReference);
  }

  const response = await fetch(`${API_BASE}/api/payments/orders/${encodeURIComponent(orderIdentifier)}/reference`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ paymentReference }),
  });

  return handleResponse(response);
}

/**
 * Submits a 7-day component replacement request for a delivered order.
 */
export async function requestOrderReplacement(orderIdentifier, { reason, details, items, unboxingProofConfirmed = true }) {
  if (isMockApiEnabled()) {
    return mockOrderApi.requestOrderReplacement(orderIdentifier, {
      reason,
      details,
      items,
      unboxingProofConfirmed,
    });
  }

  const response = await fetch(
    `${API_BASE}/api/orders/${encodeURIComponent(orderIdentifier)}/replacement`,
    {
      method: "POST",
      headers: defaultHeaders,
      credentials: "include",
      body: JSON.stringify({
        reason,
        details,
        items,
        unboxingProofConfirmed,
      }),
    }
  );

  return handleResponse(response);
}

/**
 * Retrieves replacement requests and 7-day eligibility for an order.
 */
export async function getOrderReplacements(orderIdentifier) {
  if (isMockApiEnabled()) {
    return mockOrderApi.getOrderReplacements(orderIdentifier);
  }

  const response = await fetch(
    `${API_BASE}/api/orders/${encodeURIComponent(orderIdentifier)}/replacement`,
    {
      method: "GET",
      headers: defaultHeaders,
      credentials: "include",
    }
  );

  return handleResponse(response);
}

