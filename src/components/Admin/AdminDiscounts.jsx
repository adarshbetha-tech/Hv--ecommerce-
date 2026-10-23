import React, { useState, useEffect } from "react";
import { getAdminProducts } from "../../services/adminApi";

// Currency Formatter
const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Initial specifications representing both Regular Commercial and College Educational promotions
const INITIAL_COUPONS = [
  {
    id: "coup-reg-01",
    code: "VTX-IND-BULK10",
    campaignName: "Industrial Bulk Fasteners Incentive",
    recipientName: "Premier Heavy Industries Ltd.",
    recipientAddress: "Plot 42, Peenya Industrial Area Phase 2, Bengaluru, Karnataka 560058",
    category: "regular",
    subType: "reusable",
    typeLabel: "Time-Limited Reusable",
    discountType: "percentage",
    discountValue: 10.0,
    minOrder: 10000.0,
    maxDiscount: 2500.0,
    validityDuration: "custom",
    validPeriod: "Jan 2026 – Dec 2026",
    expiresAt: "2026-12-31T23:59:59",
    status: "active",
    usagePolicy: "Reusable while valid (unlimited per customer)",
    perCustomerLimit: "Unlimited",
    redemptionStatus: "Available",
    usageCount: 14,
    description: "Volume tier discount applicable to wholesale fastener crates and hardware assortments.",
  },
  {
    id: "coup-reg-02",
    code: "VTX-ELEC-FIRST",
    campaignName: "New Lab Welcome Voucher",
    recipientName: "National Avionics Research Laboratory",
    recipientAddress: "HAL Airport Road, Kodihalli, Bengaluru, Karnataka 560017",
    category: "regular",
    subType: "single_use",
    typeLabel: "Single-Use Voucher",
    discountType: "fixed",
    discountValue: 500.0,
    minOrder: 3000.0,
    maxDiscount: 500.0,
    validityDuration: "custom",
    validPeriod: "Nov 2026 – Dec 2026",
    expiresAt: "2026-12-31T23:59:59",
    status: "scheduled",
    usagePolicy: "Single-use per customer (1 redemption maximum)",
    perCustomerLimit: "1 use",
    redemptionStatus: "Available",
    usageCount: 0,
    description: "Introductory voucher for newly registered research labs and university departments.",
  },
  {
    id: "coup-col-01",
    code: "VTX-COLLEGE-ROBO",
    campaignName: "National Robotics Championship Lab Kit",
    category: "college",
    subType: "college_gift",
    typeLabel: "College Educational Gift",
    collegeName: "Indian Institute of Science (IISc) Bengaluru",
    collegeAddress: "CV Raman Road, Mathikere, Bengaluru, Karnataka 560012",
    recipientName: "Robotics & Autonomous Systems Lab",
    recipientAddress: "Dept of Mechanical Engineering, IISc Campus, Bengaluru 560012",
    collegeId: "IISC-ROBO-2026",
    studentDomain: "@iisc.ac.in",
    discountType: "free_gift",
    discountValue: 0,
    freeProductName: "Arduino Uno R3 Microcontroller Board",
    freeProductSku: "ELEC-ARD-UNO-R3",
    freeProductValue: 1299.0,
    minOrder: 1500.0,
    maxDiscount: 1299.0,
    validityDuration: "semester",
    validPeriod: "Academic Year 2025-2026",
    expiresAt: "2026-06-30T23:59:59",
    status: "active",
    eligibilityCriteria: "Enrolled engineering students with verified @iisc.ac.in email or student ID",
    usagePolicy: "1 free board per student ID with qualifying lab order",
    perCustomerLimit: "1 per student",
    redemptionStatus: "Available",
    usageCount: 28,
    description: "Complimentary Arduino Uno R3 development board for autonomous robotics teams.",
  },
  {
    id: "coup-col-02",
    code: "VTX-IITM-AERO26",
    campaignName: "Aerospace Engineering Project Grant",
    category: "college",
    subType: "college_gift",
    typeLabel: "College Educational Gift",
    collegeName: "IIT Madras - Aero Design Lab",
    collegeAddress: "IIT P.O., Sardar Patel Road, Chennai, Tamil Nadu 600036",
    recipientName: "Aero Design Project Group",
    recipientAddress: "Dept of Aerospace Engineering, IIT Madras, Chennai 600036",
    collegeId: "IITM-AERO-GRANT",
    studentDomain: "@smail.iitm.ac.in",
    discountType: "percentage",
    discountValue: 20.0,
    freeProductName: "Stainless Steel Hex Bolt (Pack of 10)",
    freeProductSku: "FAST-HEX-M8-30-P10",
    freeProductValue: 120.0,
    minOrder: 2500.0,
    maxDiscount: 1500.0,
    validityDuration: "custom",
    validPeriod: "Aug 2026 – May 2027",
    expiresAt: "2027-05-31T23:59:59",
    status: "active",
    eligibilityCriteria: "Verified student ID or @smail.iitm.ac.in institutional domain",
    usagePolicy: "Reusable for official project teams (up to 5 orders per group)",
    perCustomerLimit: "5 per team",
    redemptionStatus: "Available",
    usageCount: 12,
    description: "20% discount plus complimentary high-tensile stainless fastener test pack.",
  },
];

// Fallback catalog gifts if catalog is loading
const FALLBACK_GIFTS = [
  { sku: "ELEC-ARD-UNO-R3", name: "Arduino Uno R3 Microcontroller Board", price: 1299.0 },
  { sku: "FAST-HEX-M8-30-P10", name: "Stainless Steel Hex Bolt (Pack of 10)", price: 120.0 },
  { sku: "ELEC-RASP-PI-4B", name: "Raspberry Pi 4 Model B (4GB RAM)", price: 4899.0 },
];

