import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  listProductsQuerySchema,
  productParamSchema,
  categoryParamSchema,
} from "../src/validators/catalog.validator.js";
import {
  createProductSchema,
  updateProductSchema,
  adminProductParamSchema,
  createCategorySchema,
  updateCategorySchema,
  adminCategoryParamSchema,
} from "../src/validators/admin.validator.js";
import { formatProduct, formatCategory, formatVariant } from "../src/utils/catalogSerializer.js";

describe("Customer Product Browsing & Category Integration Test Suite", () => {
  describe("1. Customer Catalog & Product Request Validation", () => {
    test("validates default query parameters for customer product listing", () => {
      const parsed = listProductsQuerySchema.parse({});
      assert.strictEqual(parsed.page, 1);
      assert.strictEqual(parsed.limit, 12);
      assert.strictEqual(parsed.sort, "newest");
      assert.strictEqual(parsed.category, undefined);
      assert.strictEqual(parsed.q, undefined);
    });

    test("accepts valid category filtering and search queries", () => {
      const parsed = listProductsQuerySchema.parse({
        category: "fasteners",
        subcat: "screws-hex-allen",
        inStockOnly: "true",
        q: "socket head",
        brand: "VERTEX",
        sort: "price_asc",
        page: "2",
        limit: "24",
      });
      assert.strictEqual(parsed.category, "fasteners");
      assert.strictEqual(parsed.subcat, "screws-hex-allen");
      assert.strictEqual(parsed.inStockOnly, true);
      assert.strictEqual(parsed.q, "socket head");
      assert.strictEqual(parsed.brand, "VERTEX");
      assert.strictEqual(parsed.sort, "price_asc");
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.limit, 24);
    });

    test("accepts subcategory alias and boolean inStockOnly", () => {
      const parsed = listProductsQuerySchema.parse({
        subcategory: "microcontrollers",
        inStockOnly: true,
      });
      assert.strictEqual(parsed.subcategory, "microcontrollers");
      assert.strictEqual(parsed.inStockOnly, true);
    });

    test("rejects invalid sort options and pagination values", () => {
      assert.throws(() => {
        listProductsQuerySchema.parse({ sort: "invalid_sort_type" });
      });
      assert.throws(() => {
        listProductsQuerySchema.parse({ page: 0 });
      });
      assert.throws(() => {
        listProductsQuerySchema.parse({ limit: 100 }); // Max 50
      });
      assert.throws(() => {
        listProductsQuerySchema.parse({ minPrice: 200, maxPrice: 100 }); // max < min
      });
    });

    test("validates customer product slug and category slug parameters", () => {
      const validProd = productParamSchema.parse({ slug: "socket-head-cap-screw-m8" });
      assert.strictEqual(validProd.slug, "socket-head-cap-screw-m8");

      const validCat = categoryParamSchema.parse({ slug: "screws-hex-allen" });
      assert.strictEqual(validCat.slug, "screws-hex-allen");

      assert.throws(() => {
        productParamSchema.parse({ slug: "invalid slug with spaces!" });
      });
      assert.throws(() => {
        categoryParamSchema.parse({ slug: "" });
      });
    });
  });

  describe("2. Admin Product Creation & Category Assignment Validation", () => {
    test("requires categoryId and valid fields for product creation", () => {
      const validPayload = {
        name: "SS316 Hex Bolt M8",
        slug: "ss316-hex-bolt-m8",
        categoryId: "cat-fasteners-uuid-1",
        brand: "VERTEX",
        hsnCode: "7318",
        gstRate: "18.0",
        sku: "FAST-HEX-M8-SS316",
        price: "150.00",
        stockQuantity: "100",
      };

      const parsed = createProductSchema.parse(validPayload);
      assert.strictEqual(parsed.name, "SS316 Hex Bolt M8");
      assert.strictEqual(parsed.categoryId, "cat-fasteners-uuid-1");
      assert.strictEqual(parsed.sku, "FAST-HEX-M8-SS316");
      assert.strictEqual(parsed.price, 150.0);
      assert.strictEqual(parsed.stockQuantity, 100);
    });

    test("rejects product creation without categoryId", () => {
      assert.throws(() => {
        createProductSchema.parse({
          name: "Orphan Product Without Category",
          slug: "orphan-prod",
          sku: "ORPHAN-SKU-1",
          price: 99,
        });
      });
    });

    test("validates category creation schema and hierarchy parentId", () => {
      const topLevelCat = createCategorySchema.parse({
        name: "Fasteners",
        slug: "fasteners",
        description: "Industrial hardware fasteners",
      });
      assert.strictEqual(topLevelCat.name, "Fasteners");
      assert.strictEqual(topLevelCat.parentId, undefined);

      const subCat = createCategorySchema.parse({
        name: "Allen Screws",
        slug: "allen-screws",
        parentId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      assert.strictEqual(subCat.name, "Allen Screws");
      assert.strictEqual(subCat.parentId, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    });
  });

  describe("3. Admin Product Update & Category Reassignment Validation", () => {
    test("validates adminProductParamSchema identifier", () => {
      const valid = adminProductParamSchema.parse({ id: "prod-uuid-99" });
      assert.strictEqual(valid.id, "prod-uuid-99");

      assert.throws(() => {
        adminProductParamSchema.parse({ id: "" });
      });
    });

    test("validates updateProductSchema with new categoryId assignment", () => {
      const updateData = updateProductSchema.parse({
        categoryId: "cat-electronics-new-uuid",
        name: "Renamed Hardware Module",
        brand: "VERTEX Robotics",
        tag: "Best Seller",
        isActive: true,
      });

      assert.strictEqual(updateData.categoryId, "cat-electronics-new-uuid");
      assert.strictEqual(updateData.name, "Renamed Hardware Module");
      assert.strictEqual(updateData.brand, "VERTEX Robotics");
      assert.strictEqual(updateData.tag, "Best Seller");
      assert.strictEqual(updateData.isActive, true);
    });

    test("allows partial updates without modifying other fields", () => {
      const updateOnlyCategory = updateProductSchema.parse({
        categoryId: "new-category-id-123",
      });
      assert.strictEqual(updateOnlyCategory.categoryId, "new-category-id-123");
      assert.strictEqual(updateOnlyCategory.name, undefined);

      const updateOnlyActive = updateProductSchema.parse({
        isActive: false,
      });
      assert.strictEqual(updateOnlyActive.isActive, false);
      assert.strictEqual(updateOnlyActive.categoryId, undefined);
    });

    test("rejects empty categoryId string in updateProductSchema", () => {
      assert.throws(() => {
        updateProductSchema.parse({
          categoryId: "   ",
        });
      });
    });
  });

  describe("4. Catalog Serializer, Pricing & Customer Visibility Contracts", () => {
    test("formatProduct correctly projects category, lowest variant price, and stock availability", () => {
      const dbProduct = {
        id: "prod-hex-bolt-1",
        name: "Hex Head Bolt M8 x 40mm",
        slug: "hex-head-bolt-m8-40",
        description: "Class 8.8 high tensile hex head bolt.",
        categoryId: "cat-fasteners",
        category: {
          id: "cat-fasteners",
          name: "Fasteners",
          slug: "fasteners",
        },
        brand: "VERTEX",
        hsnCode: "7318",
        gstRate: 18.0,
        tag: "Industrial Grade",
        imageUrl: "https://vertex.local/images/hex-m8.png",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        variants: [
          {
            id: "var-1",
            sku: "FAST-HEX-M8-40-P10",
            partNumber: "HX-M8-40-10",
            name: "Pack of 10",
            packSize: "Pack of 10",
            dimensions: "M8 × 40mm",
            price: 180.0,
            mrp: 220.0,
            stockQuantity: 120,
            isActive: true,
            tieredPrices: [],
          },
          {
            id: "var-2",
            sku: "FAST-HEX-M8-40-P50",
            partNumber: "HX-M8-40-50",
            name: "Pack of 50",
            packSize: "Pack of 50",
            dimensions: "M8 × 40mm",
            price: 750.0,
            mrp: 900.0,
            stockQuantity: 40,
            isActive: true,
            tieredPrices: [],
          },
          {
            id: "var-secret",
            sku: "INTERNAL-UNRELEASED-SKU",
            price: 999.0,
            stockQuantity: 0,
            isActive: false, // Inactive variant must be excluded
          },
        ],
      };

      const formatted = formatProduct(dbProduct);

      assert.strictEqual(formatted.id, "prod-hex-bolt-1");
      assert.strictEqual(formatted.name, "Hex Head Bolt M8 x 40mm");
      assert.strictEqual(formatted.category.name, "Fasteners");
      assert.strictEqual(formatted.category.slug, "fasteners");
      assert.strictEqual(formatted.price, 180.0); // Minimum active variant price
      assert.strictEqual(formatted.mrp, 220.0);
      assert.strictEqual(formatted.inStock, true);
      assert.strictEqual(formatted.variants.length, 2); // Inactive variant excluded
      assert.strictEqual(formatted.variants.some((v) => v.sku === "INTERNAL-UNRELEASED-SKU"), false);
    });

    test("formatProduct handles out-of-stock products cleanly", () => {
      const outOfStockProduct = {
        id: "prod-oos-1",
        name: "Discontinued Fastener",
        slug: "discontinued-fastener",
        category: { id: "cat-1", name: "Fasteners", slug: "fasteners" },
        variants: [
          {
            id: "var-oos",
            sku: "FAST-OOS-1",
            price: 50.0,
            stockQuantity: 0,
            isActive: true,
          },
        ],
      };

      const formatted = formatProduct(outOfStockProduct);
      assert.strictEqual(formatted.inStock, false);
      assert.strictEqual(formatted.price, 50.0);
    });

    test("formatCategory structures hierarchy and excludes inactive children", () => {
      const categoryWithChildren = {
        id: "cat-root",
        name: "Fasteners",
        slug: "fasteners",
        description: "All fasteners",
        children: [
          {
            id: "sub-1",
            name: "Hex Bolts",
            slug: "hex-bolts",
            isActive: true,
            children: [],
          },
          {
            id: "sub-inactive",
            name: "Archived Fasteners",
            slug: "archived-fasteners",
            isActive: false,
            children: [],
          },
        ],
        _count: {
          products: 42,
        },
      };

      const formatted = formatCategory(categoryWithChildren);
      assert.strictEqual(formatted.name, "Fasteners");
      assert.strictEqual(formatted.children.length, 1);
      assert.strictEqual(formatted.children[0].name, "Hex Bolts");
      assert.strictEqual(formatted.productsCount, 42);
    });
  });

  describe("5. Admin Category Hierarchy Update Validation & Priority Ordering", () => {
    test("adminCategoryParamSchema validates category id", () => {
      const valid = adminCategoryParamSchema.parse({ id: "cat-fasteners" });
      assert.strictEqual(valid.id, "cat-fasteners");

      assert.throws(() => {
        adminCategoryParamSchema.parse({ id: "" });
      });
    });

    test("updateCategorySchema validates partial category updates", () => {
      const validUpdate = updateCategorySchema.parse({
        name: "Fasteners & Threaded Hardware",
        slug: "fasteners-hardware",
        description: "Official industrial fastener catalog.",
        icon: "🔩",
        tint: "tint-orange",
        isActive: true,
      });

      assert.strictEqual(validUpdate.name, "Fasteners & Threaded Hardware");
      assert.strictEqual(validUpdate.slug, "fasteners-hardware");
      assert.strictEqual(validUpdate.isActive, true);
    });

    test("updateCategorySchema rejects invalid slugs with special characters", () => {
      assert.throws(() => {
        updateCategorySchema.parse({
          slug: "Invalid Slug With Spaces!",
        });
      });
    });

    test("verifies Fasteners appears 1st and Electronic Products 2nd in priority ordering", () => {
      const categoryPriority = {
        fasteners: 1,
        "cat-fasteners": 1,
        electronics: 2,
        "cat-electronics": 2,
      };

      const unorderedCategories = [
        { id: "cat-tools", slug: "tools", name: "Tools" },
        { id: "cat-electronics", slug: "electronics", name: "Electronic Products" },
        { id: "cat-nuts", slug: "nuts", name: "Nuts" },
        { id: "cat-fasteners", slug: "fasteners", name: "Fasteners" },
        { id: "cat-automation", slug: "automation", name: "Automation" },
      ];

      const sorted = [...unorderedCategories].sort((a, b) => {
        const pA = categoryPriority[a.slug?.toLowerCase()] || categoryPriority[a.id] || 99;
        const pB = categoryPriority[b.slug?.toLowerCase()] || categoryPriority[b.id] || 99;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name);
      });

      assert.strictEqual(sorted[0].slug, "fasteners", "Fasteners must appear first in catalog");
      assert.strictEqual(sorted[1].slug, "electronics", "Electronic Products must appear second in catalog");
    });
  });
});
