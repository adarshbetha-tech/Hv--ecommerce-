import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";

describe("Phase 4 Catalog, Categories & Products Test Suite", () => {
  const timestamp = Date.now();
  const inactiveProductSlug = `test-inactive-product-${timestamp}`;
  const testCategorySlug = `test-cat-${timestamp}`;
  let inactiveProductId = "";
  let partialInactiveProductId = "";
  const partialInactiveSlug = `test-partial-inactive-${timestamp}`;

  before(async () => {
    // 1. Create a test category
    const testCategory = await prisma.category.create({
      data: {
        name: `Test Category ${timestamp}`,
        slug: testCategorySlug,
        description: "Temporary category for testing",
        isActive: true,
      },
    });

    // 2. Create an inactive product to test exclusion
    const inactiveProd = await prisma.product.create({
      data: {
        name: `Inactive Product ${timestamp}`,
        slug: inactiveProductSlug,
        description: "Should never be returned publicly",
        categoryId: testCategory.id,
        isActive: false,
        variants: {
          create: [
            {
              sku: `TEST-INACTIVE-SKU-${timestamp}`,
              price: 199.0,
              stockQuantity: 10,
              isActive: false,
            },
          ],
        },
      },
    });
    inactiveProductId = inactiveProd.id;

    // 3. Create an active product with 1 active variant and 1 inactive variant
    const partialProd = await prisma.product.create({
      data: {
        name: `ZZZ Partial Active Product ${timestamp}`,
        slug: partialInactiveSlug,
        description: "Has one active variant and one inactive variant",
        categoryId: testCategory.id,
        isActive: true,
        variants: {
          create: [
            {
              sku: `TEST-ACTIVE-VAR-${timestamp}`,
              name: "Active Variant",
              price: 350.0,
              stockQuantity: 15,
              isActive: true,
            },
            {
              sku: `TEST-INACTIVE-VAR-${timestamp}`,
              name: "Secret Inactive Variant",
              price: 999.0,
              stockQuantity: 0,
              isActive: false,
            },
          ],
        },
      },
    });
    partialInactiveProductId = partialProd.id;
  });

  after(async () => {
    // Clean up created test catalog entities
    if (inactiveProductId || partialInactiveProductId) {
      await prisma.product.deleteMany({
        where: {
          id: { in: [inactiveProductId, partialInactiveProductId].filter(Boolean) },
        },
      }).catch(() => {});
    }

    await prisma.category.deleteMany({
      where: { slug: testCategorySlug },
    }).catch(() => {});

    await prisma.$disconnect();
  });

  // 1. Categories listing
  test("1. GET /api/categories lists active categories", async () => {
    const res = await request(app).get("/api/categories");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.categories));
    assert.ok(res.body.categories.length >= 3);

    // Verify expected seeded categories exist
    const slugs = res.body.categories.map((c) => c.slug);
    assert.ok(slugs.includes("electronics"));
    assert.ok(slugs.includes("fasteners"));
    assert.ok(slugs.includes("nuts"));
  });

  // 2. Category by slug
  test("2. GET /api/categories/:slug returns category details and active products", async () => {
    const res = await request(app).get("/api/categories/electronics");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.category.slug, "electronics");
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.length >= 4);

    // Ensure all returned products belong to this category
    for (const prod of res.body.products) {
      assert.equal(prod.category.slug, "electronics");
    }
  });

  test("3. GET /api/categories/:slug returns 404 for missing category", async () => {
    const res = await request(app).get("/api/categories/non-existent-category-slug");

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "CATEGORY_NOT_FOUND");
  });

  // 4. Products listing & Pagination
  test("4. GET /api/products returns paginated products with metadata", async () => {
    const res = await request(app).get("/api/products?page=1&limit=2");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.products.length, 2);
    assert.equal(res.body.pagination.page, 1);
    assert.equal(res.body.pagination.limit, 2);
    assert.ok(res.body.pagination.totalItems >= 6);
    assert.ok(res.body.pagination.totalPages >= 3);
    assert.equal(res.body.pagination.hasNextPage, true);
    assert.equal(res.body.pagination.hasPrevPage, false);
  });

  test("5. GET /api/products rejects invalid pagination parameters", async () => {
    // page = 0
    const resZero = await request(app).get("/api/products?page=0");
    assert.equal(resZero.status, 400);
    assert.equal(resZero.body.error.code, "VALIDATION_ERROR");

    // page is non-numeric
    const resNaN = await request(app).get("/api/products?page=abc");
    assert.equal(resNaN.status, 400);

    // limit exceeds max allowed (50)
    const resBigLimit = await request(app).get("/api/products?limit=100");
    assert.equal(resBigLimit.status, 400);
    assert.equal(resBigLimit.body.error.code, "VALIDATION_ERROR");
  });

  // 6. Search
  test("6. GET /api/products?q=arduino performs case-insensitive keyword search", async () => {
    const res = await request(app).get("/api/products?q=arduino");

    assert.equal(res.status, 200);
    assert.ok(res.body.products.length >= 1);
    const arduino = res.body.products.find((p) => p.slug === "arduino-uno-r3");
    assert.ok(arduino, "Arduino Uno R3 should be found by keyword 'arduino'");
  });

  test("7. GET /api/products?q=ELEC-ARD matches variant SKU", async () => {
    const res = await request(app).get("/api/products?q=ELEC-ARD");

    assert.equal(res.status, 200);
    assert.ok(res.body.products.length >= 1);
    const match = res.body.products.find((p) => p.slug === "arduino-uno-r3");
    assert.ok(match, "Product should be found by variant SKU");
  });

  test("8. GET /api/products?q=nonexistent returns empty list gracefully", async () => {
    const res = await request(app).get("/api/products?q=nonexistentqueryxyz123");

    assert.equal(res.status, 200);
    assert.equal(res.body.products.length, 0);
    assert.equal(res.body.pagination.totalItems, 0);
  });

  // 9. Filtering
  test("9. GET /api/products?category=fasteners filters by category", async () => {
    const res = await request(app).get("/api/products?category=fasteners");

    assert.equal(res.status, 200);
    assert.ok(res.body.products.length >= 1);
    for (const p of res.body.products) {
      assert.equal(p.category.slug, "fasteners");
    }
  });

  test("10. GET /api/products filters by minPrice and maxPrice", async () => {
    // 500 to 2000: Arduino Uno is 1299
    const res = await request(app).get("/api/products?minPrice=500&maxPrice=2000");

    assert.equal(res.status, 200);
    assert.ok(res.body.products.length >= 1);
    for (const p of res.body.products) {
      assert.ok(p.price >= 500 && p.price <= 2000);
    }
  });

  test("10a. GET /api/products?sort=price_asc&minPrice=500&maxPrice=2000 verifies price-sorted branch filters correctly", async () => {
    const res = await request(app).get("/api/products?sort=price_asc&minPrice=500&maxPrice=2000");

    assert.equal(res.status, 200);
    assert.ok(res.body.products.length >= 1);
    for (const p of res.body.products) {
      assert.ok(p.price >= 500 && p.price <= 2000, `Expected product price ${p.price} to be between 500 and 2000`);
      for (const v of p.variants) {
        assert.ok(v.price >= 500 && v.price <= 2000, `Expected variant price ${v.price} to be between 500 and 2000`);
      }
    }
    // Verify ascending order
    for (let i = 0; i < res.body.products.length - 1; i++) {
      assert.ok(res.body.products[i].price <= res.body.products[i + 1].price);
    }
  });

  test("10b. GET /api/products with out-of-range price filter returns empty list and 0 totalItems gracefully", async () => {
    const res = await request(app).get("/api/products?minPrice=99999&maxPrice=100000");

    assert.equal(res.status, 200);
    assert.equal(res.body.products.length, 0);
    assert.equal(res.body.pagination.totalItems, 0);
  });

  test("10c. Multi-variant price boundary: all returned variants strictly satisfy minPrice/maxPrice bounds", async () => {
    const res = await request(app).get("/api/products?minPrice=499&maxPrice=1300");

    assert.equal(res.status, 200);
    assert.ok(res.body.products.length >= 1);
    for (const p of res.body.products) {
      assert.ok(p.price >= 499 && p.price <= 1300);
      assert.ok(p.variants.length >= 1);
      for (const v of p.variants) {
        assert.ok(v.price >= 499 && v.price <= 1300, `Variant ${v.sku} price ${v.price} must satisfy [499, 1300]`);
      }
    }
  });

  test("11. GET /api/products rejects minPrice greater than maxPrice", async () => {
    const res = await request(app).get("/api/products?minPrice=3000&maxPrice=500");

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  // 12. Sorting
  test("12. GET /api/products?sort=price_asc sorts products ascending by variant price", async () => {
    const res = await request(app).get("/api/products?sort=price_asc&limit=10");

    assert.equal(res.status, 200);
    const prices = res.body.products.map((p) => p.price);
    for (let i = 0; i < prices.length - 1; i++) {
      assert.ok(prices[i] <= prices[i + 1], `Expected ${prices[i]} <= ${prices[i + 1]}`);
    }
  });

  test("12a. GET /api/products?sort=price_asc enforces deterministic pagination without duplicates across pages", async () => {
    // Page 1 with limit=2
    const page1Res = await request(app).get("/api/products?sort=price_asc&limit=2&page=1");
    assert.equal(page1Res.status, 200);
    assert.equal(page1Res.body.products.length, 2);
    const page1Ids = page1Res.body.products.map((p) => p.id);

    // Page 2 with limit=2
    const page2Res = await request(app).get("/api/products?sort=price_asc&limit=2&page=2");
    assert.equal(page2Res.status, 200);
    assert.equal(page2Res.body.products.length, 2);
    const page2Ids = page2Res.body.products.map((p) => p.id);

    // Verify no product appears on both page 1 and page 2
    for (const id of page2Ids) {
      assert.ok(!page1Ids.includes(id), `Product ${id} must not appear on both page 1 and page 2`);
    }

    // Verify ordering between pages: max price on page 1 <= min price on page 2
    const maxPage1 = Math.max(...page1Res.body.products.map((p) => p.price));
    const minPage2 = Math.min(...page2Res.body.products.map((p) => p.price));
    assert.ok(maxPage1 <= minPage2, `Expected max(page 1) ${maxPage1} <= min(page 2) ${minPage2}`);
  });

  test("12b. GET /api/products?sort=price_asc handles multi-variant products using minimum active variant price", async () => {
    const res = await request(app).get("/api/products?sort=price_asc&limit=20");
    assert.equal(res.status, 200);

    // Ensure no duplicate products are returned
    const productIds = res.body.products.map((p) => p.id);
    const uniqueIds = new Set(productIds);
    assert.equal(productIds.length, uniqueIds.size, "Product list must not contain duplicate products");

    // Verify every product's displayed price matches the minimum of its active variants
    for (const prod of res.body.products) {
      if (prod.variants && prod.variants.length > 0) {
        const minVarPrice = Math.min(...prod.variants.map((v) => v.price));
        assert.equal(prod.price, minVarPrice, `Product ${prod.name} displayed price must equal minimum variant price`);
      }
    }
  });

  test("12c. GET /api/products?sort=price_asc excludes active products with zero active variants from totalItems and results", async () => {
    // 1. Get an existing category ID for the product
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    assert.ok(category, "Must find an active category");

    // 2. Create an active product with NO variants
    const noVariantProduct = await prisma.product.create({
      data: {
        name: "Temporary Active Product Without Variants",
        slug: `temp-no-variants-${Date.now()}`,
        categoryId: category.id,
        isActive: true,
      },
    });

    try {
      // 3. Query price-sorted products
      const res = await request(app).get("/api/products?sort=price_asc&limit=50");
      assert.equal(res.status, 200);

      // Verify the no-variant product is NOT in results
      const returnedIds = res.body.products.map((p) => p.id);
      assert.ok(!returnedIds.includes(noVariantProduct.id), "Product without variants must not appear in price-sorted list");

      // Verify totalItems strictly equals products with active variants
      assert.equal(res.body.pagination.totalItems, returnedIds.length);
      assert.equal(res.body.pagination.totalPages, Math.ceil(returnedIds.length / 50) || 1);

      // Verify each returned product has at least one variant and a non-null price
      for (const prod of res.body.products) {
        assert.ok(prod.variants && prod.variants.length > 0);
        assert.notEqual(prod.price, null);
      }
    } finally {
      // Clean up the temporary product
      await prisma.product.delete({
        where: { id: noVariantProduct.id },
      });
    }
  });

  test("13. GET /api/products?sort=price_desc sorts products descending by variant price", async () => {
    const res = await request(app).get("/api/products?sort=price_desc&limit=10");

    assert.equal(res.status, 200);
    const prices = res.body.products.map((p) => p.price);
    for (let i = 0; i < prices.length - 1; i++) {
      assert.ok(prices[i] >= prices[i + 1], `Expected ${prices[i]} >= ${prices[i + 1]}`);
    }
  });

  test("13a. GET /api/products?sort=price_desc preserves stable deterministic ordering across repeated requests", async () => {
    const res1 = await request(app).get("/api/products?sort=price_desc&limit=10");
    const res2 = await request(app).get("/api/products?sort=price_desc&limit=10");

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    const ids1 = res1.body.products.map((p) => p.id);
    const ids2 = res2.body.products.map((p) => p.id);

    assert.deepEqual(ids1, ids2, "Repeated price_desc queries must produce identical, deterministic product order");
  });

  test("14. GET /api/products?sort=name_asc sorts products alphabetically", async () => {
    const res = await request(app).get("/api/products?sort=name_asc&limit=10");

    assert.equal(res.status, 200);
    const names = res.body.products.map((p) => p.name.toLowerCase());
    for (let i = 0; i < names.length - 1; i++) {
      assert.ok(names[i].localeCompare(names[i + 1]) <= 0);
    }
  });

  test("15. GET /api/products rejects invalid sort parameter", async () => {
    const res = await request(app).get("/api/products?sort=unsupported_sort");

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  // 16. Product detail and variants
  test("16. GET /api/products/:slug returns product detail and active variants", async () => {
    const res = await request(app).get("/api/products/arduino-uno-r3");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.product.name, "Arduino Uno R3 Microcontroller Board");
    assert.equal(res.body.product.brand, "Arduino");
    assert.equal(typeof res.body.product.price, "number");
    assert.equal(res.body.product.price, 1299);
    assert.ok(Array.isArray(res.body.product.variants));
    assert.ok(res.body.product.variants.length >= 1);

    const variant = res.body.product.variants[0];
    assert.equal(variant.sku, "ELEC-ARD-UNO-R3");
    assert.equal(variant.price, 1299);
    assert.equal(variant.inStock, true);
  });

  test("17. GET /api/products/slug/:slug explicit slug route alias works", async () => {
    const res = await request(app).get("/api/products/slug/arduino-uno-r3");

    assert.equal(res.status, 200);
    assert.equal(res.body.product.slug, "arduino-uno-r3");
  });

  test("18. GET /api/products/:slug/variants returns only active variants", async () => {
    const res = await request(app).get(`/api/products/${partialInactiveSlug}/variants`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.variants.length, 1);
    assert.equal(res.body.variants[0].name, "Active Variant");
  });

  test("19. GET /api/products/:slug returns 404 for missing product", async () => {
    const res = await request(app).get("/api/products/completely-missing-slug");

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "PRODUCT_NOT_FOUND");
  });

  // 20. Inactive product and variant exclusion
  test("20. Public catalog strictly excludes inactive products", async () => {
    // 1. Inactive product must not appear in product list
    const listRes = await request(app).get("/api/products?limit=50");
    const foundInList = listRes.body.products.some((p) => p.slug === inactiveProductSlug);
    assert.equal(foundInList, false, "Inactive product must not appear in public product listing");

    // 2. Direct slug fetch for inactive product must return 404
    const detailRes = await request(app).get(`/api/products/${inactiveProductSlug}`);
    assert.equal(detailRes.status, 404);
    assert.equal(detailRes.body.error.code, "PRODUCT_NOT_FOUND");

    // 3. Product with mixed variants must only return active variants
    const mixedRes = await request(app).get(`/api/products/${partialInactiveSlug}`);
    assert.equal(mixedRes.status, 200);
    assert.equal(mixedRes.body.product.variants.length, 1);
    assert.equal(mixedRes.body.product.variants[0].sku, `TEST-ACTIVE-VAR-${timestamp}`);
  });

  // 21. Rejection of public mutations
  test("21. Public catalog endpoints reject mutation attempts", async () => {
    // Attempt POST on /api/products
    const postProdRes = await request(app).post("/api/products").send({ name: "Hacker Product" });
    assert.ok([404, 405].includes(postProdRes.status));

    // Attempt POST on /api/categories
    const postCatRes = await request(app).post("/api/categories").send({ name: "Hacker Cat" });
    assert.ok([404, 405].includes(postCatRes.status));

    // Attempt PATCH on /api/products/:slug
    const patchRes = await request(app).patch("/api/products/arduino-uno-r3").send({ price: 1.0 });
    assert.ok([404, 405].includes(patchRes.status));

    // Attempt DELETE on /api/products/:slug
    const deleteRes = await request(app).delete("/api/products/arduino-uno-r3");
    assert.ok([404, 405].includes(deleteRes.status));
  });

  // 22. SQL Injection Resistance
  test("22. Public search and filter endpoints resist SQL injection payloads safely", async () => {
    const maliciousPayloads = [
      "'; DROP TABLE \"Product\"; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM \"User\" --",
      "1; SELECT pg_sleep(5); --",
    ];

    for (const payload of maliciousPayloads) {
      const res = await request(app).get(`/api/products?q=${encodeURIComponent(payload)}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.products));
    }
  });
});
