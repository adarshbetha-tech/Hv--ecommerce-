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

describe("Admin Backend Features: Role Management, Product Specifications & Refund Tracking", () => {
  const timestamp = Date.now();
  const testAdminEmail = `test.admin.feat.${timestamp}@vertex.local`;
  const testCustomerEmail = `test.cust.feat.${timestamp}@vertex.local`;
  const testTargetEmail = `test.target.feat.${timestamp}@vertex.local`;
  const testPassword = "AdminSecurePass123!";

  let adminUser = null;
  let customerUser = null;
  let targetUser = null;
  let adminCookie = "";
  let customerCookie = "";
  let testProductId = "";
  let testOrderId = "";

  before(async () => {
    const passwordHash = await hashPassword(testPassword);

    // 1. Create ADMIN user and active session
    adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "Chief Administrator",
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
        fullName: "Standard Customer",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const customerToken = generateSessionToken();
    const customerTokenHash = hashToken(customerToken);
    await prisma.session.create({
      data: {
        userId: customerUser.id,
        tokenHash: customerTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    customerCookie = `vertex_session=${customerToken}`;

    // 3. Create target user for role updates
    targetUser = await prisma.user.create({
      data: {
        email: testTargetEmail,
        fullName: "Target User",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    // 4. Find an existing product or category to use for specification testing
    const existingProduct = await prisma.product.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true },
    });
    if (existingProduct) {
      testProductId = existingProduct.id;
    }

    // 5. Find an existing order for refund testing
    const existingOrder = await prisma.order.findFirst({
      where: { orderStatus: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } },
      select: { id: true, orderNumber: true, totalAmount: true },
    });
    if (existingOrder) {
      testOrderId = existingOrder.id;
    }
  });

  after(async () => {
    // Clean up created test sessions and users safely
    try {
      if (adminUser) {
        await prisma.auditLog.deleteMany({ where: { actorId: adminUser.id } });
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.user.delete({ where: { id: adminUser.id } });
      }
      if (customerUser) {
        await prisma.session.deleteMany({ where: { userId: customerUser.id } });
        await prisma.user.delete({ where: { id: customerUser.id } });
      }
      if (targetUser) {
        await prisma.user.delete({ where: { id: targetUser.id } });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("1. Admin Users, Roles & Permissions (PATCH /api/admin/users/:id/role)", () => {
    test("rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUser.id}/role`)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ role: "B2B" });

      assert.equal(res.status, 401);
    });

    test("rejects non-admin customer requests with 403", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUser.id}/role`)
        .set("Cookie", customerCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ role: "B2B" });

      assert.equal(res.status, 403);
    });

    test("prevents administrator from demoting self (400)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/role`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ role: "CUSTOMER" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, "SELF_DEMOTION_PROHIBITED");
    });

    test("allows administrator to update user role to B2B and generates AuditLog", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUser.id}/role`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ role: "B2B", isActive: true });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, "B2B");

      // Verify AuditLog record was created
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: "USER_ROLE_UPDATE",
          entityId: targetUser.id,
        },
      });
      assert.ok(auditEntry, "AuditLog record must exist for role update");
      assert.equal(auditEntry.metadata?.newRole, "B2B");
    });
  });

  describe("2. Product Specifications (POST/GET/DELETE /api/admin/products/:id/specification)", () => {
    test("rejects unauthorized specification upload with 401/403", async () => {
      if (!testProductId) return;

      const res = await request(app)
        .post(`/api/admin/products/${testProductId}/specification`)
        .set("Cookie", customerCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          fileName: "test-drawing.pdf",
          fileData: Buffer.from("%PDF-1.4 Mock").toString("base64"),
          fileType: "application/pdf",
        });

      assert.equal(res.status, 403);
    });

    test("uploads, serves, and deletes specification PDF persistently", async () => {
      if (!testProductId) return;

      const mockPdfBase64 = Buffer.from("%PDF-1.4 VERTEX FASTENER DRAWING\nDIN 933 M8-30").toString("base64");

      // 1. Upload
      const uploadRes = await request(app)
        .post(`/api/admin/products/${testProductId}/specification`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          fileName: "DIN933_Hex_Bolt.pdf",
          fileData: mockPdfBase64,
          fileType: "application/pdf",
          fileSize: 42,
        });

      assert.equal(uploadRes.status, 200);
      assert.equal(uploadRes.body.success, true);
      assert.equal(uploadRes.body.specification.fileName, "DIN933_Hex_Bolt.pdf");

      // 2. Stream / Download
      const streamRes = await request(app)
        .get(`/api/products/${testProductId}/specification`);

      assert.equal(streamRes.status, 200);
      assert.ok(streamRes.headers["content-type"].includes("application/pdf"));

      // 3. Delete
      const deleteRes = await request(app)
        .delete(`/api/admin/products/${testProductId}/specification`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest");

      assert.equal(deleteRes.status, 200);
      assert.equal(deleteRes.body.success, true);

      // Verify AuditLog entries
      const uploadAudit = await prisma.auditLog.findFirst({
        where: { action: "PRODUCT_SPECIFICATION_UPLOAD", entityId: testProductId },
      });
      assert.ok(uploadAudit, "Upload audit log must exist");

      const deleteAudit = await prisma.auditLog.findFirst({
        where: { action: "PRODUCT_SPECIFICATION_DELETE", entityId: testProductId },
      });
      assert.ok(deleteAudit, "Delete audit log must exist");
    });
  });

  describe("3. Payment & Refund Tracking (PATCH /api/admin/orders/:id/status)", () => {
    test("records refund payment status and writes ORDER_REFUND_RECORD audit log", async () => {
      if (!testOrderId) return;

      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId}/status`)
        .set("Cookie", adminCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          orderStatus: "PROCESSING",
          paymentStatus: "REFUNDED",
          refundAmount: 500.0,
          notes: "Approved commercial return and credit refund",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.order.paymentStatus, "REFUNDED");

      // Verify AuditLog recorded with ORDER_REFUND_RECORD
      const refundAudit = await prisma.auditLog.findFirst({
        where: {
          action: "ORDER_REFUND_RECORD",
          entityId: testOrderId,
        },
      });
      assert.ok(refundAudit, "ORDER_REFUND_RECORD audit log must exist");
      assert.equal(refundAudit.metadata?.newPaymentStatus, "REFUNDED");
      assert.equal(refundAudit.metadata?.refundAmount, 500);
    });
  });
});
