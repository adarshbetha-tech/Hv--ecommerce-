/**
 * VERTEX Fastener Category Tiles Component (Page 1)
 * 
 * Polished category browsing page inspired by reference screenshot 1.
 * Shows consistent image tiles with category labels and clickable navigation.
 * Uses clean white background, dark typography, generous spacing, and responsive grid.
 * 
 * Approved categories from Product_Categories_Fasteners_First_Electronics_Second.pdf:
 * 1. Screws — Flat (Slotted)
 * 2. Screws — Cross (Phillips)
 * 3. Screws — Hex (Allen)
 * 4. Nuts
 * 5. Washers
 * 6. Brass Inserts
 */

import React from "react";
import { APPROVED_FASTENER_CATEGORIES } from "../../utils/screwCategoriesData";
import "./FastenerCategoryTiles.css";

export default function FastenerCategoryTiles({
  onSelectCategory,
  products = [],
}) {
  return (
    <section className="vtx-fastener-cat-section" aria-label="Shop Fasteners by Category">
      <div className="vtx-fastener-cat-head">
        <span className="vtx-fastener-cat-badge">PRECISION FASTENERS &amp; HARDWARE</span>
        <h2 className="vtx-fastener-cat-title">Shop by Category</h2>
        <p className="vtx-fastener-cat-sub">
          Select a certified fastener family to explore head profiles, thread pitches, and material grades compliant with DIN, ISO, and IS engineering standards.
        </p>
      </div>

      <div className="vtx-fastener-cat-grid">
        {APPROVED_FASTENER_CATEGORIES.map((cat) => {
          // Calculate actual matching product count from catalog
          const matchingCount = products.filter((p) => {
            const subSlug = p.subcategory?.slug?.toLowerCase() || "";
            const catSlug = p.category?.slug?.toLowerCase() || "";
            return (
              subSlug === cat.slug ||
              (cat.slug === "nuts" && (subSlug === "nuts" || catSlug === "nuts")) ||
              (cat.slug === "washers" && subSlug === "washers") ||
              (cat.slug === "brass-inserts" && subSlug === "brass-inserts")
            );
          }).length;

          const countLabel = matchingCount > 0 ? `${matchingCount} Products` : cat.countLabel;

          return (
            <div
              key={cat.slug}
              className="vtx-fastener-cat-tile"
              onClick={() => onSelectCategory && onSelectCategory(cat.slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectCategory && onSelectCategory(cat.slug);
                }
              }}
              title={`Explore ${cat.name}`}
              data-testid={`fastener-cat-tile-${cat.slug}`}
            >
              <div className="vtx-fastener-tile-media">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="vtx-fastener-tile-img"
                  loading="lazy"
                  width="180"
                  height="180"
                />
                <span className="vtx-fastener-tile-count">{countLabel}</span>
              </div>

              <div className="vtx-fastener-tile-info">
                <div className="vtx-fastener-tile-header">
                  <span className="vtx-fastener-tile-icon" aria-hidden="true">{cat.icon}</span>
                  <h3 className="vtx-fastener-tile-name">{cat.name}</h3>
                </div>
                <p className="vtx-fastener-tile-desc">{cat.description}</p>
                <div className="vtx-fastener-tile-action">
                  <span className="vtx-fastener-action-text">Explore {cat.name} →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
