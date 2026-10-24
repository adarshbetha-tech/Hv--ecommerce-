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

export async function updateAdminOrderStatus(orderId, { orderStatus, carrier, trackingNumber, notes, paymentStatus, refundAmount }) {
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
    paymentStatus: paymentStatus !== undefined ? paymentStatus : baseOrder.paymentStatus,
    refundAmount: refundAmount !== undefined ? refundAmount : baseOrder.refundAmount,
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

export async function updateAdminUserRole(userId, { role, isActive }) {
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    message: `User role updated to ${role} successfully (Mock Mode).`,
    user: { id: userId, role, isActive: isActive !== false },
  };
}

export async function uploadAdminProductSpecification(productId, { fileName, fileData, fileType, fileSize }) {
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    message: "Specification uploaded successfully (Mock Mode).",
    specification: { productId, fileName, fileType, fileSize, uploadedAt: new Date().toISOString() },
  };
}

export async function deleteAdminProductSpecification(productId) {
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    message: "Specification document deleted successfully (Mock Mode).",
  };
}

export async function getAdminPayments({
  page = 1,
  limit = 10,
  paymentStatus = "",
  paymentMethod = "",
  search = "",
  dateRange = "all",
  sort = "newest",
} = {}) {
  await new Promise((r) => setTimeout(r, 40));

  let payments = MOCK_ORDERS.map((o) => {
    const rawStatus = (o.paymentStatus || "PENDING").toUpperCase();
    const cleanStatus = rawStatus.includes("PAID")
      ? "PAID"
      : rawStatus.includes("REFUND")
      ? "REFUNDED"
      : rawStatus.includes("FAIL")
      ? "FAILED"
      : "PENDING";

    return {
      id: o.id,
      orderId: o.id,
      orderNumber: o.orderNumber,
      orderStatus: o.orderStatus || o.status || "PENDING",
      paymentStatus: cleanStatus,
      paymentMethod: o.paymentMethod || "COD",
      paymentId: o.paymentId || (cleanStatus === "PAID" ? `pay_mock_${o.orderNumber}` : null),
      amount: Number(o.totalAmount || 0),
      subtotal: Number(o.subtotal || 0),
      taxAmount: Number(o.taxAmount || o.taxTotal || 0),
      shippingFee: Number(o.shippingFee || 0),
      customer: {
        id: o.userId || "mock-user-1",
        email: "customer@vertex.in",
        fullName: o.shippingRecipient || "Apex Industrial Customer",
        role: "CUSTOMER",
      },
      recipientName: o.shippingRecipient || "Apex Industrial Customer",
      phone: o.shippingPhone || "+91 98765 43210",
      city: o.shippingCity || "Bengaluru",
      state: o.shippingState || "Karnataka",
      notes: o.notes || null,
      createdAt: o.createdAt || new Date().toISOString(),
      updatedAt: o.updatedAt || new Date().toISOString(),
      auditHistory: [
        {
          id: `audit-pay-${o.id}`,
          action: cleanStatus === "REFUNDED" ? "ORDER_REFUND_RECORD" : "PAYMENT_STATUS_UPDATE",
          actor: "admin@vertex.in",
          metadata: { paymentStatus: cleanStatus, orderNumber: o.orderNumber },
          createdAt: o.createdAt || new Date().toISOString(),
        },
      ],
    };
  });

  const totalOrdersCount = payments.length;
  const sumAmounts = (arr) => arr.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const summary = {
    totalCount: totalOrdersCount,
    totalGrossVolume: sumAmounts(payments),
    paidCount: payments.filter((p) => p.paymentStatus === "PAID").length,
    paidVolume: sumAmounts(payments.filter((p) => p.paymentStatus === "PAID")),
    pendingCount: payments.filter((p) => p.paymentStatus === "PENDING").length,
    pendingVolume: sumAmounts(payments.filter((p) => p.paymentStatus === "PENDING")),
    failedCount: payments.filter((p) => p.paymentStatus === "FAILED").length,
    failedVolume: sumAmounts(payments.filter((p) => p.paymentStatus === "FAILED")),
    refundedCount: payments.filter((p) => p.paymentStatus === "REFUNDED").length,
    refundedVolume: sumAmounts(payments.filter((p) => p.paymentStatus === "REFUNDED")),
  };

  if (paymentStatus && paymentStatus !== "all") {
    payments = payments.filter((p) => p.paymentStatus === paymentStatus.toUpperCase());
  }

  if (paymentMethod && paymentMethod !== "all") {
    payments = payments.filter((p) => p.paymentMethod.toUpperCase() === paymentMethod.toUpperCase());
  }

  if (search && search.trim()) {
    const s = search.toLowerCase();
    payments = payments.filter(
      (p) =>
        (p.orderNumber && p.orderNumber.toLowerCase().includes(s)) ||
        (p.paymentId && p.paymentId.toLowerCase().includes(s)) ||
        (p.recipientName && p.recipientName.toLowerCase().includes(s))
    );
  }

  if (dateRange && dateRange !== "all") {
    const now = new Date();
    if (dateRange === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      payments = payments.filter((p) => new Date(p.createdAt) >= todayStart);
    }
  }

  const unresolvedIssues = payments.filter(
    (p) =>
      p.paymentStatus === "FAILED" ||
      (p.paymentStatus === "PENDING" && p.orderStatus === "CANCELLED") ||
      (p.paymentMethod === "UPI" && p.paymentStatus === "PENDING")
  );

  return {
    success: true,
    summary,
    payments,
    unresolvedIssues,
    upiConfig: { ...MOCK_PAYMENT_CONFIG },
    gatewayIntegration: {
      isConfigured: false,
      provider: "RAZORPAY / STRIPE (Mock Safe Boundary)",
      message:
        "External payment gateway merchant credentials are not configured in mock environment. The system records verifiable local database transactions and immutable administrative audit logs.",
    },
    pagination: {
      totalItems: payments.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
    },
  };
}

