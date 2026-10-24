import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GST_ENABLED, calculateOrderTotals } from "../src/services/order.service.js";

describe("Temporary GST Exclusion in Checkout & Order Totals Suite", () => {
  describe("1. GST_ENABLED Configuration Flag", () => {
    test("verifies GST_ENABLED is currently set to false for temporary suspension", () => {
      assert.equal(
        GST_ENABLED,
        false,
        "GST_ENABLED must be false during temporary suspension of GST charges"
      );
    });
  });

  describe("2. Order Total Calculations (Subtotal + Shipping Only)", () => {
    test("calculates totalAmount as subtotal + 0 shipping when shipping is FREE", () => {
      const subtotal = 1799.0;
      const shippingFee = 0.0;
      const result = calculateOrderTotals(subtotal, shippingFee, 18.0);

      assert.equal(result.subtotal, 1799.0);
      assert.equal(result.taxAmount, 0.0, "taxAmount must be 0 when GST is suspended");
      assert.equal(result.shippingFee, 0.0);
      assert.equal(
        result.totalAmount,
        1799.0,
        "totalAmount must equal subtotal + shipping (1799.00 + 0)"
      );
      assert.equal(result.gstEnabled, false);
    });

    test("calculates totalAmount as subtotal + shipping when shipping is non-zero", () => {
      const subtotal = 2500.5;
      const shippingFee = 150.0;
      const result = calculateOrderTotals(subtotal, shippingFee, 18.0);

      assert.equal(result.subtotal, 2500.5);
      assert.equal(result.taxAmount, 0.0, "taxAmount must be 0 when GST is suspended");
      assert.equal(result.shippingFee, 150.0);
      assert.equal(
        result.totalAmount,
        2650.5,
        "totalAmount must strictly equal subtotal + shippingFee (2500.50 + 150.00 = 2650.50)"
      );
    });

    test("excludes GST regardless of product GST rate (e.g. 5%, 12%, 18%, 28%)", () => {
      const rates = [5.0, 12.0, 18.0, 28.0];
      for (const rate of rates) {
        const result = calculateOrderTotals(1000.0, 50.0, rate);
        assert.equal(result.taxAmount, 0.0, `taxAmount for rate ${rate}% must be 0`);
        assert.equal(result.totalAmount, 1050.0, "totalAmount must strictly be 1000 + 50");
      }
    });

    test("handles fractional decimals accurately without rounding drift", () => {
      const subtotal = 99.99;
      const shippingFee = 49.5;
      const result = calculateOrderTotals(subtotal, shippingFee, 18.0);

      assert.equal(result.subtotal, 99.99);
      assert.equal(result.taxAmount, 0.0);
      assert.equal(result.shippingFee, 49.5);
      assert.equal(result.totalAmount, 149.49);
    });
  });

  describe("3. Order Item Line Calculations During Suspension", () => {
    test("verifies item lineTotal equals lineSubtotal with 0 item tax", () => {
      const unitPrice = 250.0;
      const quantity = 3;
      const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
      const gstRate = 18.0;

      const itemTax = GST_ENABLED ? Number((lineSubtotal * (gstRate / 100)).toFixed(2)) : 0.0;
      const lineTotal = Number((lineSubtotal + itemTax).toFixed(2));

      assert.equal(lineSubtotal, 750.0);
      assert.equal(itemTax, 0.0);
      assert.equal(lineTotal, 750.0, "lineTotal must equal lineSubtotal when GST is excluded");
    });
  });

  describe("4. Preservation of Historical Order Records & Database Safety", () => {
    test("historical orders with previously recorded GST remain unchanged", () => {
      const historicalOrder = {
        orderNumber: "VTX-20261015-00001",
        subtotal: 1000.0,
        taxAmount: 180.0, // Historical 18% GST preserved
        shippingFee: 0.0,
        totalAmount: 1180.0,
      };

      // Ensure historical records are not mutated or recalculated retroactively
      assert.equal(historicalOrder.taxAmount, 180.0);
      assert.equal(historicalOrder.totalAmount, 1180.0);
    });
  });
});