export default function AdminDiscounts() {
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);
  const [catalogProducts, setCatalogProducts] = useState(FALLBACK_GIFTS);
  const [activeCategoryTab, setActiveCategoryTab] = useState("all"); // "all" | "regular" | "college"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "percentage" | "fixed" | "free_gift"

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategory, setCreateCategory] = useState("regular"); // "regular" | "college"
  const [inspectingCoupon, setInspectingCoupon] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Form states for Regular Coupon
  const [regSubType, setRegSubType] = useState("reusable"); // "reusable" | "single_use"
  const [regCode, setRegCode] = useState("");
  const [regCampaignName, setRegCampaignName] = useState("");
  const [regRecipientName, setRegRecipientName] = useState("");
  const [regRecipientAddress, setRegRecipientAddress] = useState("");
  const [regDiscountType, setRegDiscountType] = useState("percentage");
  const [regDiscountVal, setRegDiscountVal] = useState("10");
  const [regMinOrder, setRegMinOrder] = useState("5000");
  const [regMaxDiscount, setRegMaxDiscount] = useState("2000");
  const [regDurationPreset, setRegDurationPreset] = useState("custom"); // "2_days" | "5_days" | "custom"
  const [regCustomPeriod, setRegCustomPeriod] = useState("Nov 2026 – Dec 2026");
  const [regCustomerLimit, setRegCustomerLimit] = useState("Unlimited");
  const [regStatus, setRegStatus] = useState("active");
  const [regDescription, setRegDescription] = useState("");

  // Form states for College Coupon
  const [colCollegeName, setColCollegeName] = useState("");
  const [colCollegeAddress, setColCollegeAddress] = useState("");
  const [colRecipientName, setColRecipientName] = useState("");
  const [colCollegeId, setColCollegeId] = useState("");
  const [colStudentDomain, setColStudentDomain] = useState("");
  const [colCode, setColCode] = useState("");
  const [colCampaignName, setColCampaignName] = useState("");
  const [colBenefitType, setColBenefitType] = useState("free_gift"); // "free_gift" | "percentage"
  const [colSelectedGiftSku, setColSelectedGiftSku] = useState(FALLBACK_GIFTS[0].sku);
  const [colDiscountVal, setColDiscountVal] = useState("15");
  const [colMinOrder, setColMinOrder] = useState("1000");
  const [colPeriod, setColPeriod] = useState("Academic Year 2026");
  const [colEligibility, setColEligibility] = useState("Enrolled students with verified institutional ID");
  const [colStatus, setColStatus] = useState("active");
  const [colDescription, setColDescription] = useState("");

  const [formError, setFormError] = useState("");

  // Load real catalog products for free gift selection
  useEffect(() => {
    let isMounted = true;
    async function fetchCatalog() {
      try {
        const res = await getAdminProducts({ limit: 50 });
        if (isMounted && res?.products && res.products.length > 0) {
          const mapped = res.products.map((p) => {
            const firstVariant = p.variants?.[0] || {};
            return {
              sku: firstVariant.sku || p.slug,
              name: p.name,
              price: firstVariant.price || p.price || 999,
            };
          });
          setCatalogProducts(mapped);
          if (mapped.length > 0) {
            setColSelectedGiftSku(mapped[0].sku);
          }
        }
      } catch (err) {
        console.warn("Catalog fetch for gift selection (using fallbacks):", err);
      }
    }
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (showCreateModal || inspectingCoupon) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCreateModal, inspectingCoupon]);

  // Filter coupons
  const filteredCoupons = coupons.filter((c) => {
    // 1. Category Tab
    if (activeCategoryTab === "regular" && c.category !== "regular") return false;
    if (activeCategoryTab === "college" && c.category !== "college") return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = (c.code || "").toLowerCase().includes(q);
      const nameMatch = (c.campaignName || "").toLowerCase().includes(q);
      const collegeMatch = (c.collegeName || "").toLowerCase().includes(q);
      const collegeIdMatch = (c.collegeId || "").toLowerCase().includes(q);
      const giftMatch = (c.freeProductName || "").toLowerCase().includes(q);
      const skuMatch = (c.freeProductSku || "").toLowerCase().includes(q);
      const descMatch = (c.description || "").toLowerCase().includes(q);
      if (
        !codeMatch &&
        !nameMatch &&
        !collegeMatch &&
        !collegeIdMatch &&
        !giftMatch &&
        !skuMatch &&
        !descMatch
      ) {
        return false;
      }
    }

    // 3. Status Filter
    if (statusFilter !== "all" && c.status !== statusFilter) return false;

    // 4. Benefit Type Filter
    if (typeFilter !== "all" && c.discountType !== typeFilter) return false;

    return true;
  });

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    activeCategoryTab !== "all"
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setActiveCategoryTab("all");
  };

  // Generate code helpers
  const handleGenerateRegCode = () => {
    const prefix = regSubType === "single_use" ? "VTX-ONE-" : "VTX-PROMO-";
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRegCode(`${prefix}${rand}`);
  };

  const handleGenerateColCode = () => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setColCode(`VTX-COLLEGE-${rand}`);
  };

  // Open Create Modal for specific category
  const handleOpenCreateModal = (category = "regular") => {
    setCreateCategory(category);
    setFormError("");
    if (category === "regular") {
      handleGenerateRegCode();
    } else {
      handleGenerateColCode();
    }
    setShowCreateModal(true);
  };

  // Duration preset selection for Regular Coupon
  const handleSelectDurationPreset = (preset) => {
    setRegDurationPreset(preset);
    if (preset === "2_days") {
      setRegCustomPeriod("2 Days (48 Hours from issuance)");
    } else if (preset === "5_days") {
      setRegCustomPeriod("5 Days (120 Hours from issuance)");
    } else {
      setRegCustomPeriod("Nov 2026 – Dec 2026");
    }
  };

  // Toggle Coupon Status (Active / Disabled)
  const handleToggleStatus = (couponId) => {
    setCoupons((prev) =>
      prev.map((c) => {
        if (c.id === couponId) {
          const nextStatus = c.status === "active" ? "disabled" : "active";
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
    setFeedbackMessage({
      type: "info",
      text: "Coupon status toggled successfully in admin session registry.",
    });
  };

  // Submit Create Form
  const handleCreateCouponSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (createCategory === "regular") {
      if (!regCode.trim()) {
        setFormError("Please enter or generate a coupon code.");
        return;
      }
      if (!regCampaignName.trim()) {
        setFormError("Please enter a campaign name.");
        return;
      }

      const isSingle = regSubType === "single_use";
      const newCoupon = {
        id: `coup-reg-${Date.now()}`,
        code: regCode.trim().toUpperCase(),
        campaignName: regCampaignName.trim(),
        recipientName: regRecipientName.trim() || null,
        recipientAddress: regRecipientAddress.trim() || null,
        category: "regular",
        subType: regSubType,
        typeLabel: isSingle ? "Single-Use Voucher" : "Time-Limited Reusable",
        discountType: regDiscountType,
        discountValue: Number(regDiscountVal) || 0,
        minOrder: Number(regMinOrder) || 0,
        maxDiscount: Number(regMaxDiscount) || 0,
        validityDuration: regDurationPreset,
        validPeriod: regCustomPeriod || "Specified period",
        status: regStatus,
        usagePolicy: isSingle
          ? "Single-use per customer (1 redemption maximum)"
          : `Reusable while valid (${regCustomerLimit} per customer)`,
        perCustomerLimit: isSingle ? "1 use" : regCustomerLimit,
        redemptionStatus: "Available",
        usageCount: 0,
        description:
          regDescription.trim() ||
          (isSingle ? "Single-use promotional voucher." : "Reusable commercial discount."),
      };

      setCoupons((prev) => [newCoupon, ...prev]);
      setShowCreateModal(false);
      setFeedbackMessage({
        type: "success",
        text: `Regular coupon "${newCoupon.code}" created and registered in admin session.`,
      });
    } else {
      // College Coupon
      if (!colCollegeName.trim()) {
        setFormError("Please specify the college or university name.");
        return;
      }
      if (!colCode.trim()) {
        setFormError("Please enter or generate a college coupon code.");
        return;
      }
      if (!colCampaignName.trim()) {
        setFormError("Please enter an educational campaign name.");
        return;
      }

      const selectedGift = catalogProducts.find((p) => p.sku === colSelectedGiftSku);

      const newCoupon = {
        id: `coup-col-${Date.now()}`,
        code: colCode.trim().toUpperCase(),
        campaignName: colCampaignName.trim(),
        recipientName: colRecipientName.trim() || null,
        collegeAddress: colCollegeAddress.trim() || null,
        recipientAddress: colCollegeAddress.trim() || null,
        category: "college",
        subType: "college_gift",
        typeLabel: "College Educational Gift",
        collegeName: colCollegeName.trim(),
        collegeId: colCollegeId.trim() || "COLLEGE-ID-PENDING",
        studentDomain: colStudentDomain.trim() || "@college.edu",
        discountType: colBenefitType,
        discountValue: colBenefitType === "percentage" ? Number(colDiscountVal) || 0 : 0,
        freeProductName:
          colBenefitType === "free_gift"
            ? selectedGift?.name || "Educational Hardware Kit"
            : null,
        freeProductSku:
          colBenefitType === "free_gift" ? selectedGift?.sku || colSelectedGiftSku : null,
        freeProductValue:
          colBenefitType === "free_gift" ? selectedGift?.price || 1200 : null,
        minOrder: Number(colMinOrder) || 0,
        maxDiscount:
          colBenefitType === "percentage"
            ? Number(colDiscountVal) * 50
            : selectedGift?.price || 1299,
        validityDuration: "semester",
        validPeriod: colPeriod || "Academic Semester",
        status: colStatus,
        eligibilityCriteria:
          colEligibility.trim() || "Verified enrolled students with valid institutional email/ID",
        usagePolicy: "1 redemption per verified student ID with qualifying lab order",
        perCustomerLimit: "1 per student",
        redemptionStatus: "Available",
        usageCount: 0,
        description:
          colDescription.trim() ||
          `College partner promotion for students of ${colCollegeName.trim()}.`,
      };

      setCoupons((prev) => [newCoupon, ...prev]);
      setShowCreateModal(false);
      setFeedbackMessage({
        type: "success",
        text: `College coupon "${newCoupon.code}" for ${newCoupon.collegeName} successfully registered in admin session.`,
      });
    }
  };

  // Status badge helper
  const getBadgeForStatus = (status) => {
    switch (status) {
      case "active":
        return { label: "Active", className: "adm-badge-success" };
      case "scheduled":
        return { label: "Scheduled", className: "adm-badge-info" };
      case "expired":
        return { label: "Expired", className: "adm-badge-warning" };
      case "disabled":
        return { label: "Disabled", className: "adm-badge-neutral" };
      default:
        return { label: status, className: "adm-badge-neutral" };
    }
  };

  // KPI Metrics calculation
  const totalCouponsCount = coupons.length;
  const regularCouponsCount = coupons.filter((c) => c.category === "regular").length;
  const collegeCouponsCount = coupons.filter((c) => c.category === "college").length;
  const activeCouponsCount = coupons.filter((c) => c.status === "active").length;

  return (
    <div className="adm-discounts-view">
      {/* Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Discounts &amp; Promotions Management</h1>
          <p className="adm-page-subtitle">
            Configure industrial B2B discount tiers, time-limited reusable coupons, single-use vouchers, and verified college promotional programs.
          </p>
        </div>
        <div className="adm-page-actions" style={{ gap: 10 }}>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => handleOpenCreateModal("college")}
            data-testid="create-college-coupon-btn"
          >
            🎓 New College Coupon
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => handleOpenCreateModal("regular")}
            data-testid="create-discount-btn"
          >
            + Create Promotion
          </button>
        </div>
      </div>

      {/* Integration Status Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">ℹ️</span>
        <div>
          <strong>Backend Architecture Roadmap Notice:</strong> The PostgreSQL schema currently enforces server-authoritative pricing via <code>TieredPrice</code> for volume orders. Order-level coupon and promotion codes (e.g. <code>Discount</code> or <code>Promotion</code> models) require an authorized database migration and validation engine. Promotion parameters below reflect the planned specification.
        </div>
      </div>

      {/* Ephemeral Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`adm-notice-banner ${
            feedbackMessage.type === "success"
              ? "adm-notice-success"
              : feedbackMessage.type === "warning"
              ? "adm-notice-warning"
              : "adm-notice-info"
          }`}
          role="status"
          style={{ marginBottom: 18 }}
        >
          <span className="adm-notice-icon">
            {feedbackMessage.type === "success" ? "✅" : "ℹ️"}
          </span>
          <div style={{ flex: 1 }}>{feedbackMessage.text}</div>
          <button
            type="button"
            className="adm-btn-text"
            onClick={() => setFeedbackMessage(null)}
            style={{ fontSize: "0.85rem", cursor: "pointer", marginLeft: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="adm-customer-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Total Coupons</span>
            <span className="adm-customer-kpi-val">{totalCouponsCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
            🏷️
          </div>
        </div>

        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Regular Commercial</span>
            <span className="adm-customer-kpi-val">{regularCouponsCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
            💼
          </div>
        </div>

        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">College Coupons</span>
            <span className="adm-customer-kpi-val">{collegeCouponsCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-green" aria-hidden="true">
            🎓
          </div>
        </div>

        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Active Campaigns</span>
            <span className="adm-customer-kpi-val">{activeCouponsCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
            ⚡
          </div>
        </div>
      </div>

      {/* Category Tabs: All, Regular, College */}
      <div className="adm-coupon-tabs" role="tablist" aria-label="Coupon Categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryTab === "all"}
          className={`adm-coupon-tab-btn ${activeCategoryTab === "all" ? "active" : ""}`}
          onClick={() => setActiveCategoryTab("all")}
        >
          All Coupons ({totalCouponsCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryTab === "regular"}
          className={`adm-coupon-tab-btn ${activeCategoryTab === "regular" ? "active" : ""}`}
          onClick={() => setActiveCategoryTab("regular")}
        >
          Regular Coupons ({regularCouponsCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryTab === "college"}
          className={`adm-coupon-tab-btn ${activeCategoryTab === "college" ? "active" : ""}`}
          onClick={() => setActiveCategoryTab("college")}
        >
          College Coupons ({collegeCouponsCount})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by code, campaign, or college name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search promotions"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter promotions by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            className="adm-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter promotions by benefit type"
          >
            <option value="all">All Benefit Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
            <option value="free_gift">Free Gift / Product</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={handleClearFilters}
              title="Reset search and filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredCoupons.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            🏷️
          </div>
          <h3 className="adm-empty-title">
            {hasActiveFilters ? "No Matching Coupons Found" : "No Coupons Registered"}
          </h3>
          <p className="adm-empty-desc">
            {hasActiveFilters
              ? "No promotions or college coupons match your current filters. Clear filters to view all campaigns."
              : "No promotional campaigns are currently registered in this session."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          ) : (
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              onClick={() => handleOpenCreateModal("regular")}
            >
              + Create Promotion
            </button>
          )}
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          <div className="adm-card-header" style={{ padding: "16px 20px" }}>
            <div>
              <h2 className="adm-card-title" style={{ margin: 0 }}>
                {activeCategoryTab === "college"
                  ? "College Educational Coupons Registry"
                  : activeCategoryTab === "regular"
                  ? "Regular Commercial Coupons Registry"
                  : "Promotions & Voucher Registry"}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--adm-text-secondary)" }}>
                Showing {filteredCoupons.length} of {coupons.length} registered coupons
              </span>
            </div>
            <span className="adm-badge adm-badge-neutral">Read-Only Architecture Preview</span>
          </div>

          {/* Desktop Table View */}
          <div className="adm-coupon-desktop-table">
            <div className="adm-table-container">
              <table className="adm-table" aria-label="Promotions list">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Category &amp; Campaign</th>
                    <th>Discount / Benefit</th>
                    <th>Usage &amp; Policy</th>
                    <th>Validity Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map((coupon) => {
                    const statusBadge = getBadgeForStatus(coupon.status);
                    const isCollege = coupon.category === "college";
                    return (
                      <tr key={coupon.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <code>{coupon.code}</code>
                            <span
                              className={`adm-badge ${
                                isCollege ? "adm-badge-info" : "adm-badge-neutral"
                              }`}
                              style={{ fontSize: "0.68rem", width: "fit-content" }}
                            >
                              {isCollege ? "🎓 College" : "💼 Regular"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong>{coupon.campaignName}</strong>
                          {isCollege ? (
                            <div style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)", marginTop: 2 }}>
                              <span style={{ fontWeight: 600 }}>🏫 {coupon.collegeName}</span>
                              {coupon.studentDomain && (
                                <span style={{ marginLeft: 6, color: "var(--adm-text-muted)" }}>
                                  ({coupon.studentDomain})
                                </span>
                              )}
                              {(coupon.collegeAddress || coupon.recipientAddress) && (
                                <div style={{ fontSize: "0.73rem", color: "var(--adm-text-muted)", marginTop: 2 }} title={coupon.collegeAddress || coupon.recipientAddress}>
                                  📍 {coupon.collegeAddress || coupon.recipientAddress}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)", marginTop: 2 }}>
                              {coupon.recipientName && (
                                <div style={{ fontWeight: 600, color: "var(--adm-text-primary)" }}>
                                  👤 {coupon.recipientName}
                                </div>
                              )}
                              {coupon.recipientAddress && (
                                <div style={{ fontSize: "0.73rem", color: "var(--adm-text-muted)", marginTop: 1 }} title={coupon.recipientAddress}>
                                  📍 {coupon.recipientAddress}
                                </div>
                              )}
                              {!coupon.recipientName && !coupon.recipientAddress && (
                                <div>{coupon.description}</div>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          {coupon.discountType === "free_gift" ? (
                            <div>
                              <span className="adm-badge adm-badge-success" style={{ fontSize: "0.72rem" }}>
                                🎁 Free Gift
                              </span>
                              <div style={{ fontWeight: 600, fontSize: "0.82rem", marginTop: 2 }}>
                                {coupon.freeProductName}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--adm-text-secondary)" }}>
                                SKU: {coupon.freeProductSku}
                              </div>
                            </div>
                          ) : coupon.discountType === "percentage" ? (
                            <div>
                              <strong style={{ color: "var(--adm-primary)" }}>
                                {coupon.discountValue}% Off
                              </strong>
                              <div style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)" }}>
                                Min: {formatINR(coupon.minOrder)} | Cap: {formatINR(coupon.maxDiscount)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <strong style={{ color: "#059669" }}>
                                {formatINR(coupon.discountValue)} Off
                              </strong>
                              <div style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)" }}>
                                Min: {formatINR(coupon.minOrder)}
                              </div>
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--adm-text-primary)" }}>
                            {coupon.typeLabel}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--adm-text-secondary)", marginTop: 2 }}>
                            {coupon.usagePolicy}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--adm-text-muted)", marginTop: 2 }}>
                            Limit: {coupon.perCustomerLimit}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                            {coupon.validPeriod}
                          </div>
                          {coupon.validityDuration && coupon.validityDuration !== "custom" && (
                            <span className="adm-badge adm-badge-neutral" style={{ fontSize: "0.68rem" }}>
                              {coupon.validityDuration.replace("_", " ")}
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span className={`adm-badge ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                            {coupon.subType === "single_use" && (
                              <span style={{ fontSize: "0.72rem", color: "var(--adm-text-secondary)" }}>
                                Status: {coupon.redemptionStatus || "Available"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              onClick={() => setInspectingCoupon(coupon)}
                              data-testid={`inspect-coupon-${coupon.code}`}
                              title="Inspect full coupon parameters and backend policy"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn-outline adm-btn-sm"
                              onClick={() => handleToggleStatus(coupon.id)}
                              data-testid={`toggle-status-${coupon.code}`}
                              title={coupon.status === "active" ? "Disable coupon" : "Enable coupon"}
                            >
                              {coupon.status === "active" ? "Disable" : "Enable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (Optimized for viewports <= 768px) */}
          <div className="adm-coupon-mobile-cards">
            {filteredCoupons.map((coupon) => {
              const statusBadge = getBadgeForStatus(coupon.status);
              const isCollege = coupon.category === "college";
              return (
                <div key={coupon.id} className="adm-coupon-card">
                  <div className="adm-coupon-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code>{coupon.code}</code>
                      <span
                        className={`adm-badge ${
                          isCollege ? "adm-badge-info" : "adm-badge-neutral"
                        }`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {isCollege ? "🎓 College" : "💼 Regular"}
                      </span>
                    </div>
                    <span className={`adm-badge ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="adm-coupon-card-body">
                    <div className="adm-coupon-card-item">
                      <span className="adm-coupon-card-label">Campaign Name</span>
                      <span className="adm-coupon-card-value">{coupon.campaignName}</span>
                    </div>

                    {isCollege && (
                      <div className="adm-coupon-card-item">
                        <span className="adm-coupon-card-label">College / University</span>
                        <span className="adm-coupon-card-value">
                          {coupon.collegeName} ({coupon.studentDomain || "No domain"})
                        </span>
                      </div>
                    )}

                    <div className="adm-coupon-card-item">
                      <span className="adm-coupon-card-label">Benefit / Discount</span>
                      <span className="adm-coupon-card-value">
                        {coupon.discountType === "free_gift"
                          ? `🎁 Free Gift: ${coupon.freeProductName}`
                          : coupon.discountType === "percentage"
                          ? `${coupon.discountValue}% Off (Cap: ${formatINR(coupon.maxDiscount)})`
                          : `${formatINR(coupon.discountValue)} Off`}
                      </span>
                    </div>

                    <div className="adm-coupon-card-item">
                      <span className="adm-coupon-card-label">Type &amp; Usage Limit</span>
                      <span className="adm-coupon-card-value">
                        {coupon.typeLabel} ({coupon.perCustomerLimit})
                      </span>
                    </div>

                    <div className="adm-coupon-card-item">
                      <span className="adm-coupon-card-label">Validity Period</span>
                      <span className="adm-coupon-card-value">{coupon.validPeriod}</span>
                    </div>

                    <div className="adm-coupon-card-item">
                      <span className="adm-coupon-card-label">Redemption Status</span>
                      <span className="adm-coupon-card-value">
                        {coupon.redemptionStatus || "Available"}
                      </span>
                    </div>
                  </div>

                  <div className="adm-coupon-card-footer">
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={() => setInspectingCoupon(coupon)}
                    >
                      Inspect Details &rarr;
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-outline adm-btn-sm"
                      onClick={() => handleToggleStatus(coupon.id)}
                    >
                      {coupon.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Architectural Callout inside table container */}
          <div className="adm-info-callout" style={{ margin: 20 }}>
            <h4>Financial Integrity &amp; Validation Constraints</h4>
            <ul>
              <li>
                <strong>Authoritative Recalculation:</strong> Client-submitted discount amounts will never be trusted. The backend recalculates all order totals and taxes.
              </li>
              <li>
                <strong>Tax Ordering:</strong> Pre-tax discounts apply to line subtotals before 18% GST calculation; post-tax vouchers apply against gross totals.
              </li>
              <li>
                <strong>Stacking Protection:</strong> Prevents compounding multiple percentage discounts beyond permitted commercial thresholds.
              </li>
              <li>
                <strong>College Eligibility:</strong> Institutional email domain validation and student ID limits prevent duplicate coupon redemptions across campuses.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Inspect Coupon Details Modal */}
      {inspectingCoupon && (
        <div
          className="adm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-coupon-title"
          onClick={() => setInspectingCoupon(null)}
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <div>
                <h3 id="inspect-coupon-title" style={{ margin: 0 }}>
                  Coupon Specification: {inspectingCoupon.code}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--adm-text-secondary)" }}>
                  {inspectingCoupon.typeLabel} &bull;{" "}
                  {inspectingCoupon.category === "college"
                    ? "Educational Partner Program"
                    : "Commercial Customer Promotion"}
                </span>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingCoupon(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body">
              {/* Top Hero Overview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  background: "#f8fafc",
                  border: "1px solid var(--adm-border)",
                  borderRadius: "var(--adm-radius)",
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "monospace" }}>
                    {inspectingCoupon.code}
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--adm-text-primary)", marginTop: 2 }}>
                    {inspectingCoupon.campaignName}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span className={`adm-badge ${getBadgeForStatus(inspectingCoupon.status).className}`}>
                    {getBadgeForStatus(inspectingCoupon.status).label}
                  </span>
                  <span className="adm-badge adm-badge-info" style={{ fontSize: "0.72rem" }}>
                    {inspectingCoupon.category === "college" ? "College Category" : "Regular Category"}
                  </span>
                </div>
              </div>

              {/* College Information (if College coupon) */}
              {inspectingCoupon.category === "college" && (
                <div style={{ marginBottom: 18 }}>
                  <h4 style={{ fontSize: "0.9rem", color: "#1e3a8a", margin: "0 0 10px" }}>
                    🏫 College &amp; Institutional Verification
                  </h4>
                  <div className="adm-detail-grid">
                    <div className="adm-detail-item">
                      <span className="adm-detail-label">College / Institute Name</span>
                      <span className="adm-detail-value">{inspectingCoupon.collegeName}</span>
                    </div>
                    <div className="adm-detail-item">
                      <span className="adm-detail-label">College Identifier</span>
                      <span className="adm-detail-value">
                        <code>{inspectingCoupon.collegeId || "N/A"}</code>
                      </span>
                    </div>
                    <div className="adm-detail-item">
                      <span className="adm-detail-label">Allowed Email Domain</span>
                      <span className="adm-detail-value">
                        <code>{inspectingCoupon.studentDomain || "@college.edu"}</code>
                      </span>
                    </div>
                    <div className="adm-detail-item">
                      <span className="adm-detail-label">Eligibility Criteria</span>
                      <span className="adm-detail-value">
                        {inspectingCoupon.eligibilityCriteria || "Active student status"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipient / Delivery Address Binding (if present) */}
              {(inspectingCoupon.recipientName || inspectingCoupon.recipientAddress || inspectingCoupon.collegeAddress) && (
                <div style={{ marginBottom: 18 }} data-testid="inspect-coupon-recipient-section">
                  <h4 style={{ fontSize: "0.9rem", color: "var(--adm-primary)", margin: "0 0 10px" }}>
                    📍 Recipient &amp; Delivery Address Binding
                  </h4>
                  <div className="adm-detail-grid">
                    {inspectingCoupon.recipientName && (
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Designated Recipient / Account</span>
                        <span className="adm-detail-value">{inspectingCoupon.recipientName}</span>
                      </div>
                    )}
                    {(inspectingCoupon.recipientAddress || inspectingCoupon.collegeAddress) && (
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Designated Address</span>
                        <span className="adm-detail-value">
                          {inspectingCoupon.recipientAddress || inspectingCoupon.collegeAddress}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Benefit & Commercial Terms */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: "0.9rem", color: "#1e3a8a", margin: "0 0 10px" }}>
                  💰 Benefit &amp; Commercial Terms
                </h4>
                <div className="adm-detail-grid">
                  <div className="adm-detail-item">
                    <span className="adm-detail-label">Discount / Benefit Type</span>
                    <span className="adm-detail-value" style={{ textTransform: "capitalize" }}>
                      {inspectingCoupon.discountType.replace("_", " ")}
                    </span>
                  </div>
                  {inspectingCoupon.discountType === "free_gift" ? (
                    <>
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Gift Product Name</span>
                        <span className="adm-detail-value" style={{ fontWeight: 600 }}>
                          🎁 {inspectingCoupon.freeProductName}
                        </span>
                      </div>
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Gift SKU</span>
                        <span className="adm-detail-value">
                          <code>{inspectingCoupon.freeProductSku}</code>
                        </span>
                      </div>
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Gift Commercial Value</span>
                        <span className="adm-detail-value">
                          {formatINR(inspectingCoupon.freeProductValue)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Discount Value</span>
                        <span className="adm-detail-value" style={{ fontWeight: 700, color: "var(--adm-primary)" }}>
                          {inspectingCoupon.discountType === "percentage"
                            ? `${inspectingCoupon.discountValue}%`
                            : formatINR(inspectingCoupon.discountValue)}
                        </span>
                      </div>
                      <div className="adm-detail-item">
                        <span className="adm-detail-label">Maximum Discount Cap</span>
                        <span className="adm-detail-value">
                          {formatINR(inspectingCoupon.maxDiscount)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="adm-detail-item">
                    <span className="adm-detail-label">Minimum Order Value</span>
                    <span className="adm-detail-value">
                      {formatINR(inspectingCoupon.minOrder)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Validity & Usage Policies */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: "0.9rem", color: "#1e3a8a", margin: "0 0 10px" }}>
                  ⏳ Validity &amp; Usage Policy
                </h4>
                <div className="adm-detail-grid">
                  <div className="adm-detail-item">
                    <span className="adm-detail-label">Validity Period</span>
                    <span className="adm-detail-value">{inspectingCoupon.validPeriod}</span>
                  </div>
                  <div className="adm-detail-item">
                    <span className="adm-detail-label">Per-Customer Limit</span>
                    <span className="adm-detail-value">{inspectingCoupon.perCustomerLimit}</span>
                  </div>
                  <div className="adm-detail-item">
                    <span className="adm-detail-label">Usage Policy</span>
                    <span className="adm-detail-value">{inspectingCoupon.usagePolicy}</span>
                  </div>
                  <div className="adm-detail-item">
                    <span className="adm-detail-label">Recorded Usages</span>
                    <span className="adm-detail-value">{inspectingCoupon.usageCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: "0.9rem", color: "#1e3a8a", margin: "0 0 6px" }}>
                  📝 Campaign Description
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--adm-text-secondary)", lineHeight: 1.5 }}>
                  {inspectingCoupon.description}
                </p>
              </div>

              {/* Technical / Architectural Guardrail Notice */}
              <div className="adm-notice-banner adm-notice-warning" style={{ marginTop: 12 }}>
                <span className="adm-notice-icon">⚠️</span>
                <div style={{ fontSize: "0.82rem" }}>
                  <strong>Backend Architecture Guardrail:</strong> In accordance with project security policies, coupons and discount redemptions cannot be verified or deducted authoritatively by the client. An upcoming PostgreSQL database migration will introduce transactional redemption tracking and student verification.
                </div>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingCoupon(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Coupon Modal (Supports Regular & College Coupons) */}
      {showCreateModal && (
        <div
          className="adm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-modal-title"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="adm-modal-content"
            style={{ maxWidth: 720 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <div>
                <h3 id="promo-modal-title" style={{ margin: 0 }}>
                  Create New Promotion Campaign
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)" }}>
                  Configure Regular Commercial or College Educational incentives
                </span>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="adm-modal-form">
              <div className="adm-modal-body">
                {/* Category Switcher Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 20,
                    padding: 4,
                    background: "#f1f5f9",
                    borderRadius: 8,
                  }}
                  role="tablist"
                  aria-label="New coupon category selection"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={createCategory === "regular"}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: "none",
                      background: createCategory === "regular" ? "#ffffff" : "transparent",
                      color: createCategory === "regular" ? "var(--adm-primary)" : "var(--adm-text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: createCategory === "regular" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => {
                      setCreateCategory("regular");
                      setFormError("");
                    }}
                  >
                    💼 Regular Commercial Coupon
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={createCategory === "college"}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: "none",
                      background: createCategory === "college" ? "#ffffff" : "transparent",
                      color: createCategory === "college" ? "#1e3a8a" : "var(--adm-text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: createCategory === "college" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => {
                      setCreateCategory("college");
                      setFormError("");
                      if (!colCode) handleGenerateColCode();
                    }}
                  >
                    🎓 College Educational Coupon
                  </button>
                </div>

                {formError && (
                  <div className="adm-notice-banner adm-notice-danger" style={{ marginBottom: 16 }}>
                    <span className="adm-notice-icon">⚠️</span>
                    <div>{formError}</div>
                  </div>
                )}

                {/* FORM A: REGULAR COUPONS */}
                {createCategory === "regular" && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
                        Coupon Subtype
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: 12,
                            border: `2px solid ${regSubType === "reusable" ? "var(--adm-primary)" : "var(--adm-border)"}`,
                            borderRadius: 8,
                            background: regSubType === "reusable" ? "#eff6ff" : "var(--adm-surface)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="regSubType"
                            value="reusable"
                            checked={regSubType === "reusable"}
                            onChange={() => setRegSubType("reusable")}
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <strong style={{ display: "block", fontSize: "0.85rem" }}>
                              Time-Limited Reusable
                            </strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--adm-text-secondary)" }}>
                              Reusable by customers within the active validity window.
                            </span>
                          </div>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: 12,
                            border: `2px solid ${regSubType === "single_use" ? "var(--adm-primary)" : "var(--adm-border)"}`,
                            borderRadius: 8,
                            background: regSubType === "single_use" ? "#eff6ff" : "var(--adm-surface)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="regSubType"
                            value="single_use"
                            checked={regSubType === "single_use"}
                            onChange={() => setRegSubType("single_use")}
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <strong style={{ display: "block", fontSize: "0.85rem" }}>
                              Single-Use Voucher
                            </strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--adm-text-secondary)" }}>
                              Each issued token can be redeemed exactly once.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="adm-form-grid">
                      <div className="adm-form-field">
                        <label htmlFor="regCode">Coupon Code *</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            id="regCode"
                            type="text"
                            className="adm-input"
                            value={regCode}
                            onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                            placeholder="e.g. VTX-OFFER-15"
                            required
                            style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                          />
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary"
                            onClick={handleGenerateRegCode}
                            title="Generate random coupon code"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            🎲 Generate
                          </button>
                        </div>
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regCampaignName">Campaign Name *</label>
                        <input
                          id="regCampaignName"
                          type="text"
                          className="adm-input"
                          value={regCampaignName}
                          onChange={(e) => setRegCampaignName(e.target.value)}
                          placeholder="e.g. Spring Fastener Sale"
                          required
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regDiscountType">Discount Type</label>
                        <select
                          id="regDiscountType"
                          className="adm-select"
                          value={regDiscountType}
                          onChange={(e) => setRegDiscountType(e.target.value)}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regDiscountVal">
                          {regDiscountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                        </label>
                        <input
                          id="regDiscountVal"
                          type="number"
                          className="adm-input"
                          value={regDiscountVal}
                          onChange={(e) => setRegDiscountVal(e.target.value)}
                          placeholder="10"
                          min="1"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regMinOrder">Minimum Order Value (₹)</label>
                        <input
                          id="regMinOrder"
                          type="number"
                          className="adm-input"
                          value={regMinOrder}
                          onChange={(e) => setRegMinOrder(e.target.value)}
                          placeholder="5000"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regMaxDiscount">Maximum Discount Cap (₹)</label>
                        <input
                          id="regMaxDiscount"
                          type="number"
                          className="adm-input"
                          value={regMaxDiscount}
                          onChange={(e) => setRegMaxDiscount(e.target.value)}
                          placeholder="2000"
                        />
                      </div>
                    </div>

                    {/* Validity Duration Configuration */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
                        Validity Duration &amp; Expiry
                      </label>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                        <button
                          type="button"
                          className={`adm-btn adm-btn-sm ${
                            regDurationPreset === "2_days" ? "adm-btn-primary" : "adm-btn-secondary"
                          }`}
                          onClick={() => handleSelectDurationPreset("2_days")}
                        >
                          ⚡ 2 Days (48 Hours)
                        </button>
                        <button
                          type="button"
                          className={`adm-btn adm-btn-sm ${
                            regDurationPreset === "5_days" ? "adm-btn-primary" : "adm-btn-secondary"
                          }`}
                          onClick={() => handleSelectDurationPreset("5_days")}
                        >
                          📅 5 Days (120 Hours)
                        </button>
                        <button
                          type="button"
                          className={`adm-btn adm-btn-sm ${
                            regDurationPreset === "custom" ? "adm-btn-primary" : "adm-btn-secondary"
                          }`}
                          onClick={() => handleSelectDurationPreset("custom")}
                        >
                          ⚙️ Custom Period
                        </button>
                      </div>

                      <input
                        type="text"
                        className="adm-input"
                        value={regCustomPeriod}
                        onChange={(e) => setRegCustomPeriod(e.target.value)}
                        placeholder="e.g. 2 Days (48h from issuance) or Nov 2026 – Dec 2026"
                      />
                    </div>

                    {/* Usage Policy & Per-Customer Limit */}
                    <div className="adm-form-grid">
                      <div className="adm-form-field">
                        <label htmlFor="regCustomerLimit">Per-Customer Usage Limit</label>
                        {regSubType === "single_use" ? (
                          <input
                            id="regCustomerLimit"
                            type="text"
                            className="adm-input"
                            value="1 Redemption Maximum"
                            disabled
                          />
                        ) : (
                          <select
                            id="regCustomerLimit"
                            className="adm-select"
                            value={regCustomerLimit}
                            onChange={(e) => setRegCustomerLimit(e.target.value)}
                          >
                            <option value="Unlimited">Unlimited (Reusable)</option>
                            <option value="1 Use per Customer">1 Use per Customer</option>
                            <option value="3 Uses per Customer">3 Uses per Customer</option>
                            <option value="5 Uses per Customer">5 Uses per Customer</option>
                          </select>
                        )}
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regStatus">Initial Status</label>
                        <select
                          id="regStatus"
                          className="adm-select"
                          value={regStatus}
                          onChange={(e) => setRegStatus(e.target.value)}
                        >
                          <option value="active">Active (Available)</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>

                    <div className="adm-form-grid" style={{ marginBottom: 12 }}>
                      <div className="adm-form-field">
                        <label htmlFor="regRecipientName">
                          Designated Recipient / Customer Name (Optional)
                        </label>
                        <input
                          id="regRecipientName"
                          type="text"
                          className="adm-input"
                          value={regRecipientName}
                          onChange={(e) => setRegRecipientName(e.target.value)}
                          placeholder="e.g. Apex Robotics Pvt Ltd / Dr. S. Raman"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="regRecipientAddress">
                          Designated Delivery / Billing Address (Optional)
                        </label>
                        <input
                          id="regRecipientAddress"
                          type="text"
                          className="adm-input"
                          value={regRecipientAddress}
                          onChange={(e) => setRegRecipientAddress(e.target.value)}
                          placeholder="e.g. Plot 14, Peenya Phase 2, Bengaluru 560058"
                        />
                      </div>
                    </div>

                    <div className="adm-form-field" style={{ marginBottom: 16 }}>
                      <label htmlFor="regDescription">Campaign Description / Notes</label>
                      <textarea
                        id="regDescription"
                        className="adm-input"
                        rows="2"
                        value={regDescription}
                        onChange={(e) => setRegDescription(e.target.value)}
                        placeholder="Optional internal administrative notes or customer terms..."
                      />
                    </div>
                  </>
                )}

                {/* FORM B: COLLEGE COUPONS */}
                {createCategory === "college" && (
                  <>
                    <div className="adm-form-grid">
                      <div className="adm-form-field">
                        <label htmlFor="colCollegeName">College / University Name *</label>
                        <input
                          id="colCollegeName"
                          type="text"
                          className="adm-input"
                          value={colCollegeName}
                          onChange={(e) => setColCollegeName(e.target.value)}
                          placeholder="e.g. Indian Institute of Technology Bombay"
                          required
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colCode">Coupon Code *</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            id="colCode"
                            type="text"
                            className="adm-input"
                            value={colCode}
                            onChange={(e) => setColCode(e.target.value.toUpperCase())}
                            placeholder="e.g. VTX-COLLEGE-IITB"
                            required
                            style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                          />
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary"
                            onClick={handleGenerateColCode}
                            title="Generate college coupon code"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            🎲 Generate
                          </button>
                        </div>
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colCollegeAddress">Campus / Department Address (Optional)</label>
                        <input
                          id="colCollegeAddress"
                          type="text"
                          className="adm-input"
                          value={colCollegeAddress}
                          onChange={(e) => setColCollegeAddress(e.target.value)}
                          placeholder="e.g. Powai, Mumbai, Maharashtra 400076"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colRecipientName">Department / Faculty Lead (Optional)</label>
                        <input
                          id="colRecipientName"
                          type="text"
                          className="adm-input"
                          value={colRecipientName}
                          onChange={(e) => setColRecipientName(e.target.value)}
                          placeholder="e.g. Dr. H. Bhaskaran / Robotics Lab"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colCollegeId">College ID / Student Roll Prefix</label>
                        <input
                          id="colCollegeId"
                          type="text"
                          className="adm-input"
                          value={colCollegeId}
                          onChange={(e) => setColCollegeId(e.target.value)}
                          placeholder="e.g. IITB-ROBO-2026"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colStudentDomain">Allowed Student Email Domain</label>
                        <input
                          id="colStudentDomain"
                          type="text"
                          className="adm-input"
                          value={colStudentDomain}
                          onChange={(e) => setColStudentDomain(e.target.value)}
                          placeholder="e.g. @iitb.ac.in"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colCampaignName">Educational Campaign Title *</label>
                        <input
                          id="colCampaignName"
                          type="text"
                          className="adm-input"
                          value={colCampaignName}
                          onChange={(e) => setColCampaignName(e.target.value)}
                          placeholder="e.g. Annual Techfest Hardware Grant"
                          required
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colBenefitType">Educational Benefit Type</label>
                        <select
                          id="colBenefitType"
                          className="adm-select"
                          value={colBenefitType}
                          onChange={(e) => setColBenefitType(e.target.value)}
                        >
                          <option value="free_gift">🎁 Free Product / Catalog Gift</option>
                          <option value="percentage">Percentage Discount (%)</option>
                        </select>
                      </div>
                    </div>

                    {/* Free Product or Gift Selection from Catalog */}
                    {colBenefitType === "free_gift" ? (
                      <div className="adm-form-field" style={{ marginBottom: 16 }}>
                        <label htmlFor="colSelectedGiftSku">
                          Select Free Gift from Live Catalog Data *
                        </label>
                        <select
                          id="colSelectedGiftSku"
                          className="adm-select"
                          value={colSelectedGiftSku}
                          onChange={(e) => setColSelectedGiftSku(e.target.value)}
                        >
                          {catalogProducts.map((prod) => (
                            <option key={prod.sku} value={prod.sku}>
                              {prod.name} (SKU: {prod.sku} — {formatINR(prod.price)})
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)", marginTop: 4 }}>
                          Populated directly from the active catalog database to guarantee real SKU matching.
                        </span>
                      </div>
                    ) : (
                      <div className="adm-form-grid">
                        <div className="adm-form-field">
                          <label htmlFor="colDiscountVal">Discount Percentage (%)</label>
                          <input
                            id="colDiscountVal"
                            type="number"
                            className="adm-input"
                            value={colDiscountVal}
                            onChange={(e) => setColDiscountVal(e.target.value)}
                            placeholder="20"
                            min="1"
                          />
                        </div>
                        <div className="adm-form-field">
                          <label htmlFor="colMinOrder">Min Order Value (₹)</label>
                          <input
                            id="colMinOrder"
                            type="number"
                            className="adm-input"
                            value={colMinOrder}
                            onChange={(e) => setColMinOrder(e.target.value)}
                            placeholder="1000"
                          />
                        </div>
                      </div>
                    )}

                    <div className="adm-form-grid">
                      <div className="adm-form-field">
                        <label htmlFor="colPeriod">Validity / Academic Semester</label>
                        <input
                          id="colPeriod"
                          type="text"
                          className="adm-input"
                          value={colPeriod}
                          onChange={(e) => setColPeriod(e.target.value)}
                          placeholder="e.g. Academic Year 2026"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colEligibility">Eligibility &amp; Verification Note</label>
                        <input
                          id="colEligibility"
                          type="text"
                          className="adm-input"
                          value={colEligibility}
                          onChange={(e) => setColEligibility(e.target.value)}
                          placeholder="e.g. Verified university email or student card"
                        />
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="colStatus">Campaign Status</label>
                        <select
                          id="colStatus"
                          className="adm-select"
                          value={colStatus}
                          onChange={(e) => setColStatus(e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>

                    <div className="adm-form-field" style={{ marginBottom: 16 }}>
                      <label htmlFor="colDescription">College Program Description</label>
                      <textarea
                        id="colDescription"
                        className="adm-input"
                        rows="2"
                        value={colDescription}
                        onChange={(e) => setColDescription(e.target.value)}
                        placeholder="Special instructions for campus ambassadors, robotics teams, or faculty..."
                      />
                    </div>
                  </>
                )}

                {/* Technical Transparency Banner */}
                <div className="adm-notice-banner adm-notice-info" style={{ marginTop: 12 }}>
                  <span className="adm-notice-icon">ℹ️</span>
                  <div style={{ fontSize: "0.82rem" }}>
                    <strong>Admin Session Notice:</strong> Newly configured promotions are recorded in the administrator session registry. Full database persistence and checkout redemption will be wired upon executing the backend discount schema migration.
                  </div>
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  data-testid="submit-create-coupon"
                >
                  Confirm &amp; Register Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
