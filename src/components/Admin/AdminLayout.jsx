import React, { useState, useEffect, useCallback } from "react";
import { verifyAdminAuthorization, getSystemHealth } from "../../services/adminApi";
import { logoutUser, getCurrentUser } from "../../services/authApi";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminDashboard from "./AdminDashboard";
import AdminProducts from "./AdminProducts";
import AdminCategories from "./AdminCategories";
import AdminInventory from "./AdminInventory";
import AdminOrders from "./AdminOrders";
import AdminPayments from "./AdminPayments";
import AdminQuotes from "./AdminQuotes";
import AdminDiscounts from "./AdminDiscounts";
import AdminRefunds from "./AdminRefunds";
import AdminReviews from "./AdminReviews";
import AdminCustomers from "./AdminCustomers";
import AdminNewsletter from "./AdminNewsletter";
import AdminReports from "./AdminReports";
import AdminUsers from "./AdminUsers";
import AdminSettings from "./AdminSettings";
import AdminAuditLogs from "./AdminAuditLogs";
import AdminUnauthorized from "./AdminUnauthorized";
import "./AdminPortal.css";

export default function AdminLayout({
  onNavigateHome,
  onNavigateLogin,
  initialSection = "dashboard",
  currentUser = null,
}) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Theme Management (Default, Dark, Light) with Safe Browser Persistence
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("vertex_admin_theme") || "default";
      }
    } catch {
      // ignore
    }
    return "default";
  });

  const handleThemeChange = (newTheme) => {
    setAdminTheme(newTheme);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vertex_admin_theme", newTheme);
      }
    } catch {
      // ignore
    }
  };

  // Authentication & Authorization state
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(currentUser);
  const [authError, setAuthError] = useState(null);

  // Health telemetry
  const [healthStatus, setHealthStatus] = useState(null);

  const checkAuthorization = useCallback(async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);

      // 1. Verify server-side authorization check (calls GET /api/auth/admin-check)
      const authRes = await verifyAdminAuthorization();
      setAdminUser(authRes?.user || null);

      // 2. Fetch server and database health
      const health = await getSystemHealth().catch(() => null);
      setHealthStatus(health);
    } catch (err) {
      const status = err.status || 401;

      // 401 Unauthenticated: user is logged out.
      // Automatically redirect to the shared login page, preserving intended destination.
      if (status === 401 && typeof onNavigateLogin === "function") {
        const destination =
          typeof window !== "undefined" && window.location.pathname.startsWith("/admin")
            ? window.location.pathname + window.location.search
            : "/admin";
        onNavigateLogin(destination);
      }

      // If 403 Forbidden and user profile not yet loaded, safely resolve current customer identity for the screen
      if (status === 403) {
        try {
          const res = getCurrentUser?.();
          if (res && typeof res.then === "function") {
            res.then((data) => {
              if (data?.user) setAdminUser(data.user);
            }).catch(() => {});
          }
        } catch {
          // ignore
        }
      }

      setAuthError({
        status,
        message: err.message || "Admin authorization check failed.",
      });
    } finally {
      setAuthLoading(false);
    }
  }, [onNavigateLogin]);

  useEffect(() => {
    checkAuthorization();
  }, [checkAuthorization, currentUser]);

  const [sectionParams, setSectionParams] = useState(null);

  // Handle URL sync
  const handleSelectSection = (sectionId, params = null) => {
    setActiveSection(sectionId);
    if (sectionId === "orders") {
      setSectionParams(params);
    } else {
      setSectionParams(null);
    }
    const targetUrl = sectionId === "dashboard" ? "/admin" : `/admin/${sectionId}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, "", targetUrl);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignored
    }
    onNavigateLogin();
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div
        className="adm-shell"
        data-admin-theme={adminTheme}
        style={{
          alignItems: "center",
          justifyContent: "center",
          background: "var(--adm-sidebar-bg)",
          color: "#ffffff",
        }}
        role="status"
      >
        <div style={{ textAlign: "center" }}>
          <span
            className="adm-spinner"
            style={{ width: 36, height: 36, borderWidth: 3, marginBottom: 16 }}
            aria-hidden="true"
          />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 6px" }}>
            Verifying Admin Authorization
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
            Validating session cookie and server-side RBAC permissions...
          </p>
        </div>
      </div>
    );
  }

  // Access Denied / Unauthorized Screen
  if (authError) {
    return (
      <AdminUnauthorized
        errorStatus={authError.status}
        errorMessage={authError.message}
        currentUser={currentUser || adminUser}
        onNavigateLogin={() => (typeof onNavigateLogin === "function" ? onNavigateLogin("/admin") : null)}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  // Render Admin Shell
  return (
    <div className="adm-shell" data-admin-theme={adminTheme}>
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigateStorefront={onNavigateHome}
        healthStatus={healthStatus}
      />

      <div className="adm-main">
        <AdminHeader
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          onOpenMobile={() => setMobileOpen(true)}
          currentUser={adminUser}
          onLogout={handleLogout}
          healthStatus={healthStatus}
          adminTheme={adminTheme}
          onThemeChange={handleThemeChange}
        />

        <main className="adm-content" id="admin-main-content">
          {activeSection === "dashboard" && (
            <AdminDashboard
              onNavigateSection={handleSelectSection}
              onNavigateStorefront={onNavigateHome}
            />
          )}
          {activeSection === "products" && <AdminProducts />}
          {activeSection === "categories" && <AdminCategories />}
          {activeSection === "inventory" && <AdminInventory />}
          {activeSection === "orders" && (
            <AdminOrders
              initialFilter={sectionParams?.filter || (typeof sectionParams === "string" ? sectionParams : "all")}
              initialDateFilter={sectionParams?.dateFilter || (typeof sectionParams === "string" && sectionParams.toLowerCase() === "today" ? "today" : "all")}
            />
          )}
          {activeSection === "payments" && (
            <AdminPayments onNavigateOrders={(filter) => handleSelectSection("orders", filter)} />
          )}
          {activeSection === "quotes" && <AdminQuotes />}
          {activeSection === "discounts" && <AdminDiscounts />}
          {activeSection === "refunds" && (
            <AdminRefunds onNavigateOrders={() => handleSelectSection("orders")} />
          )}
          {activeSection === "reviews" && <AdminReviews />}
          {activeSection === "customers" && (
            <AdminCustomers currentAdminUser={adminUser} />
          )}
          {activeSection === "newsletter" && <AdminNewsletter />}
          {activeSection === "reports" && <AdminReports />}
          {activeSection === "users" && (
            <AdminUsers currentAdminUser={adminUser} />
          )}
          {activeSection === "settings" && (
            <AdminSettings
              healthStatus={healthStatus}
              currentAdminUser={adminUser}
              adminTheme={adminTheme}
              onThemeChange={handleThemeChange}
            />
          )}
          {activeSection === "audit-logs" && <AdminAuditLogs />}
        </main>
      </div>
    </div>
  );
}
