/**
 * VERTEX Screw Head Category Selection Component (Page 2)
 * 
 * Inspired by reference screenshot 2:
 * Displays the heading (e.g. "Cross (Phillips)") and subtitle "Choose by Head category"
 * with a responsive grid of consistent, appropriately proportioned screw head image tiles.
 */

import React from "react";
import ScrollReveal from "../Common/ScrollReveal";
import "./ScrewHeadCategorySelector.css";

export default function ScrewHeadCategorySelector({
  groupData,
  onSelectHeadCategory,
  onNavigateHome,
  onNavigateFasteners,
}) {
  if (!groupData) return null;

  const {
    familyTitle = "Cross (Phillips)",
    familySubtitle = "Choose by Head category",
    breadcrumbLabel = "Cross (Phillips)",
    parentName = "Fasteners",
    headCategories = [],
  } = groupData;

  return (
    <section
      className="vtx-head-selection-page"
      data-testid="screw-head-category-selector"
      aria-label={`${familyTitle} Head Categories`}
    >
      {/* Breadcrumb Navigation */}
      <nav className="vtx-head-breadcrumbs" aria-label="Head category breadcrumbs">
        <div className="vtx-head-breadcrumbs-inner">
          <button
            type="button"
            className="vtx-breadcrumb-btn"
            onClick={onNavigateHome}
          >
            Home
          </button>
          <span className="vtx-breadcrumb-sep" aria-hidden="true">/</span>
          <button
            type="button"
            className="vtx-breadcrumb-btn"
            onClick={onNavigateFasteners}
          >
            {parentName}
          </button>
          <span className="vtx-breadcrumb-sep" aria-hidden="true">/</span>
          <span className="vtx-breadcrumb-active" aria-current="page">
            {breadcrumbLabel}
          </span>
        </div>
      </nav>

      {/* Page Header */}
      <div className="vtx-head-selection-header">
        <h1 className="vtx-head-family-title">{familyTitle}</h1>
        <p className="vtx-head-family-subtitle">{familySubtitle}</p>
        <span className="vtx-head-count-badge">
          {headCategories.length} {headCategories.length === 1 ? "Head Category" : "Head Categories"} Available
        </span>
      </div>

      {/* Head Category Tiles Grid */}
      <div
        className="vtx-head-tiles-grid"
        role="region"
        aria-label={`${familyTitle} head category tiles`}
      >
        {headCategories.map((cat, idx) => (
          <ScrollReveal
            key={cat.id || cat.slug}
            staggerIndex={idx}
            staggerDelay={0.05}
            yOffset={14}
            duration={0.35}
            className="vtx-head-tile-reveal"
          >
            <div
              className="vtx-head-tile-card"
              role="button"
              tabIndex={0}
              onClick={() => onSelectHeadCategory && onSelectHeadCategory(cat)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (onSelectHeadCategory) onSelectHeadCategory(cat);
                }
              }}
              title={`Browse ${cat.name} products`}
              data-testid={`head-category-tile-${cat.slug}`}
            >
              <div className="vtx-head-tile-media">
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="vtx-head-tile-img"
                  loading="lazy"
                  width="220"
                  height="160"
                />
              </div>

              <div className="vtx-head-tile-content">
                <h2 className="vtx-head-tile-name">{cat.name}</h2>
                {cat.description && (
                  <p className="vtx-head-tile-desc">{cat.description}</p>
                )}
                <div className="vtx-head-tile-footer">
                  <span className="vtx-head-tile-action">
                    Explore Products <span className="action-arrow">→</span>
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
