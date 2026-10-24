import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  hashPassword,
  hashToken,
  generateSessionToken,
} from "../src/utils/crypto.js";

describe("UPI Payment Configuration, Dynamic QR Generation & Discrepancy Reconciliation", () => {
  const timestamp = Date.now();
  const testAdminEmail = `admin.upi.${timestamp}@vertex.local`;
  const testCustomerEmail = `customer.upi.${timestamp}@vertex.local`;
  const testOtherCustomerEmail = `other.upi.${timestamp}@vertex.local`;
  const testPassword = "UpiSecurePass123!";

  let adminUser = null;
  let customerUser = null;
  let otherCustomerUser = null;
  let adminCookie = "";
  let customerCookie = "";
  let otherCustomerCookie = "";
  let testUpiOrder = null;

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. Create ADMIN user and session
    adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "UPI Payment Admin",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    const adminToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: adminUser.id,
        tokenHash: hashToken(adminToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    adminCookie = `vertex_session=${adminToken}`;

    // 2. Create primary CUSTOMER user and session
    customerUser = await prisma.user.create({
      data: {
        email: testCustomerEmail,
        fullName: "Industrial Buyer",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const custToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: customerUser.id,
        tokenHash: hashToken(custToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    customerCookie = `vertex_session=${custToken}`;

    // 3. Create secondary CUSTOMER user for ownership checks
    otherCustomerUser = await prisma.user.create({
      data: {
        email: testOtherCustomerEmail,
        fullName: "Other Buyer",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const otherToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: otherCustomerUser.id,
        tokenHash: hashToken(otherToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    otherCustomerCookie = `vertex_session=${otherToken}`;

    // 4. Create a test UPI Order
    testUpiOrder = await prisma.order.create({
      data: {
        orderNumber: `VTX-ORD-UPI-${timestamp}`,
        userId: customerUser.id,
        orderStatus: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "UPI",
        paymentId: "INITIAL-UTR-12345",
        subtotal: 3500.0,
        taxAmount: 630.0,
        shippingFee: 70.0,
        totalAmount: 4200.0,
        shippingRecipient: "Industrial Buyer",
        shippingPhone: "+91 98765 43210",
        shippingLine1: "Industrial Area Phase 2",
        shippingCity: "Bengaluru",
        shippingState: "Karnataka",
        shippingPostalCode: "560058",
        shippingCountry: "India",
      },
    });
  });

  after(async () => {
    try {
      if (testUpiOrder) {
        await prisma.auditLog.deleteMany({
          where: { entityType: "Order", entityId: testUpiOrder.id },
        });
        await prisma.order.delete({ where: { id: testUpiOrder.id } }).catch(() => {});
      }
      if (adminUser) {
        await prisma.auditLog.deleteMany({ where: { actorId: adminUser.id } });
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }
      if (customerUser) {
        await prisma.session.deleteMany({ where: { userId: customerUser.id } });
        await prisma.user.delete({ where: { id: customerUser.id } }).catch(() => {});
      }
      if (otherCustomerUser) {
        await prisma.session.deleteMany({ where: { userId: otherCustomerUser.id } });
        await prisma.user.delete({ where: { id: otherCustomerUser.id } }).catch(() => {});
      }
    } catch {
      // Cleanup fallback
    }
  });

  describe("1. Public Payment Config & Dynamic QR Generation", () => {
    test("GET /api/payments/config returns public UPI parameters without exposing secrets", async () => {
      const res = await request(app).get("/api/payments/config");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.config);
      assert.equal(typeof res.body.config.merchantUpiId, "string");
      assert.equal(typeof res.body.config.merchantName, "string");
      assert.equal(typeof res.body.config.upiEnabled, "boolean");
      assert.equal(typeof res.body.config.qrMode, "string");
      // Must not leak any server secrets or internal tokens
      assert.equal(res.body.config.secret, undefined);
      assert.equal(res.body.config.privateKey, undefined);
    });

    test("POST /api/payments/upi-qr generates a valid dynamic QR data URL and UPI URI", async () => {
      const res = await request(app)
        .post("/api/payments/upi-qr")
        .send({
          amount: 1450.5,
          orderNumber: "VTX-ORD-TEST-99",
          note: "Order Payment",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.qrDataUrl.startsWith("data:image/png;base64,"));
      assert.ok(res.body.upiUri.startsWith("upi://pay?"));
      assert.ok(res.body.upiUri.includes("am=1450.50"));
      assert.ok(res.body.upiUri.includes("cu=INR"));
      assert.equal(res.body.isDynamic, true);
      assert.equal(res.body.amount, 1450.5);
    });

    test("POST /api/payments/upi-qr rejects invalid or non-positive amount", async () => {
      const res = await request(app)
        .post("/api/payments/upi-qr")
        .send({
          amount: -50,
          orderNumber: "VTX-ORD-INVALID",
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });
  });

  describe("2. Admin UPI & QR Configuration Management", () => {
    test("GET /api/admin/payments/config rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/admin/payments/config");
      assert.equal(res.status, 401);
    });

    test("GET /api/admin/payments/config rejects non-admin customer with 403", async () => {
      const res = await request(app)
        .get("/api/admin/payments/config")
        .set("Cookie", customerCookie);
      assert.equal(res.status, 403);
    });

    test("GET /api/admin/payments/config allows admin and returns configuration", async () => {
      const res = await request(app)
        .get("/api/admin/payments/config")
        .set("Cookie", adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.config);
      assert.ok(res.body.config.merchantUpiId);
    });

    test("PUT /api/admin/payments/config validates UPI VPA format strictly", async () => {
      const res = await request(app)
        .put("/api/admin/payments/config")
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          merchantUpiId: "invalid-vpa-without-at",
          merchantName: "VERTEX Industrial Supplies",
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error);
      const errStr = JSON.stringify(res.body.error);
      assert.match(errStr, /UPI VPA|format/i);
    });

    test("PUT /api/admin/payments/config saves valid configuration and logs in AuditLog", async () => {
      const updatedVpa = "vertex.billing@icici";
      const updatedName = "VERTEX Industrial Solutions Ltd";
      const updatedInstructions = "Pay via UPI and enter the 12-digit UTR reference below.";

      const res = await request(app)
        .put("/api/admin/payments/config")
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          merchantUpiId: updatedVpa,
          merchantName: updatedName,
          upiEnabled: true,
          qrMode: "DYNAMIC",
          instructions: updatedInstructions,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.config.merchantUpiId, updatedVpa);
      assert.equal(res.body.config.merchantName, updatedName);
      assert.equal(res.body.config.instructions, updatedInstructions);

      // Verify AuditLog record in database
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "PAYMENT_CONFIG_UPDATED",
          entityType: "PaymentConfig",
          actorId: adminUser.id,
        },
        orderBy: { createdAt: "desc" },
      });

      assert.ok(audit, "PAYMENT_CONFIG_UPDATED audit log must be recorded");
      assert.equal(audit.metadata?.merchantUpiId, updatedVpa);
    });

    test("DELETE /api/admin/payments/config/qr removes static QR code and returns 200", async () => {
      const res = await request(app)
        .delete("/api/admin/payments/config/qr")
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest");

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.config.hasStaticQr, false);
      assert.equal(res.body.config.qrMode, "DYNAMIC");
    });
  });

  describe("3. Customer Payment Reference Submission & Discrepancy Prevention", () => {
    test("POST /api/payments/orders/:id/reference rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post(`/api/payments/orders/${testUpiOrder.id}/reference`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ reference: "UTR998877665544" });

      assert.equal(res.status, 401);
    });

    test("POST /api/payments/orders/:id/reference rejects unauthorized customer with 403 or 404", async () => {
      const res = await request(app)
        .post(`/api/payments/orders/${testUpiOrder.id}/reference`)
        .set("Cookie", otherCustomerCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ reference: "UTR998877665544" });

      assert.ok(res.status === 403 || res.status === 404);
    });

    test("POST /api/payments/orders/:id/reference allows order owner to submit 12-digit UTR and keeps status PENDING", async () => {
      const newUtr = "UTR123456789012";
      const res = await request(app)
        .post(`/api/payments/orders/${testUpiOrder.id}/reference`)
        .set("Cookie", customerCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ reference: newUtr });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.order.paymentId, newUtr);
      // Critical Security Rule: Never mark an order as PAID solely because customer submitted a reference
      assert.equal(res.body.order.paymentStatus, "PENDING");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityType: "Order",
          entityId: testUpiOrder.id,
          action: "CUSTOMER_PAYMENT_REFERENCE_SUBMITTED",
        },
      });
      assert.ok(audit, "CUSTOMER_PAYMENT_REFERENCE_SUBMITTED audit log must be written");
      assert.equal(audit.metadata?.newPaymentId, newUtr);
    });

    test("Admin can review pending UPI payment with customer UTR in payments ledger", async () => {
      const res = await request(app)
        .get(`/api/admin/payments?paymentMethod=UPI`)
        .set("Cookie", adminCookie);

      assert.equal(res.status, 200);
      const foundOrder = res.body.payments.find((p) => p.id === testUpiOrder.id);
      assert.ok(foundOrder, "Test UPI order must be found in admin payments ledger");
      assert.equal(foundOrder.paymentMethod, "UPI");
      assert.equal(foundOrder.paymentId, "UTR123456789012");
      assert.equal(foundOrder.paymentStatus, "PENDING");
    });

    test("Admin reconciles UPI payment: marks PAID via VERIFY_OFFLINE_SETTLEMENT and blocks duplicate settlement", async () => {
      const reconcileRes = await request(app)
        .post(`/api/admin/payments/${testUpiOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "VERIFY_OFFLINE_SETTLEMENT",
          notes: "Verified against HDFC Bank merchant account statement. UTR matched.",
          settlementReference: "BANK-STMT-TXN-4455",
          confirmed: true,
        });

      assert.equal(reconcileRes.status, 200);
      assert.equal(reconcileRes.body.success, true);
      assert.equal(reconcileRes.body.order.paymentStatus, "PAID");

      // Verify database reflects PAID
      const dbOrder = await prisma.order.findUnique({
        where: { id: testUpiOrder.id },
      });
      assert.equal(dbOrder.paymentStatus, "PAID");

      // Subsequent customer attempt to submit reference on a PAID order is rejected
      const custAttempt = await request(app)
        .post(`/api/payments/orders/${testUpiOrder.id}/reference`)
        .set("Cookie", customerCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ reference: "UTR999999999999" });

      assert.equal(custAttempt.status, 400);
      const custErrMsg = custAttempt.body.error?.message || custAttempt.body.message || "";
      assert.match(custErrMsg, /already.*PAID|cannot update/i);

      // Subsequent duplicate settlement by admin is also rejected
      const dupAdminAttempt = await request(app)
        .post(`/api/admin/payments/${testUpiOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "VERIFY_OFFLINE_SETTLEMENT",
          notes: "Attempting duplicate payment marking",
          confirmed: true,
        });

      assert.equal(dupAdminAttempt.status, 400);
      const dupErrMsg = dupAdminAttempt.body.error?.message || dupAdminAttempt.body.message || "";
      assert.match(dupErrMsg, /duplicate.*prohibited/i);
    });
  });
});
