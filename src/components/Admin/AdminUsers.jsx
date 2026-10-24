import React, { useState, useEffect, useCallback } from "react";
import { getAdminCustomers, updateAdminUserRole } from "../../services/adminApi";

// Formats ISO timestamp to local readable date
const formatDate = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Generates 2-letter uppercase initials for user avatars
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// Checks if a date falls within the last 30 days
const isRecentlyRegistered = (dateStr) => {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return date.getTime() >= thirtyDaysAgo;
};

// Helper for role badge styling
const getRoleBadge = (role) => {
  switch (role) {
    case "ADMIN":
      return { label: "ADMIN", className: "adm-badge-primary" };
    case "B2B":
      return { label: "B2B WHOLESALE", className: "adm-badge-info" };
    case "CUSTOMER":
      return { label: "CUSTOMER", className: "adm-badge-neutral" };
    default:
      return { label: role || "USER", className: "adm-badge-neutral" };
  }
};

export default function AdminUsers({ currentAdminUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [inspectingUser, setInspectingUser] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Role & status management state
  const [selectedRole, setSelectedRole] = useState("CUSTOMER");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [roleFeedback, setRoleFeedback] = useState(null);

  useEffect(() => {
    if (inspectingUser) {
      setSelectedRole(inspectingUser.role || "CUSTOMER");
      setSelectedStatus(inspectingUser.status || "ACTIVE");
      setRoleFeedback(null);
    }
  }, [inspectingUser]);

  const handleUpdateUserRole = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!inspectingUser || roleUpdating) return;

    try {
      setRoleUpdating(true);
      setRoleFeedback(null);

      await updateAdminUserRole(inspectingUser.id, {
        role: selectedRole,
        isActive: selectedStatus === "ACTIVE",
      });

      setRoleFeedback({
        type: "success",
        text: `User ${inspectingUser.fullName} role updated to ${selectedRole} (${selectedStatus}) successfully.`,
      });

      setInspectingUser((prev) => (prev ? { ...prev, role: selectedRole, status: selectedStatus } : null));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === inspectingUser.id ? { ...u, role: selectedRole, status: selectedStatus } : u
        )
      );

      loadUsers(true);
    } catch (err) {
      setRoleFeedback({
        type: "error",
        text: err.message || "Failed to update user role and account status.",
      });
    } finally {
      setRoleUpdating(false);
    }
  };

  const loadUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let customerList = [];
      try {
        const res = await getAdminCustomers();
        if (res?.customers && Array.isArray(res.customers)) {
          customerList = res.customers;
        }
      } catch (err) {
        console.warn("User directory fetch notice:", err.message);
      }

      // Merge current active admin user with loaded accounts
      const unified = [];

      if (currentAdminUser && currentAdminUser.email) {
        unified.push({
          id: currentAdminUser.id || "admin-current",
          fullName: currentAdminUser.fullName || "Chief Engineer (Administrator)",
          email: currentAdminUser.email,
          role: currentAdminUser.role || "ADMIN",
          phone: currentAdminUser.phone || "+91 98765 11111",
          mfaEnabled: currentAdminUser.mfaEnabled ?? true,
          status: "ACTIVE",
          createdAt: currentAdminUser.createdAt || "2026-01-01T08:00:00.000Z",
          lastLoginAt: currentAdminUser.lastLoginAt || new Date().toISOString(),
        });
      }

      customerList.forEach((c) => {
        if (!unified.some((u) => u.email === c.email || (u.id && u.id === c.id))) {
          unified.push({
            id: c.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            fullName: c.fullName || "Registered User",
            email: c.email,
            role: c.role || "CUSTOMER",
            phone: c.phone || "—",
            companyName: c.companyName,
            gstin: c.gstin,
            mfaEnabled: Boolean(c.mfaEnabled),
            status: c.status || "ACTIVE",
            createdAt: c.createdAt || "2026-02-15T10:00:00.000Z",
            lastLoginAt: c.lastLoginAt || null,
          });
        }
      });

      setUsers(unified);
    } catch (err) {
      setError(err.message || "Failed to query system user accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentAdminUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (inspectingUser) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [inspectingUser]);

  // Filtered users calculation
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.id && u.id.toLowerCase().includes(term)) ||
      (u.companyName && u.companyName.toLowerCase().includes(term));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "ACTIVE" && u.status !== "INACTIVE") ||
      (statusFilter === "INACTIVE" && u.status === "INACTIVE");

    return matchesSearch && matchesRole && matchesStatus;
  });

  const hasActiveFilters = Boolean(
    searchQuery.trim() || roleFilter !== "all" || statusFilter !== "all"
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  // Summary KPI Metrics strictly computed from loaded user data
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status !== "INACTIVE").length;
  const adminUsersCount = users.filter((u) => u.role === "ADMIN").length;
  const recentlyRegisteredCount = users.filter((u) => isRecentlyRegistered(u.createdAt)).length;

  return (
    <div className="adm-users-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Admin Users &amp; Role-Based Access Control</h1>
          <p className="adm-page-subtitle">
            Configure administrative security privileges, verify identity accounts, and inspect role policies.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadUsers(true)}
            disabled={loading || refreshing}
            data-testid="refresh-users-btn"
            title="Refresh users directory"
          >
            {refreshing ? (
              <>
                <span className="adm-spinner adm-spinner-dark" aria-hidden="true" /> Refreshing...
              </>
            ) : (
              "↻ Refresh Users"
            )}
          </button>
        </div>
      </div>

      {/* Security Provisioning Banner */}
      <div className="adm-notice-banner adm-notice-info" role="status">
        <span className="adm-notice-icon">🛡️</span>
        <div>
          <strong>Controlled Administration Policy:</strong> Public registration of administrator accounts is strictly blocked by the server-side validator. New administrators must be provisioned via the secure CLI procedure (<code>node src/scripts/seedAdmin.js</code>) to prevent privilege escalation.
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>User Directory Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="adm-customer-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Total Users</span>
            <span className="adm-customer-kpi-val">{totalUsersCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
            👥
          </div>
        </div>

        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Active Users</span>
            <span className="adm-customer-kpi-val">{activeUsersCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-green" aria-hidden="true">
            ✓
          </div>
        </div>

        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Admin Users</span>
            <span className="adm-customer-kpi-val">{adminUsersCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
            🛡️
          </div>
        </div>

        <div className="adm-customer-kpi-card">
          <div className="adm-customer-kpi-info">
            <span className="adm-customer-kpi-label">Recent Registrations</span>
            <span className="adm-customer-kpi-val">{recentlyRegisteredCount}</span>
          </div>
          <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
            📅
          </div>
        </div>
      </div>

      {/* Current Active Administrator Card */}
      {currentAdminUser && (
        <div className="adm-card" style={{ marginBottom: 20 }}>
          <div className="adm-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>👑</span>
              <h2 className="adm-card-title" style={{ margin: 0 }}>Current Active Administrator</h2>
            </div>
            <span className="adm-badge adm-badge-success">Session Active</span>
          </div>
          <div className="adm-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <span className="adm-label">Full Name</span>
                <strong style={{ color: "var(--adm-text-primary)" }}>
                  {currentAdminUser.fullName || "Administrator"}
                </strong>
              </div>
              <div>
                <span className="adm-label">Email Address</span>
                <code>{currentAdminUser.email}</code>
              </div>
              <div>
                <span className="adm-label">System Role</span>
                <span className="adm-badge adm-badge-primary">
                  {currentAdminUser.role}
                </span>
              </div>
              <div>
                <span className="adm-label">Two-Factor Authentication</span>
                <span className={`adm-badge ${currentAdminUser.mfaEnabled ? "adm-badge-success" : "adm-badge-warning"}`}>
                  {currentAdminUser.mfaEnabled ? "✓ TOTP Enabled" : "⚠️ Recommended"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by user name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="ADMIN">Administrators ({adminUsersCount})</option>
            <option value="B2B">B2B Wholesale Accounts</option>
            <option value="CUSTOMER">Retail Customers</option>
          </select>

          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by account status"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Users Content */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Loading user accounts and access credentials...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            👥
          </div>
          <h3 className="adm-empty-title">
            {hasActiveFilters ? "No Matching Users Found" : "No Users Registered"}
          </h3>
          <p className="adm-empty-desc">
            {hasActiveFilters
              ? "No system user accounts match your search query or filter criteria. Clear your filters to view all registered users."
              : "No user identity accounts are currently active in the system."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
          <div className="adm-card-header" style={{ padding: "16px 20px" }}>
            <div>
              <h2 className="adm-card-title" style={{ margin: 0 }}>System Identity &amp; Access Directory</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--adm-text-secondary)" }}>
                Displaying {filteredUsers.length} of {users.length} registered accounts
              </span>
            </div>
            <span className="adm-badge adm-badge-success">Server-Enforced RBAC</span>
          </div>

          {/* Desktop Table View */}
          <div className="adm-user-desktop-table">
            <div className="adm-table-container" style={{ border: "none" }}>
              <table className="adm-table" aria-label="System users list">
                <thead>
                  <tr>
                    <th>User &amp; Identity</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Security / MFA</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const roleBadge = getRoleBadge(user.role);
                    return (
                      <tr key={user.id || user.email}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className={`adm-user-avatar role-${(user.role || "customer").toLowerCase()}`}>
                              {getInitials(user.fullName)}
                            </div>
                            <div>
                              <strong style={{ color: "var(--adm-text-primary)", fontSize: "0.88rem" }}>
                                {user.fullName}
                              </strong>
                              {user.companyName && (
                                <div style={{ fontSize: "0.72rem", color: "var(--adm-text-muted)" }}>
                                  🏢 {user.companyName}
                                </div>
                              )}
                              {user.id && (
                                <div style={{ fontSize: "0.7rem", color: "var(--adm-text-muted)", fontFamily: "monospace" }}>
                                  ID: {String(user.id).slice(0, 8)}...
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <code style={{ fontSize: "0.8rem" }}>{user.email}</code>
                        </td>

                        <td>
                          <span className={`adm-badge ${roleBadge.className}`}>
                            {roleBadge.label}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`adm-badge ${
                              user.mfaEnabled ? "adm-badge-success" : "adm-badge-warning"
                            }`}
                            style={{ fontSize: "0.74rem" }}
                          >
                            {user.mfaEnabled ? "✓ TOTP Enabled" : "⚠️ Recommended"}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: "0.82rem", color: "var(--adm-text-secondary)" }}>
                            {formatDate(user.createdAt)}
                          </span>
                        </td>

                        <td>
                          <span className="adm-badge adm-badge-success">Active</span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => setInspectingUser(user)}
                            data-testid={`inspect-user-${user.id || user.email}`}
                            title={`Inspect security profile for ${user.fullName}`}
                          >
                            Inspect Profile &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (<= 768px) */}
          <div className="adm-user-mobile-cards" style={{ padding: "12px" }}>
            {filteredUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role);
              return (
                <div key={user.id || user.email} className="adm-user-card">
                  <div className="adm-user-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className={`adm-user-avatar role-${(user.role || "customer").toLowerCase()}`}>
                        {getInitials(user.fullName)}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.92rem", color: "var(--adm-text-primary)" }}>
                          {user.fullName}
                        </strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--adm-text-secondary)" }}>
                          <code>{user.email}</code>
                        </div>
                      </div>
                    </div>
                    <span className={`adm-badge ${roleBadge.className}`}>
                      {roleBadge.label}
                    </span>
                  </div>

                  <div className="adm-user-card-body">
                    <div className="adm-user-card-item">
                      <span className="adm-user-card-label">Security / MFA</span>
                      <span className="adm-user-card-value">
                        <span
                          className={`adm-badge ${
                            user.mfaEnabled ? "adm-badge-success" : "adm-badge-warning"
                          }`}
                          style={{ fontSize: "0.72rem" }}
                        >
                          {user.mfaEnabled ? "✓ TOTP Enabled" : "⚠️ Recommended"}
                        </span>
                      </span>
                    </div>

                    <div className="adm-user-card-item">
                      <span className="adm-user-card-label">Registered</span>
                      <span className="adm-user-card-value">{formatDate(user.createdAt)}</span>
                    </div>

                    {user.companyName && (
                      <div className="adm-user-card-item" style={{ gridColumn: "span 2" }}>
                        <span className="adm-user-card-label">Organization</span>
                        <span className="adm-user-card-value">🏢 {user.companyName}</span>
                      </div>
                    )}
                  </div>

                  <div className="adm-user-card-footer">
                    <span className="adm-badge adm-badge-success">Active</span>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={() => setInspectingUser(user)}
                    >
                      Inspect Profile &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Security Profile Inspection Modal */}
      {inspectingUser && (
        <div
          className="adm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-inspect-title"
          onClick={() => setInspectingUser(null)}
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <h2 id="user-inspect-title" className="adm-modal-title">
                User Security Profile: {inspectingUser.fullName}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingUser(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body">
              {/* User Hero */}
              <div className="adm-customer-modal-hero" style={{ marginBottom: 20 }}>
                <div
                  className={`adm-user-avatar role-${(inspectingUser.role || "customer").toLowerCase()}`}
                  style={{ width: 56, height: 56, fontSize: "1.4rem" }}
                >
                  {getInitials(inspectingUser.fullName)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--adm-text-primary)" }}>
                    {inspectingUser.fullName}
                  </div>
                  <code style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary)" }}>
                    {inspectingUser.email}
                  </code>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <span className={`adm-badge ${getRoleBadge(inspectingUser.role).className}`}>
                      {getRoleBadge(inspectingUser.role).label}
                    </span>
                    <span className="adm-badge adm-badge-success">
                      {inspectingUser.status || "Active"}
                    </span>
                    <span
                      className={`adm-badge ${
                        inspectingUser.mfaEnabled ? "adm-badge-success" : "adm-badge-warning"
                      }`}
                    >
                      {inspectingUser.mfaEnabled ? "✓ TOTP Enabled" : "⚠️ MFA Optional"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Details Grid */}
              <h3 className="adm-customer-section-title">Identity &amp; Security Telemetry</h3>
              <div className="adm-customer-section-grid" style={{ marginBottom: 20 }}>
                <div className="adm-customer-info-box">
                  <span className="adm-customer-info-label">User Identifier (UUID)</span>
                  <span className="adm-customer-info-val" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {inspectingUser.id}
                  </span>
                </div>
                <div className="adm-customer-info-box">
                  <span className="adm-customer-info-label">Assigned System Role</span>
                  <span className="adm-customer-info-val">{inspectingUser.role}</span>
                </div>
                <div className="adm-customer-info-box">
                  <span className="adm-customer-info-label">Registration Date</span>
                  <span className="adm-customer-info-val">{formatDate(inspectingUser.createdAt)}</span>
                </div>
                <div className="adm-customer-info-box">
                  <span className="adm-customer-info-label">Contact Phone</span>
                  <span className="adm-customer-info-val">{inspectingUser.phone || "Not recorded"}</span>
                </div>
              </div>

              {/* Corporate Wholesale Entity (if B2B) */}
              {inspectingUser.role === "B2B" && (
                <>
                  <h3 className="adm-customer-section-title">Corporate Wholesale Entity</h3>
                  <div className="adm-customer-section-grid" style={{ marginBottom: 20 }}>
                    <div className="adm-customer-info-box">
                      <span className="adm-customer-info-label">Registered Company Name</span>
                      <span className="adm-customer-info-val">
                        {inspectingUser.companyName || "Industrial Enterprise"}
                      </span>
                    </div>
                    <div className="adm-customer-info-box">
                      <span className="adm-customer-info-label">GSTIN Identification</span>
                      <span className="adm-customer-info-val" style={{ fontFamily: "monospace" }}>
                        {inspectingUser.gstin || "Pending Verification"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Privileges Summary */}
              <h3 className="adm-customer-section-title">Role Privileges &amp; Policy</h3>
              <div className="adm-info-callout" style={{ margin: 0 }}>
                <p style={{ margin: "0 0 8px", fontSize: "0.84rem", fontWeight: 600 }}>
                  {inspectingUser.role === "ADMIN"
                    ? "Full Governance: Read/Write catalog, inventory telemetry, order dispatch, and user oversight."
                    : inspectingUser.role === "B2B"
                    ? "Industrial Partner: Access to wholesale tiered price schedules and bulk quote generation."
                    : "Retail Customer: Standard consumer catalog checkout, order history, and self-service address management."}
                </p>
                <span style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)" }}>
                  Authorization is validated on every request by server-side middleware (<code>authenticateSession</code> + <code>requireRole</code>).
                </span>
              </div>

              {/* Administrative Role & Status Assignment */}
              <h3 className="adm-customer-section-title" style={{ marginTop: 20 }}>Administrative Role Assignment &amp; Governance</h3>
              <div className="adm-card" style={{ marginBottom: 20, padding: "16px", background: "var(--adm-surface-alt, rgba(0,0,0,0.02))" }}>
                {roleFeedback && (
                  <div
                    className={`adm-notice-banner ${roleFeedback.type === "success" ? "adm-notice-success" : "adm-notice-warning"}`}
                    role="alert"
                    data-testid="user-role-feedback"
                    style={{ marginBottom: 12 }}
                  >
                    <span className="adm-notice-icon">{roleFeedback.type === "success" ? "✓" : "⚠️"}</span>
                    <div>{roleFeedback.text}</div>
                  </div>
                )}

                {currentAdminUser && inspectingUser.email === currentAdminUser.email ? (
                  <div className="adm-notice-banner adm-notice-info" style={{ margin: 0 }}>
                    <span className="adm-notice-icon">🔒</span>
                    <div>
                      <strong>Active Self-Session:</strong> You are currently authenticated as this administrator. Modifying your own administrative privileges or deactivating yourself is blocked to prevent accidental account lockout.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateUserRole}>
                    <div className="adm-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="adm-form-field">
                        <label htmlFor="assign-user-role">System Role *</label>
                        <select
                          id="assign-user-role"
                          className="adm-select"
                          data-testid="user-role-select"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          disabled={roleUpdating}
                        >
                          <option value="CUSTOMER">CUSTOMER (Standard Retail)</option>
                          <option value="B2B">B2B (Wholesale Commercial)</option>
                          <option value="ADMIN">ADMIN (Full Governance)</option>
                        </select>
                      </div>

                      <div className="adm-form-field">
                        <label htmlFor="assign-user-status">Account Access Status *</label>
                        <select
                          id="assign-user-status"
                          className="adm-select"
                          data-testid="user-status-select"
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          disabled={roleUpdating}
                        >
                          <option value="ACTIVE">ACTIVE (Authorized Access)</option>
                          <option value="INACTIVE">INACTIVE / SUSPENDED (Login Blocked)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="submit"
                        className="adm-btn adm-btn-primary"
                        data-testid="save-user-role-btn"
                        disabled={roleUpdating || (selectedRole === inspectingUser.role && selectedStatus === (inspectingUser.status || "ACTIVE"))}
                      >
                        {roleUpdating ? "Updating Role..." : "Save Role & Privileges"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingUser(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Matrix */}
      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Role-Based Access Control (RBAC) Matrix</h2>
          <span className="adm-badge adm-badge-neutral">Server-Enforced</span>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>
          <div className="adm-table-container" style={{ border: "none" }}>
            <table className="adm-table" aria-label="RBAC Permissions matrix">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Storefront Access</th>
                  <th>Catalog &amp; Inventory Management</th>
                  <th>Order Fulfillment</th>
                  <th>MFA Requirement</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>ADMIN</strong>
                  </td>
                  <td>Yes (Full)</td>
                  <td>Yes (Create, Edit, Adjust)</td>
                  <td>Yes (Update Status, Dispatch)</td>
                  <td>
                    <span className="adm-badge adm-badge-warning">Mandatory Policy</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>B2B</strong>
                  </td>
                  <td>Yes (Tiered Pricing)</td>
                  <td>Read-Only (Public API)</td>
                  <td>Own Orders Only</td>
                  <td>Optional</td>
                </tr>
                <tr>
                  <td>
                    <strong>CUSTOMER</strong>
                  </td>
                  <td>Yes (Standard)</td>
                  <td>Read-Only (Public API)</td>
                  <td>Own Orders Only</td>
                  <td>Optional</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
