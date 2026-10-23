/**
 * VERTEX Professional Product Card with Interactive 3D Tilt
 * 
 * Renders an individual product in the catalogue grid or list view.
 * Displays verified specifications, authentic pricing or "Quote on Request",
 * Add to Cart, Add to Wishlist, and View Details actions.
 * 
 * Features:
 * - Fluid pointer-based 3D tilt interaction powered by Framer Motion springs
 * - Natural spring physics (damping: 22, stiffness: 260) with smooth neutral return
 * - Subtle layered Z-depth for thumbnail, badges, specs, price, and actions
 * - Restrained rotation angles (max 7.5deg) ensuring readability and zero layout shifts
 * - Complete touch device safety (touch scrolling preserved without sticky tilt)
 * - Strict accessibility compliance (prefers-reduced-motion, visible focus outlines, ARIA attributes)
 */

import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { isItemInWishlist, toggleWishlistItem } from "../../utils/wishlist";
import ScrollReveal from "../Common/ScrollReveal";
import { isTextOnlyProduct } from "../../assets/hardware/componentVisuals";

// Safe prefers-reduced-motion detector that gracefully handles SSR and test environments
function useSafeReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq) {
        setPrefersReduced(Boolean(mq.matches));
        const handler = (e) => setPrefersReduced(Boolean(e.matches));
        if (typeof mq.addEventListener === "function") {
          mq.addEventListener("change", handler);
          return () => mq.removeEventListener("change", handler);
        } else if (typeof mq.addListener === "function") {
          mq.addListener(handler);
          return () => mq.removeListener(handler);
        }
      }
    } catch {
      // Graceful fallback
    }
  }, []);
  return prefersReduced;
}

