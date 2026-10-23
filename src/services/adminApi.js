/**
 * VERTEX Admin Portal API Service
 * 
 * Provides client methods to interact with backend catalog, health, authentication,
 * and administration endpoints.
 * 
 * Enforces:
 * - credentials: "include" for HttpOnly session cookie transmission.
 * - X-Requested-With: "XMLHttpRequest" for strict CSRF protection.
 * - Server-side authorization verification.
 * - Graceful handling and transparent reporting of endpoints scheduled for future phases.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockAdminApi from "../mock/mockAdminApi";

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
 * Verifies that the current active session has verified ADMIN privileges on the server.
 * Returns { authorized: true, user } on 200 OK.
 * Throws with status 401 (unauthenticated) or 403 (unauthorized customer/b2b).
 */
export async function verifyAdminAuthorization() {
  if (isMockApiEnabled()) {
    return mockAdminApi.verifyAdminAuthorization();
  }

  const response = await fetch(`${API_BASE}/api/auth/admin-check`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Checks server health and database connectivity.
 */
export async function getSystemHealth() {
  if (isMockApiEnabled()) {
    return mockAdminApi.getSystemHealth();
  }

  const response = await fetch(`${API_BASE}/api/health`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches products list with live search, filtering, and pagination from the real catalog API.
 */
export async function getAdminProducts({
  q = "",
  category = "",
  brand = "",
  minPrice = "",
  maxPrice = "",
  sort = "newest",
  page = 1,
  limit = 12,
  officialOnly = false,
} = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminProducts({
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
      officialOnly,
    });
  }

  const query = new URLSearchParams();
  if (q && q.trim()) query.set("q", q.trim());
  if (category && category.trim()) query.set("category", category.trim());
  if (brand && brand.trim()) query.set("brand", brand.trim());
  if (minPrice !== "" && !isNaN(minPrice)) query.set("minPrice", minPrice);
  if (maxPrice !== "" && !isNaN(maxPrice)) query.set("maxPrice", maxPrice);
  if (sort) query.set("sort", sort);
  if (page) query.set("page", page);
  if (limit) query.set("limit", limit);
  if (officialOnly) query.set("officialOnly", "true");

  const response = await fetch(`${API_BASE}/api/products?${query.toString()}`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches product details and all variants by slug or UUID.
 */
export async function getAdminProductDetails(slugOrId) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminProductDetails(slugOrId);
  }

  const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slugOrId)}`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches all active categories with product counts.
 */
export async function getAdminCategories() {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminCategories();
  }

  const response = await fetch(`${API_BASE}/api/categories`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches a single category with its products by slug.
 */
export async function getAdminCategoryDetails(slug) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminCategoryDetails(slug);
  }

  const response = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Attempts to create a new product.
 * Returns the created product or clear message if endpoint is pending.
 */
export async function createAdminProduct(productData) {
  if (isMockApiEnabled()) {
    return mockAdminApi.createAdminProduct(productData);
  }

  const response = await fetch(`${API_BASE}/api/admin/products`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(productData),
  });

  return handleResponse(response);
}

/**
 * Updates an existing product and its category assignment via Admin API.
 */
export async function updateAdminProduct(productId, updateData) {
  if (isMockApiEnabled()) {
    return mockAdminApi.updateAdminProduct(productId, updateData);
  }

  const response = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(updateData),
  });

  return handleResponse(response);
}

/**
 * Updates a product selling price via Admin API.
 * priceData: { price: number, variantId?: string }
 */
export async function updateProductPrice(productId, priceData) {
  if (isMockApiEnabled()) {
    return mockAdminApi.updateProductPrice(productId, priceData);
  }

  const response = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/price`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(priceData),
  });

  return handleResponse(response);
}


/**
 * Attempts to create a new category.
 */
export async function createAdminCategory(categoryData) {
  if (isMockApiEnabled()) {
    return mockAdminApi.createAdminCategory(categoryData);
  }

  const response = await fetch(`${API_BASE}/api/admin/categories`, {
    method: "POST",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(categoryData),
  });

  return handleResponse(response);
}

