import React, { useState, useEffect, useCallback } from "react";
import { getAdminQuotes, updateAdminQuote } from "../../services/adminApi";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "QUOTED", label: "Quoted" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "PENDING":
      return "adm-badge adm-badge-warning";
    case "UNDER_REVIEW":
      return "adm-badge adm-badge-info";
    case "QUOTED":
      return "adm-badge adm-badge-primary";
    case "ACCEPTED":
      return "adm-badge adm-badge-success";
    case "REJECTED":
      return "adm-badge adm-badge-danger";
    case "EXPIRED":
    default:
      return "adm-badge adm-badge-neutral";
  }
};

export default function AdminQuotes() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, page: 1, limit: 10, totalPages: 1 });

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal
  const [inspectingQuote, setInspectingQuote] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState(null);

  const loadQuotes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await getAdminQuotes({
        status: statusFilter !== "all" ? statusFilter : "",
        search: searchQuery.trim(),
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res && res.quotes) {
        setQuotes(res.quotes);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load commercial quote requests.");
      setQuotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Modal open & close
  const handleOpenQuote = (quote) => {
    setInspectingQuote(quote);
    setEditStatus(quote.status || "PENDING");
    setEditNotes(quote.adminNotes || "");
    setEditAmount(quote.quotedAmount !== null && quote.quotedAmount !== undefined ? String(quote.quotedAmount) : "");
    setUpdateFeedback(null);
  };

  const handleCloseModal = () => {
    setInspectingQuote(null);
    setUpdateFeedback(null);
  };

  // Submit quote status and pricing update
  const handleSaveQuoteUpdate = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!inspectingQuote || updating) return;

    try {
      setUpdating(true);
      setUpdateFeedback(null);

      const payload = {
        status: editStatus,
        adminNotes: editNotes.trim() || null,
        quotedAmount: editAmount !== "" ? Number(editAmount) : null,
      };

      const res = await updateAdminQuote(inspectingQuote.id, payload);
      const updatedQuote = res.quote || { ...inspectingQuote, ...payload };

      setInspectingQuote(updatedQuote);
      setUpdateFeedback({
        type: "success",
        message: "Quote request status and pricing updated successfully.",
      });

      // Update in-place in list
      setQuotes((prev) =>
        prev.map((q) => (q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q))
      );
    } catch (err) {
      setUpdateFeedback({
        type: "error",
        message: err.message || "Failed to update quote request.",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Calculated Metrics
  const totalCount = pagination.totalItems || quotes.length;
  const pendingCount = quotes.filter((q) => q.status === "PENDING" || q.status === "UNDER_REVIEW").length;
  const quotedCount = quotes.filter((q) => q.status === "QUOTED" || q.status === "ACCEPTED").length;
  const totalQuotedValue = quotes.reduce((acc, q) => acc + (Number(q.quotedAmount) || 0), 0);

  return (
    <div className="adm-page">
      {/* Header */}
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Commercial Quotes (RFQ)</h1>
          <p className="adm-page-subtitle">
            Manage bulk procurement requests, customer inquiries, custom pricing, and technical proposals.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadQuotes(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Inquiries"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="adm-kpi-grid">
        <div className="adm-card adm-kpi-card">
          <div className="adm-kpi-label">Total Inquiries</div>
          <div className="adm-kpi-value">{totalCount}</div>
          <div className="adm-kpi-trend">All submitted commercial RFQs</div>
        </div>

        <div className="adm-card adm-kpi-card">
          <div className="adm-kpi-label">Pending Review</div>
          <div className="adm-kpi-value" style={{ color: "#d97706" }}>
            {pendingCount}
          </div>
          <div className="adm-kpi-trend">Awaiting technical sales action</div>
        </div>

        <div className="adm-card adm-kpi-card">
          <div className="adm-kpi-label">Proposals Sent</div>
          <div className="adm-kpi-value" style={{ color: "#2563eb" }}>
            {quotedCount}
          </div>
          <div className="adm-kpi-trend">Quoted or accepted by customer</div>
        </div>

        <div className="adm-card adm-kpi-card">
          <div className="adm-kpi-label">Quoted Pipeline</div>
          <div className="adm-kpi-value" style={{ color: "#059669" }}>
            ₹{totalQuotedValue.toLocaleString("en-IN")}
          </div>
          <div className="adm-kpi-trend">Active commercial volume value</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="adm-card adm-filter-card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 240px" }}>
            <input
              type="text"
              className="adm-input"
              placeholder="Search by contact, email, company, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search quote inquiries"
            />
          </div>

          <div style={{ width: "180px" }}>
            <select
              className="adm-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter quotes by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || statusFilter !== "all") && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="adm-alert adm-alert-danger" role="alert" style={{ marginBottom: "20px" }}>
          <span>⚠️ {error}</span>
          <button type="button" className="adm-btn adm-btn-secondary" onClick={() => loadQuotes(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Quotes Table */}
      <div className="adm-card adm-table-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <span className="adm-spinner" style={{ margin: "0 auto 12px" }} />
            <div>Loading commercial quote inquiries...</div>
          </div>
        ) : quotes.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📑</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", margin: "0 0 6px" }}>
              No Quote Requests Found
            </h3>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              {searchQuery || statusFilter !== "all"
                ? "No RFQs match your search and filter criteria."
                : "No commercial quote requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <table className="adm-table" aria-label="Commercial Quotes Table">
            <thead>
              <tr>
                <th>Reference / Date</th>
                <th>Contact &amp; Company</th>
                <th>Product &amp; Volume</th>
                <th>Quoted Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)" }}>
                      RFQ-{quote.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--adm-text-muted, #717D8F)" }}>
                      {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString("en-IN") : "—"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)" }}>{quote.contactName}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>{quote.email}</div>
                    {quote.companyName && (
                      <div style={{ fontSize: "0.8rem", color: "var(--adm-accent, #D99036)" }}>🏢 {quote.companyName}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--adm-text-primary, #F4F6F8)", maxWidth: "260px" }}>
                      {quote.productDetails}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>
                      Quantity: <strong style={{ color: "var(--adm-text-primary, #F4F6F8)" }}>{Number(quote.quantity).toLocaleString("en-IN")} units</strong>
                    </div>
                  </td>
                  <td>
                    {quote.quotedAmount !== null && quote.quotedAmount !== undefined ? (
                      <span style={{ fontWeight: 600, color: "#059669" }}>
                        ₹{Number(quote.quotedAmount).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Pending Quote</span>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(quote.status)}>
                      {quote.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.82rem" }}
                      onClick={() => handleOpenQuote(quote)}
                      aria-label={`Inspect quote for ${quote.contactName}`}
                    >
                      Inspect &amp; Quote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspect and Manage Quote Modal */}
      {inspectingQuote && (
        <div
          className="vtx-modal-backdrop"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-inspect-modal-title"
        >
          <div
            className="vtx-modal"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vtx-modal-header">
              <div>
                <span className="vtx-modal-badge">Commercial RFQ Management</span>
                <h3 id="quote-inspect-modal-title" className="vtx-modal-title">
                  Inquiry: RFQ-{inspectingQuote.id.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                className="vtx-modal-close"
                onClick={handleCloseModal}
                aria-label="Close quote modal"
              >
                ✕
              </button>
            </div>

            <div className="vtx-modal-body">
              {updateFeedback && (
                <div
                  className={`adm-alert ${
                    updateFeedback.type === "success" ? "adm-alert-success" : "adm-alert-danger"
                  }`}
                  role="alert"
                  style={{ marginBottom: "16px" }}
                >
                  {updateFeedback.message}
                </div>
              )}

              {/* Inquired Product & Contact Details Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  background: "var(--adm-surface-alt, #1F2836)",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  border: "1px solid var(--adm-border, #222D3D)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--adm-text-muted, #717D8F)", fontWeight: 700 }}>
                    Contact Person
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)", marginTop: "2px" }}>
                    {inspectingQuote.contactName}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>{inspectingQuote.email}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>{inspectingQuote.phone}</div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--adm-text-muted, #717D8F)", fontWeight: 700 }}>
                    Company &amp; Tax ID
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)", marginTop: "2px" }}>
                    {inspectingQuote.companyName || "Independent Procurement"}
                  </div>
                  {inspectingQuote.gstin && (
                    <div style={{ fontSize: "0.82rem", color: "var(--adm-accent, #D99036)" }}>GSTIN: {inspectingQuote.gstin}</div>
                  )}
                  {inspectingQuote.user && (
                    <div style={{ fontSize: "0.8rem", color: "var(--adm-success, #22C55E)", marginTop: "4px" }}>
                      ✓ Verified {inspectingQuote.user.role} Account
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--adm-border, #222D3D)", paddingTop: "12px" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--adm-text-muted, #717D8F)", fontWeight: 700 }}>
                    Product Requirement &amp; Volume
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)", marginTop: "2px" }}>
                    {inspectingQuote.productDetails}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>
                    Requested Quantity: <strong style={{ color: "var(--adm-text-primary, #F4F6F8)" }}>{Number(inspectingQuote.quantity).toLocaleString("en-IN")} units</strong>
                  </div>
                  {inspectingQuote.message && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "0.85rem",
                        color: "var(--adm-text-secondary, #A6AFBC)",
                        background: "var(--adm-surface, #171E28)",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--adm-border, #222D3D)",
                      }}
                    >
                      "{inspectingQuote.message}"
                    </div>
                  )}
                </div>
              </div>

              {/* Management & Status Update Form */}
              <form onSubmit={handleSaveQuoteUpdate}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label
                      htmlFor="quote-status-select"
                      style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
                    >
                      Workflow Status
                    </label>
                    <select
                      id="quote-status-select"
                      className="adm-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                      <option value="QUOTED">QUOTED</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="quote-amount-input"
                      style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
                    >
                      Quoted Total (₹)
                    </label>
                    <input
                      id="quote-amount-input"
                      type="number"
                      step="0.01"
                      min="0"
                      className="adm-input"
                      placeholder="e.g. 45000.00"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="quote-admin-notes"
                    style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
                  >
                    Internal Admin Notes &amp; Proposal Remarks
                  </label>
                  <textarea
                    id="quote-admin-notes"
                    className="adm-textarea"
                    rows="3"
                    placeholder="Enter supplier lead times, discount breakdown, or quotation dispatch details..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary"
                    onClick={handleCloseModal}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="adm-btn adm-btn-primary"
                    disabled={updating}
                  >
                    {updating ? "Saving Changes..." : "Save Quote Updates"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
