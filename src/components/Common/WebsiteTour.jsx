import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./WebsiteTour.css";

// Bump this key so visitors who tested an earlier tour version still get
// the corrected first-visit tour once. It is stored per browser/device.
const STORAGE_KEY = "hv-vertex-website-tour-v3-completed";

const TOUR_STEPS = [
  {
    target: null,
    eyebrow: "WELCOME TO HV VERTEX",
    title: "Welcome to HV Vertex.",
    description: "Find the products you need, save favourites, and manage your cart in just a few steps.",
  },
  {
    target: '[data-tour="search"]',
    eyebrow: "FIND WHAT YOU NEED",
    title: "Search for products",
    description: "Use search to quickly find a product by name or keyword.",
  },
  {
    target: "#shop-categories",
    eyebrow: "BROWSE BY CATEGORY",
    title: "Start with a category",
    description: "Choose a category to browse products and find the items that suit your needs.",
  },
  {
    target: '[data-tour="products"]',
    eyebrow: "DISCOVER PRODUCTS",
    title: "Explore product details",
    description: "Explore available products and open an item to see its details before you decide.",
  },
  {
    target: '[data-tour="wishlist"]',
    eyebrow: "SAVE FOR LATER",
    title: "Keep a wishlist",
    description: "Tap the wishlist option on products you like, then return to them whenever you are ready.",
  },
  {
    target: '[data-tour="cart"]',
    eyebrow: "READY TO CHECK OUT",
    title: "Your cart, all in one place",
    description: "Review your selected items, change quantities, or remove products before continuing to checkout.",
  },
  {
    target: null,
    eyebrow: "YOU'RE ALL SET",
    title: "You’re ready to shop.",
    description: "You’re all set. Explore HV Vertex, discover products, and shop whenever you’re ready.",
  },
];

export default function WebsiteTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const step = TOUR_STEPS[stepIndex];

  const closeTour = useCallback((completed = false) => {
    setOpen(false);
    setTargetRect(null);
    if (completed && typeof window !== "undefined") {
      try { window.localStorage.setItem(STORAGE_KEY, "true"); } catch { /* Storage may be unavailable. */ }
    }
  }, []);

  useEffect(() => {
    let timer;
    try {
      // Automatically open the tour once for each browser/device.
      // If storage is unavailable, still show it rather than silently skipping it.
      if (window.localStorage.getItem(STORAGE_KEY) !== "true") {
        timer = window.setTimeout(() => setOpen(true), 800);
      }
    } catch {
      timer = window.setTimeout(() => setOpen(true), 800);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open || !step?.target) {
      setTargetRect(null);
      return undefined;
    }
    let frame;
    const measure = () => {
      const target = document.querySelector(step.target);
      if (!target) {
        setTargetRect(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const scheduleMeasure = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const target = document.querySelector(step.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    measure();
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeTour(false);
      if (event.key === "ArrowRight") setStepIndex((index) => Math.min(index + 1, TOUR_STEPS.length - 1));
      if (event.key === "ArrowLeft") setStepIndex((index) => Math.max(index - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeTour]);

  const progress = useMemo(() => ((stepIndex + 1) / TOUR_STEPS.length) * 100, [stepIndex]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setOpen(true);
  }, []);

  return (
    <>
      {!open && (
        <button type="button" className="vtx-tour-replay-btn" onClick={startTour} aria-label="Start the HV Vertex shopping tour" title="Take the shopping tour">
          <span aria-hidden="true">✦</span> Tour
        </button>
      )}
      {open && (
        <div className="vtx-tour-layer" role="presentation">
          {targetRect && step.target && <div className="vtx-tour-spotlight" style={{ top: targetRect.top - 7, left: targetRect.left - 7, width: targetRect.width + 14, height: targetRect.height + 14 }} />}
          <div className="vtx-tour-scrim" onClick={() => closeTour(false)} />
          <section className="vtx-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="vtx-tour-title" aria-describedby="vtx-tour-description">
            <div className="vtx-tour-topline"><span className="vtx-tour-mark">V</span><span>HV VERTEX SHOPPING TOUR</span><button type="button" className="vtx-tour-close" onClick={() => closeTour(false)} aria-label="Close tour">×</button></div>
            <div className="vtx-tour-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
            <p className="vtx-tour-eyebrow">{step.eyebrow}</p>
            <h2 id="vtx-tour-title">{step.title}</h2>
            <p id="vtx-tour-description">{step.description}</p>
            {step.target && !targetRect && <p className="vtx-tour-note">This area may be outside the current layout. Continue to explore the tour.</p>}
            <div className="vtx-tour-footer"><span className="vtx-tour-count">{stepIndex + 1} <span>/</span> {TOUR_STEPS.length}</span><div className="vtx-tour-actions">
              {stepIndex > 0 && <button type="button" className="vtx-tour-back" onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}>Back</button>}
              {stepIndex < TOUR_STEPS.length - 1 ? <button type="button" className="vtx-tour-next" onClick={() => setStepIndex((index) => Math.min(index + 1, TOUR_STEPS.length - 1))}>Next <span aria-hidden="true">→</span></button> : <button type="button" className="vtx-tour-next" onClick={() => closeTour(true)}>Finish tour <span aria-hidden="true">✓</span></button>}
            </div></div>
            <button type="button" className="vtx-tour-skip" onClick={() => closeTour(true)}>Skip tour</button>
          </section>
        </div>
      )}
    </>
  );
}
