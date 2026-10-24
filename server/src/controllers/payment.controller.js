import fs from "fs";
import * as paymentConfigService from "../services/paymentConfig.service.js";
import * as orderService from "../services/order.service.js";

/**
 * Controller to fetch public payment configuration for checkout.
 */
export async function getPublicConfig(req, res, next) {
  try {
    const config = await paymentConfigService.getPublicPaymentConfig();
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to generate dynamic transaction-specific UPI QR data URL.
 */
export async function generateUpiQr(req, res, next) {
  try {
    const { amount, orderNumber, notes } = req.body;
    const qrResult = await paymentConfigService.generateDynamicUpiQr({
      amount,
      orderNumber,
      notes,
    });

    return res.status(200).json(qrResult);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to stream stored static QR code image.
 */
export async function getQrImage(req, res, next) {
  try {
    const filePath = await paymentConfigService.getStaticQrImagePath();
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: "QR_NOT_FOUND",
          message: "No static merchant QR code image is currently uploaded.",
        },
      });
    }

    const ext = filePath.endsWith(".png")
      ? "image/png"
      : filePath.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

    res.setHeader("Content-Type", ext);
    res.setHeader("Cache-Control", "public, max-age=300");
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for customer submission of UPI reference (UTR) on a pending order.
 */
export async function submitOrderPaymentReference(req, res, next) {
  try {
    const { id } = req.params;
    const paymentReference = req.body.paymentReference || req.body.reference;
    const userId = req.user.id;

    const updatedOrder = await orderService.submitOrderPaymentReference(
      id,
      paymentReference,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Payment reference submitted successfully. Our finance desk will verify and process your order.",
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for administrators to inspect full payment configuration.
 */
export async function getAdminConfig(req, res, next) {
  try {
    const data = await paymentConfigService.getAdminPaymentConfig();
    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for administrators to update payment configuration and upload QR code image.
 */
export async function updateAdminConfig(req, res, next) {
  try {
    const result = await paymentConfigService.updatePaymentConfig(req.body, req.user);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for administrators to remove uploaded static QR code image.
 */
export async function removeStaticQr(req, res, next) {
  try {
    const result = await paymentConfigService.removeStaticQr(req.user);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
