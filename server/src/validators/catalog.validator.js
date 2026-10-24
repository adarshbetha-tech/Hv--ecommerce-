import { z } from "zod";

export const ALLOWED_SORT_OPTIONS = [
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "newest",
];

export const listProductsQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, "Search query cannot exceed 100 characters")
      .optional(),
    category: z
      .string()
      .trim()
      .max(100, "Category filter cannot exceed 100 characters")
      .optional(),
    subcat: z
      .string()
      .trim()
      .max(100, "Subcategory filter cannot exceed 100 characters")
      .optional(),
    subcategory: z
      .string()
      .trim()
      .max(100, "Subcategory filter cannot exceed 100 characters")
      .optional(),
    brand: z
      .string()
      .trim()
      .max(100, "Brand filter cannot exceed 100 characters")
      .optional(),
    minPrice: z
      .coerce
      .number({ invalid_type_error: "minPrice must be a valid number" })
      .min(0, "minPrice cannot be negative")
      .optional(),
    maxPrice: z
      .coerce
      .number({ invalid_type_error: "maxPrice must be a valid number" })
      .min(0, "maxPrice cannot be negative")
      .optional(),
    inStockOnly: z
      .preprocess(
        (val) => val === true || val === "true" || val === "1" || val === 1,
        z.boolean()
      )
      .optional(),
    sort: z
      .enum(["price_asc", "price_desc", "name_asc", "name_desc", "newest"], {
        errorMap: () => ({
          message:
            "Invalid sort option. Allowed values: price_asc, price_desc, name_asc, name_desc, newest",
        }),
      })
      .default("newest"),
    page: z
      .coerce
      .number({ invalid_type_error: "page must be a valid number" })
      .int("page must be an integer")
      .min(1, "page must be at least 1")
      .default(1),
    limit: z
      .coerce
      .number({ invalid_type_error: "limit must be a valid number" })
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .max(50, "limit cannot exceed 50 items per page")
      .default(12),
  })
  .refine(
    (data) => {
      if (
        data.minPrice !== undefined &&
        data.maxPrice !== undefined &&
        data.maxPrice < data.minPrice
      ) {
        return false;
      }
      return true;
    },
    {
      message: "maxPrice must be greater than or equal to minPrice",
      path: ["maxPrice"],
    }
  );

export const productParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Product slug or identifier is required")
    .max(120, "Slug is too long")
    .regex(/^[a-zA-Z0-9-_]+$/, "Invalid product slug or ID format"),
});

export const categoryParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Category slug is required")
    .max(120, "Category slug is too long")
    .regex(/^[a-zA-Z0-9-_]+$/, "Invalid category slug format"),
});
