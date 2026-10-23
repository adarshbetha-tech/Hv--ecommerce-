import React, { useState, useEffect, useRef, useCallback } from "react";
import arduinoImg from "../../assets/hardware/arduino.jpg";
import fastenersImg from "../../assets/hardware/fasteners.jpg";
import automationImg from "../../assets/hardware/automation.jpg";
import pcbImg from "../../assets/hardware/pcb.jpg";

const DEFAULT_SLIDES = [
  {
    id: "slide-overview",
    badge: "⚡ Industrial Components & Precision Fasteners",
    title: "Precision Electronics & Hardware Fasteners",
    titleAccent: "Built for Engineering & B2B Supply",
    subtitle:
      "Source factory-tested microcontrollers, industrial automation modules, SS304 metric fasteners, and lab components with transparent volume pricing and pan-India dispatch.",
    primaryCta: { label: "Explore Products ↓", type: "explore" },
    secondaryCta: { label: "Shop Electronics →", type: "electronics" },
    tertiaryCta: { label: "Browse Catalogue →", type: "catalog" },
    perks: [
      "✓ Factory Verified Sourcing",
      "✓ SS304 Precision Tolerances",
      "✓ GST Tax Invoicing",
    ],
    preview: {
      category: "Hardware Showcase",
      status: "● Ready to Dispatch",
      image: arduinoImg,
      alt: "Industrial Microcontroller",
      title: "Arduino Uno R3 & SS304 Metric Hardware",
      sku: "SKU: ELEC-ARD-UNO-R3 • SS304 M3-M10",
      price: "Verified B2B Direct Sourcing",
      tag: "ISO 9001 Compliant",
    },
  },
  {
    id: "slide-fasteners",
    badge: "🔩 Metric Screws & Machine Fasteners",
    title: "SS304 & Metric Hardware Screws",
    titleAccent: "Flat, Phillips, Hex & Socket Heads",
    subtitle:
      "Full range of precision machine screws, self-drilling pan screws, countersunk CSK bolts, and brass threaded inserts for mechanical assemblies and 3D printing.",
    primaryCta: { label: "Shop Fasteners →", type: "fasteners" },
    secondaryCta: { label: "Shop Electronics →", type: "electronics" },
    tertiaryCta: { label: "Browse Catalogue →", type: "catalog" },
    perks: [
      "✓ No Minimum Order Quantity (MOQ)",
      "✓ Standard Metric Pitches",
      "✓ High-Tensile SS304 & SS316",
    ],
    preview: {
      category: "Fasteners Showcase",
      status: "● In Stock (Pan-India)",
      image: fastenersImg,
      alt: "Precision Fasteners & Screws",
      title: "SS304 Hex & Socket Head Machine Screws",
      sku: "SKU: FAST-HEX-M3-M12 • DIN 912 / ISO 7380",
      price: "From ₹0.85 / unit in packs",
      tag: "Metric Standard",
    },
  },
  {
    id: "slide-robotics",
    badge: "🤖 Robotics & Embedded Systems",
    title: "Microcontroller Boards & DC Motor Drivers",
    titleAccent: "HVNEX, Arduino & PLC Automation",
    subtitle:
      "Tested development boards, high-current dual H-bridge motor drivers, opto-isolated solid-state relays, and industrial prototyping controllers.",
    primaryCta: { label: "Shop Electronics →", type: "electronics" },
    secondaryCta: { label: "Explore Products ↓", type: "explore" },
    tertiaryCta: { label: "Browse Catalogue →", type: "catalog" },
    perks: [
      "✓ 100% Quality Inspected",
      "✓ Full Pinout & Schematics",
      "✓ Bulk Project Discounts",
    ],
    preview: {
      category: "Robotics Showcase",
      status: "● Warehouse Ready",
      image: automationImg,
      alt: "Industrial Robotics & Automation",
      title: "HVNEX Motor Driver & Development Kits",
      sku: "SKU: ELEC-DRV-HVNEX-2X • 12V-36V",
      price: "High-Efficiency Dual MOSFET",
      tag: "Robotics Grade",
    },
  },
  {
    id: "slide-bulk",
    badge: "📦 Commercial Supply & Institutional Orders",
    title: "Volume Procurement & Custom Specifications",
    titleAccent: "Zero MOQ • Direct Institutional Supply",
    subtitle:
      "Dedicated fulfillment for educational laboratories, engineering startups, industrial manufacturing units, and volume assembly orders across India.",
    primaryCta: { label: "Request Commercial RFQ →", type: "quote" },
    secondaryCta: { label: "Shop Electronics →", type: "electronics" },
    tertiaryCta: { label: "Browse Catalogue →", type: "catalog" },
    perks: [
      "✓ Tiered Volume Pricing",
      "✓ Instant GST Tax Invoicing",
      "✓ Priority Dispatch Logistics",
    ],
    preview: {
      category: "Bulk Commercial Supply",
      status: "● RFQ Response in 2 Hours",
      image: pcbImg,
      alt: "Custom PCB & Electronics Fabrication",
      title: "Bulk Precision Hardware & Custom Packs",
      sku: "SKU: VTX-BULK-COMMERCIAL • All Categories",
      price: "Volume Discounts up to 35%",
      tag: "GST Input Ready",
    },
  },
];

