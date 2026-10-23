/**
 * VERTEX Mock Admin API Service
 * 
 * Provides simulated admin dashboard data, inventory adjustments, and portal telemetry.
 */

import { MOCK_USERS, MOCK_ORDERS, MOCK_PRODUCTS, MOCK_CATEGORIES } from "./mockData";
import * as mockCatalogApi from "./mockCatalogApi";

function getStoredUser() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem("vertex_mock_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function verifyAdminAuthorization() {
  await new Promise((r) => setTimeout(r, 40));
  const storedUser = getStoredUser();

  // If a simulated non-admin user is explicitly active (e.g. CUSTOMER or B2B), enforce 403 Forbidden
  if (storedUser && storedUser.role !== "ADMIN") {
    const error = new Error("Admin privileges required (Mock Mode).");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  // If stored user is ADMIN or not yet set in dev mode, provide admin authorization
  const admin = (storedUser && storedUser.role === "ADMIN") ? storedUser : MOCK_USERS.admin;
  if (typeof window !== "undefined" && window.localStorage && !storedUser) {
    try {
      window.localStorage.setItem("vertex_mock_user", JSON.stringify(admin));
    } catch {
      // Ignore
    }
  }

  return {
    authorized: true,
    user: admin,
  };
}

export async function getSystemHealth() {
  await new Promise((r) => setTimeout(r, 40));
  return {
    status: "UP",
    database: {
      connected: true,
      type: "PostgreSQL (Frontend Mock Dev Mode)",
    },
    uptime: "99.98%",
    timestamp: new Date().toISOString(),
  };
}

export async function getAdminProducts(params) {
  return mockCatalogApi.getProducts(params);
}

export async function getAdminProductDetails(slugOrId) {
  return mockCatalogApi.getProductBySlug(slugOrId);
}

export async function getAdminCategories() {
  return mockCatalogApi.getCategories();
}

export async function getAdminCategoryDetails(slug) {
  return mockCatalogApi.getCategoryBySlug(slug);
}

export async function createAdminProduct(productData) {
  await new Promise((r) => setTimeout(r, 60));
  return {
    success: true,
    message: "Product created successfully (Mock Dev Mode).",
    product: {
      id: `mock-prod-${Date.now()}`,
      ...productData,
    },
  };
}

export async function updateAdminProduct(productId, updateData) {
  await new Promise((r) => setTimeout(r, 60));
  const product = MOCK_PRODUCTS.find((p) => p.id === productId || p.slug === productId);
  if (!product) {
    const error = new Error(`Product with ID '${productId}' not found.`);
    error.status = 404;
    throw error;
  }

  // Update category and subcategory relation if categoryId changed
  if (updateData.categoryId) {
    let cat = MOCK_CATEGORIES.find((c) => c.id === updateData.categoryId || c.slug === updateData.categoryId);
    let sub = null;

    if (!cat) {
      for (const parent of MOCK_CATEGORIES) {
        const foundSub = (parent.children || []).find(
          (s) => s.id === updateData.categoryId || s.slug === updateData.categoryId
        );
        if (foundSub) {
          cat = parent;
          sub = foundSub;
          break;
        }
      }
    }

    if (cat) {
      product.categoryId = cat.id;
      product.category = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      };
      if (sub) {
        product.subcategory = {
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
        };
      }
    }
  }

  if (updateData.name !== undefined) product.name = updateData.name;
  if (updateData.brand !== undefined) product.brand = updateData.brand;
  if (updateData.tag !== undefined) product.tag = updateData.tag;
  if (updateData.description !== undefined) product.description = updateData.description;
  if (updateData.imageUrl !== undefined) product.imageUrl = updateData.imageUrl;
  if (updateData.hsnCode !== undefined) product.hsnCode = updateData.hsnCode;
  if (updateData.gstRate !== undefined) product.gstRate = Number(updateData.gstRate);
  if (updateData.specificationFileName !== undefined) product.specificationFileName = updateData.specificationFileName;
  if (updateData.isActive !== undefined) product.isActive = updateData.isActive;

  if (updateData.price !== undefined && updateData.price !== null && !isNaN(Number(updateData.price))) {
    product.price = Number(updateData.price);
    if (product.variants && product.variants.length > 0) {
      product.variants[0].price = Number(updateData.price);
    }
  }

  if (updateData.stockQuantity !== undefined && updateData.stockQuantity !== null && !isNaN(Number(updateData.stockQuantity))) {
    product.stockQuantity = Number(updateData.stockQuantity);
    if (product.variants && product.variants.length > 0) {
      product.variants[0].stockQuantity = Number(updateData.stockQuantity);
    }
  }

  return {
    success: true,
    message: "Product and category updated successfully (Mock Dev Mode).",
    product: { ...product },
  };
}