export async function reconcileAdminPayment(orderId, { action, notes, settlementReference, refundAmount, confirmed }) {
  await new Promise((r) => setTimeout(r, 40));
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.orderNumber === orderId) || MOCK_ORDERS[0];
  if (action === "RECORD_REFUND") {
    order.paymentStatus = "REFUNDED";
    order.refundAmount = refundAmount || order.totalAmount;
  } else if (action === "VERIFY_OFFLINE_SETTLEMENT") {
    order.paymentStatus = "PAID";
    if (settlementReference) order.paymentId = settlementReference;
  } else if (action === "FLAG_UNRESOLVED") {
    order.paymentStatus = "FAILED";
  }
  return {
    success: true,
    message: `Payment reconciled successfully via ${action} (Mock Mode).`,
    order,
    auditLog: {
      id: `audit-${Date.now()}`,
      action: "PAYMENT_RECONCILE_RECORD",
      createdAt: new Date().toISOString(),
    },
  };
}

let MOCK_PAYMENT_CONFIG = {
  merchantUpiId: "billing.vertex@icici",
  merchantName: "VERTEX Industrial E-Commerce",
  upiEnabled: true,
  qrMode: "DYNAMIC",
  instructions:
    "1. Scan the QR code using any UPI app (GPay, PhonePe, Paytm, BHIM).\n2. Verify the recipient is VERTEX Industrial E-Commerce.\n3. Complete the transfer of the exact order amount.\n4. Enter the 12-digit UPI Reference / UTR Number from your bank receipt below.",
  hasStaticQr: false,
  staticQrFileName: null,
  staticQrFileType: null,
  staticQrFileSize: null,
  staticQrImageUrl: null,
  supportsDynamicQr: true,
  availableMethods: ["COD", "UPI"],
  updatedAt: new Date().toISOString(),
  updatedBy: "admin@vertex.local",
};

export async function getAdminPaymentConfig() {
  await new Promise((r) => setTimeout(r, 40));
  return {
    success: true,
    config: { ...MOCK_PAYMENT_CONFIG },
    auditHistory: [
      {
        id: "audit-pay-init",
        action: "PAYMENT_CONFIG_INITIALIZED",
        actor: "admin@vertex.local",
        createdAt: new Date().toISOString(),
        metadata: { upiEnabled: true, merchantUpiId: MOCK_PAYMENT_CONFIG.merchantUpiId },
      },
    ],
  };
}

