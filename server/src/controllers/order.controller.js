import * as orderService from "../services/order.service.js";

export async function createOrder(req, res, next) {
  try {
    const idempotencyKey =
      req.body.idempotencyKey ||
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      null;

    const order = await orderService.createOrder(req.user.id, {
      ...req.body,
      idempotencyKey,
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const orders = await orderService.listUserOrders(req.user.id);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await orderService.getUserOrderById(req.user.id, req.params.id);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelUserOrder(
      req.user.id,
      req.params.id,
      req.body || {},
      req.user.email
    );
    res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order,
    });
  } catch (err) {
    next(err);
  }
}

export async function requestReplacement(req, res, next) {
  try {
    const result = await orderService.requestOrderReplacement(
      req.user.id,
      req.params.id,
      req.body,
      req.user.email
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOrderReplacements(req, res, next) {
  try {
    const result = await orderService.getOrderReplacements(
      req.user.id,
      req.params.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

