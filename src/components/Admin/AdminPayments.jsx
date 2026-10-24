import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getAdminPayments,
  reconcileAdminPayment,
  getAdminPaymentConfig,
  updateAdminPaymentConfig,
  removeAdminPaymentQr,
} from "../../services/adminApi";

export default function AdminPayments({ onNavigateOrders }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentsData, setPaymentsData] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");

  // Modal inspection & reconciliation state
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [reconcileAction, setReconcileAction] = useState("VERIFY_OFFLINE_SETTLEMENT");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [settlementRefInput, setSettlementRefInput] = useState("");
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // UPI & QR Configuration Modal state
  const [isUpiConfigOpen, setIsUpiConfigOpen] = useState(false);
  const [upiConfigLoading, setUpiConfigLoading] = useState(false);
  const [upiConfigSaving, setUpiConfigSaving] = useState(false);
  const [upiConfigFeedback, setUpiConfigFeedback] = useState(null);
  const [merchantUpiInput, setMerchantUpiInput] = useState("billing.vertex@icici");
  const [merchantNameInput, setMerchantNameInput] = useState("VERTEX Industrial E-Commerce");
  const [upiEnabledInput, setUpiEnabledInput] = useState(true);
  const [qrModeInput, setQrModeInput] = useState("DYNAMIC");
  const [instructionsInput, setInstructionsInput] = useState("");
  const [staticQrPreview, setStaticQrPreview] = useState(null);
  const [staticQrFile, setStaticQrFile] = useState(null);
  const [removingQr, setRemovingQr] = useState(false);
  const upiModalRef = useRef(null);

  // Lock background body scroll when any modal is open
  useEffect(() => {
    if (isUpiConfigOpen || selectedPayment) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isUpiConfigOpen, selectedPayment]);

  // Support Escape key to dismiss active dialog
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isUpiConfigOpen && !upiConfigSaving) {
          handleCloseUpiConfig();
        } else if (selectedPayment && !reconciling) {
          handleCloseModal();
        }
      }
    };
    if (isUpiConfigOpen || selectedPayment) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isUpiConfigOpen, selectedPayment, upiConfigSaving, reconciling]);

  // Focus modal dialog container on open for keyboard accessibility
  useEffect(() => {
    if (isUpiConfigOpen && upiModalRef.current) {
      upiModalRef.current.focus();
    }
  }, [isUpiConfigOpen]);

  const loadPayments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await getAdminPayments({
        paymentStatus: statusFilter !== "all" ? statusFilter : "",
        paymentMethod: methodFilter !== "all" ? methodFilter : "",
        search: searchQuery.trim(),
        dateRange: dateRangeFilter,
      });
      setPaymentsData(res);
    } catch (err) {
      setError(err.message || "Failed to load payment transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, methodFilter, searchQuery, dateRangeFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateRangeFilter("all");
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "all" ||
    methodFilter !== "all" ||
    dateRangeFilter !== "all";

  const handleOpenPayment = (payment) => {
    setSelectedPayment(payment);
    setActionFeedback(null);
    setReconcileNotes("");
    setSettlementRefInput(payment.paymentId || "");
    setRefundAmountInput(payment.amount ? String(payment.amount) : "");
    setConfirmedCheckbox(false);
    if (payment.paymentStatus === "PAID") {
      setReconcileAction("RECORD_REFUND");
    } else if (payment.paymentStatus === "FAILED") {
      setReconcileAction("FLAG_UNRESOLVED");
    } else {
      setReconcileAction("VERIFY_OFFLINE_SETTLEMENT");
    }
  };

  const handleCloseModal = () => {
    setSelectedPayment(null);
    setActionFeedback(null);
  };

  const handleExecuteReconcile = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!selectedPayment || reconciling) return;

    if (!confirmedCheckbox) {
      setActionFeedback({
        type: "error",
        message: "You must check the confirmation box before executing this financial action.",
      });
      return;
    }

    if (!reconcileNotes.trim() || reconcileNotes.trim().length < 3) {
      setActionFeedback({
        type: "error",
        message: "Please enter detailed resolution notes (at least 3 characters).",
      });
      return;
    }

    try {
      setReconciling(true);
      setActionFeedback(null);

      const payload = {
        action: reconcileAction,
        notes: reconcileNotes.trim(),
        settlementReference: settlementRefInput.trim() || null,
        refundAmount: refundAmountInput ? Number(refundAmountInput) : null,
        confirmed: true,
      };

      const res = await reconcileAdminPayment(selectedPayment.orderId || selectedPayment.id, payload);

      setActionFeedback({
        type: "success",
        message: res.message || "Payment reconciliation recorded successfully in audit log.",
      });

      // Reload list to update KPIs and status table
      loadPayments(true);
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err.message || "Failed to execute payment resolution.",
      });
    } finally {
      setReconciling(false);
    }
  };

  const handleOpenUpiConfig = async () => {
    setIsUpiConfigOpen(true);
    setUpiConfigFeedback(null);
    setStaticQrFile(null);
    try {
      setUpiConfigLoading(true);
      const res = await getAdminPaymentConfig();
      if (res && res.config) {
        setMerchantUpiInput(res.config.merchantUpiId || "billing.vertex@icici");
        setMerchantNameInput(res.config.merchantName || "VERTEX Industrial E-Commerce");
        setUpiEnabledInput(res.config.upiEnabled !== false);
        setQrModeInput(res.config.qrMode || "DYNAMIC");
        setInstructionsInput(res.config.instructions || "");
        setStaticQrPreview(res.config.staticQrImageUrl || null);
      }
    } catch (err) {
      console.warn("Could not fetch payment config, using defaults:", err);
    } finally {
      setUpiConfigLoading(false);
    }
  };

  const handleCloseUpiConfig = () => {
    setIsUpiConfigOpen(false);
    setUpiConfigFeedback(null);
    setStaticQrFile(null);
  };

  const handleQrFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      setUpiConfigFeedback({
        type: "error",
        message: "Invalid file format. Only PNG, JPEG, and WebP images are permitted for QR codes.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUpiConfigFeedback({
        type: "error",
        message: "Image file size exceeds 5MB limit. Please upload a smaller QR code image.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setStaticQrPreview(dataUrl);
      setStaticQrFile({
        fileName: file.name,
        fileData: dataUrl,
        fileType: file.type,
        fileSize: file.size,
      });
      setUpiConfigFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrCode = async () => {
    try {
      setRemovingQr(true);
      setUpiConfigFeedback(null);
      await removeAdminPaymentQr();
      setStaticQrPreview(null);
      setStaticQrFile(null);
      setQrModeInput("DYNAMIC");
      setUpiConfigFeedback({
        type: "success",
        message: "Static QR code image removed. Checkout will use dynamic UPI QR generation.",
      });
      loadPayments(true);
    } catch (err) {
      setUpiConfigFeedback({
        type: "error",
        message: err.message || "Failed to remove static QR code image.",
      });
    } finally {
      setRemovingQr(false);
    }
  };

  const handleSaveUpiConfig = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    // Validate UPI VPA format
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(merchantUpiInput.trim())) {
      setUpiConfigFeedback({
        type: "error",
        message: "Invalid UPI VPA format. Must be formatted like merchant@bank (e.g. billing.vertex@icici).",
      });
      return;
    }

    if (!merchantNameInput.trim() || merchantNameInput.trim().length < 2) {
      setUpiConfigFeedback({
        type: "error",
        message: "Merchant display name must be at least 2 characters.",
      });
      return;
    }

    try {
      setUpiConfigSaving(true);
      setUpiConfigFeedback(null);

      const payload = {
        merchantUpiId: merchantUpiInput.trim(),
        merchantName: merchantNameInput.trim(),
        upiEnabled: upiEnabledInput,
        qrMode: qrModeInput,
        instructions: instructionsInput.trim() || null,
        staticQrImage: staticQrFile,
      };

      const res = await updateAdminPaymentConfig(payload);
      setUpiConfigFeedback({
        type: "success",
        message: res.message || "Merchant UPI and payment configuration saved successfully.",
      });
      setStaticQrFile(null);
      loadPayments(true);
    } catch (err) {
      setUpiConfigFeedback({
        type: "error",
        message: err.message || "Failed to save payment configuration.",
      });
    } finally {
      setUpiConfigSaving(false);
    }
  };

  const formatINR = (val) =>
    "₹" +
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPaymentDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return <span className="adm-badge adm-badge-success">PAID</span>;
      case "REFUNDED":
        return <span className="adm-badge adm-badge-neutral">REFUNDED</span>;
      case "FAILED":
        return <span className="adm-badge adm-badge-danger">FAILED</span>;
      case "PENDING":
      default:
        return <span className="adm-badge adm-badge-warning">PENDING</span>;
    }
  };

  const summary = paymentsData?.summary || {
    totalCount: 0,
    totalGrossVolume: 0,
    paidCount: 0,
    paidVolume: 0,
    pendingCount: 0,
    pendingVolume: 0,
    failedCount: 0,
    failedVolume: 0,
    refundedCount: 0,
    refundedVolume: 0,
  };

  const payments = paymentsData?.payments || [];
  const unresolved = paymentsData?.unresolvedIssues || [];

  return (
    <div className="adm-payments-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Payments &amp; Transactions</h1>
          <p className="adm-page-subtitle">
            Authoritative order payment tracking, transaction references, reconciliation, and financial audit logs.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadPayments(true)}
            disabled={refreshing}
            data-testid="refresh-payments-btn"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Ledger"}
          </button>
        </div>
      </div>

      {/* UPI & QR Gateway Configuration Status Banner */}
      <div className="adm-notice" style={{ background: "var(--adm-surface)", border: "1.5px solid #0d9488", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }} data-testid="upi-config-status-card">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: "1.8rem" }} aria-hidden="true">⚡</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <strong style={{ fontSize: "0.95rem", color: "var(--adm-text-primary)" }}>Merchant UPI &amp; QR Payment Gateway</strong>
              <span
                className={`adm-badge ${
                  paymentsData?.upiConfig?.upiEnabled !== false ? "adm-badge-success" : "adm-badge-neutral"
                }`}
                data-testid="upi-enabled-badge"
              >
                {paymentsData?.upiConfig?.upiEnabled !== false ? "● Active on Storefront" : "○ Disabled"}
              </span>
              <span className="adm-badge adm-badge-info" data-testid="upi-mode-badge">
                {paymentsData?.upiConfig?.hasStaticQr && paymentsData?.upiConfig?.qrMode === "STATIC"
                  ? "Static Merchant QR"
                  : "Dynamic Order QR (Auto-Amount)"}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary)" }}>
              Merchant VPA: <strong style={{ fontFamily: "monospace", color: "var(--adm-text-primary)" }} data-testid="status-merchant-vpa">{paymentsData?.upiConfig?.merchantUpiId || "billing.vertex@icici"}</strong> | Recipient:{" "}
              <strong>{paymentsData?.upiConfig?.merchantName || "VERTEX Industrial E-Commerce"}</strong>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          onClick={handleOpenUpiConfig}
          data-testid="open-upi-config-btn"
        >
          ⚙️ Configure UPI &amp; QR Code
        </button>
      </div>

      {/* Gateway Boundary Notice Banner */}
      <div className="adm-notice adm-notice-info" style={{ marginBottom: 20 }}>
        <div className="adm-notice-icon" aria-hidden="true">
          🛡️
        </div>
        <div className="adm-notice-content">
          <strong>Payment Gateway Boundary &amp; Financial Ledger Integrity</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.9 }}>
            Live payment provider webhooks (e.g. Razorpay / Stripe gateway secrets) require external production merchant keys in <code>.env</code>. The records below reflect authentic PostgreSQL orders, verified COD / bank transfer settlements, and immutable administrative audit logs. Status modifications require explicit administrator confirmation.
          </p>
        </div>
      </div>

      {/* Unresolved Payments Alert (If any) */}
      {unresolved.length > 0 && (
        <div className="adm-notice adm-notice-danger" style={{ marginBottom: 20 }} data-testid="unresolved-payments-alert">
          <div className="adm-notice-icon" aria-hidden="true">
            ⚠️
          </div>
          <div className="adm-notice-content" style={{ flex: 1 }}>
            <strong>Action Required: {unresolved.length} Unresolved Payment Issue(s)</strong>
            <p style={{ margin: "4px 0 8px", fontSize: "0.85rem" }}>
              The following orders have failed payment attempts or payment verification discrepancies requiring manual review:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {unresolved.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-secondary"
                  style={{ background: "#ffffff", borderColor: "#ef4444", color: "#b91c1c" }}
                  onClick={() => handleOpenPayment(issue)}
                >
                  Order #{issue.orderNumber} ({formatINR(issue.amount)}) — Resolve
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial KPI Summary Cards */}
      <div className="adm-customer-kpi-grid" style={{ marginBottom: 24 }}>
        <div className="adm-customer-kpi-card" data-testid="kpi-total-payments">
          <span className="adm-customer-kpi-label">Gross Processed Volume</span>
          <span className="adm-customer-kpi-val">{formatINR(summary.totalGrossVolume)}</span>
          <span className="adm-customer-kpi-sub">{summary.totalCount} total orders recorded</span>
        </div>

        <div className="adm-customer-kpi-card" style={{ borderLeft: "4px solid #22c55e" }} data-testid="kpi-paid-payments">
          <span className="adm-customer-kpi-label">Paid / Settled</span>
          <span className="adm-customer-kpi-val" style={{ color: "#22c55e" }}>
            {formatINR(summary.paidVolume)}
          </span>
          <span className="adm-customer-kpi-sub">{summary.paidCount} successful payments</span>
        </div>

        <div className="adm-customer-kpi-card" style={{ borderLeft: "4px solid #f59e0b" }} data-testid="kpi-pending-payments">
          <span className="adm-customer-kpi-label">Pending Collection (COD)</span>
          <span className="adm-customer-kpi-val" style={{ color: "#f59e0b" }}>
            {formatINR(summary.pendingVolume)}
          </span>
          <span className="adm-customer-kpi-sub">{summary.pendingCount} pending settlement</span>
        </div>

        <div className="adm-customer-kpi-card" style={{ borderLeft: "4px solid #ef4444" }} data-testid="kpi-failed-payments">
          <span className="adm-customer-kpi-label">Failed / Disputed</span>
          <span className="adm-customer-kpi-val" style={{ color: "#ef4444" }}>
            {formatINR(summary.failedVolume)}
          </span>
          <span className="adm-customer-kpi-sub">{summary.failedCount} unresolved errors</span>
        </div>

        <div className="adm-customer-kpi-card" style={{ borderLeft: "4px solid #64748b" }} data-testid="kpi-refunded-payments">
          <span className="adm-customer-kpi-label">Total Refunded</span>
          <span className="adm-customer-kpi-val" style={{ color: "#64748b" }}>
            {formatINR(summary.refundedVolume)}
          </span>
          <span className="adm-customer-kpi-sub">{summary.refundedCount} refund records</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by order number (VTX-...), payment ID, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search payment records"
            data-testid="search-payments-input"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by payment status"
            data-testid="filter-payment-status"
          >
            <option value="all">All Payment Statuses</option>
            <option value="PAID">Paid ({summary.paidCount})</option>
            <option value="PENDING">Pending ({summary.pendingCount})</option>
            <option value="FAILED">Failed ({summary.failedCount})</option>
            <option value="REFUNDED">Refunded ({summary.refundedCount})</option>
          </select>

          <select
            className="adm-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter by payment method"
            data-testid="filter-payment-method"
          >
            <option value="all">All Payment Methods</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="BANK_TRANSFER">Bank Wire / NEFT</option>
            <option value="CREDIT_LINE">B2B Net Terms</option>
          </select>

          <select
            className="adm-select"
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            aria-label="Filter by date range"
            data-testid="filter-payment-date"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={handleClearFilters}
              title="Reset all payment filters"
              data-testid="clear-payment-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="adm-card" style={{ padding: 48, textAlign: "center" }} role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p style={{ marginTop: 12, color: "var(--adm-text-secondary)" }}>
            Loading payments and querying transaction audit logs...
          </p>
        </div>
      ) : error ? (
        <div className="adm-card" style={{ padding: 32, textAlign: "center" }} role="alert">
          <span style={{ fontSize: 32 }}>⚠️</span>
          <h2 style={{ fontSize: "1.1rem", margin: "12px 0 6px" }}>Failed to Load Payments</h2>
          <p style={{ color: "var(--adm-text-secondary)", marginBottom: 16 }}>{error}</p>
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => loadPayments()}>
            Retry Query
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className="adm-card" style={{ padding: 48, textAlign: "center" }} data-testid="empty-payments-view">
          <span style={{ fontSize: 40 }}>💳</span>
          <h2 style={{ fontSize: "1.1rem", margin: "12px 0 6px" }}>No Payment Transactions Found</h2>
          <p style={{ color: "var(--adm-text-secondary)", maxWidth: 460, margin: "0 auto 16px" }}>
            {hasActiveFilters
              ? "No payment records match your active search or filter criteria."
              : "No payment transactions have been recorded in the database yet."}
          </p>
          {hasActiveFilters && (
            <button type="button" className="adm-btn adm-btn-secondary" onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="adm-table-wrap">
            <table className="adm-table" aria-label="Payment Transactions Table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Date &amp; Time</th>
                  <th>Method</th>
                  <th>Transaction Reference</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} data-testid={`payment-row-${p.id}`}>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--adm-text-primary)" }}>
                        {p.orderNumber}
                      </span>
                      <div style={{ fontSize: "0.75rem", color: "var(--adm-text-muted)" }}>
                        Fulfillment: {p.orderStatus}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.customer?.fullName || p.recipientName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--adm-text-muted)" }}>
                        {p.customer?.email || "—"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem" }}>{formatPaymentDate(p.createdAt)}</div>
                    </td>
                    <td>
                      <span className="adm-badge adm-badge-neutral">{p.paymentMethod}</span>
                    </td>
                    <td>
                      {p.paymentId ? (
                        <code
                          style={{
                            background: "var(--adm-surface-alt)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: "0.8rem",
                            border: "1px solid var(--adm-border)",
                          }}
                        >
                          {p.paymentId}
                        </code>
                      ) : (
                        <span style={{ color: "var(--adm-text-muted)", fontSize: "0.82rem" }}>
                          — (Pending Reference)
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        {formatINR(p.amount)}
                      </span>
                    </td>
                    <td>{getStatusBadge(p.paymentStatus)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => handleOpenPayment(p)}
                        data-testid={`inspect-payment-btn-${p.id}`}
                      >
                        Inspect &amp; Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Inspection & Resolution Modal */}
      {selectedPayment && (
        <div
          className="adm-modal-backdrop"
          onClick={handleCloseModal}
          data-testid="payment-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <h2 id="payment-modal-title" className="adm-modal-title">
                Payment Details &amp; Reconciliation — Order #{selectedPayment.orderNumber}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={handleCloseModal}
                aria-label="Close payment modal"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body" style={{ padding: "20px 24px" }}>
              {/* Status and Summary Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--adm-surface-alt)",
                  padding: "14px 16px",
                  borderRadius: "var(--adm-radius-sm)",
                  border: "1px solid var(--adm-border)",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--adm-text-muted)" }}>Payment Status</div>
                  <div style={{ marginTop: 4 }}>{getStatusBadge(selectedPayment.paymentStatus)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--adm-text-muted)" }}>Total Gross Amount</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--adm-text-primary)" }}>
                    {formatINR(selectedPayment.amount)}
                  </div>
                </div>
              </div>

              {/* Linked Order & Customer Details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 20,
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 8px" }}>Customer Profile</h3>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Name:</strong> {selectedPayment.customer?.fullName || selectedPayment.recipientName}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Email:</strong> {selectedPayment.customer?.email || "—"}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Phone:</strong> {selectedPayment.phone || "—"}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>City / State:</strong> {selectedPayment.city}, {selectedPayment.state}
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 8px" }}>Financial Breakdown</h3>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Subtotal (Net):</strong> {formatINR(selectedPayment.subtotal)}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Tax (GST):</strong> {formatINR(selectedPayment.taxAmount)}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Shipping Fee:</strong> {formatINR(selectedPayment.shippingFee)}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Payment Method:</strong> {selectedPayment.paymentMethod}
                  </p>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Transaction ID:</strong> {selectedPayment.paymentId || "None (Offline/Pending)"}
                  </p>
                </div>
              </div>

              {/* Linked Audit History */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 8px" }}>
                  Payment Audit &amp; Reconciliation History
                </h3>
                {selectedPayment.auditHistory && selectedPayment.auditHistory.length > 0 ? (
                  <div
                    style={{
                      background: "var(--adm-surface-alt)",
                      border: "1px solid var(--adm-border)",
                      borderRadius: "var(--adm-radius-sm)",
                      padding: "8px 12px",
                      fontSize: "0.8rem",
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {selectedPayment.auditHistory.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: "6px 0",
                          borderBottom: "1px solid var(--adm-border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600, color: "var(--adm-primary)" }}>{log.action}</span>
                          <span style={{ color: "var(--adm-text-muted)" }}>
                            {formatPaymentDate(log.createdAt)}
                          </span>
                        </div>
                        <div style={{ color: "var(--adm-text-secondary)", marginTop: 2 }}>
                          Actor: {log.actor}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      background: "var(--adm-surface-alt)",
                      border: "1px dashed var(--adm-border)",
                      borderRadius: "var(--adm-radius-sm)",
                      padding: "10px 14px",
                      fontSize: "0.82rem",
                      color: "var(--adm-text-muted)",
                    }}
                  >
                    No prior reconciliation audit logs recorded for this order.
                  </div>
                )}
              </div>

              {/* Safe Payment Issue Resolution Form */}
              <div
                style={{
                  background: "var(--adm-surface)",
                  border: "1px solid var(--adm-border)",
                  borderRadius: "var(--adm-radius-sm)",
                  padding: "16px 18px",
                }}
              >
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 12px" }}>
                  Financial Reconciliation &amp; Status Management
                </h3>

                {actionFeedback && (
                  <div
                    className={`adm-notice ${
                      actionFeedback.type === "success" ? "adm-notice-success" : "adm-notice-danger"
                    }`}
                    style={{ marginBottom: 14 }}
                  >
                    <div className="adm-notice-icon">{actionFeedback.type === "success" ? "✓" : "⚠️"}</div>
                    <div className="adm-notice-content">{actionFeedback.message}</div>
                  </div>
                )}

                <form onSubmit={handleExecuteReconcile}>
                  <div className="adm-form-group" style={{ marginBottom: 12 }}>
                    <label className="adm-label">Select Action</label>
                    <select
                      className="adm-select"
                      value={reconcileAction}
                      onChange={(e) => setReconcileAction(e.target.value)}
                      data-testid="reconcile-action-select"
                    >
                      <option value="VERIFY_OFFLINE_SETTLEMENT">
                        Verify Offline Settlement (Mark PAID for COD / Bank Wire)
                      </option>
                      <option value="RECORD_REFUND">Record Administrative Refund (Mark REFUNDED)</option>
                      <option value="FLAG_UNRESOLVED">Flag Payment as Unresolved / Failed (Mark FAILED)</option>
                      <option value="RETRY_RECONCILIATION">Retry Gateway Reconciliation (Provider Check)</option>
                    </select>
                  </div>

                  {reconcileAction === "VERIFY_OFFLINE_SETTLEMENT" && (
                    <div className="adm-form-group" style={{ marginBottom: 12 }}>
                      <label className="adm-label">Bank Settlement / Cash Receipt Reference (Optional)</label>
                      <input
                        type="text"
                        className="adm-input"
                        placeholder="e.g. UTR-98234823 or Cash Voucher #104"
                        value={settlementRefInput}
                        onChange={(e) => setSettlementRefInput(e.target.value)}
                        data-testid="settlement-ref-input"
                      />
                    </div>
                  )}

                  {reconcileAction === "RECORD_REFUND" && (
                    <div className="adm-form-group" style={{ marginBottom: 12 }}>
                      <label className="adm-label">Refund Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="adm-input"
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        data-testid="refund-amount-input"
                      />
                    </div>
                  )}

                  <div className="adm-form-group" style={{ marginBottom: 12 }}>
                    <label className="adm-label">
                      Reconciliation Notes &amp; Audit Justification <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      className="adm-textarea"
                      rows={2}
                      placeholder="State the verifiable reason, cashier/bank confirmation, or error details..."
                      value={reconcileNotes}
                      onChange={(e) => setReconcileNotes(e.target.value)}
                      required
                      data-testid="reconcile-notes-input"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: "0.85rem" }}>
                      <input
                        type="checkbox"
                        checked={confirmedCheckbox}
                        onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                        style={{ marginTop: 3 }}
                        data-testid="confirm-reconciliation-checkbox"
                      />
                      <span>
                        I confirm this financial reconciliation action is truthful, verified against the commercial ledger, and authorize writing this entry to the permanent audit log.
                      </span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary"
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="adm-btn adm-btn-primary"
                      disabled={reconciling || !confirmedCheckbox}
                      data-testid="submit-reconciliation-btn"
                    >
                      {reconciling ? "Recording Resolution..." : "Execute Resolution"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merchant UPI & QR Configuration Modal */}
      {isUpiConfigOpen && (
        <div
          className="adm-modal-backdrop adm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upi-modal-title"
          aria-describedby="upi-modal-desc"
          data-testid="upi-config-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget && !upiConfigSaving) {
              handleCloseUpiConfig();
            }
          }}
        >
          <div
            ref={upiModalRef}
            tabIndex={-1}
            className="adm-modal adm-modal-upi"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="adm-modal-header">
              <div>
                <h2
                  id="upi-modal-title"
                  className="adm-modal-title"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span style={{ color: "var(--adm-primary, #ff7900)" }}>⚡</span>{" "}
                  Configure Merchant UPI &amp; QR Code
                </h2>
                <p
                  id="upi-modal-desc"
                  style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--adm-text-secondary)" }}
                >
                  Configure merchant VPA, checkout instructions, and dynamic vs static QR mode with immutable audit trail.
                </p>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={handleCloseUpiConfig}
                aria-label="Close configuration modal"
                disabled={upiConfigSaving}
              >
                ✕
              </button>
            </div>

            {/* Form Wrapping Scrollable Body & Fixed Action Footer */}
            <form
              onSubmit={handleSaveUpiConfig}
              className="adm-modal-form"
              style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}
            >
              <div
                className="adm-modal-body"
                style={{ padding: "20px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}
              >
                {upiConfigFeedback && (
                  <div
                    className={`adm-notice ${upiConfigFeedback.type === "success" ? "adm-notice-success" : "adm-notice-danger"}`}
                    style={{ marginBottom: 16 }}
                    data-testid="upi-config-feedback"
                  >
                    <div className="adm-notice-content">
                      {upiConfigFeedback.message}
                    </div>
                  </div>
                )}

                {upiConfigLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--adm-text-secondary)" }}>
                    Loading merchant payment settings...
                  </div>
                ) : (
                  <>
                    {/* Availability Toggle */}
                    <div className="adm-upi-toggle-card">
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                        <input
                          type="checkbox"
                          checked={upiEnabledInput}
                          onChange={(e) => setUpiEnabledInput(e.target.checked)}
                          data-testid="toggle-upi-enabled"
                          style={{ width: 18, height: 18 }}
                        />
                        <span>Enable UPI &amp; QR Code Payment Method on Customer Checkout</span>
                      </label>
                      <p style={{ margin: "4px 0 0 28px", fontSize: "0.8rem", color: "var(--adm-text-secondary)" }}>
                        When enabled, customers can select UPI during checkout, scan the QR code, and submit their transaction reference (UTR).
                      </p>
                    </div>

                    {/* Merchant VPA & Name */}
                    <div className="adm-form-row" style={{ marginBottom: 16 }}>
                      <div>
                        <label htmlFor="merchantUpiInput" className="adm-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                          Merchant UPI ID (VPA) *
                        </label>
                        <input
                          id="merchantUpiInput"
                          type="text"
                          className="adm-input"
                          placeholder="e.g. billing.vertex@icici"
                          value={merchantUpiInput}
                          onChange={(e) => setMerchantUpiInput(e.target.value)}
                          data-testid="input-merchant-upi"
                          required
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--adm-text-muted)", display: "block", marginTop: 4 }}>
                          Must follow merchant@bank format.
                        </span>
                      </div>

                      <div>
                        <label htmlFor="merchantNameInput" className="adm-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                          Merchant Display Name *
                        </label>
                        <input
                          id="merchantNameInput"
                          type="text"
                          className="adm-input"
                          placeholder="e.g. VERTEX Industrial E-Commerce"
                          value={merchantNameInput}
                          onChange={(e) => setMerchantNameInput(e.target.value)}
                          data-testid="input-merchant-name"
                          required
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--adm-text-muted)", display: "block", marginTop: 4 }}>
                          Displayed on UPI apps during transfer.
                        </span>
                      </div>
                    </div>

                    {/* QR Mode Selection */}
                    <div style={{ marginBottom: 16 }}>
                      <label htmlFor="qrModeSelect" className="adm-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                        QR Code Generation Mode
                      </label>
                      <select
                        id="qrModeSelect"
                        className="adm-select"
                        value={qrModeInput}
                        onChange={(e) => setQrModeInput(e.target.value)}
                        data-testid="select-qr-mode"
                      >
                        <option value="DYNAMIC">Dynamic Order QR (Recommended: embeds cart total &amp; order note)</option>
                        <option value="STATIC">Static Merchant QR (Uses uploaded static QR image)</option>
                      </select>
                    </div>

                    {/* Static QR Code Uploader */}
                    <div className="adm-upi-qr-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <strong style={{ fontSize: "0.85rem", color: "var(--adm-text-primary)" }}>Static Merchant QR Code Image</strong>
                          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--adm-text-secondary)" }}>
                            Upload an official merchant QR image provided by your acquiring bank (PNG, JPEG, WebP, max 5MB).
                          </p>
                        </div>
                        {staticQrPreview && (
                          <button
                            type="button"
                            className="adm-btn adm-btn-sm adm-btn-danger"
                            onClick={handleRemoveQrCode}
                            disabled={removingQr}
                            data-testid="remove-qr-btn"
                          >
                            {removingQr ? "Removing..." : "Remove Static QR"}
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                        {staticQrPreview ? (
                          <div style={{ width: 100, height: 100, background: "#ffffff", padding: 6, borderRadius: 6, border: "1px solid var(--adm-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <img
                              src={staticQrPreview}
                              alt="Merchant Static QR Preview"
                              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                              data-testid="qr-preview-img"
                            />
                          </div>
                        ) : (
                          <div style={{ width: 100, height: 100, background: "var(--adm-surface)", border: "1.5px dashed var(--adm-border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--adm-text-muted)", textAlign: "center", padding: 6, flexShrink: 0 }}>
                            No static QR image uploaded
                          </div>
                        )}

                        <div style={{ flex: "1 1 200px" }}>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleQrFileSelected}
                            data-testid="input-qr-file"
                            style={{ fontSize: "0.85rem" }}
                          />
                          <span style={{ fontSize: "0.75rem", color: "var(--adm-text-muted)", display: "block", marginTop: 4 }}>
                            Supports drag &amp; drop or file browsing.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Checkout Instructions */}
                    <div style={{ marginBottom: 12 }}>
                      <label htmlFor="instructionsInput" className="adm-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                        Customer Checkout Instructions
                      </label>
                      <textarea
                        id="instructionsInput"
                        className="adm-input"
                        rows={3}
                        placeholder="Step-by-step instructions for paying via UPI..."
                        value={instructionsInput}
                        onChange={(e) => setInstructionsInput(e.target.value)}
                        data-testid="input-upi-instructions"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={handleCloseUpiConfig}
                  disabled={upiConfigSaving}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={upiConfigSaving || upiConfigLoading}
                  data-testid="save-upi-config-btn"
                >
                  {upiConfigSaving ? "Saving Configuration..." : "Save Payment Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
