import { z } from "zod";

/**
 * Validator for creating a category via Admin API.
 */
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required" })
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters"),
  slug: z
    .string({ required_error: "Category slug is required" })
    .trim()
    .min(1, "Category slug cannot be empty")
    .max(120, "Category slug cannot exceed 120 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug must only contain letters, numbers, hyphens, and underscores"),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  icon: z
    .string()
    .trim()
    .max(50, "Icon identifier cannot exceed 50 characters")
    .optional()
    .nullable(),
  tint: z
    .string()
    .trim()
    .max(50, "Tint identifier cannot exceed 50 characters")
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL cannot exceed 500 characters")
    .optional()
    .nullable(),
  parentId: z
    .string()
    .trim()
    .uuid("Parent category ID must be a valid UUID")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

/**
 * Parameter validator for admin category routes.
 */
export const adminCategoryParamSchema = z.object({
  id: z
    .string({ required_error: "Category ID is required" })
    .trim()
    .min(1, "Category ID cannot be empty"),
});

/**
 * Validator for updating an existing category via Admin API.
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Category slug cannot be empty")
    .max(120, "Category slug cannot exceed 120 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug must only contain letters, numbers, hyphens, and underscores")
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  icon: z
    .string()
    .trim()
    .max(50, "Icon identifier cannot exceed 50 characters")
    .optional()
    .nullable(),
  tint: z
    .string()
    .trim()
    .max(50, "Tint identifier cannot exceed 50 characters")
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL cannot exceed 500 characters")
    .optional()
    .nullable(),
  parentId: z
    .string()
    .trim()
    .uuid("Parent category ID must be a valid UUID")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  isActive: z.boolean().optional(),
});

/**
 * Validator for creating a product with its initial variant via Admin API.
 */
export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .trim()
    .min(1, "Product name cannot be empty")
    .max(200, "Product name cannot exceed 200 characters"),
  slug: z
    .string({ required_error: "Product slug is required" })
    .trim()
    .min(1, "Product slug cannot be empty")
    .max(120, "Product slug cannot exceed 120 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug must only contain letters, numbers, hyphens, and underscores"),
  categoryId: z
    .string({ required_error: "Category ID is required" })
    .trim()
    .min(1, "Category ID is required"),
  brand: z
    .string()
    .trim()
    .max(100, "Brand cannot exceed 100 characters")
    .optional()
    .nullable(),
  hsnCode: z
    .string()
    .trim()
    .max(20, "HSN code cannot exceed 20 characters")
    .optional()
    .nullable(),
  gstRate: z
    .coerce
    .number({ invalid_type_error: "GST rate must be a number" })
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .default(18.0),
  tag: z
    .string()
    .trim()
    .max(50, "Tag cannot exceed 50 characters")
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL cannot exceed 500 characters")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional()
    .nullable(),
  // Initial Variant Fields
  sku: z
    .string({ required_error: "Variant SKU is required" })
    .trim()
    .min(1, "Variant SKU cannot be empty")
    .max(100, "Variant SKU cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "SKU must only contain alphanumeric characters, hyphens, and underscores"),
  partNumber: z
    .string()
    .trim()
    .max(100, "Part number cannot exceed 100 characters")
    .optional()
    .nullable(),
  variantName: z
    .string()
    .trim()
    .max(150, "Variant name cannot exceed 150 characters")
    .optional()
    .nullable(),
  packSize: z
    .string()
    .trim()
    .max(50, "Pack size cannot exceed 50 characters")
    .optional()
    .nullable(),
  dimensions: z
    .string()
    .trim()
    .max(100, "Dimensions cannot exceed 100 characters")
    .optional()
    .nullable(),
  price: z
    .coerce
    .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
  mrp: z
    .coerce
    .number({ invalid_type_error: "MRP must be a number" })
    .min(0, "MRP cannot be negative")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  stockQuantity: z
    .coerce
    .number({ invalid_type_error: "Stock quantity must be an integer" })
    .int("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative")
    .default(0),
});

/**
 * Validator for admin product route parameter.
 */
export const adminProductParamSchema = z.object({
  id: z
    .string({ required_error: "Product ID is required" })
    .trim()
    .min(1, "Product ID is required"),
});

/**
 * Validator for updating a product and its category assignment via Admin API.
 */
export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name cannot be empty")
    .max(200, "Product name cannot exceed 200 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Product slug cannot be empty")
    .max(120, "Product slug cannot exceed 120 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug must only contain letters, numbers, hyphens, and underscores")
    .optional(),
  categoryId: z
    .string()
    .trim()
    .min(1, "Category ID cannot be empty")
    .optional(),
  brand: z
    .string()
    .trim()
    .max(100, "Brand cannot exceed 100 characters")
    .optional()
    .nullable(),
  hsnCode: z
    .string()
    .trim()
    .max(20, "HSN code cannot exceed 20 characters")
    .optional()
    .nullable(),
  gstRate: z
    .coerce
    .number({ invalid_type_error: "GST rate must be a number" })
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .optional(),
  tag: z
    .string()
    .trim()
    .max(50, "Tag cannot exceed 50 characters")
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL cannot exceed 500 characters")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional()
    .nullable(),
  isActive: z
    .boolean()
    .optional(),
});

/**
 * Validator for variant route parameter.
 */
export const variantParamSchema = z.object({
  id: z
    .string({ required_error: "Variant ID is required" })
    .trim()
    .min(1, "Variant ID is required"),
});