export async function updateAdminPaymentConfig(configData) {
  await new Promise((r) => setTimeout(r, 60));
  let hasStaticQr = MOCK_PAYMENT_CONFIG.hasStaticQr;
  let staticQrImageUrl = MOCK_PAYMENT_CONFIG.staticQrImageUrl;
  let staticQrFileName = MOCK_PAYMENT_CONFIG.staticQrFileName;

  if (configData.staticQrImage && configData.staticQrImage.fileData) {
    hasStaticQr = true;
    staticQrImageUrl = configData.staticQrImage.fileData;
    staticQrFileName = configData.staticQrImage.fileName || "merchant-qr.png";
  }

  MOCK_PAYMENT_CONFIG = {
    ...MOCK_PAYMENT_CONFIG,
    merchantUpiId: configData.merchantUpiId || MOCK_PAYMENT_CONFIG.merchantUpiId,
    merchantName: configData.merchantName || MOCK_PAYMENT_CONFIG.merchantName,
    upiEnabled: configData.upiEnabled !== undefined ? Boolean(configData.upiEnabled) : MOCK_PAYMENT_CONFIG.upiEnabled,
    qrMode: configData.qrMode || MOCK_PAYMENT_CONFIG.qrMode,
    instructions: configData.instructions || MOCK_PAYMENT_CONFIG.instructions,
    hasStaticQr,
    staticQrImageUrl,
    staticQrFileName,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    message: "Payment configuration saved successfully (Mock Mode).",
    config: { ...MOCK_PAYMENT_CONFIG },
  };
}

export async function removeAdminPaymentQr() {
  await new Promise((r) => setTimeout(r, 40));
  MOCK_PAYMENT_CONFIG = {
    ...MOCK_PAYMENT_CONFIG,
    hasStaticQr: false,
    staticQrImageUrl: null,
    staticQrFileName: null,
    qrMode: "DYNAMIC",
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    message: "Static QR code image removed (Mock Mode).",
    config: { ...MOCK_PAYMENT_CONFIG },
  };
}

let MOCK_COUPONS = [
  {
    id: "coup-reg-01",
    code: "VTX-IND-BULK10",
    campaignName: "Industrial Bulk Fasteners Incentive",
    recipientName: "Premier Heavy Industries Ltd.",
    recipientAddress: "Plot 42, Peenya Industrial Area Phase 2, Bengaluru, Karnataka 560058",
    category: "regular",
    subType: "reusable",
    typeLabel: "Time-Limited Reusable",
    discountType: "percentage",
    discountValue: 10.0,
    minOrder: 10000.0,
    maxDiscount: 2500.0,
    validityDuration: "custom",
    validPeriod: "Jan 2026 – Dec 2026",
    expiresAt: "2026-12-31T23:59:59",
    status: "active",
    usagePolicy: "Reusable while valid (unlimited per customer)",
    perCustomerLimit: "Unlimited",
    redemptionStatus: "Available",
    usageCount: 14,
    description: "Volume tier discount applicable to wholesale fastener crates and hardware assortments.",
  },
  {
    id: "coup-reg-02",
    code: "VTX-ELEC-FIRST",
    campaignName: "New Lab Welcome Voucher",
    recipientName: "National Avionics Research Laboratory",
    recipientAddress: "HAL Airport Road, Kodihalli, Bengaluru, Karnataka 560017",
    category: "regular",
    subType: "single_use",
    typeLabel: "Single-Use Voucher",
    discountType: "fixed",
    discountValue: 500.0,
    minOrder: 3000.0,
    maxDiscount: 500.0,
    validityDuration: "custom",
    validPeriod: "Nov 2026 – Dec 2026",
    expiresAt: "2026-12-31T23:59:59",
    status: "scheduled",
    usagePolicy: "Single-use per customer (1 redemption maximum)",
    perCustomerLimit: "1 use",
    redemptionStatus: "Available",
    usageCount: 0,
    description: "Introductory voucher for newly registered research labs and university departments.",
  },
  {
    id: "coup-col-01",
    code: "VTX-COLLEGE-ROBO",
    campaignName: "National Robotics Championship Lab Kit",
    category: "college",
    subType: "college_gift",
    typeLabel: "College Educational Gift",
    collegeName: "Indian Institute of Science (IISc) Bengaluru",
    collegeAddress: "CV Raman Road, Mathikere, Bengaluru, Karnataka 560012",
    recipientName: "Robotics & Autonomous Systems Lab",
    recipientAddress: "Dept of Mechanical Engineering, IISc Campus, Bengaluru 560012",
    collegeId: "IISC-ROBO-2026",
    studentDomain: "@iisc.ac.in",
    discountType: "free_gift",
    discountValue: 0,
    freeProductName: "Arduino Uno R3 Microcontroller Board",
    freeProductSku: "ELEC-ARD-UNO-R3",
    freeProductValue: 1299.0,
    maxFreeUnits: 1,
    minOrder: 1500.0,
    maxDiscount: 1299.0,
    validityDuration: "semester",
    validPeriod: "Academic Year 2025-2026",
    expiresAt: "2026-06-30T23:59:59",
    status: "active",
    eligibilityCriteria: "Enrolled engineering students with verified @iisc.ac.in email or student ID",
    usagePolicy: "1 free board per student ID with qualifying lab order",
    perCustomerLimit: "1 per student",
    redemptionStatus: "Available",
    usageCount: 28,
    description: "Complimentary Arduino Uno R3 development board for autonomous robotics teams.",
  },
  {
    id: "coup-col-02",
    code: "VTX-IITM-AERO26",
    campaignName: "Aerospace Engineering Project Grant",
    category: "college",
    subType: "college_gift",
    typeLabel: "College Educational Gift",
    collegeName: "IIT Madras - Aero Design Lab",
    collegeAddress: "IIT P.O., Sardar Patel Road, Chennai, Tamil Nadu 600036",
    recipientName: "Aero Design Project Group",
    recipientAddress: "Dept of Aerospace Engineering, IIT Madras, Chennai 600036",
    collegeId: "IITM-AERO-GRANT",
    studentDomain: "@smail.iitm.ac.in",
    discountType: "free_gift",
    discountValue: 0,
    freeProductName: "Stainless Steel Hex Bolt (Pack of 10)",
    freeProductSku: "FAST-HEX-M8-30-P10",
    freeProductValue: 120.0,
    maxFreeUnits: 2,
    minOrder: 2500.0,
    maxDiscount: 1500.0,
    validityDuration: "custom",
    validPeriod: "Aug 2026 – May 2027",
    expiresAt: "2027-05-31T23:59:59",
    status: "active",
    eligibilityCriteria: "Verified student ID or @smail.iitm.ac.in institutional domain",
    usagePolicy: "Reusable for official project teams (up to 2 packs per team)",
    perCustomerLimit: "Up to 2 packs",
    redemptionStatus: "Available",
    usageCount: 12,
    description: "Complimentary high-tensile stainless fastener test pack for aerospace engineering students.",
  },
];

