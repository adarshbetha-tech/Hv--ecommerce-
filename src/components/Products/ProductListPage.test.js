/**
 * VERTEX Product Catalogue & Listing Page Test Suite
 * 
 * Verifies catalog rendering, hierarchical categories, subcategories,
 * multi-facet filters, keyword search, sorting, grid/list toggle,
 * and commercial RFQ quote triggers.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductListPage from "./ProductListPage";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, OFFICIAL_CATALOG_PRODUCTS, OFFICIAL_CATEGORIES } from "../../mock/mockData";
import { getProducts } from "../../mock/mockCatalogApi";

const mockCategories = [
  {
    id: "cat-fasteners",
    name: "Fasteners",
    slug: "fasteners",
    children: [
      { id: "sub-screws-cross", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips" },
      { id: "sub-screws-hex", name: "Screws — Hex (Allen)", slug: "screws-hex-allen" },
    ],
  },
  {
    id: "cat-electronics",
    name: "Electronic Products",
    slug: "electronics",
    children: [
      { id: "sub-lithium-cells", name: "Lithium-Ion Batteries / Cells", slug: "lithium-ion-batteries" },
      { id: "sub-hvnex-mcu", name: "HVNEX — Microcontroller Boards", slug: "hvnex-microcontrollers" },
    ],
  },
];

const mockProducts = [
  {
    id: "prod-dmegc-18650",
    name: "DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2600 mAh, EV Grade",
    slug: "dmegc-18650-2600",
    categoryId: "cat-electronics",
    category: { id: "cat-electronics", name: "Electronic Products", slug: "electronics" },
    subcategory: { id: "sub-lithium-cells", name: "Lithium-Ion Batteries / Cells", slug: "lithium-ion-batteries" },
    brand: "DMEGC",
    specs: { "Cell Format": "18650", "Nominal Voltage": "3.65V", "Rated Capacity": "2600 mAh", "Grade": "EV Grade" },
    price: null,
    inStock: true,
    variants: [{ id: "var-1", sku: "BATT-DMEGC-18650-2600", price: null, stockQuantity: 500 }],
  },
  {
    id: "prod-pan-head",
    name: "Pan Head Screw",
    slug: "pan-head-screw",
    categoryId: "cat-fasteners",
    category: { id: "cat-fasteners", name: "Fasteners", slug: "fasteners" },
    subcategory: { id: "sub-screws-cross", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips" },
    brand: "VERTEX",
    specs: { "Drive Type": "Cross (Phillips)", "Head Type": "Pan Head" },
    price: null,
    inStock: true,
    variants: [{ id: "var-2", sku: "FAST-PH-PAN", price: null, stockQuantity: 300 }],
  },
  {
    id: "prod-socket-cap",
    name: "Socket Head Screw",
    slug: "socket-head-screw",
    categoryId: "cat-fasteners",
    category: { id: "cat-fasteners", name: "Fasteners", slug: "fasteners" },
    subcategory: { id: "sub-screws-hex", name: "Screws — Hex (Allen)", slug: "screws-hex-allen" },
    brand: "VERTEX",
    specs: { "Drive Type": "Hex (Allen)", "Head Type": "Socket Head" },
    price: 180,
    inStock: true,
    variants: [{ id: "var-3", sku: "FAST-SC-M6", price: 180, stockQuantity: 150 }],
  },
];

describe("VERTEX ProductListPage Component Suite", () => {
  test("1. Renders catalogue title, breadcrumbs, and total product count", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Products Found")).toBeInTheDocument();
    expect(screen.getByText("DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2600 mAh, EV Grade")).toBeInTheDocument();
    expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
  });

  test("2. Filters catalogue by parent category", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const fastenersChip = screen.getByRole("button", { name: /Fasteners/i });
    fireEvent.click(fastenersChip);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
    expect(screen.queryByText(/DMEGC Cylindrical/i)).not.toBeInTheDocument();
  });

  test("3. Filters catalogue by subcategory", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
        initialCategory="fasteners"
      />
    );

    const hexPill = screen.getByRole("button", { name: "Screws — Hex (Allen)" });
    fireEvent.click(hexPill);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Product Found")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
    expect(screen.queryByText("Pan Head Screw")).not.toBeInTheDocument();
  });

  test("4. Keyword search filters results across product names and specifications", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search specs, part numbers/i);
    fireEvent.change(searchInput, { target: { value: "2600 mAh" } });
    fireEvent.submit(searchInput.closest("form"));

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/DMEGC Cylindrical/i)).toBeInTheDocument();
    expect(screen.queryByText("Pan Head Screw")).not.toBeInTheDocument();
  });

  test("5. Clear All Filters resets search and categories", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
        initialCategory="electronics"
      />
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    const clearLink = screen.getByText("Clear All");
    fireEvent.click(clearLink);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("6. View mode switcher toggles between Grid and List view", () => {
    const { container } = render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const listBtn = screen.getByTitle("List View (Technical Specs Table)");
    fireEvent.click(listBtn);

    expect(container.querySelector(".product-list-view")).toBeInTheDocument();
  });

  test("7. Displays authentic Price for priced products and Quote on Request for unpriced products", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    expect(screen.getByText("₹180")).toBeInTheDocument();
    expect(screen.getAllByText("Quote on Request").length).toBeGreaterThanOrEqual(1);
  });

  test("8. Clicking Request Quote opens the RFQ modal", () => {
    render(
      <ProductListPage
        categories={mockCategories}
        products={mockProducts}
      />
    );

    const rfqBtns = screen.getAllByRole("button", { name: /Request Quote/i });
    fireEvent.click(rfqBtns[0]);

    expect(screen.getByRole("heading", { name: /Request a Commercial Quote/i })).toBeInTheDocument();
  });

  test("9. Validates official PDF category ordering: Fasteners is first, Electronic Products is second", () => {
    expect(MOCK_CATEGORIES[0].name).toBe("Fasteners");
    expect(MOCK_CATEGORIES[0].slug).toBe("fasteners");
    expect(MOCK_CATEGORIES[1].name).toBe("Electronic Products");
    expect(MOCK_CATEGORIES[1].slug).toBe("electronics");

    // Fasteners 6 subcategories in exact PDF order
    const fastenerSubcats = MOCK_CATEGORIES[0].children.map((c) => c.name);
    expect(fastenerSubcats).toEqual([
      "Screws — Flat (Slotted)",
      "Screws — Cross (Phillips)",
      "Screws — Hex (Allen)",
      "Nuts",
      "Washers",
      "Brass Inserts",
    ]);

    // Electronic Products 6 subcategories in exact PDF order
    const electronicSubcats = MOCK_CATEGORIES[1].children.map((c) => c.name);
    expect(electronicSubcats).toEqual([
      "Lithium-Ion Batteries / Cells",
      "Electronic Components",
      "HVNEX – Microcontroller Boards",
      "HVNEX – DC Motor Drivers",
      "HVNEX – PLC Controller",
      "HVNEX – DC-DC Buck Converters",
    ]);
  });

  test("10. Validates all 39 PDF items exist without duplicates in MOCK_PRODUCTS and have correct category assignments", () => {
    const pdfNames = [
      // Fasteners (19)
      "Slotted CHHD",
      "Pan Head Screw",
      "Countersunk (CSK) Screw",
      "Self-Tapping Pan Head Screw",
      "Self-Tapping Countersunk (CSK) Screw",
      "Laptop and Mobile Screws",
      "Drywall/Gypsum Screws",
      "Pan Phillips Self-Drilling Screw",
      "Socket Head Screw",
      "Button Head Screw",
      "Allen Countersunk (CSK) Screw",
      "Hex Nut",
      "Nyloc Nut",
      "Wing Nut",
      "Plain Washer",
      "Spring Washer",
      "External Serrated Washer",
      "3D Printing Brass Threaded Slant Knurled Inserts",
      "Brass Threaded Inserts",

      // Electronic Products (20)
      "DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2600 mAh, EV Grade",
      "DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 2900 mAh, EV Grade",
      "DMEGC Cylindrical Lithium-Ion Cell 18650 – 3.65V, 3200 mAh, EV Grade",
      "DMEGC Cylindrical Lithium-Ion Cell 21700 – 3.65V, 4500 mAh, EV Grade",
      "NORDA NMC Cell 21700 – 4500 mAh",
      "Panasonic NMC Cell 21700 – 4500 mAh",
      "NORDA NMC Cell 18650 – 2600 mAh, EV Grade",
      "GL-12 840-Point Solderless Breadboard",
      "Jumper Cables",
      "Male Berg Strip",
      "Female Berg Strip",
      "HVNEX-T1",
      "HVNEX-T2 Mini",
      "HVNEX-ESP32",
      "HVNEX-ESP Mini",
      "HVNEX-D20 – 20A DC Motor Driver",
      "HVNEX-D60 – 60A DC Motor Driver",
      "HVNEX-PLC Basic",
      "HVNEX-BUCK 5V to 3.3V Converter",
      "HVNEX-BUCK 300W 12A Adjustable Converter (7–32V Input, 0.8–28V Output)",
    ];

    expect(pdfNames).toHaveLength(39);

    const norm = (s) => (s || "").toLowerCase().replace(/[\u2013\u2014-]/g, "-").replace(/\s+/g, " ").trim();

    // Verify all 39 exist
    pdfNames.forEach((targetName) => {
      const found = MOCK_PRODUCTS.find((p) => norm(p.name) === norm(targetName));
      expect(found).toBeDefined();
      expect(found.categoryId).toMatch(/cat-fasteners|cat-electronics/);
      expect(found.subcategory).toBeDefined();
      expect(found.subcategory.name).toBeTruthy();
    });

    // Verify no duplicate IDs in catalog
    const seenIds = new Set();
    const duplicateIds = [];
    MOCK_PRODUCTS.forEach((p) => {
      if (seenIds.has(p.id)) {
        duplicateIds.push(p.id);
      }
      seenIds.add(p.id);
    });
    expect(duplicateIds).toEqual([]);
  });

  test("11. Validates that OFFICIAL_CATALOG_PRODUCTS strictly contains exactly the 39 named products", () => {
    expect(OFFICIAL_CATALOG_PRODUCTS).toHaveLength(39);

    const fasteners = OFFICIAL_CATALOG_PRODUCTS.filter((p) => p.categoryId === "cat-fasteners");
    const electronics = OFFICIAL_CATALOG_PRODUCTS.filter((p) => p.categoryId === "cat-electronics");

    expect(fasteners).toHaveLength(19);
    expect(electronics).toHaveLength(20);

    // Calculate total variant SKUs (1 item has 3 variants, 38 have 1 variant = 41 total SKUs)
    const totalSkus = OFFICIAL_CATALOG_PRODUCTS.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    expect(totalSkus).toBe(41);
  });

  test("12. Customer-facing getProducts() returns only official catalog products when officialOnly is true", async () => {
    const res = await getProducts({ limit: 100, officialOnly: true });
    expect(res.success).toBe(true);
    expect(res.products).toHaveLength(39);

    // Verify demo products are excluded from customer storefront listing
    const names = res.products.map((p) => p.name);
    expect(names).not.toContain("Arduino Uno R3 Microcontroller Board");
    expect(names).not.toContain("Stainless Steel Hex Bolt (M8 x 30mm)");
    expect(names).not.toContain("Raspberry Pi 4 Development Board");
    expect(names).not.toContain("Single Phase Solid State Relay (SSR-40DA)");
    expect(names).not.toContain("Industrial Ball-End Hex Key Set (9-Piece)");

    // But default/fixture query keeps fixtures accessible for tests
    const defaultRes = await getProducts({ limit: 100 });
    expect(defaultRes.products.length).toBeGreaterThan(39);
  });

  test("13. ProductListPage customer-facing view displays only official catalog products and excludes all 8 demo fixtures", () => {
    // Render ProductListPage with full MOCK_PRODUCTS (which contains 39 official + 8 demo fixtures = 47)
    render(
      <ProductListPage
        categories={MOCK_CATEGORIES}
        products={MOCK_PRODUCTS}
      />
    );

    // Verify product count pill displays exactly 39 products found
    const countPill = screen.getByText("39");
    expect(countPill).toBeInTheDocument();
    expect(screen.getByText("Products Found")).toBeInTheDocument();

    // Verify that NONE of the 8 demo fixtures are rendered in the document
    const demoFixtures = [
      "Arduino Uno R3 Microcontroller Board",
      "Raspberry Pi 4 Development Board",
      "Stainless Steel Hex Bolt (M8 x 30mm)",
      "Serrated Flanged Hex Nut (M6)",
      "L298N Dual H-Bridge Motor Driver Module",
      "Delta DVP-14SS2 Slim Programmable Logic Controller",
      "Single Phase Solid State Relay (SSR-40DA)",
      "Industrial Ball-End Hex Key Set (9-Piece)",
    ];

    demoFixtures.forEach((fixtureName) => {
      expect(screen.queryByText(fixtureName)).not.toBeInTheDocument();
    });

    // Verify official parent products are present (e.g. Hex Nut, Nyloc Nut, DMEGC cell, Slotted CHHD)
    expect(screen.getByText("Hex Nut")).toBeInTheDocument();
    expect(screen.getByText("Nyloc Nut")).toBeInTheDocument();
    expect(screen.getByText("Slotted CHHD")).toBeInTheDocument();
    expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
  });

  test("14. Official catalog strictly consists of 39 parent products: 19 Fasteners and 20 Electronic Products", () => {
    expect(OFFICIAL_CATALOG_PRODUCTS).toHaveLength(39);

    const fasteners = OFFICIAL_CATALOG_PRODUCTS.filter((p) => p.categoryId === "cat-fasteners");
    const electronics = OFFICIAL_CATALOG_PRODUCTS.filter((p) => p.categoryId === "cat-electronics");

    expect(fasteners).toHaveLength(19);
    expect(electronics).toHaveLength(20);

    // Verify none of the 8 fixtures are marked as official
    const fixtureIds = [
      "prod-arduino-uno-r3",
      "prod-rpi-4b",
      "prod-ss-hex-bolt-m8",
      "prod-flanged-nut-m6",
      "prod-drv-l298n",
      "prod-plc-delta-dvp",
      "prod-solid-state-relay",
      "prod-allen-key-set",
    ];

    fixtureIds.forEach((id) => {
      expect(OFFICIAL_CATALOG_PRODUCTS.some((p) => p.id === id)).toBe(false);
    });
  });

  test("15. Category structure has exactly 2 official top-level categories and 6 official subcategories each from PDF", () => {
    // Official categories check
    expect(OFFICIAL_CATEGORIES).toHaveLength(2);
    expect(OFFICIAL_CATEGORIES[0].id).toBe("cat-fasteners");
    expect(OFFICIAL_CATEGORIES[0].name).toBe("Fasteners");
    expect(OFFICIAL_CATEGORIES[0].productsCount).toBe(19);

    expect(OFFICIAL_CATEGORIES[1].id).toBe("cat-electronics");
    expect(OFFICIAL_CATEGORIES[1].name).toBe("Electronic Products");
    expect(OFFICIAL_CATEGORIES[1].productsCount).toBe(20);

    // Fasteners 6 subcategories from PDF
    const fastenerSubNames = OFFICIAL_CATEGORIES[0].children.map((s) => s.name);
    expect(fastenerSubNames).toEqual([
      "Screws — Flat (Slotted)",
      "Screws — Cross (Phillips)",
      "Screws — Hex (Allen)",
      "Nuts",
      "Washers",
      "Brass Inserts",
    ]);

    // Electronic Products 6 subcategories from PDF
    const electronicSubNames = OFFICIAL_CATEGORIES[1].children.map((s) => s.name);
    expect(electronicSubNames).toEqual([
      "Lithium-Ion Batteries / Cells",
      "Electronic Components",
      "HVNEX – Microcontroller Boards",
      "HVNEX – DC Motor Drivers",
      "HVNEX – PLC Controller",
      "HVNEX – DC-DC Buck Converters",
    ]);

    // Total products assigned across both official categories is 39
    const totalCount = OFFICIAL_CATEGORIES.reduce((acc, c) => acc + c.productsCount, 0);
    expect(totalCount).toBe(39);
  });
});
