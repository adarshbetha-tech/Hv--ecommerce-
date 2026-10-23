import React, { useState, useEffect, useRef } from "react";

export default function FloatingSupport({ onRequestQuote, onOpenPolicy }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="vtx-floating-support-wrap" ref={panelRef}>
      {isOpen && (
        <div
          className="vtx-floating-support-panel"
          role="region"
          aria-label="Direct Technical Support"
        >
          <div className="vtx-support-panel-head">
            <div className="vtx-support-head-left">
              <span className="vtx-support-status-dot" aria-hidden="true" />
              <div>
                <h4 className="vtx-support-panel-title">VERTEX Technical Desk</h4>
                <span className="vtx-support-panel-sub">Active • Hyderabad Logistics Hub</span>
              </div>
            </div>
            <button
              type="button"
              className="vtx-support-panel-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close support menu"
            >
              ✕
            </button>
          </div>

          <div className="vtx-support-panel-body">
            <p className="vtx-support-body-lead">
              Need assistance selecting metric fastener pitches, microcontroller specs, or bulk orders?
            </p>

            <div className="vtx-support-actions">
              <a
                href="https://wa.me/919876543210?text=Hello%20VERTEX%20Team%2C%20I%20have%20an%20inquiry%20regarding%20components."
                target="_blank"
                rel="noopener noreferrer"
                className="vtx-support-item vtx-support-item-wa"
              >
                <span className="vtx-support-item-icon" aria-hidden="true">💬</span>
                <div className="vtx-support-item-info">
                  <strong>Chat on WhatsApp</strong>
                  <span>Instant reply for stock &amp; dispatch</span>
                </div>
              </a>

              <a
                href="mailto:sales@vertex.in?subject=VERTEX%20Technical%20Inquiry"
                className="vtx-support-item"
              >
                <span className="vtx-support-item-icon" aria-hidden="true">✉️</span>
                <div className="vtx-support-item-info">
                  <strong>Email Engineering Team</strong>
                  <span>sales@vertex.in (Quotes &amp; Datasheets)</span>
                </div>
              </a>

              <button
                type="button"
                className="vtx-support-item"
                onClick={() => {
                  setIsOpen(false);
                  if (onRequestQuote) onRequestQuote();
                }}
              >
                <span className="vtx-support-item-icon" aria-hidden="true">📋</span>
                <div className="vtx-support-item-info">
                  <strong>Request Bulk Quotation (RFQ)</strong>
                  <span>Volume tier discounts &amp; custom orders</span>
                </div>
              </button>

              <button
                type="button"
                className="vtx-support-item"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenPolicy) onOpenPolicy("shipping");
                }}
              >
                <span className="vtx-support-item-icon" aria-hidden="true">🚚</span>
                <div className="vtx-support-item-info">
                  <strong>Pan-India Shipping &amp; COD FAQs</strong>
                  <span>Delivery zones, thresholds &amp; GST invoices</span>
                </div>
              </button>
            </div>
          </div>

          <div className="vtx-support-panel-foot">
            <span>📞 Call Desk: +91 98765 43210</span>
            <span>Mon–Sat: 9:00 AM – 7:00 PM IST</span>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`vtx-floating-support-btn ${isOpen ? "is-active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Toggle technical support options"
        title="Need Technical Help? Click to chat"
      >
        <span className="vtx-support-fab-icon" aria-hidden="true">
          {isOpen ? "✕" : "💬"}
        </span>
        <span className="vtx-support-fab-label">
          {isOpen ? "Close" : "Need Help?"}
        </span>
      </button>
    </div>
  );
}
