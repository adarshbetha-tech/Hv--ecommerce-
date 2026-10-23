import React, { useState, useEffect, useCallback } from "react";
import { getAdminNewsletterSubscriptions } from "../../services/adminApi";

export default function AdminNewsletter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, page: 1, limit: 20, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");

  const loadSubscribers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await getAdminNewsletterSubscriptions({
        search: searchQuery.trim(),
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res && res.subscriptions) {
        setSubscriptions(res.subscriptions);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load newsletter subscribers.");
      setSubscriptions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  const totalCount = pagination.totalItems || subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.isActive !== false).length;

  return (
    <div className="adm-page">
      {/* Header */}
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Newsletter Subscribers</h1>
          <p className="adm-page-subtitle">
            Auditing marketing subscriptions, new arrival notifications, and technical guide opt-ins.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadSubscribers(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Subscribers"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="adm-kpi-grid">
        <div className="adm-card adm-kpi-card">
          <div className="adm-kpi-label">Total Subscribers</div>
          <div className="adm-kpi-value">{totalCount}</div>
          <div className="adm-kpi-trend">All registered email addresses</div>
        </div>

        <div className="adm-card adm-kpi-card">
          <div className="adm-kpi-label">Active Opt-ins</div>
          <div className="adm-kpi-value" style={{ color: "#059669" }}>
            {activeCount}
          </div>
          <div className="adm-kpi-trend">Active marketing recipients</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="adm-card adm-filter-card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ flex: "1 1 300px" }}>
            <input
              type="text"
              className="adm-input"
              placeholder="Search by subscriber email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search newsletter subscribers"
            />
          </div>

          {searchQuery && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="adm-alert adm-alert-danger" role="alert" style={{ marginBottom: "20px" }}>
          <span>⚠️ {error}</span>
          <button type="button" className="adm-btn adm-btn-secondary" onClick={() => loadSubscribers(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="adm-card adm-table-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <span className="adm-spinner" style={{ margin: "0 auto 12px" }} />
            <div>Loading subscriber directory...</div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--adm-text-secondary, #A6AFBC)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✉️</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)", margin: "0 0 6px" }}>
              No Subscribers Found
            </h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>
              {searchQuery
                ? "No subscribers match your search term."
                : "No email subscribers have opted in yet."}
            </p>
          </div>
        ) : (
          <table className="adm-table" aria-label="Newsletter Subscribers Table">
            <thead>
              <tr>
                <th>Subscriber Email</th>
                <th>Status</th>
                <th>Subscribed At</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--adm-text-primary, #F4F6F8)" }}>
                      {sub.email}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`adm-badge ${
                        sub.isActive !== false ? "adm-badge-success" : "adm-badge-neutral"
                      }`}
                    >
                      {sub.isActive !== false ? "ACTIVE" : "UNSUBSCRIBED"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary, #A6AFBC)" }}>
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleString("en-IN") : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
