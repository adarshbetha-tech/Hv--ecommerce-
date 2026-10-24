import { z } from "zod";

/**
 * Validator for administrative payment and UPI configuration updates.
 */
export const updatePaymentConfigSchema = z.object({
  merchantUpiId: z
    .string({ required_error: "Merchant UPI ID (VPA) is required." })
    .trim()
    .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, {
      message: "Invalid UPI VPA format. Must follow standard merchant@bank pattern (e.g. billing.vertex@icici).",
    }),
  merchantName: z
    .string({ required_error: "Merchant display name is required." })
    .trim()
    .min(2, "Merchant display name must be at least 2 characters.")
    .max(100, "Merchant display name cannot exceed 100 characters."),
  upiEnabled: z.boolean().default(true),
  qrMode: z.enum(["DYNAMIC", "STATIC"]).default("DYNAMIC"),
  instructions: z
    .string()
    .trim()
    .max(1000, "Instructions cannot exceed 1000 characters.")
    .optional()
    .nullable(),
  staticQrImage: z
    .object({
      fileName: z.string().trim().max(255),
      fileData: z.string().min(10, "Valid image data URL or base64 is required."),
      fileType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp"], {
        errorMap: () => ({ message: "Only PNG, JPEG, and WebP image formats are permitted for QR codes." }),
      }),
      fileSize: z.number().max(5 * 1024 * 1024, "Image file size cannot exceed 5MB."),
    })
    .optional()
    .nullable(),
});

/**
 * Validator for dynamic UPI QR generation.
 */
export const generateUpiQrSchema = z.object({
  amount: z.coerce
    .number({ required_error: "Amount is required for dynamic QR generation." })
    .min(0.01, "Amount must be at least ₹0.01.")
    .max(10000000, "Amount cannot exceed ₹10,000,000."),
  orderNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(200).optional().nullable(),
});

export const submitPaymentReferenceSchema = z
  .object({
    paymentReference: z
      .string()
      .trim()
      .min(4, "Transaction reference must be at least 4 characters.")
      .max(100, "Transaction reference cannot exceed 100 characters.")
      .optional(),
    reference: z
      .string()
      .trim()
      .min(4, "Transaction reference must be at least 4 characters.")
      .max(100, "Transaction reference cannot exceed 100 characters.")
      .optional(),
  })
  .refine((data) => Boolean(data.paymentReference || data.reference), {
    message: "Payment transaction reference is required.",
    path: ["paymentReference"],
  });

