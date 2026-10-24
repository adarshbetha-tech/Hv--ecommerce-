import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminOrders,
  getAdminReplacements,
  reviewAdminReplacement,
} from "../../services/adminApi";

export default function AdminRefunds({ onNavigateOrders }) {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "replacements" | "refunds"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Historical Refunds state
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [realRefunds, setRealRefunds] = useState([]);

  // Replacement Requests state
  const [replacements, setReplacements] = useState([]);
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("APPROVED_FOR_DISPATCH");
  const [reviewAdminNotes, setReviewAdminNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);

  const fetchReplacements = useCallback(() => {
    setReplacementsLoading(true);
    try {
      const p = typeof getAdminReplacements === "function" ? getAdminReplacements() : null;
      if (p && typeof p.then === "function") {
        p.then((res) => {
          if (res && res.replacements && Array.isArray(res.replacements)) {
            setReplacements(res.replacements);
          }
        })
          .catch(() => {})
          .finally(() => setReplacementsLoading(false));
      } else {
        setReplacementsLoading(false);
      }
    } catch {
      setReplacementsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReplacements();
  }, [fetchReplacements]);

  useEffect(() => {
    let isMounted = true;
    try {
      const p = typeof getAdminOrders === "function" ? getAdminOrders({ paymentStatus: "REFUNDED" }) : null;
      if (p && typeof p.then === "function") {
        p.then((res) => {
          if (isMounted && res?.orders && Array.isArray(res.orders)) {
            const mapped = res.orders.map((o) => ({
              id: `REF-${(o.orderNumber || "").replace(/[^0-9]/g, "").slice(-4) || "009"}`,
              orderNumber: o.orderNumber,
              orderDate: o.createdAt ? o.createdAt.slice(0, 10) : "2026-10-23",
              customer: o.customer?.fullName || o.shippingRecipient || "Customer",
              requestedAmount: Number(o.refundAmount || o.totalAmount || 0),
              originalAmount: Number(o.totalAmount || 0),
              previouslyRefunded: Number(o.refundAmount || 0),
              reason: o.notes || "Recorded administrative credit refund",
              status: "REFUNDED",
              paymentStatus: "REFUNDED",
              createdAt: o.updatedAt || o.createdAt,
            }));
            setRealRefunds(mapped);
          }
        }).catch(() => {});
      }
    } catch {}
    return () => {
      isMounted = false;
    };
  }, []);


  useEffect(() => {
    if (selectedRefund || selectedReplacement) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [selectedRefund, selectedReplacement]);

  const sampleRefundRequests = [
    {
      id: "REF-2026-001",
      orderNumber: "VTX-20261018-74192",
      orderDate: "2026-10-18",
      customer: "Alpha Robotics Corp",
      requestedAmount: 1532.82,
      originalAmount: 1532.82,
      previouslyRefunded: 0.0,
      reason: "Ordered incorrect microcontroller pack size; unopened return requested.",
      status: "AWAITING_REVIEW",
      paymentStatus: "PENDING (COD)",
      createdAt: "2026-10-18T12:30:00Z",
    },
    {
      id: "REF-2026-002",
      orderNumber: "VTX-20261018-88210",
      orderDate: "2026-10-17",
      customer: "Apex Precision Tools",
      requestedAmount: 295.0,
      originalAmount: 590.0,
      previouslyRefunded: 0.0,
      reason: "Partial cancellation of duplicate bolt pack.",
      status: "GATEWAY_INTEGRATION_PENDING",
      paymentStatus: "PENDING",
      createdAt: "2026-10-17T15:45:00Z",
    },
  ];

  const allRefunds = [
    ...realRefunds,
    ...sampleRefundRequests.filter((s) => !realRefunds.some((r) => r.orderNumber === s.orderNumber)),
  ];

  const filteredRefunds = allRefunds.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReplacements = replacements.filter((r) => {
    const custName = r.customer?.fullName || r.customer?.email || "";
    const matchesSearch =
      r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenReviewModal = (repl) => {
    setSelectedReplacement(repl);
    setReviewStatus(repl.status === "PENDING_REVIEW" ? "APPROVED_FOR_DISPATCH" : repl.status);
    setReviewAdminNotes(repl.adminNotes || "");
    setReviewFeedback(null);
  };

  const handleCloseReviewModal = () => {
    if (isSubmittingReview) return;
    setSelectedReplacement(null);
    setReviewFeedback(null);
  };

  const handleSubmitReview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedReplacement || isSubmittingReview) return;

    if (!reviewAdminNotes.trim() || reviewAdminNotes.trim().length < 2) {
      setReviewFeedback({
        type: "error",
        message: "Please enter at least 2 characters for administrative review notes.",
      });
      return;
    }

    setIsSubmittingReview(true);
    setReviewFeedback(null);

    try {
      const res = await reviewAdminReplacement(selectedReplacement.orderNumber, {
        status: reviewStatus,
        adminNotes: reviewAdminNotes.trim(),
      });

      if (res && res.success) {
        setReviewFeedback({
          type: "success",
          message: `Replacement request for Order #${selectedReplacement.orderNumber} successfully updated to ${reviewStatus}.`,
        });
        fetchReplacements();
        setTimeout(() => {
          setSelectedReplacement(null);
          setReviewFeedback(null);
        }, 1200);
      } else {
        setReviewFeedback({
          type: "error",
          message: res?.message || "Failed to update replacement status.",
        });
      }
    } catch (err) {
      setReviewFeedback({
        type: "error",
        message: err.message || "An error occurred while updating replacement status.",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="adm-refunds-view">
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Refunds &amp; Returns Operations</h1>
          <p className="adm-page-subtitle">
            Manage customer 7-day component replacements, inspect transit damage documentation, and audit historical refund records.
          </p>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="adm-tab-bar" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          type="button"
          className={`adm-btn ${activeTab === "all" ? "adm-btn-primary" : "adm-btn-secondary"}`}
          onClick={() => {
            setActiveTab("all");
            setSearchQuery("");
            setStatusFilter("all");
          }}
          data-testid="tab-all-operations"
        >
          📋 All Operations
        </button>
        <button
          type="button"
          className={`adm-btn ${activeTab === "replacements" ? "adm-btn-primary" : "adm-btn-secondary"}`}
          onClick={() => {
            setActiveTab("replacements");
            setSearchQuery("");
            setStatusFilter("all");
          }}
          data-testid="tab-replacements"
        >
          🔄 7-Day Replacement Requests ({replacements.length})
        </button>
        <button
          type="button"
          className={`adm-btn ${activeTab === "refunds" ? "adm-btn-primary" : "adm-btn-secondary"}`}
          onClick={() => {
            setActiveTab("refunds");
            setSearchQuery("");
            setStatusFilter("all");
          }}
          data-testid="tab-refunds"
        >
          📜 Historical Refund Records ({allRefunds.length})
        </button>
      </div>

      {/* Policy & Safety Notice */}
      <div className="adm-notice-banner adm-notice-info" role="status" style={{ marginBottom: "20px" }}>
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Financial Boundary &amp; Non-Operational Notice (Historical Financial Boundary):</strong> This refunds module is strictly non-operational for live gateway reversals. Customers are strictly entitled to component replacements within 7 days of actual delivery under VERTEX's Replacement-Only Policy. Historical refund records are preserved for accounting and reconciliation purposes. Dual-authorization accounting review is required for any monetary adjustments.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="adm-search-input"
            placeholder={
              activeTab === "replacements"
                ? "Search by order number, customer, or reason..."
                : "Search by refund ID, order number, or customer name..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search records"
          />
        </div>

        <div className="adm-filter-group">
          {activeTab === "replacements" ? (
            <select
              className="adm-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter replacements by status"
            >
              <option value="all">All Request Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="APPROVED_FOR_DISPATCH">Approved for Dispatch</option>
              <option value="REJECTED">Rejected</option>
            </select>
          ) : (
            <select
              className="adm-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter refunds by status"
            >
              <option value="all">All Request Statuses</option>
              <option value="AWAITING_REVIEW">Awaiting Review</option>
              <option value="GATEWAY_INTEGRATION_PENDING">Gateway Integration Pending</option>
              <option value="SETTLED">Settled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: 7-Day Replacement Requests */}
      {(activeTab === "all" || activeTab === "replacements") && (
        <div className="adm-card" style={{ marginBottom: "24px" }}>
          <div className="adm-card-header">
            <h2 className="adm-card-title">Customer Replacement Requests</h2>
            <span className="adm-badge adm-badge-info">7-Day Window Enforced</span>
          </div>
          <div className="adm-card-body">
            {replacementsLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                Loading replacement requests...
              </div>
            ) : filteredReplacements.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No replacement requests found matching the current filters.
              </div>
            ) : (
              <div className="adm-table-container">
                <table className="adm-table" aria-label="Replacements table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Customer</th>
                      <th>Delivery Date</th>
                      <th>7-Day Eligibility</th>
                      <th>Reason &amp; Items</th>
                      <th>Status</th>
                      <th>Requested At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReplacements.map((repl) => {
                      const deliveryStr = repl.deliveryDate
                        ? new Date(repl.deliveryDate).toLocaleDateString("en-IN")
                        : "Unverified";
                      const customerName = repl.customer?.fullName || repl.customer?.email || "Customer";

                      let badgeClass = "adm-badge-info";
                      if (repl.status === "PENDING_REVIEW") badgeClass = "adm-badge-warning";
                      if (repl.status === "APPROVED_FOR_DISPATCH") badgeClass = "adm-badge-success";
                      if (repl.status === "REJECTED") badgeClass = "adm-badge-danger";

                      return (
                        <tr key={repl.id || repl.orderNumber}>
                          <td>
                            <span
                              className="adm-code-link"
                              onClick={() => onNavigateOrders && onNavigateOrders(repl.orderNumber)}
                              title="Navigate to Order Details"
                            >
                              {repl.orderNumber}
                            </span>
                          </td>
                          <td>
                            <strong>{customerName}</strong>
                            {repl.customer?.companyName && (
                              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                {repl.customer.companyName}
                              </div>
                            )}
                          </td>
                          <td>{deliveryStr}</td>
                          <td>
                            {repl.isWithinWindow ? (
                              <span className="adm-badge adm-badge-success">Within 7 Days</span>
                            ) : (
                              <span className="adm-badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
                                Window Ended
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ maxWidth: "220px", fontSize: "0.85rem" }}>
                              <strong>{repl.reason}</strong>
                              {repl.items && repl.items.length > 0 && (
                                <div style={{ color: "#64748b", marginTop: "2px" }}>
                                  {repl.items.map((it) => `${it.productName} (×${it.quantity})`).join(", ")}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`adm-badge ${badgeClass}`}>
                              {repl.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td>{new Date(repl.requestedAt).toLocaleDateString("en-IN")}</td>
                          <td>
                            <button
                              type="button"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              onClick={() => handleOpenReviewModal(repl)}
                              data-testid={`review-replacement-btn-${repl.orderNumber}`}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Historical Refund Records */}
      {(activeTab === "all" || activeTab === "refunds") && (
        <div className="adm-card">
          <div className="adm-card-header">
            <h2 className="adm-card-title">Historical Refund Records Registry</h2>
            <span className="adm-badge adm-badge-warning">Historical Audit</span>
          </div>
          <div className="adm-card-body">
            <div className="adm-table-container">
              <table className="adm-table" aria-label="Refunds table">
                <thead>
                  <tr>
                    <th>Refund ID</th>
                    <th>Related Order</th>
                    <th>Customer</th>
                    <th>Requested Amount</th>
                    <th>Original Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((ref) => (
                    <tr key={ref.id}>
                      <td><code>{ref.id}</code></td>
                      <td>
                        <span
                          className="adm-code-link"
                          onClick={() => onNavigateOrders && onNavigateOrders(ref.orderNumber)}
                        >
                          {ref.orderNumber}
                        </span>
                      </td>
                      <td>{ref.customer}</td>
                      <td>
                        <strong>₹{ref.requestedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                      </td>
                      <td>₹{ref.originalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span
                          className={`adm-badge ${
                            ref.status === "AWAITING_REVIEW" ? "adm-badge-warning" : "adm-badge-info"
                          }`}
                        >
                          {ref.status}
                        </span>
                      </td>
                      <td>{new Date(ref.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        <button
                          type="button"
                          className="adm-btn adm-btn-secondary adm-btn-sm"
                          onClick={() => setSelectedRefund(ref)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="adm-info-callout" style={{ marginTop: 20 }}>
              <h4>Mandatory Financial Safety Guardrails</h4>
              <ul>
                <li><strong>Preserved Audit History:</strong> Historical refunds are maintained immutably.</li>
                <li><strong>Non-Operational:</strong> No funds are moved or simulated through this interface.</li>
                <li><strong>Replacement Policy:</strong> VERTEX customers operate under the 7-day replacement policy.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Replacement Review Modal */}
      {selectedReplacement && (
        <div
          className="adm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="replacement-modal-title"
          data-testid="admin-replacement-review-modal"
        >
          <div className="adm-modal-content" style={{ maxWidth: "650px" }}>
            <div className="adm-modal-header">
              <h3 id="replacement-modal-title">
                Review Replacement: Order #{selectedReplacement.orderNumber}
              </h3>
              <button
                type="button"
                className="adm-modal-close"
                onClick={handleCloseReviewModal}
                disabled={isSubmittingReview}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              {reviewFeedback && (
                <div
                  className={`adm-notice-banner ${
                    reviewFeedback.type === "success" ? "adm-notice-success" : "adm-notice-warning"
                  }`}
                  style={{ marginBottom: "16px" }}
                >
                  {reviewFeedback.message}
                </div>
              )}

              <div className="adm-detail-grid">
                <div>
                  <span className="adm-label">Order Number</span>
                  <p><strong>{selectedReplacement.orderNumber}</strong></p>
                </div>
                <div>
                  <span className="adm-label">Customer</span>
                  <p>{selectedReplacement.customer?.fullName || selectedReplacement.customer?.email}</p>
                </div>
                <div>
                  <span className="adm-label">Delivery Date</span>
                  <p>
                    {selectedReplacement.deliveryDate
                      ? new Date(selectedReplacement.deliveryDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Unverified"}
                  </p>
                </div>
                <div>
                  <span className="adm-label">7-Day Window Status</span>
                  <p>
                    {selectedReplacement.isWithinWindow ? (
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ Within 7-Day Window</span>
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>Expired (Post 7 Days)</span>
                    )}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <span className="adm-label">Customer Reason</span>
                <p><strong>{selectedReplacement.reason}</strong></p>
              </div>

              {selectedReplacement.details && (
                <div style={{ marginTop: 10 }}>
                  <span className="adm-label">Technical / Defect Description</span>
                  <p className="adm-reason-box">{selectedReplacement.details}</p>
                </div>
              )}

              {selectedReplacement.items && selectedReplacement.items.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <span className="adm-label">Items Requested for Replacement</span>
                  <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                    {selectedReplacement.items.map((it, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        <strong>{it.productName}</strong> <code>({it.sku})</code> — Quantity: <strong>{it.quantity}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <hr style={{ margin: "18px 0", borderColor: "var(--adm-border, #334155)" }} />

              <form onSubmit={handleSubmitReview}>
                <div style={{ marginBottom: 14 }}>
                  <label className="adm-label" htmlFor="admin-review-status-select">
                    Review Decision Status
                  </label>
                  <select
                    id="admin-review-status-select"
                    className="adm-select"
                    style={{ width: "100%", marginTop: "4px" }}
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    disabled={isSubmittingReview}
                    data-testid="admin-review-status-select"
                  >
                    <option value="APPROVED_FOR_DISPATCH">APPROVED FOR DISPATCH</option>
                    <option value="IN_REVIEW">IN REVIEW (Awaiting Inspection)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="adm-label" htmlFor="admin-review-notes">
                    Administrative Notes &amp; Dispatch Instructions
                  </label>
                  <textarea
                    id="admin-review-notes"
                    className="adm-input"
                    rows={3}
                    style={{ width: "100%", marginTop: "4px" }}
                    placeholder="Document inspection outcome, consignment tracking, or justification..."
                    value={reviewAdminNotes}
                    onChange={(e) => setReviewAdminNotes(e.target.value)}
                    disabled={isSubmittingReview}
                    data-testid="admin-review-notes-input"
                    required
                  />
                </div>

                <div className="adm-notice-banner adm-notice-info" style={{ marginBottom: 16 }}>
                  <span className="adm-notice-icon">ℹ️</span>
                  <div>
                    <strong>Inventory Dispatch Only:</strong> Approving this request registers warehouse dispatch authorization. Under VERTEX policy, no payment or bank accounts are touched.
                  </div>
                </div>

                <div className="adm-modal-footer" style={{ padding: 0 }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary"
                    onClick={handleCloseReviewModal}
                    disabled={isSubmittingReview}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="adm-btn adm-btn-primary"
                    disabled={isSubmittingReview}
                    data-testid="confirm-admin-review-btn"
                  >
                    {isSubmittingReview ? "Saving Decision..." : "Save Review Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Historical Refund Details Modal */}
      {selectedRefund && (
        <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title">
          <div className="adm-modal-content">
            <div className="adm-modal-header">
              <h3 id="refund-modal-title">Refund Request Details: {selectedRefund.id}</h3>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedRefund(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div>
                  <span className="adm-label">Related Order Number</span>
                  <p><strong>{selectedRefund.orderNumber}</strong></p>
                </div>
                <div>
                  <span className="adm-label">Customer</span>
                  <p>{selectedRefund.customer}</p>
                </div>
                <div>
                  <span className="adm-label">Original Payment Amount</span>
                  <p>₹{selectedRefund.originalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="adm-label">Requested Refund Amount</span>
                  <p style={{ color: "var(--adm-orange)", fontWeight: 700 }}>
                    ₹{selectedRefund.requestedAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="adm-label">Previously Refunded</span>
                  <p>₹{selectedRefund.previouslyRefunded.toFixed(2)}</p>
                </div>
                <div>
                  <span className="adm-label">Remaining Balance</span>
                  <p>₹{(selectedRefund.originalAmount - selectedRefund.previouslyRefunded).toFixed(2)}</p>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span className="adm-label">Customer-Provided Reason</span>
                <p className="adm-reason-box">{selectedRefund.reason}</p>
              </div>

              <div className="adm-notice-banner adm-notice-warning" style={{ marginTop: 16 }}>
                <span className="adm-notice-icon">⚠️</span>
                <div>
                  <strong>Financial Execution Guard:</strong> Settlement buttons are disabled. Automated money transfers are locked until an authorized payment gateway is configured.
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setSelectedRefund(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