export default function HeroSlider({
  slides = DEFAULT_SLIDES,
  onExploreProducts,
  onNavigateCategory,
  onNavigateCatalog,
  onRequestQuote,
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(0);
  const timerRef = useRef(null);

  const activeSlide = slides[currentSlideIndex] || slides[0];

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay with hover/focus pause & reduced-motion check
  useEffect(() => {
    if (slides.length <= 1) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches);

    if (prefersReducedMotion || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused, handleNext]);

  // Touch / swipe handling for mobile
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchStartXRef.current - touchEndX;
      if (deltaX > 50) {
        // Swiped left
        handleNext();
      } else if (deltaX < -50) {
        // Swiped right
        handlePrev();
      }
    }
  };

  // Keyboard navigation when hero slider has focus
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  const executeCtaAction = (type) => {
    if (type === "explore" && onExploreProducts) {
      onExploreProducts();
    } else if (type === "electronics" && onNavigateCategory) {
      onNavigateCategory("electronics");
    } else if (type === "fasteners" && onNavigateCategory) {
      onNavigateCategory("fasteners");
    } else if (type === "catalog" && onNavigateCatalog) {
      onNavigateCatalog();
    } else if (type === "quote" && onRequestQuote) {
      onRequestQuote();
    }
  };

  return (
    <section
      className="hero vtx-hero-slider-section"
      aria-label="Featured Engineering Products and Supply"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="hero-inner vtx-hero-slider-inner">
        {/* Left Copy Column */}
        <div className="hero-copy" key={`copy-${activeSlide.id}`}>
          <div className="hero-badge">
            <span>{activeSlide.badge}</span>
          </div>

          <h1>
            {activeSlide.title}
            <br />
            <span className="hero-accent">{activeSlide.titleAccent}</span>
          </h1>

          <p className="hero-sub">{activeSlide.subtitle}</p>

          <div className="hero-ctas">
            {activeSlide.primaryCta && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => executeCtaAction(activeSlide.primaryCta.type)}
              >
                {activeSlide.primaryCta.label}
              </button>
            )}
            {activeSlide.secondaryCta && (
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => executeCtaAction(activeSlide.secondaryCta.type)}
              >
                {activeSlide.secondaryCta.label}
              </button>
            )}
            {activeSlide.tertiaryCta && (
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => executeCtaAction(activeSlide.tertiaryCta.type)}
              >
                {activeSlide.tertiaryCta.label}
              </button>
            )}
          </div>

          <div className="hero-perks-row">
            {activeSlide.perks.map((perk) => (
              <span className="hero-perk-item" key={perk}>
                {perk}
              </span>
            ))}
          </div>
        </div>

        {/* Right Art / Showcase Column */}
        <div className="hero-art" aria-hidden="true" key={`art-${activeSlide.id}`}>
          <div className="hero-card-preview">
            <div className="hero-preview-header">
              <span className="hero-pill-category">{activeSlide.preview.category}</span>
              <span className="hero-pill-status">{activeSlide.preview.status}</span>
            </div>
            <div className="hero-preview-img-wrap">
              <img
                src={activeSlide.preview.image}
                alt={activeSlide.preview.alt}
                className="hero-preview-img"
                loading={currentSlideIndex === 0 ? "eager" : "lazy"}
                width="420"
                height="200"
              />
            </div>
            <div className="hero-preview-body">
              <div className="hero-preview-title">{activeSlide.preview.title}</div>
              <div className="hero-preview-sku">{activeSlide.preview.sku}</div>
              <div className="hero-preview-footer">
                <span className="hero-preview-price">{activeSlide.preview.price}</span>
                <span className="hero-preview-tag">{activeSlide.preview.tag}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slider Controls: Arrows & Indicators */}
      {slides.length > 1 && (
        <div className="vtx-hero-controls">
          <button
            type="button"
            className="vtx-hero-arrow vtx-hero-arrow-prev"
            onClick={handlePrev}
            aria-label="Previous slide"
          >
            ‹
          </button>

          <div className="vtx-hero-dots" role="tablist" aria-label="Slide indicators">
            {slides.map((s, idx) => (
              <button
                type="button"
                key={s.id || idx}
                className={`vtx-hero-dot ${idx === currentSlideIndex ? "is-active" : ""}`}
                onClick={() => setCurrentSlideIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                role="tab"
                aria-selected={idx === currentSlideIndex}
              />
            ))}
          </div>

          <button
            type="button"
            className="vtx-hero-arrow vtx-hero-arrow-next"
            onClick={handleNext}
            aria-label="Next slide"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