/**
 * Updates a product selling price via Mock Admin API.
 * Enforces admin authorization, validates positive numeric values, and records audit trail.
 */
export async function updateProductPrice(productId, priceData) {
  await new Promise((r) => setTimeout(r, 60));

  // Role check: Admin only
  const storedUser = getStoredUser();
  if (storedUser && storedUser.role !== "ADMIN") {
    const error = new Error("Admin privileges required to edit selling prices.");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const priceNum = Number(priceData?.price);
  if (priceData?.price === undefined || priceData?.price === null || isNaN(priceNum) || priceNum <= 0) {
    const error = new Error("Valid positive selling price is required.");
    error.status = 400;
    error.code = "INVALID_PRICE";
    throw error;
  }

  const product = MOCK_PRODUCTS.find((p) => p.id === productId || p.slug === productId);
  if (!product) {
    const error = new Error(`Product with ID '${productId}' not found.`);
    error.status = 404;
    error.code = "PRODUCT_NOT_FOUND";
    throw error;
  }

  // Update product price
  const previousPrice = product.price;
  product.price = priceNum;

  // Update variant price
  let targetVariant = null;
  if (product.variants && product.variants.length > 0) {
    if (priceData.variantId) {
      targetVariant = product.variants.find((v) => v.id === priceData.variantId);
    }
    if (!targetVariant) {
      targetVariant = product.variants[0];
    }
    targetVariant.price = priceNum;
  }

  // Broadcast catalog price update event so storefront views update immediately
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("vertex_catalog_updated", { detail: { productId: product.id, newPrice: priceNum } }));
    } catch {
      // Ignore
    }
  }

  return {
    success: true,
    message: "Product selling price updated successfully (Mock Mode).",
    product: { ...product },
    variant: targetVariant ? { ...targetVariant } : null,
    auditLog: {
      id: `audit-${Date.now()}`,
      action: "PRODUCT_PRICE_UPDATED",
      previousPrice,
      newPrice: priceNum,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function createAdminCategory(categoryData) {
  await new Promise((r) => setTimeout(r, 60));
  // Check slug uniqueness
  const exists = MOCK_CATEGORIES.some(
    (c) => c.slug === categoryData.slug || c.children?.some((sub) => sub.slug === categoryData.slug)
  );
  if (exists) {
    const error = new Error(`A category with slug '${categoryData.slug}' already exists.`);
    error.status = 409;
    throw error;
  }

  const newCat = {
    id: `mock-cat-${Date.now()}`,
    name: categoryData.name,
    slug: categoryData.slug,
    description: categoryData.description || null,
    icon: categoryData.icon || "📁",
    tint: categoryData.tint || "tint-blue",
    parentId: categoryData.parentId || null,
    isActive: true,
    productsCount: 0,
    children: [],
  };

  if (categoryData.parentId) {
    const parent = MOCK_CATEGORIES.find((c) => c.id === categoryData.parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push({
        id: newCat.id,
        name: newCat.name,
        slug: newCat.slug,
        parentId: parent.id,
        isActive: true,
      });
    }
  } else {
    MOCK_CATEGORIES.push(newCat);
  }

  return {
    success: true,
    message: "Category created successfully (Mock Dev Mode).",
    category: newCat,
  };
}

export async function updateAdminCategory(categoryId, updateData) {
  await new Promise((r) => setTimeout(r, 60));
  let targetCat = null;

  for (const cat of MOCK_CATEGORIES) {
    if (cat.id === categoryId || cat.slug === categoryId) {
      targetCat = cat;
      break;
    }
    if (cat.children) {
      const sub = cat.children.find((s) => s.id === categoryId || s.slug === categoryId);
      if (sub) {
        targetCat = sub;
        break;
      }
    }
  }

  if (!targetCat) {
    const error = new Error(`Category with ID '${categoryId}' not found.`);
    error.status = 404;
    throw error;
  }

  // Check duplicate slug if changed
  if (updateData.slug && updateData.slug !== targetCat.slug) {
    const slugInUse = MOCK_CATEGORIES.some(
      (c) =>
        (c.id !== categoryId && c.slug === updateData.slug) ||
        c.children?.some((s) => s.id !== categoryId && s.slug === updateData.slug)
    );
    if (slugInUse) {
      const error = new Error(`A category with slug '${updateData.slug}' already exists.`);
      error.status = 409;
      throw error;
    }
    targetCat.slug = updateData.slug;
  }

  if (updateData.name !== undefined) targetCat.name = updateData.name;
  if (updateData.description !== undefined) targetCat.description = updateData.description;
  if (updateData.icon !== undefined) targetCat.icon = updateData.icon;
  if (updateData.tint !== undefined) targetCat.tint = updateData.tint;
  if (updateData.isActive !== undefined) targetCat.isActive = updateData.isActive;

  return {
    success: true,
    message: "Category updated successfully (Mock Dev Mode).",
    category: { ...targetCat },
  };
}

export async function updateVariantStock(variantId, { stockQuantity, reason }) {
  await new Promise((r) => setTimeout(r, 60));
  return {
    success: true,
    message: "Variant stock updated successfully (Mock Dev Mode).",
    variant: {
      id: variantId,
      stockQuantity: Number(stockQuantity),
    },
    difference: 0,
    auditLog: {
      action: "VARIANT_STOCK_ADJUSTMENT",
      reason: reason || "Dev mock inventory update",
      timestamp: new Date().toISOString(),
    },
  };
}

export async function getAdminOrders({ page = 1, limit = 10, status = "" } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  let orders = [...MOCK_ORDERS];
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }
  return {
    isImplemented: true,
    success: true,
    orders,
    pagination: {
      totalItems: orders.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

export async function getAdminOrderById(orderIdentifier) {
  await new Promise((r) => setTimeout(r, 40));
  const order = MOCK_ORDERS.find((o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier);
  if (!order) {
    const error = new Error(`Order with identifier '${orderIdentifier}' not found.`);
    error.status = 404;
    error.code = "ORDER_NOT_FOUND";
    throw error;
  }
  return {
    success: true,
    order: { ...order },
  };
}

export async function updateAdminOrderStatus(orderId, { orderStatus, carrier, trackingNumber, notes }) {
  await new Promise((r) => setTimeout(r, 60));
  const orderIndex = MOCK_ORDERS.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  const baseOrder = orderIndex !== -1 ? MOCK_ORDERS[orderIndex] : MOCK_ORDERS[0] || {};
  const updated = {
    ...baseOrder,
    id: orderId,
    orderStatus,
    status: orderStatus,
    carrier: carrier !== undefined ? carrier : baseOrder.carrier,
    trackingNumber: trackingNumber !== undefined ? trackingNumber : baseOrder.trackingNumber,
    notes: notes !== undefined ? notes : baseOrder.notes,
    updatedAt: new Date().toISOString(),
  };

  if (orderIndex !== -1) {
    MOCK_ORDERS[orderIndex] = updated;
  }

  return {
    success: true,
    message: `Order status updated to ${orderStatus} successfully (Mock Mode).`,
    order: updated,
    auditLog: {
      id: `audit-${Date.now()}`,
      action: "ORDER_STATUS_UPDATE",
      createdAt: new Date().toISOString(),
    },
  };
}


export async function getAdminCustomers({ page = 1, limit = 10, role = "", search = "" } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  let customers = [MOCK_USERS.customer, MOCK_USERS.b2b];
  if (role && role !== "all") {
    customers = customers.filter((c) => c.role === role);
  }
  if (search && search.trim()) {
    const s = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.companyName && c.companyName.toLowerCase().includes(s))
    );
  }
  return {
    isImplemented: true,
    success: true,
    customers,
    pagination: {
      totalItems: customers.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

export async function getAdminCustomerDetails(customerId) {
  await new Promise((r) => setTimeout(r, 40));
  const allMockUsers = [MOCK_USERS.customer, MOCK_USERS.b2b];
  const user = allMockUsers.find((u) => u.id === customerId || u.email === customerId);
  if (!user) {
    const error = new Error(`Customer with ID '${customerId}' not found.`);
    error.status = 404;
    error.code = "CUSTOMER_NOT_FOUND";
    throw error;
  }

  const userOrders = MOCK_ORDERS.filter((o) => o.userId === user.id || !o.userId);
  const userQuotes = MOCK_QUOTES.filter((q) => q.userId === user.id);

  return {
    success: true,
    customer: {
      ...user,
      addresses: [
        {
          id: "addr-mock-1",
          recipientName: user.fullName,
          phone: user.phone || "+91 9876543210",
          line1: "Plot 42, Electronic City Phase 1",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560100",
          country: "India",
          isDefault: true,
        },
      ],
      orders: userOrders,
      ordersPagination: {
        totalItems: userOrders.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      quotes: userQuotes,
      metrics: {
        ordersCount: userOrders.length,
        totalSpent: 12500,
        quotesCount: userQuotes.length,
      },
    },
  };
}


export async function getAdminAuditLogs({ page = 1, limit = 20, action = "", entityType = "", search = "" } = {}) {
  await new Promise((r) => setTimeout(r, 50));
  let logs = [
    {
      id: "mock-log-1",
      action: "USER_AUTHENTICATION",
      entityType: "User",
      entityId: "usr-admin-01",
      metadata: { details: "Admin session initialized (Mock Dev Mode)", ip: "127.0.0.1" },
      createdAt: new Date().toISOString(),
      actorId: "usr-admin-01",
      actor: { id: "usr-admin-01", email: "admin@vertex.local", fullName: "Admin Operator", role: "ADMIN" },
    },
    {
      id: "mock-log-2",
      action: "ORDER_STATUS_UPDATE",
      entityType: "Order",
      entityId: "ord-test-01",
      metadata: { orderNumber: "VTX-ORD-1001", previousStatus: "PENDING", newStatus: "CONFIRMED" },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      actorId: "usr-admin-01",
      actor: { id: "usr-admin-01", email: "admin@vertex.local", fullName: "Admin Operator", role: "ADMIN" },
    },
    {
      id: "mock-log-3",
      action: "PRODUCT_VARIANT_STOCK_UPDATE",
      entityType: "ProductVariant",
      entityId: "var-01",
      metadata: { sku: "ELEC-ARD-UNO-R3", previousStock: 50, newStock: 65, delta: 15 },
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      actorId: "usr-admin-01",
      actor: { id: "usr-admin-01", email: "admin@vertex.local", fullName: "Admin Operator", role: "ADMIN" },
    },
  ];

  if (action && action !== "all") {
    logs = logs.filter((l) => l.action === action);
  }
  if (entityType && entityType !== "all") {
    logs = logs.filter((l) => l.entityType === entityType);
  }
  if (search && search.trim()) {
    const s = search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(s) ||
        l.entityType.toLowerCase().includes(s) ||
        l.entityId.toLowerCase().includes(s) ||
        (l.actor?.email && l.actor.email.toLowerCase().includes(s))
    );
  }

  return {
    isImplemented: true,
    success: true,
    logs,
    pagination: {
      totalItems: logs.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

let MOCK_QUOTES = [
  {
    id: "rfq-mock-1",
    userId: "mock-user-customer-1",
    contactName: "Aarav Sharma",
    email: "aarav.sharma@apexind.in",
    phone: "+91 9876543210",
    companyName: "Apex Industrial Systems",
    gstin: "29AAAAA0000A1Z5",
    productDetails: "Stainless Steel Hex Bolt (M8 x 30mm) - 500 Packs",
    quantity: 500,
    message: "Requesting expedited delivery for quarterly plant maintenance.",
    status: "PENDING",
    adminNotes: null,
    quotedAmount: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    user: {
      id: "mock-user-customer-1",
      fullName: "Aarav Sharma",
      email: "aarav.sharma@apexind.in",
      companyName: "Apex Industrial Systems",
      role: "B2B",
    },
  },
  {
    id: "rfq-mock-2",
    userId: null,
    contactName: "Sunil Patel",
    email: "sunil@patelenterprises.com",
    phone: "+91 9822334455",
    companyName: "Patel Enterprises",
    gstin: "27BBBBB1111B1Z2",
    productDetails: "Arduino Uno R3 Microcontroller Board - 100 Units",
    quantity: 100,
    message: "Requirement for technical training institute lab setup.",
    status: "UNDER_REVIEW",
    adminNotes: "Contacted customer for technical datasheet specification.",
    quotedAmount: 115000,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    user: null,
  },
];

let MOCK_NEWSLETTER_SUBSCRIBERS = [
  { id: "sub-1", email: "subscriber1@example.com", isActive: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "sub-2", email: "procurement@apexind.in", isActive: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export async function submitMockQuote(quoteData) {
  await new Promise((r) => setTimeout(r, 60));
  const newQuote = {
    id: `rfq-mock-${Date.now().toString().slice(-6)}`,
    userId: quoteData.userId || null,
    contactName: quoteData.contactName || quoteData.name || "Commercial Buyer",
    email: (quoteData.email || "").toLowerCase(),
    phone: quoteData.phone || "",
    companyName: quoteData.companyName || quoteData.company || null,
    gstin: quoteData.gstin || null,
    productDetails: quoteData.productDetails || "Custom Hardware Procurement",
    quantity: Number(quoteData.quantity) || 1,
    message: quoteData.message || quoteData.notes || null,
    status: "PENDING",
    adminNotes: null,
    quotedAmount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: null,
  };
  MOCK_QUOTES.unshift(newQuote);
  return {
    success: true,
    message: "Quote request submitted successfully.",
    quote: newQuote,
  };
}

export async function getAdminQuotes({ page = 1, limit = 10, status = "", search = "" } = {}) {
  await new Promise((r) => setTimeout(r, 40));
  let quotes = [...MOCK_QUOTES];

  if (status && status !== "all") {
    quotes = quotes.filter((q) => q.status === status);
  }
  if (search && search.trim()) {
    const s = search.toLowerCase();
    quotes = quotes.filter(
      (q) =>
        q.contactName.toLowerCase().includes(s) ||
        q.email.toLowerCase().includes(s) ||
        (q.companyName && q.companyName.toLowerCase().includes(s)) ||
        q.productDetails.toLowerCase().includes(s)
    );
  }

  return {
    success: true,
    quotes,
    pagination: {
      totalItems: quotes.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

export async function getAdminQuoteById(id) {
  await new Promise((r) => setTimeout(r, 30));
  const quote = MOCK_QUOTES.find((q) => q.id === id);
  if (!quote) {
    const err = new Error(`Quote request with ID '${id}' not found.`);
    err.status = 404;
    err.code = "QUOTE_NOT_FOUND";
    throw err;
  }
  return {
    success: true,
    quote: { ...quote },
  };
}

export async function updateAdminQuote(id, updateData) {
  await new Promise((r) => setTimeout(r, 50));
  const index = MOCK_QUOTES.findIndex((q) => q.id === id);
  if (index === -1) {
    const err = new Error(`Quote request with ID '${id}' not found.`);
    err.status = 404;
    err.code = "QUOTE_NOT_FOUND";
    throw err;
  }
  const updated = {
    ...MOCK_QUOTES[index],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  MOCK_QUOTES[index] = updated;
  return {
    success: true,
    message: "Quote request updated successfully.",
    quote: updated,
  };
}

export async function getAdminNewsletter({ page = 1, limit = 20, search = "" } = {}) {
  await new Promise((r) => setTimeout(r, 40));
  let subscriptions = [...MOCK_NEWSLETTER_SUBSCRIBERS];
  if (search && search.trim()) {
    const s = search.toLowerCase();
    subscriptions = subscriptions.filter((sub) => sub.email.toLowerCase().includes(s));
  }
  return {
    success: true,
    subscriptions,
    pagination: {
      totalItems: subscriptions.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