/**
 * Updates an existing category via Admin API.
 */
export async function updateAdminCategory(categoryId, updateData) {
  if (isMockApiEnabled()) {
    return mockAdminApi.updateAdminCategory(categoryId, updateData);
  }

  const response = await fetch(`${API_BASE}/api/admin/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify(updateData),
  });

  return handleResponse(response);
}

/**
 * Attempts to update inventory stock for a variant.
 */
export async function updateVariantStock(variantId, { stockQuantity, reason }) {
  if (isMockApiEnabled()) {
    return mockAdminApi.updateVariantStock(variantId, { stockQuantity, reason });
  }

  const response = await fetch(`${API_BASE}/api/admin/inventory/variants/${variantId}`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ stockQuantity, reason }),
  });

  return handleResponse(response);
}

/**
 * Fetches all orders with filtering, search, and pagination from the Admin API.
 */
export async function getAdminOrders({
  page = 1,
  limit = 10,
  status = "",
  paymentStatus = "",
  search = "",
  q = "",
  sort = "newest",
} = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminOrders({ page, limit, status, paymentStatus, search: search || q, sort });
  }

  try {
    const query = new URLSearchParams();
    if (page) query.set("page", page);
    if (limit) query.set("limit", limit);
    if (status && status !== "all") query.set("status", status);
    if (paymentStatus && paymentStatus !== "all") query.set("paymentStatus", paymentStatus);
    const searchTerm = (search || q || "").trim();
    if (searchTerm) query.set("search", searchTerm);
    if (sort) query.set("sort", sort);

    const response = await fetch(`${API_BASE}/api/admin/orders?${query.toString()}`, {
      method: "GET",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
    });

    if (response.status === 404) {
      return {
        isImplemented: false,
        message: "Orders administration endpoint (GET /api/admin/orders) is scheduled for Phase 9 checkout & order lifecycle integration.",
        orders: [],
        pagination: { totalItems: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }

    return await handleResponse(response);
  } catch (err) {
    if (err.status === 404 || err.message?.includes("404")) {
      return {
        isImplemented: false,
        message: "Orders administration endpoint (GET /api/admin/orders) is scheduled for Phase 9 checkout & order lifecycle integration.",
        orders: [],
        pagination: { totalItems: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
    throw err;
  }
}

/**
 * Fetches a single order by UUID or orderNumber from the Admin API.
 */
export async function getAdminOrderById(orderIdentifier) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminOrderById(orderIdentifier);
  }

  const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderIdentifier)}`, {
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Updates order fulfillment status via Admin API.
 */
export async function updateAdminOrderStatus(orderId, { orderStatus, carrier, trackingNumber, notes }) {
  if (isMockApiEnabled()) {
    return mockAdminApi.updateAdminOrderStatus(orderId, { orderStatus, carrier, trackingNumber, notes });
  }

  const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ orderStatus, carrier, trackingNumber, notes }),
  });

  return handleResponse(response);
}

/**
 * Fetches customers list. If endpoint is not yet mounted, returns pending integration status.
 */
