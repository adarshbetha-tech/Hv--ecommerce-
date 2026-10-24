import { z } from "zod";
import { createAddressSchema } from "./address.validator.js";

export const orderParamSchema = z.object({
  id: z.string().trim().min(1, "Order identifier is required."),
});

export const createOrderSchema = z
  .object({
    addressId: z.string().uuid("Invalid address ID format.").optional().nullable(),
    shippingAddress: createAddressSchema.optional().nullable(),
    paymentMethod: z
      .string()
      .trim()
      .max(50)
      .default("COD"),
    paymentId: z
      .string()
      .trim()
      .max(100, "Transaction reference must not exceed 100 characters.")
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must not exceed 500 characters.")
      .optional()
      .nullable(),
    idempotencyKey: z
      .string()
      .trim()
      .max(128, "Idempotency key must not exceed 128 characters.")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => Boolean(data.addressId || data.shippingAddress),
    {
      message: "A delivery address is required. Please provide either a saved addressId or a new shippingAddress.",
      path: ["addressId"],
    }
  );

export const cancelOrderSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(500, "Cancellation reason must not exceed 500 characters.")
      .optional()
      .nullable(),
  })
  .optional()
  .default({});

export const replacementItemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required."),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
  reason: z.string().trim().max(200).optional(),
});

export const createReplacementRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Please select or describe a valid replacement reason (at least 3 characters).")
    .max(250, "Reason must not exceed 250 characters."),
  details: z
    .string()
    .trim()
    .min(5, "Please provide engineering details or damage description (at least 5 characters).")
    .max(1000, "Details must not exceed 1000 characters."),
  items: z
    .array(replacementItemSchema)
    .min(1, "At least one item must be selected for replacement.")
    .optional(),
  unboxingProofConfirmed: z.boolean().optional().default(true),
});

export const reviewReplacementSchema = z.object({
  status: z.enum(["APPROVED_FOR_DISPATCH", "REJECTED", "IN_REVIEW"], {
    errorMap: () => ({ message: "Status must be APPROVED_FOR_DISPATCH, REJECTED, or IN_REVIEW." }),
  }),
  adminNotes: z
    .string()
    .trim()
    .min(2, "Review notes must be at least 2 characters.")
    .max(1000, "Review notes must not exceed 1000 characters."),
});


