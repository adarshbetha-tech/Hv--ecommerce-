/**
 * VERTEX Dedicated Product Detail Page
 * 
 * Provides an in-depth engineering specification sheet, verified technical parameters,
 * authentic pricing / quote requests, quantity configuration, cart integration,
 * wishlist toggle, and related component recommendations.
 * 
 * Updated with OnlyScrews.in hardware presentation patterns:
 * - Studio hardware photography showcase with angle/view gallery switcher
 * - Drive type, head profile, and DIN/ISO standard callouts
 * - Interactive variant selector updating verified specs and pricing in real time
 * - Strict quantity validation and shared cart / wishlist connectivity
 * - Comprehensive technical specifications table
 * - Related screws recommendations
 */

import React, { useState, useEffect } from "react";
import { ComponentIllustration } from "../../assets/hardware/componentVisuals";
import { isItemInWishlist, toggleWishlistItem } from "../../utils/wishlist";
import QuoteModal from "./QuoteModal";

export default function ProductDetailPage({
  product,
  relatedProducts = [],
  onAddToCart,
  onNavigateHome,
  onNavigateCatalog,
  onSelectRelatedProduct,
  currentUser,
}) {
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [activeImageAngle, setActiveImageAngle] = useState("front"); // "front" | "drive" | "blueprint"
  const [imgError, setImgError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(() => isItemInWishlist(product?.id || product?.slug));
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [addSuccessFeedback, setAddSuccessFeedback] = useState(false);

  useEffect(() => {
    if (product) {
      setIsWishlisted(isItemInWishlist(product.id || product.slug));
      setQuantity(1);
      setQuantityError(null);
      setSelectedVariantIdx(0);
      setActiveImageAngle("front");
      setImgError(false);
      setAddSuccessFeedback(false);
      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [product]);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (product) {
        setIsWishlisted(isItemInWishlist(product.id || product.slug));
      }
    };
    window.addEventListener("vertex_wishlist_updated", handleWishlistUpdate);
    return () => window.removeEventListener("vertex_wishlist_updated", handleWishlistUpdate);
  }, [product]);

  if (!product) {
    return (
      <div className="vtx-detail-page vtx-detail-not-found">
        <div className="catalog-empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h2>Product Not Found</h2>
          <p>The requested component could not be found in the VERTEX catalog or may have been retired.</p>
          <button type="button" className="btn btn-primary" onClick={onNavigateCatalog}>
            ← Back to Product Catalogue
          </button>
        </div>
      </div>
    );
  }

  const variants = product.variants || [];
  const selectedVariant = variants[selectedVariantIdx] || variants[0];
  const activePrice = selectedVariant?.price !== undefined && selectedVariant?.price !== null
    ? selectedVariant.price
    : product.price;
  const hasPrice = activePrice !== null && activePrice !== undefined && Number(activePrice) > 0;
  const inStock = product.inStock !== false && (selectedVariant ? selectedVariant.stockQuantity !== 0 : true);
  const skuCode = selectedVariant?.sku || product.sku || (product.slug ? `VTX-${product.slug.toUpperCase()}` : "VTX-GEN-SKU");
  const partNumber = selectedVariant?.partNumber || product.partNumber;

  const isBattery = product.subcategory?.slug === "lithium-ion-batteries" || (product.specs && product.specs["Cell Format"]);
  const isFastener =
    product.category?.slug === "fasteners" ||
    product.categoryId === "cat-fasteners" ||
    product.category?.slug === "nuts" ||
    (product.specs && (product.specs["Drive Type"] || product.specs["Head Type"]));

  // Hardware screw specific attributes
  const driveType = product.specs?.["Drive Type"] || "";
  const currentDimensions = selectedVariant?.dimensions || product.specs?.["Dimensions"] || product.specs?.["Thread Size"] || null;

  // Drive icon
  let driveIcon = "🔩";
  if (driveType.toLowerCase().includes("hex") || driveType.toLowerCase().includes("allen")) driveIcon = "⬡";
  else if (driveType.toLowerCase().includes("cross") || driveType.toLowerCase().includes("phillips")) driveIcon = "✚";
  else if (driveType.toLowerCase().includes("flat") || driveType.toLowerCase().includes("slotted")) driveIcon = "━";

  const handleQuantityChange = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      setQuantity(1);
      setQuantityError("Quantity must be at least 1.");
      return;
    }
    if (selectedVariant?.stockQuantity && num > selectedVariant.stockQuantity) {
      setQuantity(selectedVariant.stockQuantity);
      setQuantityError(`Maximum available stock is ${selectedVariant.stockQuantity} units.`);
      return;
    }
    setQuantityError(null);
    setQuantity(num);
  };

  const handleIncrement = () => {
    const next = quantity + 1;
    if (selectedVariant?.stockQuantity && next > selectedVariant.stockQuantity) {
      setQuantityError(`Maximum available stock is ${selectedVariant.stockQuantity} units.`);
      return;
    }
    setQuantityError(null);
    setQuantity(next);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantityError(null);
      setQuantity(quantity - 1);
    }
  };

  const handleWishlistToggle = () => {
    const updated = toggleWishlistItem(product);
    setIsWishlisted(updated);
  };

  const handleAddToCartClick = () => {
    if (!hasPrice) {
      setIsQuoteModalOpen(true);
      return;
    }
    if (onAddToCart) {
      onAddToCart(product, selectedVariant, quantity);
      setAddSuccessFeedback(true);
      setTimeout(() => setAddSuccessFeedback(false), 2500);
    }
  };

  // Structured specifications entries
  const specEntries = product.specs ? Object.entries(product.specs) : [];

  return (
    <div className="vtx-detail-page" data-testid={`product-detail-${product.slug}`}>
      {/* Breadcrumb Navigation */}
      <nav className="vtx-breadcrumbs" aria-label="Product breadcrumb">
        <div className="vtx-breadcrumbs-inner">
          <button type="button" className="vtx-breadcrumb-link" onClick={onNavigateHome}>
            Home
          </button>
          <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
          <button type="button" className="vtx-breadcrumb-link" onClick={onNavigateCatalog}>
            Catalogue
          </button>
          {product.category && (
            <>
              <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
              <button
                type="button"
                className="vtx-breadcrumb-link"
                onClick={() => onNavigateCatalog && onNavigateCatalog(product.category.slug)}
              >
                {product.category.name}
              </button>
            </>
          )}
          {product.subcategory && (
            <>
              <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
              <button
                type="button"
                className="vtx-breadcrumb-link"
                onClick={() => onNavigateCatalog && onNavigateCatalog(product.category?.slug, product.subcategory.slug)}
              >
                {product.subcategory.name}
              </button>
            </>
          )}
          <span className="vtx-breadcrumb-separator" aria-hidden="true">/</span>
          <span className="vtx-breadcrumb-current" aria-current="page">
            {product.name}
          </span>
        </div>
      </nav>

      {/* Return to Catalogue Header Bar */}
      <div className="vtx-detail-back-bar">
        <button
          type="button"
          className="btn-back-catalog"
          onClick={() => onNavigateCatalog && onNavigateCatalog(product.category?.slug, product.subcategory?.slug)}
        >
          ← Back to {product.subcategory?.name || product.category?.name || "Catalogue"}
        </button>
        <div className="vtx-detail-header-badges">
          {product.brand && <span className="vtx-badge-brand">{product.brand}</span>}
          {product.tag && <span className="vtx-badge-tag">{product.tag}</span>}
        </div>
      </div>

      {/* Main Product Showcase: Visual Gallery + Commercial Details */}
      <div className="vtx-detail-showcase">
        {/* Left Column: Technical Visual Presentation & Angles */}
        <div className="vtx-detail-visual-col">
          <div className={`vtx-detail-visual-box ${isFastener ? "vtx-visual-box-screw" : ""}`}>
            {product.imageUrl && !imgError ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="vtx-detail-img screw-detail-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <ComponentIllustration
                type={isBattery ? "battery" : isFastener ? "fastener" : "electronics"}
                brand={product.brand || "VERTEX"}
                specs={product.specs || {}}
                className="vtx-detail-svg"
              />
            )}
            <div className="vtx-visual-badge">
              <span>● Factory Verified Specification</span>
            </div>
          </div>

          {/* Technical Angles Gallery Switcher (OnlyScrews inspired) */}
          {isFastener && (
            <div className="vtx-detail-gallery-strip" aria-label="Product visual angles">
              <button
                type="button"
                className={`vtx-gallery-thumb-btn ${activeImageAngle === "front" ? "is-active" : ""}`}
                onClick={() => setActiveImageAngle("front")}
                title="Perspective Studio View"
              >
                <span className="thumb-mini-label">3D Studio</span>
              </button>
              <button
                type="button"
                className={`vtx-gallery-thumb-btn ${activeImageAngle === "drive" ? "is-active" : ""}`}
                onClick={() => setActiveImageAngle("drive")}
                title="Overhead Drive Geometry"
              >
                <span className="thumb-mini-label">{driveIcon} Drive Recess</span>
              </button>
              <button
                type="button"
                className={`vtx-gallery-thumb-btn ${activeImageAngle === "blueprint" ? "is-active" : ""}`}
                onClick={() => setActiveImageAngle("blueprint")}
                title="Technical Standard Specification"
              >
                <span className="thumb-mini-label">📐 Drawing</span>
              </button>
            </div>
          )}

          {/* Technical Identification Box */}
          <div className="vtx-detail-meta-box">
            <div className="vtx-meta-cell">
              <span className="vtx-meta-title">SKU Identifier</span>
              <code className="vtx-meta-code">{skuCode}</code>
            </div>
            {partNumber && (
              <div className="vtx-meta-cell">
                <span className="vtx-meta-title">Part Number / MPN</span>
                <code className="vtx-meta-code">{partNumber}</code>
              </div>
            )}
            {product.hsnCode && (
              <div className="vtx-meta-cell">
                <span className="vtx-meta-title">Indian HSN Code</span>
                <span className="vtx-meta-val">{product.hsnCode}</span>
              </div>
            )}
            {product.gstRate && (
              <div className="vtx-meta-cell">
                <span className="vtx-meta-title">GST Tax Rate</span>
                <span className="vtx-meta-val">{product.gstRate}% Tax Invoiced</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Specification Details & Purchasing Action */}
        <div className="vtx-detail-info-col">
          <div className="vtx-detail-header">
            <span className="vtx-cat-path">
              {product.category?.name} &gt; {product.subcategory?.name || "General"}
            </span>
            <h1 className="vtx-detail-title">{product.name}</h1>
            {isFastener && currentDimensions && (
              <div className="vtx-detail-screw-highlights">
                <span className="screw-pill pill-highlight">Verified Size: <strong>{currentDimensions}</strong></span>
              </div>
            )}
          </div>

          {/* Pricing or Quote Notice */}
          <div className="vtx-detail-price-card">
            {hasPrice ? (
              <div className="vtx-price-box">
                <div className="vtx-price-headline">
                  <span className="vtx-main-price">
                    ₹{Number(activePrice).toLocaleString("en-IN")}
                  </span>
                  {(selectedVariant?.packSize || product.unit) && (
                    <span className="vtx-pack-label"> / {selectedVariant?.packSize || product.unit}</span>
                  )}
                  {product.mrp && Number(product.mrp) > Number(activePrice) && (
                    <span className="vtx-mrp-strike">
                      ₹{Number(product.mrp).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <div className="vtx-tax-note">Price includes applicable commercial taxes (GST 18%). Pan-India courier dispatch.</div>
              </div>
            ) : (
              <div className="vtx-quote-notice">
                <div className="vtx-quote-head">
                  <span className="vtx-quote-pill">Commercial Quotation Required</span>
                  <span className="vtx-quote-time">Typical Response: &lt; 24 Hrs</span>
                </div>
                <p className="vtx-quote-desc">
                  This component is sourced directly for manufacturing, prototyping, or high-volume integration.
                  Click below to receive a formal quotation tailored to your batch quantity and GST registration.
                </p>
              </div>
            )}

            {/* Stock Availability */}
            <div className="vtx-stock-status-row">
              <span className={`vtx-status-dot ${inStock ? "in-stock" : "out-of-stock"}`} />
              <span className="vtx-status-text">
                {hasPrice
                  ? inStock
                    ? "In Stock • Ready for Pan-India Dispatch"
                    : "Currently Out of Stock / Backorder"
                  : "Available on Sourcing Order"}
              </span>
            </div>
          </div>

          {/* Product Variants (if multiple pack sizes or dimensions exist) */}
          {variants.length > 1 && (
            <div className="vtx-variant-selector-group">
              <label className="vtx-variant-label">Select Size / Pack Configuration:</label>
              <div className="vtx-variant-options">
                {variants.map((v, idx) => (
                  <button
                    type="button"
                    key={v.id || v.sku}
                    className={`vtx-variant-btn ${selectedVariantIdx === idx ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelectedVariantIdx(idx);
                      setQuantity(1);
                      setQuantityError(null);
                    }}
                  >
                    <span className="var-name">{v.name || v.packSize || v.dimensions}</span>
                    {v.dimensions && v.name !== v.dimensions && (
                      <span className="var-dim">{v.dimensions}</span>
                    )}
                    {v.price && <span className="vtx-var-price">₹{v.price}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single Variant organized pack size pill */}
          {variants.length === 1 && (
            <div className="vtx-single-variant-box">
              <span className="vtx-variant-label">Configured Pack Specification:</span>
              <div className="vtx-pack-pill">
                <span className="pack-icon">📦</span>
                <span className="pack-text">{selectedVariant?.name || selectedVariant?.packSize || product.unit || "Factory Pack"}</span>
                <span className="pack-check">✓ Standard Factory Verified</span>
              </div>
            </div>
          )}

          {/* Purchasing Form: Quantity + Primary Actions */}
          <div className="vtx-detail-actions-panel">
            {hasPrice ? (
              <div className="vtx-purchase-controls">
                <div className="vtx-qty-wrapper">
                  <label htmlFor="detail-qty-input" className="vtx-qty-label">Quantity:</label>
                  <div className="vtx-qty-counter">
                    <button
                      type="button"
                      className="vtx-qty-btn"
                      onClick={handleDecrement}
                      disabled={quantity <= 1 || !inStock}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      id="detail-qty-input"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      disabled={!inStock}
                      className="vtx-qty-input"
                    />
                    <button
                      type="button"
                      className="vtx-qty-btn"
                      onClick={handleIncrement}
                      disabled={!inStock}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="vtx-btn-row">
                  <button
                    type="button"
                    className="btn btn-primary vtx-btn-add-cart"
                    onClick={handleAddToCartClick}
                    disabled={!inStock}
                    data-testid={`detail-add-to-cart-${product.slug}`}
                  >
                    🛒 Add to Shopping Cart ({quantity})
                  </button>

                  <button
                    type="button"
                    className={`btn btn-outline vtx-btn-detail-wishlist ${isWishlisted ? "is-active" : ""}`}
                    onClick={handleWishlistToggle}
                    aria-pressed={isWishlisted}
                    title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                  >
                    <span>{isWishlisted ? "❤️ Wishlisted" : "🤍 Save to Wishlist"}</span>
                  </button>
                </div>

                {quantityError && (
                  <div className="vtx-qty-error-banner" role="alert">
                    {quantityError}
                  </div>
                )}

                {addSuccessFeedback && (
                  <div className="vtx-add-success-banner" role="status">
                    ✓ Added {quantity} unit(s) of "{product.name}" to your cart.
                  </div>
                )}
              </div>
            ) : (
              <div className="vtx-rfq-actions-row">
                <button
                  type="button"
                  className="btn btn-primary vtx-btn-rfq-main"
                  onClick={() => setIsQuoteModalOpen(true)}
                >
                  📋 Request a Volume Quote
                </button>
                <button
                  type="button"
                  className={`btn btn-outline vtx-btn-detail-wishlist ${isWishlisted ? "is-active" : ""}`}
                  onClick={handleWishlistToggle}
                  aria-pressed={isWishlisted}
                  title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                >
                  <span>{isWishlisted ? "❤️ Wishlisted" : "🤍 Save to Wishlist"}</span>
                </button>
              </div>
            )}

            {/* B2B Sourcing Callout */}
            <div className="vtx-detail-perks">
              <span className="vtx-perk">✓ 100% Genuine Technical Sourcing</span>
              <span className="vtx-perk">✓ Pan-India Courier Dispatch</span>
              <span className="vtx-perk">✓ GST Commercial Tax Invoices</span>
            </div>
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="vtx-detail-section">
              <h3 className="vtx-section-heading">Product Overview</h3>
              <p className="vtx-detail-desc">{product.description}</p>
            </div>
          )}

          {/* Verified Technical Specifications Table */}
          {specEntries.length > 0 && (
            <div className="vtx-detail-section">
              <h3 className="vtx-section-heading">Verified Technical Specifications</h3>
              <div className="vtx-specs-table-container">
                <table className="vtx-specs-table" aria-label="Technical specifications">
                  <tbody>
                    {specEntries.map(([param, value]) => (
                      <tr key={param}>
                        <th scope="row" className="vtx-spec-key">{param}</th>
                        <td className="vtx-spec-val">{String(value)}</td>
                      </tr>
                    ))}
                    {currentDimensions && (
                      <tr>
                        <th scope="row" className="vtx-spec-key">Dimensions</th>
                        <td className="vtx-spec-val">{currentDimensions}</td>
                      </tr>
                    )}
                    {product.brand && (
                      <tr>
                        <th scope="row" className="vtx-spec-key">Manufacturer / Brand</th>
                        <td className="vtx-spec-val">{product.brand}</td>
                      </tr>
                    )}
                    {product.category?.name && (
                      <tr>
                        <th scope="row" className="vtx-spec-key">Parent Category</th>
                        <td className="vtx-spec-val">{product.category.name}</td>
                      </tr>
                    )}
                    {product.subcategory?.name && (
                      <tr>
                        <th scope="row" className="vtx-spec-key">Subcategory</th>
                        <td className="vtx-spec-val">{product.subcategory.name}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products from the same Category / Subcategory */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="vtx-related-section" aria-label="Related components">
          <div className="vtx-related-head">
            <h2>Related {product.subcategory?.name || product.category?.name} Components</h2>
            <button
              type="button"
              className="link-arrow"
              onClick={() => onNavigateCatalog && onNavigateCatalog(product.category?.slug, product.subcategory?.slug)}
            >
              Browse Full Category →
            </button>
          </div>
          <div className="vtx-related-grid">
            {relatedProducts.slice(0, 4).map((rel) => (
              <div
                key={rel.id || rel.slug}
                className="vtx-related-card"
                onClick={() => onSelectRelatedProduct && onSelectRelatedProduct(rel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectRelatedProduct && onSelectRelatedProduct(rel);
                  }
                }}
              >
                <div className="vtx-related-thumb">
                  {rel.imageUrl ? (
                    <img src={rel.imageUrl} alt={rel.name} />
                  ) : (
                    <span className="vtx-related-initial">
                      {rel.name ? rel.name[0].toUpperCase() : "P"}
                    </span>
                  )}
                </div>
                <div className="vtx-related-body">
                  <h4 className="vtx-related-title">{rel.name}</h4>
                  <div className="vtx-related-price">
                    {rel.price !== null && rel.price !== undefined
                      ? `₹${Number(rel.price).toLocaleString("en-IN")}`
                      : "Quote on Request"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Commercial Request a Quote Modal */}
      <QuoteModal
        product={product}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