export async function getAdminCustomers({ page = 1, limit = 10, role = "", status = "", search = "", sort = "" } = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminCustomers({ page, limit, role, status, search, sort });
  }

  try {
    const query = new URLSearchParams({ page, limit });
    if (role && role !== "all") query.set("role", role);
    if (status && status !== "all") query.set("status", status);
    if (search && search.trim()) query.set("search", search.trim());
    if (sort) query.set("sort", sort);

    const response = await fetch(`${API_BASE}/api/admin/customers?${query.toString()}`, {
      method: "GET",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
    });

    if (response.status === 404) {
      return {
        isImplemented: false,
        message: "Customers management endpoint (GET /api/admin/customers) is scheduled for administrative user management.",
        customers: [],
        pagination: { totalItems: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }

    return await handleResponse(response);
  } catch (err) {
    if (err.status === 404 || err.message?.includes("404")) {
      return {
        isImplemented: false,
        message: "Customers management endpoint (GET /api/admin/customers) is scheduled for administrative user management.",
        customers: [],
        pagination: { totalItems: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
    throw err;
  }
}

/**
 * Fetches single customer details with address book, order history, RFQs, and spend metrics.
 */
export async function getAdminCustomerDetails(customerId, { ordersPage = 1, ordersLimit = 10 } = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminCustomerDetails(customerId, { ordersPage, ordersLimit });
  }

  const query = new URLSearchParams({ ordersPage, ordersLimit });
  const response = await fetch(`${API_BASE}/api/admin/customers/${encodeURIComponent(customerId)}?${query.toString()}`, {
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Fetches audit log events.
 */

export async function getAdminAuditLogs({ page = 1, limit = 20, action = "", entityType = "", actorId = "", search = "", sort = "" } = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminAuditLogs({ page, limit, action, entityType, actorId, search, sort });
  }

  try {
    const query = new URLSearchParams({ page, limit });
    if (action && action !== "all") query.set("action", action);
    if (entityType && entityType !== "all") query.set("entityType", entityType);
    if (actorId && actorId !== "all") query.set("actorId", actorId);
    if (search && search.trim()) query.set("search", search.trim());
    if (sort) query.set("sort", sort);

    const response = await fetch(`${API_BASE}/api/admin/audit-logs?${query.toString()}`, {
      method: "GET",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
    });

    if (response.status === 404) {
      return {
        isImplemented: false,
        message: "Audit Log query endpoint (GET /api/admin/audit-logs) is scheduled for security auditing integration.",
        logs: [],
        pagination: { totalItems: 0, page: 1, limit: 20, totalPages: 0 },
      };
    }

    return await handleResponse(response);
  } catch (err) {
    if (err.status === 404 || err.message?.includes("404")) {
      return {
        isImplemented: false,
        message: "Audit Log query endpoint (GET /api/admin/audit-logs) is scheduled for security auditing integration.",
        logs: [],
        pagination: { totalItems: 0, page: 1, limit: 20, totalPages: 0 },
      };
    }
    throw err;
  }
}

/**
 * Lists commercial RFQ quote requests via Admin API.
 */
export async function getAdminQuotes({ page = 1, limit = 10, status = "", search = "" } = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminQuotes({ page, limit, status, search });
  }

  const query = new URLSearchParams({ page, limit });
  if (status && status !== "all") query.set("status", status);
  if (search && search.trim()) query.set("search", search.trim());

  const response = await fetch(`${API_BASE}/api/admin/quotes?${query.toString()}`, {
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Retrieves a single quote request by ID via Admin API.
 */
export async function getAdminQuoteById(id) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminQuoteById(id);
  }

  const response = await fetch(`${API_BASE}/api/admin/quotes/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
  });

  return handleResponse(response);
}

/**
 * Updates a quote request status, notes, or quoted amount via Admin API.
 */
export async function updateAdminQuote(id, { status, adminNotes, quotedAmount }) {
  if (isMockApiEnabled()) {
    return mockAdminApi.updateAdminQuote(id, { status, adminNotes, quotedAmount });
  }

  const response = await fetch(`${API_BASE}/api/admin/quotes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: defaultHeaders,
    credentials: "include",
    body: JSON.stringify({ status, adminNotes, quotedAmount }),
  });

  return handleResponse(response);
}

/**
 * Lists newsletter subscriptions via Admin API.
 */
export async function getAdminNewsletterSubscriptions({ page = 1, limit = 20, search = "" } = {}) {
  if (isMockApiEnabled()) {
    return mockAdminApi.getAdminNewsletter({ page, limit, search });
  }

  const query = new URLSearchParams({ page, limit });
  if (search && search.trim()) query.set("search", search.trim());

  const response = await fetch(`${API_BASE}/api/admin/newsletter?${query.toString()}`, {
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
  });

  return handleResponse(response);
}

