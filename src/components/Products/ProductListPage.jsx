/**
 * VERTEX Product Catalogue & Listing Page
 * 
 * Complete, responsive industrial electronics and precision fastener catalog
 * with hierarchical parent/subcategory navigation, live search, faceted filters,
 * sorting, grid/list view toggle, and URL query persistence.
 * 
 * Updated with OnlyScrews.in inspired screw catalogue browsing patterns:
 * - Dedicated screw-type category navigation & subcategory filters
 * - Authentic screw drive and head type filter chips
 * - Clean industrial hardware grid presentation
 * - Multi-parameter search across specs, drive type, standards, and dimensions
 * - Informative count, active filter indicators, and empty-state recovery
 */

import React, { useState, useEffect, useMemo } from "react";
import ProductCard from "./ProductCard";
import QuoteModal from "./QuoteModal";


/**
 * Helper to identify text-only electronic products (Categories 3, 4, 5, 6)
 * Strict rule: NO images, NO thumbnails, NO empty placeholders.
 */
function isTextOnlyProduct(product) {
  if (!product) return false;
  if (product.isTextOnly === true || product.subcategory?.textOnly === true) return true;
  const sub = (product.subcategory?.slug || "").toLowerCase();
  return (
    sub.startsWith("hvnex-") ||
    sub === "hvnex-microcontrollers" ||
    sub === "hvnex-motor-drivers" ||
    sub === "hvnex-plc-controllers" ||
    sub === "hvnex-buck-converters"
  );
}

function isFastenerProduct(product) {
  if (!product) return false;
  const cat = (product.category?.slug || product.categoryId || "").toLowerCase();
  return cat === "fasteners" || cat === "cat-fasteners" || cat === "nuts" || cat === "cat-nuts";
}

/**
 * Compact, professional text-based product row for Categories 3, 4, 5, 6
 * Contains NO thumbnails, NO image placeholders, and NO empty image containers.
 */
