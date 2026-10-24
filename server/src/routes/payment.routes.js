import { Router } from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { orderParamSchema } from "../validators/order.validator.js";
import {
  generateUpiQrSchema,
  submitPaymentReferenceSchema,
} from "../validators/payment.validator.js";

export const paymentRouter = Router();

/**
 * GET /api/payments/config
 * Retrieves active public payment configuration and instructions for checkout.
 */
paymentRouter.get("/config", paymentController.getPublicConfig);

/**
 * POST /api/payments/upi-qr
 * Generates dynamic transaction-specific UPI payment QR data URL for the checkout total.
 */
paymentRouter.post("/upi-qr", validateBody(generateUpiQrSchema), paymentController.generateUpiQr);

/**
 * GET /api/payments/qr-image
 * Streams stored static merchant QR code image if uploaded.
 */
paymentRouter.get("/qr-image", paymentController.getQrImage);

/**
 * POST /api/payments/orders/:id/reference
 * Customer submits or updates UPI reference (UTR) for their pending order.
 */
paymentRouter.post(
  "/orders/:id/reference",
  authenticateSession,
  validateParams(orderParamSchema),
  validateBody(submitPaymentReferenceSchema),
  paymentController.submitOrderPaymentReference
);