export async function getAdminCoupons({ category = "all", status = "all" } = {}) {
  await new Promise((r) => setTimeout(r, 40));
  let list = [...MOCK_COUPONS];
  if (category && category !== "all") {
    list = list.filter((c) => c.category === category);
  }
  if (status && status !== "all") {
    list = list.filter((c) => c.status === status);
  }
  return {
    success: true,
    count: list.length,
    coupons: list,
  };
}

export async function createAdminCoupon(couponData) {
  await new Promise((r) => setTimeout(r, 60));
  const newCoupon = {
    id: `coup-mock-${Date.now()}`,
    code: couponData.code.trim().toUpperCase(),
    campaignName: couponData.campaignName.trim(),
    category: couponData.category,
    subType: couponData.subType || "college_gift",
    typeLabel:
      couponData.category === "college"
        ? "College Educational Gift"
        : couponData.subType === "single_use"
        ? "Single-Use Voucher"
        : "Time-Limited Reusable",
    collegeName: couponData.collegeName?.trim() || null,
    collegeAddress: couponData.collegeAddress?.trim() || null,
    recipientName: couponData.recipientName?.trim() || null,
    recipientAddress: couponData.collegeAddress?.trim() || couponData.recipientAddress?.trim() || null,
    collegeId: couponData.collegeId?.trim() || "COLLEGE-ID-PENDING",
    studentDomain: couponData.studentDomain?.trim() || "@college.edu",
    discountType: couponData.discountType,
    discountValue: Number(couponData.discountValue) || 0,
    freeProductSku: couponData.freeProductSku?.trim() || null,
    freeProductName: couponData.freeProductName?.trim() || null,
    freeProductValue: couponData.freeProductValue ? Number(couponData.freeProductValue) : null,
    maxFreeUnits:
      couponData.discountType === "free_gift"
        ? Math.max(1, Math.min(10, Number(couponData.maxFreeUnits) || 1))
        : null,
    minOrder: Number(couponData.minOrder) || 0,
    maxDiscount: Number(couponData.maxDiscount) || 0,
    validityDuration: couponData.validityDuration || "semester",
    validPeriod: couponData.validPeriod || "Academic Year 2026",
    status: couponData.status || "active",
    eligibilityCriteria: couponData.eligibilityCriteria?.trim() || null,
    description: couponData.description?.trim() || null,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };

  MOCK_COUPONS.unshift(newCoupon);
  return {
    success: true,
    message: `Coupon "${newCoupon.code}" created successfully.`,
    coupon: newCoupon,
  };
}

