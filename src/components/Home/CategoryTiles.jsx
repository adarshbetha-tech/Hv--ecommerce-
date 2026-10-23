import React from "react";
import fastenersImg from "../../assets/hardware/fasteners.jpg";
import arduinoImg from "../../assets/hardware/arduino.jpg";
import automationImg from "../../assets/hardware/automation.jpg";
import pcbImg from "../../assets/hardware/pcb.jpg";
import ScrollReveal from "../Common/ScrollReveal";

export const CATEGORY_ARTWORK = {
  fasteners: fastenersImg,
  electronics: arduinoImg,
  nuts: fastenersImg,
  automation: automationImg,
  tools: pcbImg,
};

export default function CategoryTiles({
  categories = [],
  loading = false,
  error = null,
  onRetry,
  onSelectCategory,
}) {
  // Filter out test-only categories with numeric timestamps in their names/slugs
  const displayCategories = categories.filter((cat) => {
    if (!cat) return false;
    const name = cat.name || "";
    const slug = cat.slug || "";
    const isTestCategory =
      /\btest\b.*\d{4,}/i.test(name) ||
      /\d{8,}/.test(name) ||
      /\btest-cat-\d+/i.test(slug);
    return !isTestCategory;
  });

  return (
    <section className="section vtx-category-section" id="shop-categories" aria-label="Shop by Category">
      <div className="section-head vtx-category-head">
        <div>
          <span className="vtx-section-tag">CATALOGUE BROWSING</span>
          <h2 className="vtx-section-title">Shop by Category</h2>
          <p className="vtx-section-sub">
            Direct access to metric fasteners, verified microcontroller boards, and industrial hardware collections.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelectCategory && onSelectCategory("all")}
          className="link-arrow vtx-category-all-link"
        >
          View All Categories →
        </button>
      </div>

      {loading ? (
        <div className="vtx-category-tiles-grid" role="status" aria-label="Loading categories">
          {[1, 2, 3, 4].map((n) => (
            <div className="vtx-category-tile-skeleton" key={n}>
              <div className="vtx-tile-skeleton-thumb" />
              <div className="vtx-tile-skeleton-body">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line" style={{ width: "60%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="catalog-error-state" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <h3>Unable to Load Categories</h3>
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="btn-retry" onClick={onRetry}>
              ↻ Retry
            </button>
          )}
        </div>
      ) : (
        <div className="vtx-category-tiles-grid">
          {displayCategories.map((cat, idx) => {
            const artwork =
              cat.imageUrl ||
              CATEGORY_ARTWORK[cat.slug] ||
              CATEGORY_ARTWORK[Object.keys(CATEGORY_ARTWORK).find((k) => cat.slug?.includes(k))];

            const countText =
              cat.children && cat.children.length > 0
                ? `${cat.children.length} Subcategories`
                : cat.productsCount !== undefined
                ? `${cat.productsCount} Products`
                : "Verified Catalog";

            return (
              <ScrollReveal
                key={cat.id || cat.slug}
                staggerIndex={idx}
                staggerDelay={0.065}
                yOffset={18}
                scaleFrom={0.99}
                duration={0.45}
                className="vtx-tile-reveal-wrapper"
              >
                <div
                  className={`vtx-category-tile vtx-reveal is-revealed vtx-stagger-${(idx % 4) + 1}`}
                  onClick={() => onSelectCategory && onSelectCategory(cat.slug, "all")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onSelectCategory) onSelectCategory(cat.slug, "all");
                    }
                  }}
                  title={`Explore ${cat.name}`}
                >
                  <div className="vtx-category-tile-media">
                    {artwork ? (
                      <img
                        src={artwork}
                        alt={cat.name}
                        className="vtx-category-tile-img"
                        loading="lazy"
                        width="320"
                        height="200"
                      />
                    ) : (
                      <div className="vtx-category-tile-fallback">
                        <span className="vtx-fallback-icon" aria-hidden="true">{cat.icon || "📦"}</span>
                      </div>
                    )}
                    <span className="vtx-category-tile-badge">{countText}</span>
                  </div>

                  <div className="vtx-category-tile-content">
                    <div className="vtx-category-tile-header">
                      <span className="vtx-tile-icon" aria-hidden="true">{cat.icon || "📦"}</span>
                      <h3 className="vtx-category-tile-name">{cat.name}</h3>
                    </div>
                    <p className="vtx-category-tile-desc">
                      {cat.description || "Certified engineering components engineered for industrial applications."}
                    </p>
                    <div className="vtx-category-tile-action">
                      <span className="vtx-tile-action-link">Explore {cat.name} →</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </section>
  );
}