export default function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
  onRequestQuote,
  isAdding = false,
  viewMode = "grid", // "grid" | "list"
  variant = "standard", // "standard" | "compact"
  revealIndex = 0,
  disableReveal = false,
}) {
  const cardRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [addFeedback, setAddFeedback] = useState(false);
  const addFeedbackTimerRef = useRef(null);
  const [isWishlisted, setIsWishlisted] = useState(() => isItemInWishlist(product?.id || product?.slug));
  const prefersReducedMotion = useSafeReducedMotion();

  // Normalized motion values for cursor position relative to card center (-0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth, physical spring configuration
  const springConfig = { damping: 22, stiffness: 260, mass: 0.6 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  // Restrained rotation angles: max 7.5 degrees to keep text and prices easily legible
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [7.5, -7.5]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-7.5, 7.5]);

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

  useEffect(() => () => {
    if (addFeedbackTimerRef.current) window.clearTimeout(addFeedbackTimerRef.current);
  }, []);

  if (!product) return null;

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    const nowWishlisted = toggleWishlistItem(product);
    setIsWishlisted(nowWishlisted);
  };

  const handleAddToCartClick = () => {
    if (!onAddToCart || isAdding || addFeedback) return;
    onAddToCart(product, product.variants?.[0]);
    setAddFeedback(true);
    addFeedbackTimerRef.current = window.setTimeout(() => {
      setAddFeedback(false);
      addFeedbackTimerRef.current = null;
    }, 1800);
  };

  // Pointer event handlers for 3D tilt
  const handlePointerEnter = (e) => {
    if (e.pointerType === "touch" || prefersReducedMotion || viewMode === "list") return;
    setIsHovered(true);
  };

  const handlePointerMove = (e) => {
    // Only apply tilt on mouse / trackpad, not touch screens or list mode or reduced motion
    if (e.pointerType === "touch" || prefersReducedMotion || viewMode === "list") return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
    if (!isHovered) setIsHovered(true);
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const primaryVariant = product.variants?.[0];
  const unitLabel = primaryVariant?.packSize || product.unit || null;
  const inStock = product.inStock !== false && primaryVariant?.stockQuantity !== 0;
  const skuCode = primaryVariant?.sku || product.sku || (product.slug ? `VTX-${product.slug.toUpperCase()}` : "VTX-GEN-SKU");
  const hasPrice = product.price !== null && product.price !== undefined;
  const isTextOnly = isTextOnlyProduct(product);

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
    <ScrollReveal
      className={`vtx-card-reveal-wrapper ${viewMode === "list" ? "vtx-card-reveal-list" : ""}`}
      staggerIndex={revealIndex}
      staggerDelay={0.065}
      duration={0.45}
      yOffset={18}
      scaleFrom={0.99}
      disabled={disableReveal || viewMode === "list" || prefersReducedMotion}
    >
      <motion.div
        ref={cardRef}
        className={`product-card vtx-reveal is-revealed ${viewMode === "list" ? "product-card-list-mode" : ""} ${isScrewOrFastener ? "product-card-hardware" : ""} ${variant === "compact" ? "product-card-compact" : ""} ${isTextOnly ? "product-card-text-only" : ""} ${isHovered ? "is-tilting" : ""}`}
        data-testid={`product-card-${product.id || product.slug}`}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX: prefersReducedMotion || viewMode === "list" ? 0 : rotateX,
          rotateY: prefersReducedMotion || viewMode === "list" ? 0 : rotateY,
          transformStyle: "preserve-3d",
          transformPerspective: 1000,
          opacity: 1,
        }}
      whileHover={
        prefersReducedMotion || viewMode === "list"
          ? undefined
          : {
              y: -4,
              boxShadow:
                "0 20px 32px -8px rgba(9, 24, 45, 0.16), 0 8px 16px -4px rgba(9, 24, 45, 0.08)",
            }
      }
      transition={{ duration: 0.2 }}
    >
      {/* Wishlist toggle button */}
      <motion.button
        type="button"
        className={`vtx-card-wishlist-btn ${isWishlisted ? "is-active" : ""}`}
        onClick={handleWishlistClick}
        title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={isWishlisted}
        style={{
          transform: isHovered && !prefersReducedMotion ? "translateZ(32px)" : "translateZ(0px)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.15 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
      >
        <span aria-hidden="true">{isWishlisted ? "❤️" : "🤍"}</span>
      </motion.button>

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
          style={{
            transform: isHovered && !prefersReducedMotion ? "translateZ(26px)" : "translateZ(0px)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {product.tag}
        </span>
      )}

      {/* Product Thumbnail / Hardware Studio Showcase (Hidden for text-only HVNEX products) */}
      {!isTextOnly && (
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
        style={{
          transform: isHovered && !prefersReducedMotion ? "translateZ(18px)" : "translateZ(0px)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Drive Type Indicator Overlay on Hardware Images */}
        {driveType && (
          <span
            className={`vtx-card-drive-pill ${drivePillClass}`}
            style={{
              transform: isHovered && !prefersReducedMotion ? "translateZ(28px)" : "translateZ(0px)",
              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
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
            width="240"
            height="160"
          />
        ) : (
          <span className="thumb-placeholder">
            {product.name ? product.name[0].toUpperCase() : "P"}
          </span>
        )}

        {/* Standard Norm Watermark */}
        {standardNorm && (
          <span
            className="vtx-thumb-norm-tag"
            title={standardNorm}
            style={{
              transform: isHovered && !prefersReducedMotion ? "translateZ(24px)" : "translateZ(0px)",
              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {standardNorm.split("/")[0].trim()}
          </span>
        )}
        </div>
      )}

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
          style={{
            transform: isHovered && !prefersReducedMotion ? "translateZ(14px)" : "translateZ(0px)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {product.name}
        </h3>

        {/* Clear Size & Dimension Indicator (OnlyScrews pattern) */}
        {(dimensions || unitLabel) && (
          <div
            className="product-size-indicator"
            aria-label="Available size and pack information"
            style={{
              transform: isHovered && !prefersReducedMotion ? "translateZ(10px)" : "translateZ(0px)",
              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
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
          <div
            className="product-spec-chips"
            aria-label="Verified specifications"
            style={{
              transform: isHovered && !prefersReducedMotion ? "translateZ(12px)" : "translateZ(0px)",
              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
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
        <div
          className="product-price-row"
          style={{
            transform: isHovered && !prefersReducedMotion ? "translateZ(16px)" : "translateZ(0px)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
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

        {/* Action Buttons: Primary Add to Cart Button replacing Specs & Request Quote */}
        <div
          className="product-actions-row"
          style={{
            transform: isHovered && !prefersReducedMotion ? "translateZ(22px)" : "translateZ(0px)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <motion.button
            type="button"
            className="btn btn-primary btn-cart vtx-card-add-to-cart"
            onClick={handleAddToCartClick}
            disabled={!inStock || isAdding || addFeedback}
            data-testid={`add-to-cart-${product.id || product.slug}`}
            aria-label={addFeedback ? `${product.name} added to cart` : `Add ${product.name} to cart`}
            whileHover={prefersReducedMotion || !inStock ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion || !inStock ? undefined : { scale: 0.98 }}
          >
            {addFeedback ? "✓ Added" : isAdding ? "Adding..." : "🛒 Add to Cart"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  </ScrollReveal>
);
}
