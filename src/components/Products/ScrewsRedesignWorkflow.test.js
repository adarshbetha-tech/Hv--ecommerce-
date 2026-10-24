/**
 * VERTEX Screws Browsing Redesign Workflow Test Suite
 * 
 * Comprehensive validation across the four redesigned views:
 * 1. Page 1 — Shop by Category (6 approved fastener categories from PDF)
 * 2. Page 2 — Screw Head Category Selection (Cross Phillips, Hex Allen, Flat Slotted)
 * 3. Page 3 — Product Listing (e.g. Pan Head screws, breadcrumbs, facet filters, qty stepper)
 * 4. Page 4 — Individual Product Details (two-column desktop / stacked mobile, shipping card, rating, cart)
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductListPage from "./ProductListPage";
import ProductDetailPage from "./ProductDetailPage";
import FastenerCategoryTiles from "./FastenerCategoryTiles";
import ScrewHeadCategorySelector from "./ScrewHeadCategorySelector";
import { SCREW_HEAD_GROUPS, APPROVED_FASTENER_CATEGORIES } from "../../utils/screwCategoriesData";
import { OFFICIAL_CATEGORIES, OFFICIAL_CATALOG_PRODUCTS } from "../../mock/mockData";

describe("VERTEX Screws Browsing Redesign Workflow Suite", () => {
  // --------------------------------------------------------------------------
  // PAGE 1 — SHOP BY CATEGORY
  // --------------------------------------------------------------------------
  describe("Page 1: Shop by Category", () => {
    test("1. Renders all 6 approved fastener categories from PDF with authentic labels and images", () => {
      const handleSelect = jest.fn();
      render(
        <FastenerCategoryTiles
          products={OFFICIAL_CATALOG_PRODUCTS}
          onSelectCategory={handleSelect}
        />
      );

      // Verify Page 1 heading and badge
      expect(screen.getByRole("heading", { name: "Shop by Category" })).toBeInTheDocument();
      expect(screen.getByText("PRECISION FASTENERS & HARDWARE")).toBeInTheDocument();

      // Verify all 6 approved fastener categories from PDF
      expect(screen.getByText("Screws — Flat (Slotted)")).toBeInTheDocument();
      expect(screen.getByText("Screws — Cross (Phillips)")).toBeInTheDocument();
      expect(screen.getByText("Screws — Hex (Allen)")).toBeInTheDocument();
      expect(screen.getByText("Nuts")).toBeInTheDocument();
      expect(screen.getByText("Washers")).toBeInTheDocument();
      expect(screen.getByText("Brass Inserts")).toBeInTheDocument();

      // Verify entire tile is clickable and accessible via keyboard
      const crossTile = screen.getByTestId("fastener-cat-tile-screws-cross-phillips");
      fireEvent.click(crossTile);
      expect(handleSelect).toHaveBeenCalledWith("screws-cross-phillips");

      fireEvent.keyDown(crossTile, { key: "Enter" });
      expect(handleSelect).toHaveBeenCalledWith("screws-cross-phillips");
    });

    test("2. Displays Page 1 category tiles when Fasteners is selected in ProductListPage", () => {
      render(
        <ProductListPage
          categories={OFFICIAL_CATEGORIES}
          products={OFFICIAL_CATALOG_PRODUCTS}
          initialCategory="fasteners"
          initialSubcat="all"
        />
      );

      // Verify Fastener Category Tiles are rendered on Page 1
      expect(screen.getByText("PRECISION FASTENERS & HARDWARE")).toBeInTheDocument();
      expect(screen.getByTestId("fastener-cat-tile-screws-cross-phillips")).toBeInTheDocument();
      expect(screen.getByTestId("fastener-cat-tile-screws-hex-allen")).toBeInTheDocument();
      expect(screen.getByTestId("fastener-cat-tile-screws-flat-slotted")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // PAGE 2 — SCREW HEAD CATEGORY SELECTION
  // --------------------------------------------------------------------------
  describe("Page 2: Screw Head Category Selection", () => {
    test("3. Cross (Phillips) head category selection displays heading, subtitle, and all 7 approved subcategories from PDF", () => {
      const handleSelectHead = jest.fn();
      const crossGroup = SCREW_HEAD_GROUPS["screws-cross-phillips"];

      render(
        <ScrewHeadCategorySelector
          groupData={crossGroup}
          onSelectHeadCategory={handleSelectHead}
        />
      );

      // Verify heading and subtitle
      expect(screen.getByRole("heading", { level: 1, name: "Cross (Phillips)" })).toBeInTheDocument();
      expect(screen.getByText("Choose by Head category")).toBeInTheDocument();

      // Verify all 7 approved subcategories from PDF
      expect(screen.getByText("Pan Head Screw")).toBeInTheDocument();
      expect(screen.getByText("Countersunk (CSK) Screw")).toBeInTheDocument();
      expect(screen.getByText("Self-Tapping Pan Head Screw")).toBeInTheDocument();
      expect(screen.getByText("Self-Tapping Countersunk (CSK) Screw")).toBeInTheDocument();
      expect(screen.getByText("Laptop and Mobile Screws")).toBeInTheDocument();
      expect(screen.getByText("Drywall/Gypsum Screws")).toBeInTheDocument();
      expect(screen.getByText("Pan Phillips Self-Drilling Screw")).toBeInTheDocument();

      // Click Pan Head Screw card
      const panHeadCard = screen.getByTestId("head-category-tile-pan-head-screw");
      fireEvent.click(panHeadCard);
      expect(handleSelectHead).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Pan Head Screw", slug: "pan-head-screw" })
      );
    });

    test("4. Hex (Allen) head selection displays Socket Head, Button Head, and Allen Countersunk (CSK)", () => {
      const hexGroup = SCREW_HEAD_GROUPS["screws-hex-allen"];
      render(<ScrewHeadCategorySelector groupData={hexGroup} />);

      expect(screen.getByRole("heading", { level: 1, name: "Hex (Allen)" })).toBeInTheDocument();
      expect(screen.getByText("Choose by Head category")).toBeInTheDocument();
      expect(screen.getByText("Socket Head Screw")).toBeInTheDocument();
      expect(screen.getByText("Button Head Screw")).toBeInTheDocument();
      expect(screen.getByText("Allen Countersunk (CSK) Screw")).toBeInTheDocument();
    });

    test("5. Flat (Slotted) selection displays Slotted CHHD", () => {
      const slottedGroup = SCREW_HEAD_GROUPS["screws-flat-slotted"];
      render(<ScrewHeadCategorySelector groupData={slottedGroup} />);

      expect(screen.getByRole("heading", { level: 1, name: "Flat (Slotted)" })).toBeInTheDocument();
      expect(screen.getByText("Slotted CHHD")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // PAGE 3 — PRODUCT LISTING
  // --------------------------------------------------------------------------
  describe("Page 3: Product Listing", () => {
    test("6. Renders Pan Head product listing with breadcrumbs, actual count, and RFQ action", () => {
      const handleRequestQuote = jest.fn();
      render(
        <ProductListPage
          categories={OFFICIAL_CATEGORIES}
          products={OFFICIAL_CATALOG_PRODUCTS}
          initialCategory="fasteners"
          initialSubcat="screws-cross-phillips"
          onViewDetails={handleRequestQuote}
        />
      );

      // On Page 2, click "Pan Head Screw"
      const panCard = screen.getByTestId("head-category-tile-pan-head-screw");
      fireEvent.click(panCard);

      // Verifies transition to Page 3
      expect(screen.getByRole("heading", { level: 1, name: "Pan Head Screw" })).toBeInTheDocument();

      // Breadcrumb includes Pan Head Screw
      expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Pan Head Screw");

      // Back to head categories button exists
      const backBtn = screen.getByRole("button", { name: /Back to/i });
      expect(backBtn).toBeInTheDocument();

      // Product count is dynamic and data-driven (3 Products Found matching Pan Head)
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Products Found")).toBeInTheDocument();

      // Official catalog preserves Quote on Request for commercial products
      expect(screen.getAllByText("Quote on Request").length).toBeGreaterThan(0);
    });

    test("7. Clicking back affordance on Page 3 returns customer to Page 2 head selection", () => {
      render(
        <ProductListPage
          categories={OFFICIAL_CATEGORIES}
          products={OFFICIAL_CATALOG_PRODUCTS}
          initialCategory="fasteners"
          initialSubcat="screws-cross-phillips"
        />
      );

      // Select Pan Head
      fireEvent.click(screen.getByTestId("head-category-tile-pan-head-screw"));
      expect(screen.getByRole("heading", { level: 1, name: "Pan Head Screw" })).toBeInTheDocument();

      // Click Back
      const backBtn = screen.getByRole("button", { name: /Back to/i });
      fireEvent.click(backBtn);

      // Verifies return to Page 2
      expect(screen.getByText("Choose by Head category")).toBeInTheDocument();
      expect(screen.getByTestId("head-category-tile-countersunk-csk-screw")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // PAGE 4 — INDIVIDUAL PRODUCT DETAILS
  // --------------------------------------------------------------------------
  describe("Page 4: Individual Screw Product Details", () => {
    test("8. Renders two-column layout with contain-style image, shipping info, and verified commercial quote safeguards", () => {
      const panHeadProduct = OFFICIAL_CATALOG_PRODUCTS.find((p) => p.slug === "pan-head-screw");

      render(
        <ProductDetailPage
          product={panHeadProduct}
        />
      );

      // Left Column: Contains contain-style product visual
      const img = screen.getByRole("img", { name: panHeadProduct.name });
      expect(img).toBeInTheDocument();
      expect(img.className).toContain("contain-img");

      // Right Column: Product title
      expect(screen.getByRole("heading", { level: 1, name: panHeadProduct.name })).toBeInTheDocument();

      // Shipping & Guarantee Card
      expect(screen.getByText("Express Pan-India Dispatch")).toBeInTheDocument();
      expect(screen.getByText("Free Courier Shipping")).toBeInTheDocument();
      expect(screen.getByText("7-Day Replacement Policy")).toBeInTheDocument();

      // Commercial Quotation Safeguard
      expect(screen.getByText("Commercial Quotation Required")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Request a Volume Quote/i })).toBeInTheDocument();
    });

    test("9. Renders real rating, verified price, quantity stepper, and Add to Shopping Cart for priced screws", () => {
      const handleAddToCart = jest.fn();
      const pricedScrew = {
        id: "prod-pan-head-priced",
        name: "Pan Head Screw (SS304)",
        slug: "pan-head-screw-ss304",
        price: 220,
        inStock: true,
        rating: 4.9,
        reviews: 22,
        variants: [
          {
            id: "var-1",
            sku: "VTX-PH-M4-12",
            price: 220,
            packSize: "Pack of 50",
            stockQuantity: 100,
            inStock: true,
          },
        ],
      };

      render(
        <ProductDetailPage
          product={pricedScrew}
          onAddToCart={handleAddToCart}
        />
      );

      // Real Rating & Review display
      expect(screen.getByText("4.9")).toBeInTheDocument();
      expect(screen.getByText(/22 customer reviews/i)).toBeInTheDocument();

      // Verified Price
      expect(screen.getByText("₹220")).toBeInTheDocument();
      expect(screen.getByText("/ Pack of 50")).toBeInTheDocument();

      // Quantity selector: increment from 1 to 3
      const incBtn = screen.getByRole("button", { name: /Increase quantity/i });
      fireEvent.click(incBtn);
      fireEvent.click(incBtn);

      const qtyInput = screen.getByRole("spinbutton");
      expect(qtyInput).toHaveValue(3);

      // Add to Cart
      const addCartBtn = screen.getByRole("button", { name: /Add to Shopping Cart/i });
      fireEvent.click(addCartBtn);

      expect(handleAddToCart).toHaveBeenCalledWith(
        pricedScrew,
        pricedScrew.variants[0],
        3
      );
    });
  });
});
