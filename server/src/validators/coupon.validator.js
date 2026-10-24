import { z } from "zod";

/**
 * Validates creation of commercial or college educational coupons.
 */
export const createCouponSchema = z
  .object({
    code: z
      .string({ required_error: "Coupon code is required" })
      .trim()
      .min(3, "Coupon code must be at least 3 characters")
      .max(30, "Coupon code cannot exceed 30 characters")
      .regex(/^[A-Z0-9_-]+$/i, "Coupon code can only contain letters, numbers, hyphens, and underscores"),
    campaignName: z
      .string({ required_error: "Campaign name is required" })
      .trim()
      .min(3, "Campaign name must be at least 3 characters")
      .max(120, "Campaign name cannot exceed 120 characters"),
    category: z.enum(["regular", "college"], {
      required_error: "Category must be either 'regular' or 'college'",
    }),
    subType: z.string().trim().optional(),
    collegeName: z.string().trim().max(150).optional().nullable(),
    collegeAddress: z.string().trim().max(300).optional().nullable(),
    recipientName: z.string().trim().max(150).optional().nullable(),
    recipientAddress: z.string().trim().max(300).optional().nullable(),
    collegeId: z.string().trim().max(50).optional().nullable(),
    studentDomain: z.string().trim().max(100).optional().nullable(),
    discountType: z.enum(["percentage", "fixed", "free_gift"], {
      required_error: "Discount type must be percentage, fixed, or free_gift",
    }),
    discountValue: z.number().min(0).max(100000).default(0),
    freeProductSku: z.string().trim().max(100).optional().nullable(),
    freeProductName: z.string().trim().max(200).optional().nullable(),
    freeProductValue: z.number().min(0).optional().nullable(),
    maxFreeUnits: z
      .number({ invalid_type_error: "Maximum free units must be a positive integer" })
      .int("Maximum free units must be an integer")
      .min(1, "Minimum free units must be at least 1")
      .max(10, "Maximum free units cannot exceed 10 per redemption")
      .optional()
      .nullable(),
    minOrder: z.number().min(0).default(0),
    maxDiscount: z.number().min(0).default(0),
    validityDuration: z.string().trim().default("custom"),
    validPeriod: z.string().trim().default("Academic Year 2026"),
    status: z.enum(["active", "scheduled", "expired", "disabled"]).default("active"),
    eligibilityCriteria: z.string().trim().max(300).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.category === "college") {
        return !!data.collegeName && data.collegeName.trim().length > 0;
      }
      return true;
    },
    {
      message: "College / University Name is required for college educational coupons",
      path: ["collegeName"],
    }
  )
  .refine(
    (data) => {
      if (data.discountType === "free_gift") {
        return (
          data.maxFreeUnits !== undefined &&
          data.maxFreeUnits !== null &&
          Number.isInteger(data.maxFreeUnits) &&
          data.maxFreeUnits >= 1 &&
          data.maxFreeUnits <= 10
        );
      }
      return true;
    },
    {
      message: "Maximum Free Units per Redemption is required and must be an integer between 1 and 10",
      path: ["maxFreeUnits"],
    }
  );

/**
 * Validates coupon redemption requests enforcing server-authoritative checks.
 */
export const validateRedemptionSchema = z.object({
  code: z
    .string({ required_error: "Coupon code is required" })
    .trim()
    .min(1, "Coupon code cannot be empty"),
  studentEmail: z.string().trim().email("Invalid email format").optional().nullable(),
  studentId: z.string().trim().max(50).optional().nullable(),
  requestedUnits: z
    .number({ required_error: "Requested units is required", invalid_type_error: "Requested units must be a number" })
    .int("Requested units must be an integer without decimal fraction")
    .min(1, "Requested units must be at least 1")
    .max(10, "Requested units cannot exceed limit of 10"),
  cartSubtotal: z
    .number({ required_error: "Cart subtotal is required" })
    .min(0, "Cart subtotal cannot be negative"),
});
