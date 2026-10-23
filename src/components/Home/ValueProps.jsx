import React from "react";
import ScrollReveal from "../Common/ScrollReveal";

export default function ValueProps() {
  const valueItems = [
    {
      icon: "📐",
      tag: "PRECISION SPECS",
      title: "Documented Technical Tolerances",
      desc: "Standard metric DIN & ISO thread pitches, verified SS304 tensile ratings, and detailed engineering datasheets for every SKU.",
    },
    {
      icon: "📦",
      tag: "ZERO MOQ",
      title: "No Rigid Minimum Orders",
      desc: "Order individual development units for breadboard prototypes or scale to multi-thousand industrial assembly packs seamlessly.",
    },
    {
      icon: "🚚",
      tag: "SPEED & VISIBILITY",
      title: "Pan-India Express Logistics",
      desc: "Dispatched within 24 hours from our Hyderabad logistics hub. Transparent package status and GST compliant dispatch slips.",
    },
    {
      icon: "🛡️",
      tag: "ENTERPRISE B2B",
      title: "GST Invoicing & Volume Tiers",
      desc: "Automatic 18% / 12% GST tax invoices with input tax credit for companies, laboratories, MakerSpaces, and educational institutions.",
    },
  ];

  return (
    <section className="section vtx-value-props-section" aria-label="Why choose VERTEX">
      <ScrollReveal yOffset={16} duration={0.4}>
        <div className="section-head vtx-value-props-head">
          <div>
            <span className="vtx-section-tag">ENGINEERED FOR BUILDERS</span>
            <h2 className="vtx-section-title">Why Engineering Teams Choose VERTEX</h2>
            <p className="vtx-section-sub">
              Bridging precision industrial mechanical fasteners with certified electronics, microcontrollers, and automation hardware.
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="vtx-value-props-grid">
        {valueItems.map((item, idx) => (
          <ScrollReveal
            key={idx}
            staggerIndex={idx}
            staggerDelay={0.075}
            yOffset={18}
            scaleFrom={0.99}
            duration={0.45}
            className="vtx-value-card-reveal"
          >
            <div
              className={`vtx-value-card vtx-reveal is-revealed vtx-stagger-${(idx % 4) + 1}`}
            >
              <div className="vtx-value-card-header">
                <span className="vtx-value-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="vtx-value-tag">{item.tag}</span>
              </div>
              <div className="vtx-value-content">
                <h3 className="vtx-value-title">{item.title}</h3>
                <p className="vtx-value-desc">{item.desc}</p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
