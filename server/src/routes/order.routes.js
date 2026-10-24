import { Router } from "express";
import * as orderController from "../controllers/order.controller.js";
import { authenticateSession } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import {
  createOrderSchema,
  orderParamSchema,
  cancelOrderSchema,
  createReplacementRequestSchema,
} from "../validators/order.validator.js";

export const orderRouter = Router();

// All order endpoints require user authentication & CSRF validation on state changes
orderRouter.use(authenticateSession);

/**
 * GET /api/orders
 * Lists all orders placed by the current user.
 */
orderRouter.get("/", orderController.listOrders);

/**
 * GET /api/orders/:id
 * Retrieves a single order by ID or orderNumber, enforcing ownership.
 */
orderRouter.get("/:id", validateParams(orderParamSchema), orderController.getOrder);

/**
 * GET /api/orders/:id/replacement
 * Retrieves replacement requests and 7-day eligibility for an order.
 */
orderRouter.get(
  "/:id/replacement",
  validateParams(orderParamSchema),
  orderController.getOrderReplacements
);

/**
 * POST /api/orders
 * Places a new order from the user's cart using server-authoritative totals and atomic stock decrements.
 */
orderRouter.post("/", validateBody(createOrderSchema), orderController.createOrder);

/**
 * POST /api/orders/:id/cancel
 * Cancels an order owned by the authenticated customer if in an eligible state, restoring inventory atomically.
 */
orderRouter.post(
  "/:id/cancel",
  validateParams(orderParamSchema),
  validateBody(cancelOrderSchema),
  orderController.cancelOrder
);

/**
 * POST /api/orders/:id/replacement
 * Submits a 7-day replacement request for a delivered order.
 */
orderRouter.post(
  "/:id/replacement",
  validateParams(orderParamSchema),
  validateBody(createReplacementRequestSchema),
  orderController.requestReplacement
);