export async function validateCouponRedemption({ code, studentEmail, studentId, requestedUnits, cartSubtotal }) {
  await new Promise((r) => setTimeout(r, 40));
  const coupon = MOCK_COUPONS.find((c) => c.code === code.trim().toUpperCase());
  if (!coupon) {
    const error = new Error(`Coupon "${code}" not found.`);
    error.status = 404;
    throw error;
  }
  const maxUnits = coupon.maxFreeUnits || 1;
  if (requestedUnits > maxUnits) {
    const error = new Error(`Requested free units (${requestedUnits}) exceeds maximum limit of ${maxUnits}.`);
    error.status = 400;
    throw error;
  }
  return {
    success: true,
    couponCode: coupon.code,
    benefitType: coupon.discountType,
    authorizedUnits: requestedUnits,
    maxFreeUnits: maxUnits,
    calculatedDiscount: (coupon.freeProductValue || 1200) * requestedUnits,
    collegeAddress: coupon.collegeAddress || "Address not provided",
  };
}

export async function getAdminReplacements() {
  await new Promise((r) => setTimeout(r, 40));
  const { getStoredReplacements } = await import("./mockOrderApi");
  const stored = getStoredReplacements();

  const sample = [
    {
      id: "mock-repl-sample-1",
      orderId: "mock-order-3",
      orderNumber: "VTX-20261022-38104",
      customer: {
        id: "mock-user-customer-1",
        email: "customer@vertex.local",
        fullName: "Jane Customer",
        companyName: "Alpha Robotics Corp",
      },
      deliveryDate: "2026-10-22T10:00:00.000Z",
      windowDeadline: "2026-10-29T10:00:00.000Z",
      isWithinWindow: true,
      status: "PENDING_REVIEW",
      reason: "Dead on Arrival (DOA) / Component Defect",
      details: "Hex bolts stripped threading upon initial torquing test; requesting precision batch replacement.",
      items: [
        {
          sku: "FAST-HEX-M8-30-P10",
          productName: "Stainless Steel Hex Bolt (M8 x 30mm)",
          quantity: 1,
          reason: "Stripped threading",
        },
      ],
      requestedAt: "2026-10-23T14:20:00.000Z",
      lastReviewedAt: null,
      adminNotes: null,
      reviewedBy: null,
    },
  ];

  const all = [...stored, ...sample.filter((s) => !stored.some((r) => r.orderNumber === s.orderNumber))];

  return {
    success: true,
    count: all.length,
    replacements: all,
  };
}

export async function reviewAdminReplacement(orderIdentifier, { status, adminNotes }) {
  await new Promise((r) => setTimeout(r, 60));
  const { getStoredReplacements, saveStoredReplacements } = await import("./mockOrderApi");
  const replacements = getStoredReplacements();
  const index = replacements.findIndex(
    (r) => r.orderNumber === orderIdentifier || r.id === orderIdentifier
  );

  const updatedRepl = index !== -1 ? replacements[index] : {
    id: `mock-repl-${Date.now()}`,
    orderNumber: orderIdentifier,
  };

  updatedRepl.status = status;
  updatedRepl.adminNotes = adminNotes;
  updatedRepl.lastReviewedAt = new Date().toISOString();
  updatedRepl.reviewedBy = "admin@vertex.local";

  if (index !== -1) {
    replacements[index] = updatedRepl;
  } else {
    replacements.unshift(updatedRepl);
  }
  saveStoredReplacements(replacements);

  return {
    success: true,
    message: `Replacement request for order ${orderIdentifier} updated to ${status}.`,
    orderNumber: orderIdentifier,
    status,
    adminNotes,
    reviewedAt: updatedRepl.lastReviewedAt,
  };
}



