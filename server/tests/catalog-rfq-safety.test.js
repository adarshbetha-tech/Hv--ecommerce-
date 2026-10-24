import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { formatProduct, formatVariant } from "../src/utils/catalogSerializer.js";
import { hashPassword, hashToken, generateSessionToken } from "../src/utils/crypto.js";

describe("RFQ Price Serialization & Retail Checkout Safety Test Suite", () => {
  const timestamp = Date.now();
  const testCustomerEmail = `test.rfq.safety.${timestamp}@vertex.local`;
  const testPassword = "CustomerSecurePass123!";

  let testUser = null;
  let sessionCookie = "";
  let testAddressId = "";

  // Test catalog entities
  let testCategoryId = "";
  let testRfqProductId = "";
  let testRfqVariantId = "";
  let testPricedProductId = "";
  let testPricedVariantId = "";

  before(async () => {
    // 1. Create authenticated test customer & session
    const passwordHash = await hashPassword(testPassword);
    testUser = await prisma.user.create({
      data: {
        email: testCustomerEmail,
        fullName: "Safety Test Customer",
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    const token = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: testUser.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    sessionCookie = `vertex_session=${token}`;

    // 2. Create customer shipping address
    const address = await prisma.address.create({
      data: {
        userId: testUser.id,
        recipientName: "Safety Test Customer",
        phone: "9876543210",
        line1: "123 Industrial Estate",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
      },
    });
    testAddressId = address.id;

    // 3. Create test category
    const category = await prisma.category.create({
      data: {
        name: `RFQ Safety Cat ${timestamp}`,
        slug: `rfq-safety-cat-${timestamp}`,
        isActive: true,
      },
    });
    testCategoryId = category.id;

    // 4. Create RFQ Product (price: 0.00 in database)
    const rfqProduct = await prisma.product.create({
      data: {
        name: `RFQ Pure Component ${timestamp}`,
        slug: `rfq-pure-${timestamp}`,
        categoryId: testCategoryId,
        isActive: true,
        variants: {
          create: [
            {
              sku: `TEST-RFQ-SKU-${timestamp}`,
              name: "Commercial Quote Variant",
              price: 0.0,
              mrp: 0.0,
              stockQuantity: 100,
              isActive: true,
            },
          ],
        },
      },
      include: { variants: true },
    });
    testRfqProductId = rfqProduct.id;
    testRfqVariantId = rfqProduct.variants[0].id;

    // 5. Create Priced Product (price: 150.00 in database)
    const pricedProduct = await prisma.product.create({
      data: {
        name: `Priced Component ${timestamp}`,
        slug: `priced-prod-${timestamp}`,
        categoryId: testCategoryId,
        isActive: true,
        variants: {
          create: [
            {
              sku: `TEST-PRICED-SKU-${timestamp}`,
              name: "Standard Pack 10",
              price: 150.0,
              mrp: 180.0,
              stockQuantity: 50,
              isActive: true,
            },
          ],
        },
      },
      include: { variants: true },
    });
    testPricedProductId = pricedProduct.id;
    testPricedVariantId = pricedProduct.variants[0].id;
  });

  after(async () => {
    // Clean up test data safely
    if (testUser) {
      await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.cartItem.deleteMany({ where: { cart: { userId: testUser.id } } }).catch(() => {});
      await prisma.cart.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.address.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }

    if (testRfqProductId || testPricedProductId) {
      await prisma.productVariant.deleteMany({
        where: { id: { in: [testRfqVariantId, testPricedVariantId].filter(Boolean) } },
      }).catch(() => {});
      await prisma.product.deleteMany({
        where: { id: { in: [testRfqProductId, testPricedProductId].filter(Boolean) } },
      }).catch(() => {});
    }

    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe("1. RFQ Price Serialization Contracts (catalogSerializer)", () => {
    test("A database price of 0 serializes as null in formatVariant", () => {
      const variantWithZero = {
        id: "var-zero",
        sku: "TEST-ZERO",
        price: 0,
        mrp: 0,
        stockQuantity: 10,
        isActive: true,
      };
      const formatted = formatVariant(variantWithZero);
      assert.strictEqual(formatted.price, null, "Database price of 0 must serialize as null");
      assert.strictEqual(formatted.mrp, null, "Database MRP of 0 must serialize as null");
    });

    test("A negative or invalid price serializes as null in formatVariant", () => {
      const variantNegative = {
        id: "var-neg",
        sku: "TEST-NEG",
        price: -25.5,
        stockQuantity: 5,
      };
      const formatted = formatVariant(variantNegative);
      assert.strictEqual(formatted.price, null, "Negative price must serialize as null");
    });

    test("A valid positive price is preserved as a number in formatVariant", () => {
      const variantPriced = {
        id: "var-pos",
        sku: "TEST-POS",
        price: "120.50",
        mrp: "150.00",
        stockQuantity: 20,
      };
      const formatted = formatVariant(variantPriced);
      assert.strictEqual(formatted.price, 120.5, "Positive price must serialize as valid float");
      assert.strictEqual(formatted.mrp, 150.0, "Positive MRP must serialize as valid float");
    });

    test("A product with only zero-priced variants has a null minimum price in formatProduct", () => {
      const rfqProduct = {
        id: "prod-rfq",
        name: "Commercial Fastener",
        slug: "commercial-fastener",
        variants: [
          { id: "v1", sku: "V1", price: 0, stockQuantity: 10, isActive: true },
          { id: "v2", sku: "V2", price: 0.0, stockQuantity: 20, isActive: true },
        ],
      };
      const formatted = formatProduct(rfqProduct);
      assert.strictEqual(formatted.price, null, "Product with only RFQ variants must have price: null");
      assert.strictEqual(formatted.mrp, null, "Product with only RFQ variants must have mrp: null");
    });

    test("A product with mixed variants derives minimum price strictly from positive variants", () => {
      const mixedProduct = {
        id: "prod-mixed",
        name: "Hybrid Product",
        slug: "hybrid-product",
        variants: [
          { id: "v1", sku: "V1", price: 0, stockQuantity: 10, isActive: true }, // RFQ variant
          { id: "v2", sku: "V2", price: 299.0, mrp: 350.0, stockQuantity: 5, isActive: true }, // Priced
          { id: "v3", sku: "V3", price: 199.0, mrp: 250.0, stockQuantity: 15, isActive: true }, // Lowest priced
        ],
      };
      const formatted = formatProduct(mixedProduct);
      assert.strictEqual(formatted.price, 199.0, "Base price must be minimum of positive variants");
      assert.strictEqual(formatted.mrp, 250.0, "Corresponding MRP must match lowest priced variant");
    });
  });

  describe("2. Retail Cart Protection Against RFQ / Zero-Priced Products", () => {
    test("POST /api/cart/items rejects zero-priced RFQ variant with 400 RFQ_ONLY_PRODUCT", async () => {
      const res = await request(app)
        .post("/api/cart/items")
        .set("Cookie", sessionCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          variantId: testRfqVariantId,
          quantity: 1,
        });

      assert.strictEqual(res.status, 400, "Must return HTTP 400 for RFQ products");
      assert.strictEqual(res.body.error?.code, "RFQ_ONLY_PRODUCT", "Error code must be RFQ_ONLY_PRODUCT");
    });

    test("POST /api/cart/items successfully adds legitimate positively priced variant", async () => {
      const res = await request(app)
        .post("/api/cart/items")
        .set("Cookie", sessionCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          variantId: testPricedVariantId,
          quantity: 2,
        });

      assert.strictEqual(res.status, 200, "Priced product must be added successfully");
      assert.strictEqual(res.body.cart.items.length, 1);
      assert.strictEqual(res.body.cart.items[0].variant.sku, `TEST-PRICED-SKU-${timestamp}`);
    });
  });

  describe("3. Order Placement Guard: Server-Side Revalidation Against RFQ / ₹0 Checkout", () => {
    test("POST /api/orders rejects order if cart contains an RFQ / zero-priced variant", async () => {
      // Find or create test customer's cart
      let cart = await prisma.cart.findUnique({
        where: { userId: testUser.id },
      });
      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId: testUser.id },
        });
      }

      // Directly insert an RFQ item into the user's cart (simulating pre-existing or tampered cart)
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: testRfqVariantId,
          quantity: 1,
        },
      });

      // Attempt order checkout
      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", sessionCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          addressId: testAddressId,
        });

      assert.strictEqual(res.status, 400, "Checkout must reject order containing RFQ items");
      assert.strictEqual(res.body.error?.code, "RFQ_ONLY_PRODUCT", "Must return RFQ_ONLY_PRODUCT code");

      // Verify no order was created
      const orders = await prisma.order.findMany({
        where: { userId: testUser.id },
      });
      assert.strictEqual(orders.length, 0, "Zero orders must be placed with RFQ items");

      // Clean up the invalid cart item so cart contains only legitimate items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, variantId: testRfqVariantId },
      });
    });

    test("POST /api/orders succeeds for legitimate positively priced items", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", sessionCookie)
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          addressId: testAddressId,
        });

      assert.strictEqual(res.status, 201, "Order placement must succeed for priced products");
      assert.strictEqual(res.body.order.orderStatus, "PENDING");
      assert.strictEqual(Number(res.body.order.subtotal), 300.0); // 2 units * ₹150.00
      assert.strictEqual(res.body.order.items.length, 1);
    });
  });

  describe("4. Nyloc Nut Slug & Tiered Pricing Integrity", () => {
    test("Existing Nyloc Nut record retains slug 'nyloc-nut-m8', price ₹120, and tiered pricing", async () => {
      const nyloc = await prisma.product.findUnique({
        where: { slug: "nyloc-nut-m8" },
        include: {
          variants: {
            include: { tieredPrices: true },
          },
        },
      });

      assert.ok(nyloc, "Product with slug 'nyloc-nut-m8' must exist");
      const variant = nyloc.variants.find((v) => v.sku === "NUTS-NYL-M8-P20");
      assert.ok(variant, "Variant NUTS-NYL-M8-P20 must exist");
      assert.strictEqual(Number(variant.price), 120.0, "Authentic price of ₹120.00 must be preserved");
      assert.ok(variant.tieredPrices.length >= 3, "All 3 tiered pricing rows must remain intact");
    });
  });
});
