import React, { useRef } from "react";
import ProductCard from "../Products/ProductCard";

export default function ProductRail({
  title,
  subtitle,
  badge = "COLLECTION",
  products = [],
  loading = false,
  error = null,
  onAddToCart,
  onViewDetails,
  onRequestQuote,
  onViewAll,
  pendingCartAction,
}) {
  const railRef = useRef(null);

  const scrollLeft = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  if (!loading && !error && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className="section vtx-product-rail-section" aria-label={title}>
      <div className="section-head vtx-rail-head">
        <div className="vtx-rail-title-wrap">
          {badge && <span className="vtx-rail-badge">{badge}</span>}
          <h2 className="vtx-rail-title">{title}</h2>
          {subtitle && <p className="vtx-rail-sub">{subtitle}</p>}
        </div>

        <div className="vtx-rail-actions">
          {products.length > 3 && (
            <div className="vtx-rail-arrows">
              <button
                type="button"
                className="vtx-rail-arrow vtx-rail-arrow-prev"
                onClick={scrollLeft}
                aria-label={`Scroll ${title} left`}
                title="Previous products"
              >
                ‹
              </button>
              <button
                type="button"
                className="vtx-rail-arrow vtx-rail-arrow-next"
                onClick={scrollRight}
                aria-label={`Scroll ${title} right`}
                title="Next products"
              >
                ›
              </button>
            </div>
          )}

          {onViewAll && (
            <button
              type="button"
              className="link-arrow vtx-rail-view-all"
              onClick={onViewAll}
            >
              View all →
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="product-grid" role="status" aria-label={`Loading ${title}`}>
          {[1, 2, 3, 4].map((n) => (
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
        <div className="catalog-error-state" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <p>{error}</p>
        </div>
      ) : (
        <div className="vtx-rail-track" ref={railRef} tabIndex={0} aria-label={`${title} scroll rail`}>
          {products.map((p, idx) => (
            <div className="vtx-rail-item" key={p.id || p.slug}>
              <ProductCard
                product={p}
                onAddToCart={onAddToCart}
                onViewDetails={onViewDetails}
                onRequestQuote={onRequestQuote}
                isAdding={pendingCartAction?.id === p.variants?.[0]?.id}
                variant="compact"
                revealIndex={idx}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