function TextProductRow({ product, onAddToCart, onViewDetails }) {
  const primaryVariant = product.variants?.[0];
  const sku = primaryVariant?.sku || product.sku || `VTX-${(product.slug || "").toUpperCase()}`;
  const hasPrice = product.price !== null && product.price !== undefined;
  const inStock = product.inStock !== false;

  return (
    <div className="vtx-text-product-row" data-testid={`text-product-${product.id || product.slug}`}>
      <div className="vtx-text-row-main">
        <div className="vtx-text-row-header">
          <h4
            className="vtx-text-row-name"
            onClick={() => onViewDetails && onViewDetails(product)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onViewDetails && onViewDetails(product);
            }}
            title="Click to view verified technical specifications"
          >
            {product.name}
          </h4>
          <div className="vtx-text-row-meta">
            <code className="vtx-text-sku">SKU: {sku}</code>
            {product.brand && <span className="vtx-text-brand-badge">{product.brand}</span>}
            {product.tag && <span className="vtx-text-tag-badge">{product.tag}</span>}
          </div>
        </div>

        {/* Verified Technical Specification Chips */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="vtx-text-row-specs">
            {Object.entries(product.specs).map(([key, val]) => (
              <span className="vtx-text-spec-chip" key={key} title={`${key}: ${val}`}>
                <strong className="vtx-spec-key">{key}:</strong> {val}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="vtx-text-row-actions">
        <div className="vtx-text-row-price-wrap">
          {hasPrice ? (
            <span className="vtx-text-price">₹{Number(product.price).toLocaleString("en-IN")}</span>
          ) : (
            <div className="vtx-text-quote-box">
              <span className="vtx-text-quote">Quote on Request</span>
              <span className="vtx-text-quote-sub">Commercial Pricing</span>
            </div>
          )}
          <span className={`vtx-text-stock-tag ${inStock ? "in-stock" : "out-stock"}`}>
            {inStock ? "● In Stock" : "○ Pre-Order"}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary vtx-btn-text-cart"
          onClick={() => onAddToCart && onAddToCart(product, primaryVariant)}
          data-testid={`add-to-cart-${product.id || product.slug}`}
          aria-label={`Add ${product.name} to cart`}
        >
          🛒 Add to Cart
        </button>
      </div>
    </div>
  );
}

export default function ProductListPage({
  categories = [],
  products = [],
  loading = false,
  error = null,
  initialCategory = "all",
  initialSubcat = "all",
  initialSearch = "",
  onAddToCart,
  onViewDetails,
  onNavigateHome,
  currentUser,
}) {
  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "all");
  const [selectedSubcat, setSelectedSubcat] = useState(initialSubcat || "all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedDrive, setSelectedDrive] = useState("all");
  const [selectedHead, setSelectedHead] = useState("all");
  const [selectedSpec, setSelectedSpec] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [activeSearch, setActiveSearch] = useState(initialSearch || "");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Quote modal state
  const [quoteProduct, setQuoteProduct] = useState(null);

  // Sync with prop changes (e.g. from nav clicks)
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSubcat) setSelectedSubcat(initialSubcat);
  }, [initialSubcat]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
      setActiveSearch(initialSearch);
    }
  }, [initialSearch]);

  // Update browser URL query params whenever filters change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedSubcat && selectedSubcat !== "all") params.set("subcat", selectedSubcat);
    if (selectedBrand && selectedBrand !== "all") params.set("brand", selectedBrand);
    if (selectedDrive && selectedDrive !== "all") params.set("drive", selectedDrive);
    if (selectedHead && selectedHead !== "all") params.set("head", selectedHead);
    if (activeSearch) params.set("q", activeSearch);
    if (sortBy && sortBy !== "featured") params.set("sort", sortBy);
    if (inStockOnly) params.set("inStock", "true");

    const newSearch = params.toString() ? `?${params.toString()}` : "";
    const currentPath = window.location.pathname.startsWith("/product") ? "/products" : window.location.pathname;
    const targetUrl = `${currentPath}${newSearch}`;

    if (window.location.search !== newSearch) {
      window.history.replaceState(null, "", targetUrl);
    }
  }, [selectedCategory, selectedSubcat, selectedBrand, selectedDrive, selectedHead, activeSearch, sortBy, inStockOnly]);

  // Derive available subcategories based on current parent category
  const activeParentCategory = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return null;
    return categories.find(
      (c) => c.slug?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [categories, selectedCategory]);

  const availableSubcategories = useMemo(() => {
    if (activeParentCategory?.children && activeParentCategory.children.length > 0) {
      return activeParentCategory.children.filter((sub) => sub.isActive !== false);
    }
    // Collect all subcategories if "all" is selected
    const allSubs = [];
    categories.filter((cat) => cat.isActive !== false).forEach((cat) => {
      if (cat.children) {
        cat.children.filter((sub) => sub.isActive !== false).forEach((sub) => {
          if (!allSubs.some((s) => s.slug === sub.slug)) {
            allSubs.push(sub);
          }
        });
      }
    });
    return allSubs;
  }, [activeParentCategory, categories]);

  // Derive list of all unique brands in the catalog (official products only)
  const availableBrands = useMemo(() => {
    const brandsSet = new Set();
    products
      .filter((p) => p.isOfficialCatalog !== false)
      .forEach((p) => {
        if (p.brand) brandsSet.add(p.brand);
      });
    return Array.from(brandsSet).sort();
  }, [products]);

  // Check if viewing Fasteners / Screws
  const isViewingFastenersOrScrews = useMemo(() => {
    return (
      selectedCategory === "fasteners" ||
      selectedCategory === "cat-fasteners" ||
      selectedSubcat.startsWith("screws-") ||
      selectedSubcat === "nuts" ||
      selectedSubcat === "washers" ||
      selectedSubcat === "brass-inserts"
    );
  }, [selectedCategory, selectedSubcat]);

  // Filter products locally (or from props)
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 0. Only official catalog products (excludes demo / test fixtures)
    list = list.filter((p) => p.isOfficialCatalog !== false);

    // 1. Only active products & products in active categories (Storefront requirement)
    list = list.filter((p) => p.isActive !== false);
    if (categories.length > 0) {
      const activeCategoryIds = new Set(
        categories.filter((c) => c.isActive !== false).map((c) => c.id)
      );
      const activeCategorySlugs = new Set(
        categories.filter((c) => c.isActive !== false).map((c) => c.slug?.toLowerCase())
      );
      list = list.filter((p) => {
        const catId = p.categoryId || p.category?.id;
        const catSlug = p.category?.slug?.toLowerCase();
        if (catId && activeCategoryIds.has(catId)) return true;
        if (catSlug && activeCategorySlugs.has(catSlug)) return true;
        if (!catId && !catSlug) return true;
        return false;
      });
    }

    // 1. Keyword search (case-insensitive across name, specs, brand, SKU, partNumber)
    if (activeSearch && activeSearch.trim()) {
      const term = activeSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const matchName = p.name?.toLowerCase().includes(term);
        const matchDesc = p.description?.toLowerCase().includes(term);
        const matchBrand = p.brand?.toLowerCase().includes(term);
        const matchTag = p.tag?.toLowerCase().includes(term);
        const matchSubcat = p.subcategory?.name?.toLowerCase().includes(term);
        const matchSku = p.variants?.some(
          (v) =>
            v.sku?.toLowerCase().includes(term) ||
            v.partNumber?.toLowerCase().includes(term) ||
            v.name?.toLowerCase().includes(term) ||
            v.dimensions?.toLowerCase().includes(term)
        );
        const matchSpecs = p.specs
          ? Object.entries(p.specs).some(
            ([k, v]) => k.toLowerCase().includes(term) || String(v).toLowerCase().includes(term)
          )
          : false;
        return matchName || matchDesc || matchBrand || matchTag || matchSubcat || matchSku || matchSpecs;
      });
    }

    // 2. Parent Category
    if (selectedCategory && selectedCategory !== "all") {
      const catSlug = selectedCategory.toLowerCase();
      list = list.filter(
        (p) =>
          p.category?.slug?.toLowerCase() === catSlug ||
          p.categoryId?.toLowerCase() === catSlug
      );
    }

    // 3. Subcategory
    if (selectedSubcat && selectedSubcat !== "all") {
      const subSlug = selectedSubcat.toLowerCase();
      list = list.filter(
        (p) =>
          p.subcategory?.slug?.toLowerCase() === subSlug ||
          p.subcategory?.id?.toLowerCase() === subSlug
      );
    }

    // 4. Drive Type Filter (OnlyScrews pattern)
    if (selectedDrive && selectedDrive !== "all") {
      const driveTerm = selectedDrive.toLowerCase();
      list = list.filter((p) => {
        const drive = (p.specs?.["Drive Type"] || "").toLowerCase();
        return drive.includes(driveTerm);
      });
    }

    // 5. Head Type Filter (OnlyScrews pattern)
    if (selectedHead && selectedHead !== "all") {
      const headTerm = selectedHead.toLowerCase();
      list = list.filter((p) => {
        const head = (p.specs?.["Head Type"] || "").toLowerCase();
        return head.includes(headTerm);
      });
    }

    // 6. Brand
    if (selectedBrand && selectedBrand !== "all") {
      list = list.filter((p) => p.brand?.toLowerCase() === selectedBrand.toLowerCase());
    }

    // 7. In-Stock only
    if (inStockOnly) {
      list = list.filter((p) => p.inStock !== false);
    }

    // 8. Specification tag quick filter
    if (selectedSpec && selectedSpec !== "all") {
      list = list.filter((p) => {
        if (!p.specs) return false;
        if (selectedSpec === "ev_grade") {
          return p.specs["Grade"]?.includes("EV") || p.tag?.includes("EV");
        }
        if (selectedSpec === "cell_18650") {
          return p.specs["Cell Format"]?.includes("18650");
        }
        if (selectedSpec === "cell_21700") {
          return p.specs["Cell Format"]?.includes("21700");
        }
        if (selectedSpec === "hex_drive") {
          return p.specs["Drive Type"]?.includes("Hex");
        }
        if (selectedSpec === "phillips_drive") {
          return p.specs["Drive Type"]?.includes("Phillips");
        }
        if (selectedSpec === "slotted_drive") {
          return p.specs["Drive Type"]?.includes("Slotted") || p.specs["Drive Type"]?.includes("Flat");
        }
        if (selectedSpec === "ss304") {
          return p.specs["Material Grade"]?.includes("SS304");
        }
        if (selectedSpec === "ss316") {
          return p.specs["Material Grade"]?.includes("SS316");
        }
        return true;
      });
    }

    // 9. Sorting
    if (sortBy === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => {
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return Number(a.price) - Number(b.price);
      });
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => {
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return Number(b.price) - Number(a.price);
      });
    }

    return list;
  }, [
    products,
    activeSearch,
    selectedCategory,
    selectedSubcat,
    selectedDrive,
    selectedHead,
    selectedBrand,
    inStockOnly,
    selectedSpec,
    sortBy,
    categories,
  ]);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
  };

  const handleClearAllFilters = () => {
    setSelectedCategory("all");
    setSelectedSubcat("all");
    setSelectedBrand("all");
    setSelectedDrive("all");
    setSelectedHead("all");
    setSelectedSpec("all");
    setInStockOnly(false);
    setSearchQuery("");
    setActiveSearch("");
    setSortBy("featured");
  };

  const handleCategoryTabClick = (catSlug) => {
    setSelectedCategory(catSlug);
    setSelectedSubcat("all"); // Reset subcategory when switching parent
    setSelectedDrive("all");
    setSelectedHead("all");
  };

  const hasActiveFilters =
    (selectedCategory && selectedCategory !== "all") ||
    (selectedSubcat && selectedSubcat !== "all") ||
    (selectedBrand && selectedBrand !== "all") ||
    (selectedDrive && selectedDrive !== "all") ||
    (selectedHead && selectedHead !== "all") ||
    (selectedSpec && selectedSpec !== "all") ||
    inStockOnly ||
    activeSearch;

  // Breadcrumb current label
  const activeSubcatObj = availableSubcategories.find((s) => s.slug === selectedSubcat);

  return (
    <div className="vtx-catalog-page" data-testid="product-catalogue-page">
      {/* Breadcrumb Navigation */}
      <nav className="vtx-breadcrumbs" aria-label="Breadcrumb">
        <div className="vtx-breadcrumbs-inner">
          <button
            type="button"
            className="vtx-breadcrumb-link"
            onClick={onNavigateHome}
          >
            Home
          </button>
          <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
          <button
            type="button"
            className={`vtx-breadcrumb-link ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => handleCategoryTabClick("all")}
          >
            Catalog
          </button>
          {activeParentCategory && (
            <>
              <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
              <button
                type="button"
                className={`vtx-breadcrumb-link ${selectedSubcat === "all" ? "active" : ""}`}
                onClick={() => setSelectedSubcat("all")}
              >
                {activeParentCategory.name}
              </button>
            </>
          )}
          {selectedSubcat !== "all" && (
            <>
              <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
              <span className="vtx-breadcrumb-current">
                {activeSubcatObj?.name || selectedSubcat}
              </span>
            </>
          )}
        </div>
      </nav>

      {/* Catalogue Hero & Header */}
      <section className="vtx-catalog-header">
        <div className="vtx-catalog-header-inner">
          <div className="vtx-catalog-title-col">
            <span className="vtx-catalog-badge">
              {isViewingFastenersOrScrews
                ? "Official Screws & Fasteners Catalogue"
                : "Verified Engineering Supplies"}
            </span>
            <h1 className="vtx-catalog-heading">
              {selectedSubcat !== "all"
                ? activeSubcatObj?.name || selectedSubcat
                : activeParentCategory
                  ? activeParentCategory.name
                  : "Industrial Hardware & Electronics Catalogue"}
            </h1>
            <p className="vtx-catalog-sub">
              {isViewingFastenersOrScrews
                ? "Browse certified precision machine screws, slotted, Phillips cross recess, and hex socket fasteners compliant with DIN, ISO, and IS standards."
                : activeParentCategory?.description ||
                "Browse factory-certified lithium-ion cells, precision machine screws, metric nuts, development microcontrollers, and high-power motor drivers."}
            </p>
          </div>
          <div className="vtx-catalog-header-actions">
            <div className="vtx-catalog-count-pill" aria-live="polite">
            <span className="vtx-count-number">{filteredProducts.length}</span>
            <span className="vtx-count-label">
              {filteredProducts.length === 1 ? "Product Found" : "Products Found"}
            </span>
          </div>
            <button
              type="button"
              className="btn btn-outline vtx-header-rfq-btn"
              onClick={() => setQuoteProduct(filteredProducts[0] || { name: "Commercial Price Quote" })}
              title="Request a Commercial Price Quote"
              aria-label="Request Quote"
            >
              📋 Request Quote
            </button>
          </div>
        </div>
      </section>

      {/* Parent Category Horizontal Selector Strip */}
      <section className="vtx-category-nav-strip" aria-label="Parent categories">
        <div className="vtx-category-strip-inner">
          <button
            type="button"
            className={`vtx-cat-chip ${selectedCategory === "all" ? "is-active" : ""}`}
            onClick={() => handleCategoryTabClick("all")}
          >
            <span className="chip-icon">📦</span> All Products
          </button>
          {categories.filter((cat) => cat.isActive !== false).map((cat) => (
            <button
              type="button"
              key={cat.id || cat.slug}
              className={`vtx-cat-chip ${selectedCategory === cat.slug ? "is-active" : ""}`}
              onClick={() => handleCategoryTabClick(cat.slug)}
            >
              <span className="chip-icon">{cat.icon || "🔧"}</span> {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Screws & Fasteners Subcategory Strip (OnlyScrews inspired quick category navigation) */}
      {availableSubcategories.length > 0 && (
        <section className="vtx-subcat-strip" aria-label="Subcategories">
          <div className="vtx-subcat-inner">
            <span className="vtx-subcat-label">
              {isViewingFastenersOrScrews ? "Screw & Fastener Types:" : "Subcategories:"}
            </span>
            <button
              type="button"
              className={`vtx-subcat-pill ${selectedSubcat === "all" ? "is-active" : ""}`}
              onClick={() => setSelectedSubcat("all")}
            >
              All {activeParentCategory ? activeParentCategory.name : "Subcategories"}
            </button>
            {availableSubcategories.map((sub) => {
              // Add subtle drive icon for screw types
              let icon = "";
              if (sub.slug === "screws-flat-slotted") icon = "━ ";
              else if (sub.slug === "screws-cross-phillips") icon = "✚ ";
              else if (sub.slug === "screws-hex-allen") icon = "⬡ ";
              else if (sub.slug === "nuts") icon = "🔩 ";
              else if (sub.slug === "washers") icon = "◯ ";
              else if (sub.slug === "brass-inserts") icon = "⚙ ";

              return (
                <button
                  type="button"
                  key={sub.id || sub.slug}
                  aria-label={sub.name}
                  className={`vtx-subcat-pill ${selectedSubcat === sub.slug ? "is-active" : ""}`}
                  onClick={() => setSelectedSubcat(sub.slug)}
                >
                  <span aria-hidden="true">{icon}</span>{sub.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content Area: Sidebar Filters + Product Grid */}
      <div className="vtx-catalog-layout">
        {/* Mobile Filter Toggle Button */}
        <div className="vtx-mobile-filter-bar">
          <button
            type="button"
            className="btn btn-outline vtx-filter-toggle-btn"
            onClick={() => setMobileFilterOpen(true)}
            aria-expanded={mobileFilterOpen}
          >
            <span>⚙️ Filters</span>
            {hasActiveFilters && <span className="filter-active-dot" />}
          </button>

          {/* Quick sorting dropdown on mobile */}
          <div className="vtx-quick-sort">
            <label htmlFor="mobile-sort-select" className="sr-only">Sort by</label>
            <select
              id="mobile-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="vtx-sort-select"
            >
              <option value="featured">Featured Order</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Sidebar Filters */}
        <aside className={`vtx-catalog-sidebar ${mobileFilterOpen ? "is-mobile-open" : ""}`}>
          <div className="vtx-sidebar-header">
            <h3>Filters &amp; Refinements</h3>
            {mobileFilterOpen && (
              <button
                type="button"
                className="vtx-sidebar-close"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search inside catalog */}
          <div className="vtx-filter-group">
            <label className="vtx-filter-title" htmlFor="sidebar-search-input">
              Keyword Search
            </label>
            <form onSubmit={handleSearchSubmit} className="vtx-sidebar-search">
              <input
                id="sidebar-search-input"
                type="text"
                placeholder="Search specs, part numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-input"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="btn-filter-search" aria-label="Submit search">
                🔍
              </button>
            </form>
          </div>

          {/* Parent Category Filter */}
          <div className="vtx-filter-group">
            <label className="vtx-filter-title" htmlFor="cat-filter-select">
              Parent Category
            </label>
            <select
              id="cat-filter-select"
              className="vtx-select-input"
              value={selectedCategory}
              onChange={(e) => handleCategoryTabClick(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {availableSubcategories.length > 0 && (
            <div className="vtx-filter-group">
              <label className="vtx-filter-title" htmlFor="subcat-filter-select">
                {isViewingFastenersOrScrews ? "Screw / Fastener Type" : "Subcategory"}
              </label>
              <select
                id="subcat-filter-select"
                className="vtx-select-input"
                value={selectedSubcat}
                onChange={(e) => setSelectedSubcat(e.target.value)}
              >
                <option value="all">All Subcategories</option>
                {availableSubcategories.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Screw Drive Type Filter (OnlyScrews inspired) */}
          {isViewingFastenersOrScrews && (
            <div className="vtx-filter-group">
              <label className="vtx-filter-title" htmlFor="drive-filter-select">
                Screw Drive Type
              </label>
              <select
                id="drive-filter-select"
                className="vtx-select-input"
                value={selectedDrive}
                onChange={(e) => setSelectedDrive(e.target.value)}
              >
                <option value="all">All Drive Types</option>
                <option value="hex">⬡ Hex (Allen)</option>
                <option value="cross">✚ Cross (Phillips)</option>
                <option value="slotted">━ Flat (Slotted)</option>
              </select>
            </div>
          )}

          {/* Screw Head Type Filter (OnlyScrews inspired) */}
          {isViewingFastenersOrScrews && (
            <div className="vtx-filter-group">
              <label className="vtx-filter-title" htmlFor="head-filter-select">
                Screw Head Profile
              </label>
              <select
                id="head-filter-select"
                className="vtx-select-input"
                value={selectedHead}
                onChange={(e) => setSelectedHead(e.target.value)}
              >
                <option value="all">All Head Profiles</option>
                <option value="socket">Socket Head (DIN 912)</option>
                <option value="pan">Pan Head (DIN 7985 / 7981)</option>
                <option value="countersunk">Countersunk CSK 90° (DIN 965 / 7991)</option>
                <option value="button">Button Head (ISO 7380)</option>
                <option value="chhd">Cheese Head CHHD (IS Metric)</option>
                <option value="bugle">Bugle Head (Drywall)</option>
              </select>
            </div>
          )}

          {/* Brand / Manufacturer Filter */}
          {availableBrands.length > 0 && (
            <div className="vtx-filter-group">
              <label className="vtx-filter-title" htmlFor="brand-filter-select">
                Manufacturer / Brand
              </label>
              <select
                id="brand-filter-select"
                className="vtx-select-input"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option value="all">All Manufacturers</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Technical Specification Facet Filter */}
          <div className="vtx-filter-group">
            <label className="vtx-filter-title" htmlFor="spec-filter-select">
              Technical Specification
            </label>
            <select
              id="spec-filter-select"
              className="vtx-select-input"
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
            >
              <option value="all">All Specifications</option>
              <option value="ss304">SS304 Stainless Steel</option>
              <option value="ss316">SS316 Marine Grade</option>
              <option value="hex_drive">Hex (Allen) Fasteners</option>
              <option value="phillips_drive">Phillips Cross Fasteners</option>
              <option value="slotted_drive">Slotted Flat Fasteners</option>
              <option value="ev_grade">EV Grade Battery Cells</option>
              <option value="cell_18650">18650 Cell Format</option>
              <option value="cell_21700">21700 Cell Format</option>
            </select>
          </div>

          {/* Availability / In-Stock toggle */}
          <div className="vtx-filter-group">
            <label className="vtx-checkbox-label">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>In-Stock Ready for Dispatch</span>
            </label>
          </div>

          {/* Reset All Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline vtx-btn-reset-filters"
              onClick={handleClearAllFilters}
            >
              ✕ Clear All Filters
            </button>
          )}

          {mobileFilterOpen && (
            <button
              type="button"
              className="btn btn-primary vtx-btn-apply-mobile"
              onClick={() => setMobileFilterOpen(false)}
            >
              Apply Filters ({filteredProducts.length} Results)
            </button>
          )}
        </aside>

        {/* Catalog Main Panel */}
        <main className="vtx-catalog-main">
          {/* Controls Bar: Active Filter Chips, Sort Dropdown, Grid/List view */}
          <div className="vtx-catalog-controls-bar">
            {/* Active filter chips */}
            <div className="vtx-active-chips-wrap">
              {hasActiveFilters ? (
                <>
                  <span className="vtx-active-filter-label">Active:</span>
                  {activeSearch && (
                    <span className="vtx-filter-chip">
                      Query: "{activeSearch}"
                      <button type="button" onClick={handleClearSearch} aria-label="Remove search filter">✕</button>
                    </span>
                  )}
                  {selectedCategory !== "all" && (
                    <span className="vtx-filter-chip">
                      Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                      <button type="button" onClick={() => setSelectedCategory("all")} aria-label="Remove category filter">✕</button>
                    </span>
                  )}
                  {selectedSubcat !== "all" && (
                    <span className="vtx-filter-chip">
                      Sub: {activeSubcatObj?.name || selectedSubcat}
                      <button type="button" onClick={() => setSelectedSubcat("all")} aria-label="Remove subcategory filter">✕</button>
                    </span>
                  )}
                  {selectedDrive !== "all" && (
                    <span className="vtx-filter-chip">
                      Drive: {selectedDrive.toUpperCase()}
                      <button type="button" onClick={() => setSelectedDrive("all")} aria-label="Remove drive filter">✕</button>
                    </span>
                  )}
                  {selectedHead !== "all" && (
                    <span className="vtx-filter-chip">
                      Head: {selectedHead.toUpperCase()}
                      <button type="button" onClick={() => setSelectedHead("all")} aria-label="Remove head filter">✕</button>
                    </span>
                  )}
                  {selectedBrand !== "all" && (
                    <span className="vtx-filter-chip">
                      Brand: {selectedBrand}
                      <button type="button" onClick={() => setSelectedBrand("all")} aria-label="Remove brand filter">✕</button>
                    </span>
                  )}
                  {selectedSpec !== "all" && (
                    <span className="vtx-filter-chip">
                      Spec: {selectedSpec.replace("_", " ").toUpperCase()}
                      <button type="button" onClick={() => setSelectedSpec("all")} aria-label="Remove specification filter">✕</button>
                    </span>
                  )}
                  {inStockOnly && (
                    <span className="vtx-filter-chip">
                      In Stock Only
                      <button type="button" onClick={() => setInStockOnly(false)} aria-label="Remove in stock filter">✕</button>
                    </span>
                  )}
                  <button
                    type="button"
                    className="vtx-clear-all-link"
                    onClick={handleClearAllFilters}
                  >
                    Clear All
                  </button>
                </>
              ) : (
                <span className="vtx-showing-all-text">
                  Showing {filteredProducts.length} verified catalogue products
                </span>
              )}
            </div>

            {/* Desktop Sorting & View switch */}
            <div className="vtx-controls-right">
              <div className="vtx-sort-wrap">
                <label htmlFor="desktop-sort-select">Sort By:</label>
                <select
                  id="desktop-sort-select"
                  className="vtx-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="featured">Featured Relevance</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              {/* Grid vs List view toggle */}
              <div className="vtx-view-mode-toggle" role="group" aria-label="Layout view mode">
                <button
                  type="button"
                  className={`vtx-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  aria-pressed={viewMode === "grid"}
                >
                  田
                </button>
                <button
                  type="button"
                  className={`vtx-view-btn ${viewMode === "list" ? "is-active" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="List View (Technical Specs Table)"
                  aria-pressed={viewMode === "list"}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="product-grid" role="status" aria-label="Loading products">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div className="product-card-skeleton" key={n}>
                  <div className="skeleton-thumb" />
                  <div className="skeleton-body">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-price" />
                    <div className="skeleton-line skeleton-btn" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="catalog-error-state" role="alert">
              <div className="error-icon" aria-hidden="true">⚠️</div>
              <h3>Unable to Load Products</h3>
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClearAllFilters}
              >
                ↻ Reset Filters
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Empty State */
            <div className="catalog-empty-state" role="status">
              <div className="empty-state-icon" aria-hidden="true">🔍</div>
              <h3>No matching products found</h3>
              <p>
                {activeSearch
                  ? `We could not find any engineering components or fasteners matching "${activeSearch}".`
                  : "No products match the selected category or specification filter combination."}
              </p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleClearAllFilters}
                >
                  Clear All Filters
                </button>
                {activeParentCategory && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedCategory(activeParentCategory.slug);
                      setSelectedSubcat("all");
                      setSelectedBrand("all");
                      setSelectedDrive("all");
                      setSelectedHead("all");
                      setActiveSearch("");
                      setSearchQuery("");
                    }}
                  >
                    View All {activeParentCategory.name}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Product Catalogue: Fasteners First, Electronic Products Second */
            viewMode === "list" ? (
              <div className="product-list-view">
                {filteredProducts.map((p, idx) => (
                  isTextOnlyProduct(p) ? (
                    <TextProductRow
                      key={p.id || p.slug}
                      product={p}
                      onAddToCart={onAddToCart}
                      onViewDetails={onViewDetails}
                    />
                  ) : (
                    <ProductCard
                      key={p.id || p.slug}
                      product={p}
                      viewMode="list"
                      onAddToCart={onAddToCart}
                      onViewDetails={onViewDetails}
                      onRequestQuote={(prod) => setQuoteProduct(prod)}
                      revealIndex={idx}
                    />
                  )
                ))}
              </div>
            ) : (
              /* Grid Mode with Structured Catalogue Sections */
              <div className="vtx-catalogue-sections-wrap">
                {/* 1. Fasteners Section (FIRST per PDF specification) */}
                {filteredProducts.some(isFastenerProduct) && (
                  <section className="vtx-catalogue-section vtx-fasteners-catalogue-section">
                    <div className="vtx-section-banner">
                      <div className="vtx-section-banner-title">
                        <span className="vtx-section-num-tag">SECTION 1</span>
                        <h2>Precision Fasteners & Screws</h2>
                      </div>
                      <span className="vtx-section-count-tag">
                        {filteredProducts.filter(isFastenerProduct).length} Products
                      </span>
                    </div>

                    <div className="product-grid">
                      {filteredProducts.filter(isFastenerProduct).map((p, idx) => (
                        <ProductCard
                          key={p.id || p.slug}
                          product={p}
                          viewMode="grid"
                          onAddToCart={onAddToCart}
                          onViewDetails={onViewDetails}
                          onRequestQuote={(prod) => setQuoteProduct(prod)}
                          revealIndex={idx}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 2. Electronic Products Section (SECOND per PDF specification) */}
                {filteredProducts.some((p) => !isFastenerProduct(p)) && (
                  <section className="vtx-catalogue-section vtx-electronics-catalogue-section">
                    <div className="vtx-section-banner vtx-section-banner-electronics">
                      <div className="vtx-section-banner-title">
                        <span className="vtx-section-num-tag">SECTION 2</span>
                        <h2>Electronic Products & Embedded Systems</h2>
                      </div>
                      <span className="vtx-section-count-tag">
                        {filteredProducts.filter((p) => !isFastenerProduct(p)).length} Products
                      </span>
                    </div>

                    {/* FIRST: Categories 3, 4, 5, 6 - Strictly Text-Only Lists (NO IMAGES) */}
                    {filteredProducts.some(isTextOnlyProduct) && (
                      <div className="vtx-textonly-categories-wrapper">
                        {/* 3. HVNEX – Microcontroller Boards */}
                        {filteredProducts.filter((p) => p.subcategory?.slug === "hvnex-microcontrollers").length > 0 && (
                          <div className="vtx-text-category-card">
                            <div className="vtx-text-category-header">
                              <span className="vtx-text-cat-num">3</span>
                              <div className="vtx-text-cat-headings">
                                <h3>HVNEX – Microcontroller Boards</h3>
                                <span className="vtx-text-cat-subtitle">Compact Technical Listing • No Images</span>
                              </div>
                            </div>
                            <div className="vtx-text-rows-container">
                              {filteredProducts
                                .filter((p) => p.subcategory?.slug === "hvnex-microcontrollers")
                                .map((p) => (
                                  <TextProductRow
                                    key={p.id || p.slug}
                                    product={p}
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                  />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 4. HVNEX – DC Motor Drivers */}
                        {filteredProducts.filter((p) => p.subcategory?.slug === "hvnex-motor-drivers").length > 0 && (
                          <div className="vtx-text-category-card">
                            <div className="vtx-text-category-header">
                              <span className="vtx-text-cat-num">4</span>
                              <div className="vtx-text-cat-headings">
                                <h3>HVNEX – DC Motor Drivers</h3>
                                <span className="vtx-text-cat-subtitle">Compact Technical Listing • No Images</span>
                              </div>
                            </div>
                            <div className="vtx-text-rows-container">
                              {filteredProducts
                                .filter((p) => p.subcategory?.slug === "hvnex-motor-drivers")
                                .map((p) => (
                                  <TextProductRow
                                    key={p.id || p.slug}
                                    product={p}
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                  />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 5. HVNEX – PLC Controller */}
                        {filteredProducts.filter((p) => p.subcategory?.slug === "hvnex-plc-controllers").length > 0 && (
                          <div className="vtx-text-category-card">
                            <div className="vtx-text-category-header">
                              <span className="vtx-text-cat-num">5</span>
                              <div className="vtx-text-cat-headings">
                                <h3>HVNEX – PLC Controller</h3>
                                <span className="vtx-text-cat-subtitle">Compact Technical Listing • No Images</span>
                              </div>
                            </div>
                            <div className="vtx-text-rows-container">
                              {filteredProducts
                                .filter((p) => p.subcategory?.slug === "hvnex-plc-controllers")
                                .map((p) => (
                                  <TextProductRow
                                    key={p.id || p.slug}
                                    product={p}
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                  />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 6. HVNEX – DC-DC Buck Converters */}
                        {filteredProducts.filter((p) => p.subcategory?.slug === "hvnex-buck-converters").length > 0 && (
                          <div className="vtx-text-category-card">
                            <div className="vtx-text-category-header">
                              <span className="vtx-text-cat-num">6</span>
                              <div className="vtx-text-cat-headings">
                                <h3>HVNEX – DC-DC Buck Converters</h3>
                                <span className="vtx-text-cat-subtitle">Compact Technical Listing • No Images</span>
                              </div>
                            </div>
                            <div className="vtx-text-rows-container">
                              {filteredProducts
                                .filter((p) => p.subcategory?.slug === "hvnex-buck-converters")
                                .map((p) => (
                                  <TextProductRow
                                    key={p.id || p.slug}
                                    product={p}
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                  />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Fallback for any other text-only items */}
                        {filteredProducts.filter((p) =>
                          isTextOnlyProduct(p) &&
                          p.subcategory?.slug !== "hvnex-microcontrollers" &&
                          p.subcategory?.slug !== "hvnex-motor-drivers" &&
                          p.subcategory?.slug !== "hvnex-plc-controllers" &&
                          p.subcategory?.slug !== "hvnex-buck-converters"
                        ).length > 0 && (
                          <div className="vtx-text-category-card">
                            <div className="vtx-text-category-header">
                              <span className="vtx-text-cat-num">HVNEX</span>
                              <div className="vtx-text-cat-headings">
                                <h3>HVNEX Specialized Controllers</h3>
                                <span className="vtx-text-cat-subtitle">Technical Listing • No Images</span>
                              </div>
                            </div>
                            <div className="vtx-text-rows-container">
                              {filteredProducts
                                .filter((p) =>
                                  isTextOnlyProduct(p) &&
                                  p.subcategory?.slug !== "hvnex-microcontrollers" &&
                                  p.subcategory?.slug !== "hvnex-motor-drivers" &&
                                  p.subcategory?.slug !== "hvnex-plc-controllers" &&
                                  p.subcategory?.slug !== "hvnex-buck-converters"
                                )
                                .map((p) => (
                                  <TextProductRow
                                    key={p.id || p.slug}
                                    product={p}
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                  />
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECOND: Categories 1 and 2 - Product Cards with Images */}
                    {filteredProducts.some((p) => !isFastenerProduct(p) && !isTextOnlyProduct(p)) && (
                      <div className="vtx-cards-categories-wrapper">
                        {/* 1. Lithium-Ion Batteries / Cells */}
                        {filteredProducts.filter((p) => p.subcategory?.slug === "lithium-ion-batteries").length > 0 && (
                          <div className="vtx-subcat-group-block">
                            <div className="vtx-subcat-group-header">
                              <span className="vtx-group-badge">Category 1</span>
                              <h3 className="vtx-group-title">Lithium-Ion Batteries / Cells</h3>
                              <span className="vtx-group-count">
                                {filteredProducts.filter((p) => p.subcategory?.slug === "lithium-ion-batteries").length} Verified Cells
                              </span>
                            </div>
                            <div className="product-grid">
                              {filteredProducts
                                .filter((p) => p.subcategory?.slug === "lithium-ion-batteries")
                                .map((p, idx) => (
                                  <ProductCard
                                    key={p.id || p.slug}
                                    product={p}
                                    viewMode="grid"
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                    onRequestQuote={(prod) => setQuoteProduct(prod)}
                                    revealIndex={idx}
                                  />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Electronic Components */}
                        {filteredProducts.filter((p) => p.subcategory?.slug === "electronic-components").length > 0 && (
                          <div className="vtx-subcat-group-block">
                            <div className="vtx-subcat-group-header">
                              <span className="vtx-group-badge">Category 2</span>
                              <h3 className="vtx-group-title">Electronic Components</h3>
                              <span className="vtx-group-count">
                                {filteredProducts.filter((p) => p.subcategory?.slug === "electronic-components").length} Components
                              </span>
                            </div>
                            <div className="product-grid">
                              {filteredProducts
                                .filter((p) => p.subcategory?.slug === "electronic-components")
                                .map((p, idx) => (
                                  <ProductCard
                                    key={p.id || p.slug}
                                    product={p}
                                    viewMode="grid"
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                    onRequestQuote={(prod) => setQuoteProduct(prod)}
                                    revealIndex={idx}
                                  />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Any other electronic products (e.g. preserved test items) */}
                        {filteredProducts.filter((p) =>
                          !isFastenerProduct(p) &&
                          !isTextOnlyProduct(p) &&
                          p.subcategory?.slug !== "lithium-ion-batteries" &&
                          p.subcategory?.slug !== "electronic-components"
                        ).length > 0 && (
                          <div className="vtx-subcat-group-block">
                            <div className="vtx-subcat-group-header">
                              <span className="vtx-group-badge">Hardware</span>
                              <h3 className="vtx-group-title">Additional Prototyping Electronics</h3>
                              <span className="vtx-group-count">
                                {filteredProducts.filter((p) =>
                                  !isFastenerProduct(p) &&
                                  !isTextOnlyProduct(p) &&
                                  p.subcategory?.slug !== "lithium-ion-batteries" &&
                                  p.subcategory?.slug !== "electronic-components"
                                ).length} Items
                              </span>
                            </div>
                            <div className="product-grid">
                              {filteredProducts
                                .filter((p) =>
                                  !isFastenerProduct(p) &&
                                  !isTextOnlyProduct(p) &&
                                  p.subcategory?.slug !== "lithium-ion-batteries" &&
                                  p.subcategory?.slug !== "electronic-components"
                                )
                                .map((p, idx) => (
                                  <ProductCard
                                    key={p.id || p.slug}
                                    product={p}
                                    viewMode="grid"
                                    onAddToCart={onAddToCart}
                                    onViewDetails={onViewDetails}
                                    onRequestQuote={(prod) => setQuoteProduct(prod)}
                                    revealIndex={idx}
                                  />
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )
          )}
        </main>
      </div>

      {/* Commercial Request a Quote Modal */}
      <QuoteModal
        product={quoteProduct}
        isOpen={Boolean(quoteProduct)}
        onClose={() => setQuoteProduct(null)}
        currentUser={currentUser}
      />
    </div>
  );
}
