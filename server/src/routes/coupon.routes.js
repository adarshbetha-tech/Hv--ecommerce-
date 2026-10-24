import { Router } from "express";
import * as couponService from "../services/coupon.service.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createCouponSchema, validateRedemptionSchema } from "../validators/coupon.validator.js";

export const couponRouter = Router();

/**
 * GET /api/coupons
 * Returns registered promotions and college coupons.
 */
couponRouter.get("/", async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const coupons = await couponService.listCoupons({ category, status });
    res.json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/coupons
 * Registers a new regular or college coupon enforcing schema validation.
 */
couponRouter.post("/", validateBody(createCouponSchema), async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json({
      success: true,
      message: `Coupon "${coupon.code}" successfully registered.`,
      coupon,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/coupons/validate
 * Server-authoritative validation & free unit limit verification.
 */
couponRouter.post("/validate", validateBody(validateRedemptionSchema), async (req, res, next) => {
  try {
    const result = await couponService.validateAndCalculateRedemption(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
