import React, { useState, useEffect, useRef } from "react";

const DEFAULT_PROMOTIONS = [
  {
    id: "promo-5",
    code: "VERTEX5",
    discount: "5% OFF",
    minOrder: "₹849",
    highlight: "⚡ Use code VERTEX5 for 5% off on orders above ₹849",
    subtext: "Free Pan-India Delivery available on qualifying standard orders",
    tag: "POPULAR",
  },
  {
    id: "promo-10",
    code: "VERTEX10",
    discount: "10% OFF",
    minOrder: "₹1,599",
    highlight: "🔩 Use code VERTEX10 for 10% off on industrial orders above ₹1,599",
    subtext: "Instant GST Tax Invoicing with input credit for registered businesses",
    tag: "INDUSTRIAL",
  },
  {
    id: "promo-15",
    code: "VERTEX15",
    discount: "15% OFF",
    minOrder: "₹2,999",
    highlight: "🚀 Use code VERTEX15 for 15% off on bulk orders above ₹2,999",
    subtext: "Zero Minimum Order Quantity (MOQ) on all metric fasteners & components",
    tag: "BULK SAVINGS",
  },
];

export default function AnnouncementBar({
  promotions = DEFAULT_PROMOTIONS,
  onPromoClick,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const timerRef = useRef(null);

  const activePromo = promotions[currentIndex] || promotions[0];

  // Auto-rotate announcement messages every 5 seconds (paused on hover/focus or reduced-motion)
  useEffect(() => {
    if (promotions.length <= 1) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches);

    if (prefersReducedMotion || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [promotions.length, isPaused]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
  };

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      }).catch(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      });
    } else {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  if (!promotions || promotions.length === 0) return null;

  return (
    <aside
      className="vtx-announcement-bar"
      role="region"
      aria-label="Promotions and Special Offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="vtx-announcement-inner">
        <button
          type="button"
          className="vtx-announcement-arrow vtx-announcement-arrow-prev"
          onClick={handlePrev}
          aria-label="Previous promotional message"
        >
          ‹
        </button>

        <div
          className="vtx-announcement-content"
          role="status"
          aria-live="polite"
        >
          <span className="vtx-announcement-badge">{activePromo.tag}</span>
          <span className="vtx-announcement-text">{activePromo.highlight}</span>
          <span className="vtx-announcement-subtext"> | {activePromo.subtext}</span>
          <button
            type="button"
            className="vtx-announcement-copy-btn"
            onClick={(e) => handleCopyCode(e, activePromo.code)}
            aria-label={`Copy discount code ${activePromo.code}`}
            title="Click to copy coupon code"
          >
            {copiedCode === activePromo.code ? "✓ Copied!" : `Copy Code`}
          </button>
        </div>

        <button
          type="button"
          className="vtx-announcement-arrow vtx-announcement-arrow-next"
          onClick={handleNext}
          aria-label="Next promotional message"
        >
          ›
        </button>

        {promotions.length > 1 && (
          <div className="vtx-announcement-dots" aria-hidden="true">
            {promotions.map((p, idx) => (
              <button
                type="button"
                key={p.id || idx}
                className={`vtx-announcement-dot ${idx === currentIndex ? "is-active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to promotion ${idx + 1}: ${p.code}`}
                tabIndex={-1}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
