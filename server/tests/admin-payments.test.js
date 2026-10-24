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

describe("Admin Backend Features: Dedicated Payments & Financial Reconciliation", () => {
  const timestamp = Date.now();
  const testAdminEmail = `test.admin.pay.${timestamp}@vertex.local`;
  const testCustomerEmail = `test.cust.pay.${timestamp}@vertex.local`;
  const testPassword = "AdminSecurePass123!";

  let adminUser = null;
  let customerUser = null;
  let adminCookie = "";
  let customerCookie = "";
  let testOrder = null;

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. Create ADMIN user and session
    adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "Payment Administrator",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    const adminToken = generateSessionToken();
    const adminTokenHash = hashToken(adminToken);
    await prisma.session.create({
      data: {
        userId: adminUser.id,
        tokenHash: adminTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    adminCookie = `vertex_session=${adminToken}`;

    // 2. Create CUSTOMER user and session
    customerUser = await prisma.user.create({
      data: {
        email: testCustomerEmail,
        fullName: "Store Customer",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const custToken = generateSessionToken();
    const custTokenHash = hashToken(custToken);
    await prisma.session.create({
      data: {
        userId: customerUser.id,
        tokenHash: custTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    customerCookie = `vertex_session=${custToken}`;

    // 3. Create a test Order
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `VTX-PAY-TEST-${timestamp}`,
        userId: customerUser.id,
        orderStatus: "PROCESSING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        subtotal: 1000.0,
        taxAmount: 180.0,
        shippingFee: 50.0,
        totalAmount: 1230.0,
        shippingRecipient: "Test Customer",
        shippingPhone: "+91 99999 88888",
        shippingLine1: "123 Industrial Area",
        shippingCity: "Bengaluru",
        shippingState: "Karnataka",
        shippingPostalCode: "560001",
        shippingCountry: "India",
      },
    });
  });

  after(async () => {
    try {
      if (testOrder) {
        await prisma.auditLog.deleteMany({
          where: { entityType: "Order", entityId: testOrder.id },
        });
        await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
      }
      if (adminUser) {
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: adminUser.id } });
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }
      if (customerUser) {
        await prisma.session.deleteMany({ where: { userId: customerUser.id } });
        await prisma.user.delete({ where: { id: customerUser.id } }).catch(() => {});
      }
    } catch {
      // Cleanup fallback
    }
  });

  describe("1. Payments Listing & RBAC Enforcement (GET /api/admin/payments)", () => {
    test("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/admin/payments");
      assert.equal(res.status, 401);
    });

    test("rejects non-admin customer requests with 403", async () => {
      const res = await request(app)
        .get("/api/admin/payments")
        .set("Cookie", customerCookie);
      assert.equal(res.status, 403);
    });

    test("allows admin and returns live summary KPIs, payments, and gateway boundaries", async () => {
      const res = await request(app)
        .get("/api/admin/payments")
        .set("Cookie", adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.summary);
      assert.equal(typeof res.body.summary.totalCount, "number");
      assert.equal(typeof res.body.summary.totalGrossVolume, "number");
      assert.ok(Array.isArray(res.body.payments));
      assert.ok(res.body.gatewayIntegration);
      assert.equal(res.body.gatewayIntegration.isConfigured, false);

      const foundTestOrder = res.body.payments.find((p) => p.id === testOrder.id);
      assert.ok(foundTestOrder, "Created test order must appear in payments list");
      assert.equal(foundTestOrder.paymentStatus, "PENDING");
      assert.equal(foundTestOrder.amount, 1230.0);
    });

    test("supports search and paymentStatus filtering", async () => {
      const res = await request(app)
        .get(`/api/admin/payments?search=${testOrder.orderNumber}&paymentStatus=PENDING`)
        .set("Cookie", adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.payments.length, 1);
      assert.equal(res.body.payments[0].orderNumber, testOrder.orderNumber);
    });
  });

  describe("2. Payment Issue Resolution & Financial Safety (POST /api/admin/payments/:id/reconcile)", () => {
    test("requires explicit administrator confirmation checkbox", async () => {
      const res = await request(app)
        .post(`/api/admin/payments/${testOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "VERIFY_OFFLINE_SETTLEMENT",
          notes: "Received cash at warehouse",
          // confirmed is omitted
        });

      assert.equal(res.status, 400);
    });

    test("records offline settlement, updates paymentStatus to PAID, and writes AuditLog", async () => {
      const res = await request(app)
        .post(`/api/admin/payments/${testOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "VERIFY_OFFLINE_SETTLEMENT",
          notes: "Cash collected upon warehouse delivery receipt",
          settlementReference: "CASH-RCP-9012",
          confirmed: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.order.paymentStatus, "PAID");
      assert.equal(res.body.order.paymentId, "CASH-RCP-9012");

      // Verify audit log entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityType: "Order",
          entityId: testOrder.id,
          action: "PAYMENT_OFFLINE_SETTLEMENT",
        },
      });
      assert.ok(audit, "PAYMENT_OFFLINE_SETTLEMENT audit log must exist");
      assert.equal(audit.actorId, adminUser.id);
      assert.equal(audit.metadata?.newPaymentStatus, "PAID");
    });

    test("prevents duplicate payment settlement when already PAID", async () => {
      const res = await request(app)
        .post(`/api/admin/payments/${testOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "VERIFY_OFFLINE_SETTLEMENT",
          notes: "Attempting duplicate payment marking",
          confirmed: true,
        });

      assert.equal(res.status, 400);
      const errMsg = res.body.error?.message || res.body.message || "";
      assert.match(errMsg, /duplicate.*prohibited/i);
    });

    test("records administrative refund and blocks duplicate refunds", async () => {
      const refundRes = await request(app)
        .post(`/api/admin/payments/${testOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "RECORD_REFUND",
          notes: "Customer returned goods in original packaging",
          refundAmount: 1230.0,
          confirmed: true,
        });

      assert.equal(refundRes.status, 200);
      assert.equal(refundRes.body.order.paymentStatus, "REFUNDED");

      // Attempt duplicate refund
      const dupRes = await request(app)
        .post(`/api/admin/payments/${testOrder.id}/reconcile`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          action: "RECORD_REFUND",
          notes: "Attempting duplicate refund",
          refundAmount: 1230.0,
          confirmed: true,
        });

      assert.equal(dupRes.status, 400);
      const dupErrMsg = dupRes.body.error?.message || dupRes.body.message || "";
      assert.match(dupErrMsg, /duplicate.*refund.*prohibited/i);
    });
  });
});
