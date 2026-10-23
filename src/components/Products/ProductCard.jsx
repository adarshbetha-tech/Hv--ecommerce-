/**
 * VERTEX Professional Product Card
 * 
 * Renders an individual product in the catalogue grid or list view.
 * Displays verified specifications, authentic pricing or "Quote on Request",
 * Add to Cart, Add to Wishlist, and View Details actions.
 * 
 * Inspired by OnlyScrews.in hardware presentation patterns:
 * - Product-specific screw images with crisp studio framing
 * - Clear titles with screw type and available dimensions/pack size
 * - Drive type and engineering standard indicators
 * - Industrial hardware aesthetic tailored to HV VERTEX design tokens
 */

import React, { useState, useEffect } from "react";
import { isItemInWishlist, toggleWishlistItem } from "../../utils/wishlist";

export default function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
  onRequestQuote,
  isAdding = false,
  viewMode = "grid", // "grid" | "list"
}) {
  const [imgError, setImgError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(() => isItemInWishlist(product?.id || product?.slug));

  useEffect(() => {
    setIsWishlisted(isItemInWishlist(product?.id || product?.slug));
  }, [product]);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      setIsWishlisted(isItemInWishlist(product?.id || product?.slug));
    };
    window.addEventListener("vertex_wishlist_updated", handleWishlistUpdate);
    return () => window.removeEventListener("vertex_wishlist_updated", handleWishlistUpdate);
  }, [product]);

  if (!product) return null;

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    const nowWishlisted = toggleWishlistItem(product);
    setIsWishlisted(nowWishlisted);
  };

  const primaryVariant = product.variants?.[0];
  const unitLabel = primaryVariant?.packSize || product.unit || null;
  const inStock = product.inStock !== false && primaryVariant?.stockQuantity !== 0;
  const skuCode = primaryVariant?.sku || product.sku || (product.slug ? `VTX-${product.slug.toUpperCase()}` : "VTX-GEN-SKU");
  const hasPrice = product.price !== null && product.price !== undefined && Number(product.price) > 0;

  // Determine screw / fastener drive characteristics
  const isScrewOrFastener =
    product.category?.slug === "fasteners" ||
    product.categoryId === "cat-fasteners" ||
    (product.specs && (product.specs["Drive Type"] || product.specs["Head Type"]));

  const driveType = product.specs?.["Drive Type"] || "";
  const headType = product.specs?.["Head Type"] || "";
  const standardNorm = product.specs?.["Standard"] || "";
  const materialGrade = product.specs?.["Material Grade"] || product.specs?.["Material"] || "";
  const dimensions = primaryVariant?.dimensions || product.specs?.["Dimensions"] || product.specs?.["Thread Size"] || null;

  // Drive badge styling
  let drivePillClass = "pill-drive-default";
  let driveIcon = "🔩";
  if (driveType.toLowerCase().includes("hex") || driveType.toLowerCase().includes("allen")) {
    drivePillClass = "pill-drive-hex";
    driveIcon = "⬡";
  } else if (driveType.toLowerCase().includes("cross") || driveType.toLowerCase().includes("phillips")) {
    drivePillClass = "pill-drive-phillips";
    driveIcon = "✚";
  } else if (driveType.toLowerCase().includes("flat") || driveType.toLowerCase().includes("slotted")) {
    drivePillClass = "pill-drive-slotted";
    driveIcon = "━";
  }

  // Build snippet of top 2-3 verified specifications
  const specEntries = product.specs ? Object.entries(product.specs).slice(0, 3) : [];

  return (
    <div
      className={`product-card vtx-reveal ${viewMode === "list" ? "product-card-list-mode" : ""} ${isScrewOrFastener ? "product-card-hardware" : ""}`}
      data-testid={`product-card-${product.id || product.slug}`}
    >
      {/* Wishlist toggle button */}
      <button
        type="button"
        className={`vtx-card-wishlist-btn ${isWishlisted ? "is-active" : ""}`}
        onClick={handleWishlistClick}
        title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={isWishlisted}
      >
        <span aria-hidden="true">{isWishlisted ? "❤️" : "🤍"}</span>
      </button>

      {/* Promotional / Engineering Tag */}
      {product.tag && (
        <span
          className={
            "product-tag " +
            (product.tag.toLowerCase().includes("off")
              ? "tag-discount"
              : product.tag.toLowerCase().includes("ev")
              ? "tag-ev-grade"
              : product.tag.toLowerCase().includes("marine")
              ? "tag-marine-grade"
              : "tag-best")
          }
        >
          {product.tag}
        </span>
      )}

      {/* Product Thumbnail / Hardware Studio Showcase */}
      <div
        className={`product-thumb ${isScrewOrFastener ? "product-thumb-screw" : ""}`}
        onClick={() => onViewDetails && onViewDetails(product)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onViewDetails && onViewDetails(product);
          }
        }}
        aria-label={`View details for ${product.name}`}
      >
        {/* Drive Type Indicator Overlay on Hardware Images */}
        {driveType && (
          <span className={`vtx-card-drive-pill ${drivePillClass}`}>
            <span className="drive-icon" aria-hidden="true">{driveIcon}</span> {driveType.split(" ")[0]}
          </span>
        )}

        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`product-image ${isScrewOrFastener ? "screw-product-image" : ""}`}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="thumb-placeholder">
            {product.name ? product.name[0].toUpperCase() : "P"}
          </span>
        )}

        {/* Standard Norm Watermark */}
        {standardNorm && (
          <span className="vtx-thumb-norm-tag" title={standardNorm}>
            {standardNorm.split("/")[0].trim()}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="product-body">
        <div className="product-meta-row">
          <div className="product-sku" title={`SKU: ${skuCode}`}>
            <span className="sku-label">SKU:</span> <code className="sku-code">{skuCode}</code>
          </div>
          {product.brand && (
            <span className="product-brand-badge">{product.brand}</span>
          )}
        </div>

        {/* Product Title */}
        <h3
          className="product-name"
          title={product.name}
          onClick={() => onViewDetails && onViewDetails(product)}
        >
          {product.name}
        </h3>

        {/* Clear Size & Dimension Indicator (OnlyScrews pattern) */}
        {(dimensions || unitLabel) && (
          <div className="product-size-indicator" aria-label="Available size and pack information">
            <span className="size-pill">
              <span className="size-icon" aria-hidden="true">📐</span> {dimensions ? `${dimensions} • ` : ""}{unitLabel || "Standard Pack"}
            </span>
          </div>
        )}

        {/* Category & Subcategory breadcrumb tag */}
        <div className="product-cat-label">
          {product.subcategory?.name || product.category?.name || "Industrial Component"}
        </div>

        {/* Verified Specifications Chips (Technical Hardware Specs) */}
        {specEntries.length > 0 && (
          <div className="product-spec-chips" aria-label="Verified specifications">
            {headType && (
              <span className="spec-chip spec-chip-head" title={`Head: ${headType}`}>
                <strong>Head:</strong> {headType.replace(/\s*\(.*?\)/, "")}
              </span>
            )}
            {materialGrade && (
              <span className="spec-chip spec-chip-material" title={`Material: ${materialGrade}`}>
                <strong>Grade:</strong> {materialGrade.split(" ")[0]}
              </span>
            )}
            {specEntries.slice(0, 2).map(([key, val]) => (
              <span className="spec-chip" key={key} title={`${key}: ${val}`}>
                <strong>{key}:</strong> {val}
              </span>
            ))}
          </div>
        )}

        {/* Pricing display */}
        <div className="product-price-row">
          {hasPrice ? (
            <>
              <span className="price">₹{Number(product.price).toLocaleString("en-IN")}</span>
              {product.mrp && Number(product.mrp) > Number(product.price) && (
                <span className="mrp">₹{Number(product.mrp).toLocaleString("en-IN")}</span>
              )}
              {unitLabel && <span className="unit">({unitLabel})</span>}
            </>
          ) : (
            <div className="quote-price-tag">
              <span className="quote-text">Quote on Request</span>
              <span className="quote-sub">Commercial / Volume Sourcing</span>
            </div>
          )}
        </div>

        {/* Stock status indicator */}
        <p className={"stock-line" + (!inStock ? " stock-out" : "")}>
          <span className={"stock-dot" + (!inStock ? " stock-out" : "")} />{" "}
          {hasPrice
            ? inStock
              ? "In Stock (Warehouse Ready)"
              : "Out of Stock"
            : "Available on Inquiry"}
        </p>

        {/* Action Buttons */}
        <div className="product-actions-row">
          {onViewDetails && (
            <button
              type="button"
              className="btn btn-outline btn-specs"
              onClick={() => onViewDetails(product)}
              title="View Technical Specs"
            >
              Specs
            </button>
          )}

          {hasPrice ? (
            <button
              type="button"
              className="btn btn-outline btn-cart"
              onClick={() => onAddToCart && onAddToCart(product, primaryVariant)}
              disabled={!inStock || isAdding}
              data-testid={`add-to-cart-${product.id || product.slug}`}
            >
              {isAdding ? "Adding..." : "🛒 Add to Cart"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-rfq"
              onClick={() => onRequestQuote ? onRequestQuote(product) : (onViewDetails && onViewDetails(product))}
              title="Request a Commercial Price Quote"
              data-testid={`add-to-cart-${product.id || product.slug}`}
            >
              📋 Request Quote
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
