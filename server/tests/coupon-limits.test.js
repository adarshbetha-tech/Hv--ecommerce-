import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";

describe("Coupon Validation & Free-Unit Limits Server Engine", () => {
  it("1. GET /api/coupons lists registered coupons with collegeAddress and maxFreeUnits", async () => {
    const res = await request(app).get("/api/coupons").expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.coupons.length >= 4);

    const roboCoupon = res.body.coupons.find((c) => c.code === "VTX-COLLEGE-ROBO");
    assert.ok(roboCoupon, "VTX-COLLEGE-ROBO must be registered");
    assert.equal(roboCoupon.category, "college");
    assert.equal(roboCoupon.discountType, "free_gift");
    assert.equal(roboCoupon.maxFreeUnits, 1);
    assert.ok(roboCoupon.collegeAddress.includes("Mathikere"));

    const aeroCoupon = res.body.coupons.find((c) => c.code === "VTX-IITM-AERO26");
    assert.ok(aeroCoupon, "VTX-IITM-AERO26 must be registered");
    assert.equal(aeroCoupon.maxFreeUnits, 2);
    assert.ok(aeroCoupon.collegeAddress.includes("Chennai"));
  });

  it("2. POST /api/coupons/validate succeeds for valid redemption within free-unit limit", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "arun.kumar@iisc.ac.in",
        studentId: "IISC-ROBO-101",
        requestedUnits: 1,
        cartSubtotal: 2000,
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.couponCode, "VTX-COLLEGE-ROBO");
    assert.equal(res.body.benefitType, "free_gift");
    assert.equal(res.body.authorizedUnits, 1);
    assert.equal(res.body.maxFreeUnits, 1);
    assert.ok(res.body.calculatedDiscount > 0);
    assert.ok(res.body.collegeAddress.length > 0);
  });

  it("3. POST /api/coupons/validate rejects over-limit free units server-side (400)", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "arun.kumar@iisc.ac.in",
        requestedUnits: 2, // Exceeds limit of 1
        cartSubtotal: 2500,
      })
      .expect(400);

    assert.ok(res.body.error);
    assert.equal(res.body.error.code, "FREE_UNIT_LIMIT_EXCEEDED");
    assert.match(res.body.error.message, /exceeds the maximum limit of 1 unit/i);
  });

  it("4. POST /api/coupons/validate rejects zero, negative, and fractional quantities (400)", async () => {
    // Zero
    const resZero = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "arun.kumar@iisc.ac.in",
        requestedUnits: 0,
        cartSubtotal: 2500,
      })
      .expect(400);
    assert.ok(resZero.body.error);

    // Negative
    const resNeg = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "arun.kumar@iisc.ac.in",
        requestedUnits: -1,
        cartSubtotal: 2500,
      })
      .expect(400);
    assert.ok(resNeg.body.error);

    // Fractional
    const resFrac = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "arun.kumar@iisc.ac.in",
        requestedUnits: 1.5,
        cartSubtotal: 2500,
      })
      .expect(400);
    assert.ok(resFrac.body.error);
  });

  it("5. POST /api/coupons/validate rejects institutional domain mismatch (403)", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "student@gmail.com",
        requestedUnits: 1,
        cartSubtotal: 2500,
      })
      .expect(403);

    assert.equal(res.body.error.code, "STUDENT_DOMAIN_MISMATCH");
    assert.match(res.body.error.message, /@iisc\.ac\.in/i);
  });

  it("6. POST /api/coupons/validate rejects subtotal below minimum order value (400)", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({
        code: "VTX-COLLEGE-ROBO",
        studentEmail: "arun.kumar@iisc.ac.in",
        requestedUnits: 1,
        cartSubtotal: 500, // Min order is 1500
      })
      .expect(400);

    assert.equal(res.body.error.code, "MIN_ORDER_NOT_MET");
  });

  it("7. POST /api/coupons creates college coupon with campus address and free-unit limit", async () => {
    const code = `VTX-TEST-BITS-${Date.now()}`;
    const payload = {
      code,
      campaignName: "BITS Pilani Robotics Project",
      category: "college",
      collegeName: "BITS Pilani",
      collegeAddress: "Vidya Vihar, Pilani, Rajasthan 333031",
      recipientName: "Dr. K. Sharma / Mechatronics Lab",
      studentDomain: "@pilani.bits-pilani.ac.in",
      discountType: "free_gift",
      freeProductSku: "ELEC-ARD-UNO-R3",
      freeProductName: "Arduino Uno R3 Microcontroller Board",
      freeProductValue: 1299.0,
      maxFreeUnits: 3,
      minOrder: 1800,
      validPeriod: "Academic Year 2026-2027",
      status: "active",
      eligibilityCriteria: "Verified BITS student ID",
      description: "Departmental project grant",
    };

    const res = await request(app).post("/api/coupons").send(payload).expect(201);

    assert.equal(res.body.success, true);
    assert.equal(res.body.coupon.code, code);
    assert.equal(res.body.coupon.maxFreeUnits, 3);
    assert.equal(res.body.coupon.collegeAddress, "Vidya Vihar, Pilani, Rajasthan 333031");

    // Verify redemption up to 3 units succeeds
    const redeemRes = await request(app)
      .post("/api/coupons/validate")
      .send({
        code,
        studentEmail: "lead@pilani.bits-pilani.ac.in",
        requestedUnits: 3,
        cartSubtotal: 2500,
      })
      .expect(200);

    assert.equal(redeemRes.body.success, true);
    assert.equal(redeemRes.body.authorizedUnits, 3);
    assert.equal(redeemRes.body.collegeAddress, "Vidya Vihar, Pilani, Rajasthan 333031");

    // Requesting 4 units exceeds limit
    await request(app)
      .post("/api/coupons/validate")
      .send({
        code,
        studentEmail: "lead@pilani.bits-pilani.ac.in",
        requestedUnits: 4,
        cartSubtotal: 2500,
      })
      .expect(400);
  });
});