/**
 * Validator for variant stock update body.
 */
export const updateVariantStockSchema = z.object({
  stockQuantity: z
    .coerce
    .number({ required_error: "Stock quantity is required", invalid_type_error: "Stock quantity must be an integer" })
    .int("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative"),
  reason: z
    .string({ required_error: "Adjustment reason is required" })
    .trim()
    .min(1, "Adjustment reason cannot be empty")
    .max(500, "Adjustment reason cannot exceed 500 characters"),
});

/**
 * Validator for admin orders query parameters.
 */
export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional()
    .or(z.literal("")),
  paymentStatus: z
    .enum(["PENDING", "PAID", "FAILED", "REFUNDED"])
    .optional()
    .or(z.literal("")),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  q: z.string().trim().max(100).optional().or(z.literal("")),
  sort: z.enum(["newest", "oldest", "total_desc", "total_asc"]).default("newest"),
});

/**
 * Validator for order route parameter (supports UUID or orderNumber string).
 */
export const adminOrderParamSchema = z.object({
  id: z
    .string({ required_error: "Order identifier is required" })
    .trim()
    .min(1, "Order identifier is required"),
});

/**
 * Validator for updating order fulfillment status.
 */
export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(
    ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
    { required_error: "Order status is required" }
  ),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  refundAmount: z.coerce.number().min(0).optional(),
  carrier: z.string().trim().max(100).optional().nullable(),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Validator for admin customers query parameters.
 */
export const adminCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  q: z.string().trim().max(100).optional().or(z.literal("")),
  role: z.enum(["CUSTOMER", "B2B", "all"]).optional().or(z.literal("")),
  status: z.enum(["active", "suspended", "all"]).optional().or(z.literal("")),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc"]).default("newest"),
});

/**
 * Validator for admin audit logs query parameters.
 */
export const adminAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().max(100).optional().or(z.literal("")),
  entityType: z.string().trim().max(100).optional().or(z.literal("")),
  actorId: z.string().trim().max(100).optional().or(z.literal("")),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  q: z.string().trim().max(100).optional().or(z.literal("")),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

/**
 * Validator for single customer route parameter.
 */
export const adminCustomerParamSchema = z.object({
  id: z
    .string({ required_error: "Customer identifier is required" })
    .trim()
    .min(1, "Customer identifier is required"),
});

/**
 * Validator for admin customer details query parameters (nested orders pagination).
 */
export const adminCustomerDetailsQuerySchema = z.object({
  ordersPage: z.coerce.number().int().min(1).default(1),
  ordersLimit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Validator for updating a product or variant selling price via Admin API.
 * Enforces positive numeric selling price, rejects negative/malformed prices.
 */
export const updateProductPriceSchema = z.object({
  price: z.coerce
    .number({
      required_error: "Selling price is required",
      invalid_type_error: "Selling price must be a valid number",
    })
    .min(0.01, "Selling price must be greater than zero")
    .max(10000000, "Selling price exceeds maximum allowable limit"),
  variantId: z
    .string()
    .trim()
    .uuid("Variant ID must be a valid UUID")
    .optional(),
});

/**
 * Validator for updating user role and account status via Admin API.
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "B2B", "ADMIN"], {
    required_error: "System role is required",
  }),
  isActive: z.boolean().optional(),
});

/**
 * Validator for uploading specification documents via Admin API.
 */
export const uploadSpecificationSchema = z.object({
  fileName: z
    .string({ required_error: "File name is required" })
    .trim()
    .min(1, "File name cannot be empty")
    .regex(/\.(pdf|xlsx|xls|csv)$/i, "Allowed formats: .pdf, .xlsx, .xls, .csv"),
  fileData: z
    .string({ required_error: "File data (base64) is required" })
    .min(1, "File data cannot be empty"),
  fileType: z.string().optional().default("application/pdf"),
  fileSize: z.coerce.number().max(10485760, "File size cannot exceed 10 MB").optional(),
});

/**
 * Validator for admin payments query parameters.
 */
export const adminPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  paymentStatus: z
    .enum(["PENDING", "PAID", "FAILED", "REFUNDED", "all"])
    .optional()
    .or(z.literal("")),
  paymentMethod: z.string().trim().max(50).optional().or(z.literal("")),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  q: z.string().trim().max(100).optional().or(z.literal("")),
  dateRange: z.enum(["all", "today", "week", "month"]).optional().default("all"),
  sort: z.enum(["newest", "oldest", "amount_desc", "amount_asc"]).default("newest"),
});

/**
 * Validator for payment / order route parameter.
 */
export const reconcilePaymentParamSchema = z.object({
  id: z
    .string({ required_error: "Payment identifier is required" })
    .trim()
    .min(1, "Payment identifier is required"),
});

/**
 * Validator for safe payment issue resolution and reconciliation.
 */
export const reconcilePaymentSchema = z.object({
  action: z.enum(
    ["VERIFY_OFFLINE_SETTLEMENT", "RETRY_RECONCILIATION", "FLAG_UNRESOLVED", "RECORD_REFUND"],
    { required_error: "Reconciliation action is required" }
  ),
  notes: z
    .string({ required_error: "Resolution notes are required" })
    .trim()
    .min(3, "Notes must be at least 3 characters")
    .max(1000, "Notes cannot exceed 1000 characters"),
  settlementReference: z.string().trim().max(100).optional().nullable(),
  refundAmount: z.coerce.number().min(0).optional(),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: "You must explicitly confirm this financial resolution action" }),
  }),
});



