import React from "react";
import logo from "../../assets/logo.png";

export default function SiteFooter({
  wishlistCount = 0,
  onNavigateCategory,
  onOpenWishlist,
  onRequestQuote,
  onOpenPolicy,
}) {
  return (
    <footer className="footer" id="footer" aria-label="Store footer">
      <div className="footer-inner">
        {/* Column 1: Brand Info */}
        <div className="footer-col footer-col-brand">
          <div className="brand footer-brand">
            <img src={logo} alt="HV Vertex logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">VERTEX</span>
              <span className="brand-tagline">BUILD BETTER TOGETHER</span>
            </div>
          </div>
          <p className="footer-about">
            VERTEX is an online engineering components and precision hardware store.
            Supplying automotive lithium-ion cells, microcontroller hardware, motor drivers,
            and metric fasteners across India.
          </p>
          <div className="vtx-footer-compliance-badge">
            <span>⚡ Certified Hardware • ISO/DIN Metric Standard</span>
          </div>
        </div>

        {/* Column 2: Catalogue Navigation */}
        <div className="footer-col">
          <h4>Catalogue</h4>
          <ul className="footer-links">
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigateCategory && onNavigateCategory("all")}
              >
                All Products
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigateCategory && onNavigateCategory("electronics")}
              >
                Lithium Cells &amp; Electronics
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigateCategory && onNavigateCategory("fasteners")}
              >
                Screws &amp; Fasteners
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigateCategory && onNavigateCategory("nuts")}
              >
                Nuts &amp; Washers
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigateCategory && onNavigateCategory("tools")}
              >
                Precision Assembly Tools
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Support & Policies */}
        <div className="footer-col">
          <h4>Support &amp; Commercial</h4>
          <ul className="footer-links">
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onOpenWishlist && onOpenWishlist()}
              >
                Saved Wishlist ({wishlistCount})
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onRequestQuote && onRequestQuote()}
              >
                Request Commercial Quote (RFQ)
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onOpenPolicy && onOpenPolicy("shipping")}
              >
                Pan-India Shipping Policy
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onOpenPolicy && onOpenPolicy("gst")}
              >
                GST Tax Invoicing (B2B ITC)
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onOpenPolicy && onOpenPolicy("returns")}
              >
                Returns &amp; Replacements
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact & Operations Hub */}
        <div className="footer-col footer-col-contact">
          <h4>Contact &amp; Operations Hub</h4>
          <p className="vtx-footer-contact-line">
            <span className="vtx-footer-icon" aria-hidden="true">📍</span>
            <span>Logistics Facility: Hyderabad, Telangana, India</span>
          </p>
          <p className="vtx-footer-contact-line">
            <span className="vtx-footer-icon" aria-hidden="true">✉️</span>
            <a href="mailto:sales@vertex.in" className="vtx-footer-link">
              sales@vertex.in
            </a>
          </p>
          <p className="vtx-footer-contact-line">
            <span className="vtx-footer-icon" aria-hidden="true">📞</span>
            <a href="tel:+919876543210" className="vtx-footer-link">
              +91 98765 43210
            </a>
          </p>
          <p className="vtx-footer-contact-line vtx-footer-hours">
            <span className="vtx-footer-icon" aria-hidden="true">⏰</span>
            <span>Mon–Sat: 9:00 AM – 7:00 PM IST</span>
          </p>
        </div>
      </div>

      {/* Bottom bar with legal policies & payments */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copy">
            © {new Date().getFullYear()} VERTEX Engineering &amp; Supplies. All rights reserved.
          </p>
          <div className="footer-legal-links">
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenPolicy && onOpenPolicy("privacy")}
            >
              Privacy Policy
            </button>
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenPolicy && onOpenPolicy("terms")}
            >
              Terms of Service
            </button>
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenPolicy && onOpenPolicy("shipping")}
            >
              Shipping Terms
            </button>
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenPolicy && onOpenPolicy("returns")}
            >
              Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
