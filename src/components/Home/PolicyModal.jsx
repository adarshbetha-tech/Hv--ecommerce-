import React, { useEffect } from "react";

export const POLICIES = {
  shipping: {
    id: "shipping",
    title: "Pan-India Shipping & Delivery Policy",
    icon: "🚚",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "Free Shipping Threshold",
        body: "Prepaid orders with a subtotal of ₹799 or above qualify for free standard shipping across all serviceable pin codes in India. For orders below ₹799, a flat delivery fee of ₹49 applies.",
      },
      {
        heading: "Cash on Delivery (COD)",
        body: "Cash on Delivery is supported for select serviceable delivery pin codes on orders valued between ₹450 and ₹1,500. A standard handling fee of ₹40 may be applied at checkout for COD processing.",
      },
      {
        heading: "Dispatch & Turnaround Time",
        body: "All verified orders placed Monday through Friday before 2:00 PM IST are packed and dispatched within 24 hours from our Hyderabad logistics facility. Typical courier transit time is 2 to 5 business days depending on destination tier.",
      },
      {
        heading: "Transit Tracking & Packaging",
        body: "Hardware components and sensitive electronic modules (microcontrollers, development boards) are packed in electrostatic-discharge (ESD) safe shielding and heavy-gauge corrugated boxes. Real-time courier tracking numbers are dispatched upon handover.",
      },
    ],
  },
  gst: {
    id: "gst",
    title: "GST Tax Invoicing & B2B Compliance",
    icon: "📄",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "Tax Invoices for All Orders",
        body: "Every single purchase made on VERTEX includes a legally compliant Tax Invoice issued under Indian Goods and Services Tax (GST) regulations, complete with HSN codes and appropriate IGST / CGST / SGST rates.",
      },
      {
        heading: "Input Tax Credit (ITC) for Businesses",
        body: "Corporate entities, workshops, and GST-registered proprietary firms can enter their 15-digit GSTIN and legal entity name during checkout or quote submission. The tax invoice will reflect your GSTIN for direct Input Tax Credit claims on your monthly returns.",
      },
      {
        heading: "Digital Invoice Copies",
        body: "An official PDF tax invoice is automatically generated upon order completion and available for download in your order confirmation email and customer dashboard.",
      },
    ],
  },
  returns: {
    id: "returns",
    title: "Returns, Replacements & Warranty",
    icon: "🛡️",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "7-Day Transit Damage & Defect Replacement",
        body: "If any component arrives physically damaged, missing specified quantities, or exhibiting factory dead-on-arrival (DOA) defects, notify us within 7 days of delivery with an unboxing photo or video for an immediate free replacement.",
      },
      {
        heading: "Component Integrity & Technical Standards",
        body: "Because fasteners and electronic ICs require rigorous dimensional and electrical verification, items returned must be in unused condition with original pack labelling intact.",
      },
      {
        heading: "Refund Processing",
        body: "Approved refunds for out-of-stock replacement requests are processed back to the original payment source within 3 to 5 business days.",
      },
    ],
  },
  privacy: {
    id: "privacy",
    title: "Privacy & Data Safeguards",
    icon: "🔒",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "Data Collection & Purpose",
        body: "VERTEX collects only essential contact details, shipping addresses, and tax numbers required to fulfill logistics, issue invoices, and communicate order tracking updates.",
      },
      {
        heading: "Security & Encryption",
        body: "All communications are encrypted using modern Transport Layer Security (TLS 1.3). Passwords and sensitive credentials are encrypted using industry-standard bcrypt hashes. Payment processing occurs through PCI-DSS compliant payment gateways; VERTEX never stores complete debit/credit card numbers.",
      },
      {
        heading: "No Data Brokering",
        body: "We do not sell, rent, or trade your phone number, email address, or corporate purchasing habits to third-party marketing firms.",
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Terms of Service",
    icon: "⚖️",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "Storefront Usage",
        body: "By accessing VERTEX storefront, you agree to browse catalog specifications, place legitimate purchase orders, and request quotes in good faith for engineering and industrial hardware.",
      },
      {
        heading: "Pricing & Technical Accuracy",
        body: "We strive for complete accuracy in dimensional metric pitches, pack sizes, and pricing. In the rare event of a typographical pricing error, VERTEX reserves the right to notify the customer and rectify or cancel the impacted line item prior to dispatch.",
      },
      {
        heading: "Commercial Orders & Quotations",
        body: "Quotations generated via the VERTEX RFQ system are valid for 15 calendar days from issuance, subject to material raw commodity market fluctuations for stainless steel and copper.",
      },
    ],
  },
};

export default function PolicyModal({ policyId, isOpen, onClose }) {
  const [activeId, setActiveId] = React.useState(policyId || "shipping");

  useEffect(() => {
    if (policyId) setActiveId(policyId);
  }, [policyId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPolicy = POLICIES[activeId] || POLICIES.shipping;

  return (
    <div
      className="vtx-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={currentPolicy.title}
    >
      <div
        className="vtx-modal vtx-policy-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vtx-policy-header">
          <div className="vtx-policy-header-left">
            <span className="vtx-policy-icon" aria-hidden="true">
              {currentPolicy.icon}
            </span>
            <div>
              <h2 className="vtx-policy-title">{currentPolicy.title}</h2>
              <span className="vtx-policy-meta">
                VERTEX Official Policy • Last reviewed {currentPolicy.lastUpdated}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="vtx-modal-close"
            onClick={onClose}
            aria-label="Close policy dialog"
          >
            ✕
          </button>
        </div>

        {/* Tab navigation for quick switching */}
        <div className="vtx-policy-tabs" role="tablist" aria-label="Store policies">
          {Object.values(POLICIES).map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={activeId === p.id}
              className={`vtx-policy-tab ${activeId === p.id ? "is-active" : ""}`}
              onClick={() => setActiveId(p.id)}
            >
              <span className="vtx-policy-tab-icon" aria-hidden="true">
                {p.icon}
              </span>
              <span>{p.title.split("&")[0].trim()}</span>
            </button>
          ))}
        </div>

        <div className="vtx-policy-content">
          {currentPolicy.sections.map((sec, idx) => (
            <div className="vtx-policy-section" key={idx}>
              <h3 className="vtx-policy-sec-heading">{sec.heading}</h3>
              <p className="vtx-policy-sec-body">{sec.body}</p>
            </div>
          ))}
        </div>

        <div className="vtx-policy-footer">
          <p className="vtx-policy-footer-note">
            Have questions regarding this policy? Contact our team at{" "}
            <a href="mailto:sales@vertex.in" className="vtx-policy-link">
              sales@vertex.in
            </a>
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close Policy
          </button>
        </div>
      </div>
    </div>
  );
}
