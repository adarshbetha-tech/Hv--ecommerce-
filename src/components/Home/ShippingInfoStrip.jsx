import React from "react";
import ScrollReveal from "../Common/ScrollReveal";

export default function ShippingInfoStrip({ onOpenPolicy }) {
  const infoItems = [
    {
      icon: "🚚",
      title: "Free Pan-India Delivery",
      desc: "On all prepaid orders above ₹799",
      action: "Shipping Info",
      policyId: "shipping",
    },
    {
      icon: "💵",
      title: "Cash on Delivery",
      desc: "Available across serviceable pincodes",
      action: "COD Terms",
      policyId: "shipping",
    },
    {
      icon: "📄",
      title: "GST Tax Invoicing",
      desc: "Official B2B invoices with input credit",
      action: "Tax Details",
      policyId: "gst",
    },
    {
      icon: "⚡",
      title: "24-Hour Dispatch",
      desc: "Fast processing from Hyderabad central hub",
      action: "Dispatch FAQs",
      policyId: "shipping",
    },
  ];

  return (
    <section className="vtx-info-strip" aria-label="Shipping and Store Guarantees">
      <h2 className="sr-only">Store Guarantees and Shipping Services</h2>
      <div className="vtx-info-strip-inner">
        {infoItems.map((item, idx) => (
          <ScrollReveal
            key={idx}
            staggerIndex={idx}
            staggerDelay={0.05}
            yOffset={14}
            duration={0.4}
            className="vtx-info-reveal-wrap"
          >
            <div className="vtx-info-strip-card">
            <span className="vtx-info-strip-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="vtx-info-strip-body">
              <h3 className="vtx-info-strip-title">{item.title}</h3>
              <p className="vtx-info-strip-desc">{item.desc}</p>
            </div>
            {onOpenPolicy && (
              <button
                type="button"
                className="vtx-info-strip-btn"
                onClick={() => onOpenPolicy(item.policyId)}
                title={`View ${item.action}`}
              >
                {item.action} →
              </button>
            )}
          </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
