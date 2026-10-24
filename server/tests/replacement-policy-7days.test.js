import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import {
  createReplacementRequestSchema,
  reviewReplacementSchema,
} from "../src/validators/order.validator.js";
import {
  resolveOrderDeliveryDate,
  requestOrderReplacement,
  getOrderReplacements,
  SEVEN_DAYS_MS,
} from "../src/services/order.service.js";
import {
  listAdminReplacements,
  reviewAdminReplacement,
} from "../src/services/admin.service.js";

describe("7-Day Replacement-Only Customer Policy Test Suite", () => {
  const originalFindFirst = prisma.order.findFirst;
  const originalUpdate = prisma.order.update;
  const originalFindMany = prisma.order.findMany;
  const originalAuditCreate = prisma.auditLog.create;
  const originalAuditFindFirst = prisma.auditLog.findFirst;
  const originalAuditFindMany = prisma.auditLog.findMany;
  const originalTransaction = prisma.$transaction;

  afterEach(() => {
    // Restore mocked prisma methods
    prisma.order.findFirst = originalFindFirst;
    prisma.order.update = originalUpdate;
    prisma.order.findMany = originalFindMany;
    prisma.auditLog.create = originalAuditCreate;
    prisma.auditLog.findFirst = originalAuditFindFirst;
    prisma.auditLog.findMany = originalAuditFindMany;
    prisma.$transaction = originalTransaction;
  });

  describe("1. Validation Schemas & Policy Rules", () => {
    test("accepts valid replacement request within schema limits", () => {
      const parsed = createReplacementRequestSchema.parse({
        reason: "Transit Damage / Broken in Transit",
        details: "Package arrived crushed; Arduino board headers bent and cracked PCB.",
        items: [{ sku: "ELEC-ARD-UNO-R3", quantity: 1 }],
        unboxingProofConfirmed: true,
      });
      assert.strictEqual(parsed.reason, "Transit Damage / Broken in Transit");
      assert.strictEqual(parsed.items.length, 1);
    });

    test("rejects replacement request with reason shorter than 3 chars or details shorter than 5 chars", () => {
      assert.throws(() => {
        createReplacementRequestSchema.parse({
          reason: "no",
          details: "valid details here",
        });
      });

      assert.throws(() => {
        createReplacementRequestSchema.parse({
          reason: "Transit Damage",
          details: "bad",
        });
      });
    });

    test("validates admin review replacement schema statuses", () => {
      const approved = reviewReplacementSchema.parse({
        status: "APPROVED_FOR_DISPATCH",
        adminNotes: "Dispatched replacement unit via BlueDart tracking #BD99120.",
      });
      assert.strictEqual(approved.status, "APPROVED_FOR_DISPATCH");

      const inReview = reviewReplacementSchema.parse({
        status: "IN_REVIEW",
        adminNotes: "Awaiting high-resolution photos of component defect.",
      });
      assert.strictEqual(inReview.status, "IN_REVIEW");

      const rejected = reviewReplacementSchema.parse({
        status: "REJECTED",
        adminNotes: "Component inspected and damage was caused by soldering iron misapplication.",
      });
      assert.strictEqual(rejected.status, "REJECTED");

      // Invalid status
      assert.throws(() => {
        reviewReplacementSchema.parse({
          status: "REFUND_APPROVED", // Must not allow refund in replacement review!
          adminNotes: "Invalid",
        });
      });
    });
  });

  describe("2. Replacement Requests Within the 7-Day Eligibility Window", () => {
    test("successfully creates replacement request when within 7 days of actual delivery", async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockOrder = {
        id: "ord-test-deliv-1",
        orderNumber: "VTX-DELIV-001",
        userId: "user-cust-1",
        orderStatus: "DELIVERED",
        paymentStatus: "PAID",
        notes: `[DeliveredAt: ${threeDaysAgo.toISOString()}]`,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: threeDaysAgo,
        items: [
          {
            id: "item-1",
            sku: "ELEC-ARD-UNO-R3",
            productName: "Arduino Uno R3",
            quantity: 1,
          },
        ],
      };

      const auditCreated = [];
      const txMock = {
        order: {
          findFirst: async () => mockOrder,
          update: async ({ data }) => {
            mockOrder.notes = data.notes;
            return mockOrder;
          },
        },
        auditLog: {
          findFirst: async () => null,
          create: async ({ data }) => {
            const entry = { id: `audit-${Date.now()}`, ...data };
            auditCreated.push(entry);
            return entry;
          },
        },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      const result = await requestOrderReplacement(
        "user-cust-1",
        "VTX-DELIV-001",
        {
          reason: "Dead on Arrival (DOA) / Component Defect",
          details: "Microcontroller board fails to enumerate on USB CDC serial.",
          items: [{ sku: "ELEC-ARD-UNO-R3", quantity: 1 }],
        },
        "customer@vertex.local"
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "PENDING_REVIEW");
      assert.strictEqual(result.orderNumber, "VTX-DELIV-001");
      assert.strictEqual(auditCreated.length, 1);
      assert.strictEqual(auditCreated[0].action, "CUSTOMER_REPLACEMENT_REQUESTED");
      assert.strictEqual(auditCreated[0].metadata.policy, "7_DAY_REPLACEMENT_ONLY");
      assert.strictEqual(mockOrder.paymentStatus, "PAID"); // Financial status preserved!
    });
  });

  describe("3. Replacement Requests After the 7-Day Window (Rejection)", () => {
    test("rejects replacement request when delivery occurred more than 7 days ago", async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const mockOrder = {
        id: "ord-test-expired",
        orderNumber: "VTX-EXPIRED-001",
        userId: "user-cust-1",
        orderStatus: "DELIVERED",
        paymentStatus: "PAID",
        notes: `[DeliveredAt: ${tenDaysAgo.toISOString()}]`,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: tenDaysAgo,
        items: [
          {
            id: "item-1",
            sku: "FAST-HEX-M8-30-P10",
            productName: "Stainless Steel Hex Bolt",
            quantity: 2,
          },
        ],
      };

      const txMock = {
        order: {
          findFirst: async () => mockOrder,
        },
        auditLog: {
          findFirst: async () => null,
        },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await assert.rejects(
        async () => {
          await requestOrderReplacement(
            "user-cust-1",
            "VTX-EXPIRED-001",
            {
              reason: "Transit Damage / Broken in Transit",
              details: "Bolts threading defective upon inspection.",
            },
            "customer@vertex.local"
          );
        },
        (err) => {
          assert.strictEqual(err.code, "REPLACEMENT_WINDOW_EXPIRED");
          assert.strictEqual(err.status, 400);
          assert.match(err.message, /7-day replacement window/i);
          return true;
        }
      );
    });
  });

  describe("4. Missing or Invalid Delivery Dates", () => {
    test("rejects request safely when delivery timestamp cannot be determined", async () => {
      const mockOrder = {
        id: "ord-test-nodate",
        orderNumber: "VTX-NODATE-001",
        userId: "user-cust-1",
        orderStatus: "DELIVERED",
        paymentStatus: "PAID",
        notes: null,
        createdAt: new Date("2026-10-01"),
        updatedAt: null, // No timestamp
        items: [{ id: "i1", sku: "SKU1", productName: "Item", quantity: 1 }],
      };

      const txMock = {
        order: { findFirst: async () => mockOrder },
        auditLog: { findFirst: async () => null },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await assert.rejects(
        async () => {
          await requestOrderReplacement(
            "user-cust-1",
            "VTX-NODATE-001",
            {
              reason: "Defective component",
              details: "Item pin bent.",
            }
          );
        },
        (err) => {
          assert.strictEqual(err.code, "MISSING_DELIVERY_DATE");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    test("rejects delivery date recorded in the future", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockOrder = {
        id: "ord-future",
        orderNumber: "VTX-FUTURE-001",
        userId: "user-cust-1",
        orderStatus: "DELIVERED",
        paymentStatus: "PAID",
        notes: `[DeliveredAt: ${tomorrow.toISOString()}]`,
        updatedAt: tomorrow,
        items: [{ id: "i1", sku: "SKU1", productName: "Item", quantity: 1 }],
      };

      const txMock = {
        order: { findFirst: async () => mockOrder },
        auditLog: { findFirst: async () => null },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await assert.rejects(
        async () => {
          await requestOrderReplacement(
            "user-cust-1",
            "VTX-FUTURE-001",
            {
              reason: "Defective component",
              details: "Item pin bent.",
            }
          );
        },
        (err) => {
          assert.strictEqual(err.code, "INVALID_DELIVERY_DATE");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });
  });

  describe("5. Customer Order Ownership Checks", () => {
    test("rejects customer attempting to request replacement for an order owned by someone else", async () => {
      const mockOrder = {
        id: "ord-diff-user",
        orderNumber: "VTX-DIFF-001",
        userId: "user-cust-OTHER",
        orderStatus: "DELIVERED",
        notes: `[DeliveredAt: ${new Date().toISOString()}]`,
        items: [{ id: "i1", sku: "SKU1", productName: "Item", quantity: 1 }],
      };

      const txMock = {
        order: { findFirst: async () => mockOrder },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await assert.rejects(
        async () => {
          await requestOrderReplacement(
            "user-cust-ATTACKER",
            "VTX-DIFF-001",
            {
              reason: "Defective component",
              details: "Item pin bent.",
            }
          );
        },
        (err) => {
          assert.strictEqual(err.code, "FORBIDDEN");
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });
  });

  describe("6. Ineligible Products and Invalid Order Statuses", () => {
    test("rejects replacement request for order in non-DELIVERED status (e.g. PROCESSING, PENDING, SHIPPED)", async () => {
      const mockOrder = {
        id: "ord-processing",
        orderNumber: "VTX-PROC-001",
        userId: "user-cust-1",
        orderStatus: "PROCESSING",
        items: [{ id: "i1", sku: "SKU1", productName: "Item", quantity: 1 }],
      };

      const txMock = {
        order: { findFirst: async () => mockOrder },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await assert.rejects(
        async () => {
          await requestOrderReplacement(
            "user-cust-1",
            "VTX-PROC-001",
            {
              reason: "DOA Defect",
              details: "Component defective.",
            }
          );
        },
        (err) => {
          assert.strictEqual(err.code, "ORDER_NOT_DELIVERED");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    test("rejects item not present in the order", async () => {
      const mockOrder = {
        id: "ord-deliv",
        orderNumber: "VTX-DELIV-002",
        userId: "user-cust-1",
        orderStatus: "DELIVERED",
        notes: `[DeliveredAt: ${new Date().toISOString()}]`,
        items: [{ id: "i1", sku: "REAL-SKU", productName: "Real Item", quantity: 1 }],
      };

      const txMock = {
        order: { findFirst: async () => mockOrder },
        auditLog: { findFirst: async () => null },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await assert.rejects(
        async () => {
          await requestOrderReplacement(
            "user-cust-1",
            "VTX-DELIV-002",
            {
              reason: "DOA Defect",
              details: "Component defective.",
              items: [{ sku: "FAKE-SKU-999", quantity: 1 }],
            }
          );
        },
        (err) => {
          assert.strictEqual(err.code, "ITEM_NOT_IN_ORDER");
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });
  });

  describe("7. Refund-Request Actions Unavailable in Customer Workflow", () => {
    test("verifies that POST /api/orders/:id/refund does not exist (404)", async () => {
      // Unauthenticated or not found - no customer refund endpoint exists
      const res = await request(app).post("/api/orders/VTX-1001/refund").send({});
      // Route does not exist (404) or is rejected by auth (401)
      assert.ok([404, 401].includes(res.status));
    });

    test("verifies that customer replacement endpoints require authentication (401)", async () => {
      const resPost = await request(app)
        .post("/api/orders/VTX-1001/replacement")
        .send({
          reason: "Transit damage",
          details: "Crushed box",
        });
      assert.strictEqual(resPost.status, 401);

      const resGet = await request(app).get("/api/orders/VTX-1001/replacement");
      assert.strictEqual(resGet.status, 401);
    });
  });

  describe("8. Existing Cancellation and Order History Behavior Remaining Intact", () => {
    test("requesting replacement does not modify orderStatus to CANCELLED or paymentStatus to REFUNDED", async () => {
      const now = new Date();
      const mockOrder = {
        id: "ord-safe",
        orderNumber: "VTX-SAFE-001",
        userId: "user-cust-1",
        orderStatus: "DELIVERED",
        paymentStatus: "PAID",
        paymentMethod: "COD",
        notes: `[DeliveredAt: ${now.toISOString()}]`,
        updatedAt: now,
        items: [{ id: "i1", sku: "SAFE-SKU", productName: "Item", quantity: 1 }],
      };

      let updatedData = null;
      const txMock = {
        order: {
          findFirst: async () => mockOrder,
          update: async ({ data }) => {
            updatedData = data;
            return { ...mockOrder, ...data };
          },
        },
        auditLog: {
          findFirst: async () => null,
          create: async () => ({ id: "audit-1" }),
        },
      };

      prisma.$transaction = async (fn) => fn(txMock);

      await requestOrderReplacement(
        "user-cust-1",
        "VTX-SAFE-001",
        {
          reason: "Physical Dimension / Threading Mismatch",
          details: "M8 bolts received with 1.0mm fine pitch instead of standard 1.25mm.",
        }
      );

      // Verify ONLY notes were updated, orderStatus and paymentStatus remain untouched!
      assert.strictEqual(updatedData.orderStatus, undefined);
      assert.strictEqual(updatedData.paymentStatus, undefined);
      assert.match(updatedData.notes, /Replacement Requested:/);
    });
  });

  describe("9. Admin Permissions and Replacement Review", () => {
    test("admin can list and review replacement requests with audit logging", async () => {
      const mockOrder = {
        id: "ord-adm-1",
        orderNumber: "VTX-ADM-001",
        orderStatus: "DELIVERED",
        notes: "[DeliveredAt: 2026-10-22T00:00:00Z]",
      };

      const mockRequestLog = {
        id: "log-req-1",
        entityId: "ord-adm-1",
        metadata: {
          orderNumber: "VTX-ADM-001",
          status: "PENDING_REVIEW",
          deliveryDate: "2026-10-22T00:00:00Z",
          reason: "Transit Damage",
        },
      };

      prisma.order.findFirst = async () => mockOrder;
      prisma.order.update = async ({ data }) => ({ ...mockOrder, ...data });
      prisma.auditLog.findFirst = async () => mockRequestLog;

      let recordedAudit = null;
      prisma.auditLog.create = async ({ data }) => {
        recordedAudit = data;
        return { id: "log-admin-review-1", createdAt: new Date(), ...data };
      };

      const result = await reviewAdminReplacement(
        "VTX-ADM-001",
        {
          status: "APPROVED_FOR_DISPATCH",
          adminNotes: "Replacement approved. Dispatched via express courier.",
        },
        "admin-user-1",
        "admin@vertex.local"
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "APPROVED_FOR_DISPATCH");
      assert.strictEqual(recordedAudit.action, "ADMIN_REPLACEMENT_STATUS_UPDATE");
      assert.strictEqual(recordedAudit.metadata.newStatus, "APPROVED_FOR_DISPATCH");
      assert.strictEqual(recordedAudit.metadata.actorEmail, "admin@vertex.local");
    });

    test("unauthorized users cannot access /api/admin/replacements (401/403)", async () => {
      const res = await request(app).get("/api/admin/replacements");
      assert.strictEqual(res.status, 401);
    });
  });

  describe("10. Historical Refund and Payment Records Intact", () => {
    test("resolving order delivery date ignores unrelated fields and preserves payment history", async () => {
      const order = {
        orderStatus: "DELIVERED",
        notes: "[DeliveredAt: 2026-10-21T12:00:00.000Z]",
        paymentStatus: "PAID",
        paymentId: "UPI-UTR-991283",
      };

      const deliveryDate = await resolveOrderDeliveryDate(order);
      assert.ok(deliveryDate instanceof Date);
      assert.strictEqual(deliveryDate.toISOString(), "2026-10-21T12:00:00.000Z");

      // Verify payment details untouched
      assert.strictEqual(order.paymentStatus, "PAID");
      assert.strictEqual(order.paymentId, "UPI-UTR-991283");
    });
  });
});
