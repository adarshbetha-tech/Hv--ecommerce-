import React from "react";
import ScrollReveal from "../Common/ScrollReveal";

export default function BulkInquirySection({ onRequestQuote }) {
  const perks = [
    {
      icon: "🏷️",
      title: "Volume-Tiered Discounts",
      desc: "Special unit rates for 100+, 500+, and 1,000+ pack procurement.",
    },
    {
      icon: "📑",
      title: "B2B GST Tax Invoicing",
      desc: "Full Input Tax Credit (ITC) compliance with valid HSN classifications.",
    },
    {
      icon: "📐",
      title: "Material Certification",
      desc: "SS304 composition assurance and documented dimensional tolerances.",
    },
    {
      icon: "⏱️",
      title: "24-Hour RFQ Response",
      desc: "Direct review by our hardware technical desk within 1 business day.",
    },
  ];

  return (
    <section className="section vtx-bulk-section" aria-label="Bulk Orders and RFQ">
      <ScrollReveal yOffset={22} duration={0.48} scaleFrom={0.99}>
        <div className="vtx-bulk-container vtx-reveal is-revealed">
        <div className="vtx-bulk-content">
          <span className="vtx-section-tag">COMMERCIAL PROCUREMENT</span>
          <h2 className="vtx-bulk-title">
            Bulk Hardware Procurement <br />&amp; Custom RFQs
          </h2>
          <p className="vtx-bulk-lead">
            Supplying automotive lithium cells, development boards, and standard metric fasteners
            to original equipment manufacturers (OEMs), engineering colleges, and industrial workshops across India.
          </p>
          <div className="vtx-bulk-cta-wrap">
            <button
              type="button"
              className="btn btn-primary vtx-bulk-btn"
              onClick={onRequestQuote}
            >
              Request a Commercial Quote (RFQ) →
            </button>
            <span className="vtx-bulk-cta-sub">
              No minimum threshold for quote evaluation • Instant RFQ tracking ID
            </span>
          </div>
        </div>

        <div className="vtx-bulk-perks-grid">
          {perks.map((perk, idx) => (
            <div className="vtx-bulk-perk-item" key={idx}>
              <span className="vtx-bulk-perk-icon" aria-hidden="true">
                {perk.icon}
              </span>
              <div>
                <h3 className="vtx-bulk-perk-title">{perk.title}</h3>
                <p className="vtx-bulk-perk-desc">{perk.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </ScrollReveal>
    </section>
  );
}
