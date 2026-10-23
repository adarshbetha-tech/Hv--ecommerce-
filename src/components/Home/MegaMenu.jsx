import React, { useEffect, useRef } from "react";

export default function MegaMenu({
  isOpen = false,
  categories = [],
  onNavigateCategory,
  onRequestQuote,
  onClose,
}) {
  const menuRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        // Also check if the click was on the trigger button to avoid immediate re-opening
        const trigger = document.querySelector(".nav-link-dropdown-trigger");
        if (trigger && trigger.contains(e.target)) return;
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="vtx-mega-menu"
      ref={menuRef}
      className="vtx-mega-menu is-open"
      role="region"
      aria-label="Product Categories Mega Menu"
    >
      <div className="vtx-mega-menu-inner">
        <div className="vtx-mega-menu-header">
          <div className="vtx-mega-menu-title-wrap">
            <span className="vtx-mega-badge">PRODUCT CATALOGUE</span>
            <h3 className="vtx-mega-title">Browse Engineering Hardware &amp; Components</h3>
          </div>
          <button
            type="button"
            className="vtx-mega-close"
            onClick={onClose}
            aria-label="Close category menu"
          >
            ✕
          </button>
        </div>

        <div className="vtx-mega-menu-body">
          <div className="vtx-mega-categories-grid">
            {categories.map((cat) => (
              <div className="vtx-mega-col" key={cat.id || cat.slug}>
                <div
                  className="vtx-mega-col-header"
                  onClick={() => {
                    onNavigateCategory(cat.slug, "all");
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigateCategory(cat.slug, "all");
                      onClose();
                    }
                  }}
                  title={`View all ${cat.name}`}
                >
                  <span className="vtx-mega-col-icon" aria-hidden="true">{cat.icon || "📦"}</span>
                  <div className="vtx-mega-col-heading">
                    <span className="vtx-mega-col-name">{cat.name}</span>
                    <span className="vtx-mega-col-count">
                      {cat.productsCount ? `${cat.productsCount} items` : "Explore"}
                    </span>
                  </div>
                </div>

                {cat.children && cat.children.length > 0 ? (
                  <ul className="vtx-mega-subcat-list">
                    {cat.children.map((sub) => (
                      <li key={sub.id || sub.slug}>
                        <button
                          type="button"
                          className="vtx-mega-subcat-btn"
                          onClick={() => {
                            onNavigateCategory(cat.slug, sub.slug);
                            onClose();
                          }}
                        >
                          <span className="vtx-subcat-bullet" aria-hidden="true">›</span>
                          <span>{sub.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="vtx-mega-col-desc">{cat.description || "Certified industrial engineering components."}</p>
                )}

                <button
                  type="button"
                  className="vtx-mega-view-all-link"
                  onClick={() => {
                    onNavigateCategory(cat.slug, "all");
                    onClose();
                  }}
                >
                  <span>All {cat.name}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            ))}
          </div>

          {/* Right Spotlight: Custom Bulk RFQ banner */}
          <div className="vtx-mega-spotlight">
            <div className="vtx-mega-spotlight-card">
              <span className="vtx-spotlight-tag">INDUSTRIAL SUPPLY</span>
              <h4>Custom &amp; High-Volume Orders</h4>
              <p>
                Need custom pitches, stainless steel grades (SS304/SS316), or special thread dimensions?
                Get a rapid quote from our engineering team.
              </p>
              <ul className="vtx-spotlight-perks">
                <li>✔ No Minimum Order Quantity (MOQ)</li>
                <li>✔ Pan-India Express Delivery</li>
                <li>✔ Instant GST Invoicing &amp; Tax Credit</li>
              </ul>
              <button
                type="button"
                className="btn btn-primary vtx-spotlight-btn"
                onClick={() => {
                  onClose();
                  if (onRequestQuote) onRequestQuote();
                }}
              >
                <span>📋 Request Custom RFQ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
