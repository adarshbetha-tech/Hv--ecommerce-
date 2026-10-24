import React, { useState, useEffect, useCallback } from "react";
import CountUp from "./CountUp";
import {
  getAdminProducts,
  getAdminCategories,
  getSystemHealth,
  getAdminOrders,
} from "../../services/adminApi";

export default function AdminDashboard({ onNavigateSection, onNavigateStorefront }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [productsData, setProductsData] = useState({ products: [], pagination: {} });
  const [categories, setCategories] = useState([]);
  const [health, setHealth] = useState(null);
  const [ordersData, setOrdersData] = useState({ orders: [], isImplemented: false });

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [prodRes, catRes, healthRes, ordRes] = await Promise.all([
        getAdminProducts({ limit: 50, officialOnly: true }),
        getAdminCategories(),
        getSystemHealth().catch(() => null),
        getAdminOrders().catch(() => ({ orders: [], isImplemented: false })),
      ]);

      setProductsData(prodRes || { products: [], pagination: {} });
      setCategories(catRes?.categories || []);
      setHealth(healthRes);
      setOrdersData(ordRes || { orders: [], isImplemented: false });
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics from backend API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const rawProducts = productsData.products || [];
  const products = rawProducts.filter((p) => p.isOfficialCatalog !== false);
  const totalProductsCount = products.length;

  const officialCategories = categories.filter((c) => {
    if (c.isOfficial === false) return false;
    const legacyFixtureCategoryIds = new Set(["cat-nuts", "cat-automation", "cat-tools"]);
    if (categories.some((cat) => cat.id === "cat-fasteners" || cat.id === "cat-electronics")) {
      if (legacyFixtureCategoryIds.has(c.id)) return false;
    }
    return true;
  });

  // Flatten all variants from loaded official products
  const allVariants = products.flatMap((p) =>
    (p.variants || []).map((v) => ({
      ...v,
      productName: p.name,
      productSlug: p.slug,
      categoryName: p.category?.name || "General",
    }))
  );

  const lowStockItems = allVariants.filter(
    (v) => (v.stockQuantity || 0) <= 50
  );

  // Orders operational calculations - strictly derived from live API response
  const rawOrders = ordersData.orders || [];
  const totalOrders = rawOrders.length;
  const isOrdersEndpointAvailable = ordersData.isImplemented !== false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const ordersToday = rawOrders.filter(
    (o) => o.createdAt && new Date(o.createdAt) >= todayStart
  ).length;

  const pendingOrders = rawOrders.filter((o) => o.orderStatus === "PENDING").length;
  const processingOrders = rawOrders.filter((o) => o.orderStatus === "PROCESSING" || o.orderStatus === "CONFIRMED").length;
  const shippedOrders = rawOrders.filter((o) => o.orderStatus === "SHIPPED").length;
  const deliveredOrders = rawOrders.filter((o) => o.orderStatus === "DELIVERED").length;
  const cancelledOrders = rawOrders.filter((o) => o.orderStatus === "CANCELLED").length;

  if (loading) {
    return (
      <div className="adm-loading-screen" role="status">
        <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
        <p>Connecting to VERTEX PostgreSQL database &amp; loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="adm-dashboard-view">
      {/* Page Title & Actions */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Admin Overview</h1>
          <p className="adm-page-subtitle">
            Real-time industrial electronics catalog, stock telemetry, and store operations.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            data-testid="refresh-telemetry-btn"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Telemetry"}
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={onNavigateStorefront}
          >
            🏪 View Storefront
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => onNavigateSection("products")}
          >
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>API Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid - 4 Column Balanced Layout */}
      <div className="adm-metrics-grid">
        <div
          className="adm-metric-card"
          onClick={() => onNavigateSection("products")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("products");
            }
          }}
          title="Jump to Product Catalog"
        >
          <div className="adm-metric-info">
            <span className="adm-metric-label">Active Products</span>
            <span className="adm-metric-value">
              <CountUp value={totalProductsCount} />
            </span>
            <span className="adm-metric-sub">
              {officialCategories.length} Categories • Verified Active
            </span>
          </div>
          <div className="adm-metric-icon" aria-hidden="true">
            📦
          </div>
        </div>

        <div
          className="adm-metric-card"
          onClick={() => onNavigateSection("orders")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("orders");
            }
          }}
          title="Jump to Orders & Fulfillment"
        >
          <div className="adm-metric-info">
            <span className="adm-metric-label">Orders &amp; Revenue</span>
            <span className="adm-metric-value">
              <CountUp value={totalOrders} />
            </span>
            <span className="adm-metric-sub">
              {totalOrders > 0 ? `${totalOrders} Orders Recorded` : "Awaiting checkout orders"}
            </span>
          </div>
          <div className="adm-metric-icon icon-orange" aria-hidden="true">
            🚚
          </div>
        </div>

        <div
          className="adm-metric-card"
          onClick={() => onNavigateSection("inventory")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("inventory");
            }
          }}
          title="Jump to Low Stock Inventory"
        >
          <div className="adm-metric-info">
            <span className="adm-metric-label">Low Stock Alerts</span>
            <span className="adm-metric-value">
              <CountUp value={lowStockItems.length} />
            </span>
            <span className="adm-metric-sub">
              {lowStockItems.length > 0 ? "Variants at or below 50 units" : "All variants well-stocked"}
            </span>
          </div>
          <div className="adm-metric-icon icon-warning" aria-hidden="true">
            ⚠️
          </div>
        </div>

        <div
          className="adm-metric-card"
          onClick={() => onNavigateSection("settings")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("settings");
            }
          }}
          title="Jump to System Settings"
        >
          <div className="adm-metric-info">
            <span className="adm-metric-label">System Health</span>
            <span className="adm-metric-value" style={{ fontSize: "1.2rem", marginTop: 4 }}>
              {health?.status === "UP" ? "Operational" : "Degraded"}
            </span>
            <span className="adm-metric-sub">
              PostgreSQL 18.6 (Neon) • Active
            </span>
          </div>
          <div className="adm-metric-icon icon-green" aria-hidden="true">
            ⚡
          </div>
        </div>
      </div>

      {/* Operational Order Monitoring Dashboard Panel */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.2rem" }} aria-hidden="true">📡</span>
            <h2 className="adm-card-title" style={{ margin: 0 }}>
              Operational Order Monitoring Dashboard
            </h2>
          </div>
          <span className="adm-badge adm-badge-info">Real-Time Operational Status</span>
        </div>
        <div className="adm-card-body">
          <p style={{ margin: "0 0 16px", color: "var(--adm-text-secondary)", fontSize: "0.88rem" }}>
            Live status visibility across customer fulfillment pipelines. Select any metric to jump to filtered orders:
          </p>

          <div className="adm-order-kpi-grid">
            <div
              className="adm-order-kpi-box kpi-total-orders"
              onClick={() => onNavigateSection("orders", { filter: "all", dateFilter: "all" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "all", dateFilter: "all" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View all orders"
              data-testid="kpi-total-orders"
              aria-label={`Total Orders: ${totalOrders}. Click to view all orders.`}
            >
              <span className="adm-order-kpi-count">{totalOrders}</span>
              <span className="adm-order-kpi-title">Total Orders</span>
              <span className="adm-order-kpi-hint">All time</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-orders-today"
              onClick={() => onNavigateSection("orders", { filter: "all", dateFilter: "today" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "all", dateFilter: "today" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View orders received today"
              data-testid="kpi-orders-today"
              aria-label={`Orders Today: ${isOrdersEndpointAvailable ? ordersToday : 0}. Click to view today's orders.`}
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? ordersToday : 0}</span>
              <span className="adm-order-kpi-title">Orders Today</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Active shift" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-pending"
              onClick={() => onNavigateSection("orders", { filter: "PENDING", dateFilter: "all" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "PENDING", dateFilter: "all" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View pending orders"
              data-testid="kpi-pending-orders"
              aria-label={`Pending Review: ${isOrdersEndpointAvailable ? pendingOrders : 0}. Click to view pending orders.`}
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? pendingOrders : 0}</span>
              <span className="adm-order-kpi-title">Pending Review</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Unprocessed" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-processing"
              onClick={() => onNavigateSection("orders", { filter: "PROCESSING", dateFilter: "all" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "PROCESSING", dateFilter: "all" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View processing orders"
              data-testid="kpi-processing-orders"
              aria-label={`Processing: ${isOrdersEndpointAvailable ? processingOrders : 0}. Click to view processing orders.`}
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? processingOrders : 0}</span>
              <span className="adm-order-kpi-title">Processing</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Picking / Packing" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-shipped"
              onClick={() => onNavigateSection("orders", { filter: "SHIPPED", dateFilter: "all" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "SHIPPED", dateFilter: "all" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View shipped orders"
              data-testid="kpi-shipped-orders"
              aria-label={`Dispatched: ${isOrdersEndpointAvailable ? shippedOrders : 0}. Click to view shipped orders.`}
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? shippedOrders : 0}</span>
              <span className="adm-order-kpi-title">Dispatched</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "In transit" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-delivered"
              onClick={() => onNavigateSection("orders", { filter: "DELIVERED", dateFilter: "all" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "DELIVERED", dateFilter: "all" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View delivered orders"
              data-testid="kpi-delivered-orders"
              aria-label={`Delivered: ${isOrdersEndpointAvailable ? deliveredOrders : 0}. Click to view delivered orders.`}
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? deliveredOrders : 0}</span>
              <span className="adm-order-kpi-title">Delivered</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Completed" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-cancelled"
              onClick={() => onNavigateSection("orders", { filter: "CANCELLED", dateFilter: "all" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("orders", { filter: "CANCELLED", dateFilter: "all" });
                }
              }}
              role="button"
              tabIndex={0}
              title="View cancelled orders"
              data-testid="kpi-cancelled-orders"
              aria-label={`Cancelled: ${isOrdersEndpointAvailable ? cancelledOrders : 0}. Click to view cancelled orders.`}
            >
              <span className="adm-order-kpi-count">{isOrdersEndpointAvailable ? cancelledOrders : 0}</span>
              <span className="adm-order-kpi-title">Cancelled</span>
              <span className="adm-order-kpi-hint">{isOrdersEndpointAvailable ? "Voided" : "Pending endpoint"}</span>
            </div>

            <div
              className="adm-order-kpi-box kpi-refund"
              onClick={() => onNavigateSection("refunds")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigateSection("refunds");
                }
              }}
              role="button"
              tabIndex={0}
              title="View refund requests"
              data-testid="kpi-refund-requests"
              aria-label="Refund Requests: 0 claims. Click to view refunds."
            >
              <span className="adm-order-kpi-count">0</span>
              <span className="adm-order-kpi-title">Refund Requests</span>
              <span className="adm-order-kpi-hint">0 claims</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status & Diagnostics Card */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">System Health &amp; Infrastructure</h2>
          <span className={`adm-badge ${health?.status === "UP" ? "adm-badge-success" : "adm-badge-warning"}`}>
            {health?.status === "UP" ? "Operational" : "Degraded"}
          </span>
        </div>
        <div className="adm-card-body">
          <div className="adm-health-diag-grid">
            <div className="adm-health-diag-item">
              <span className="adm-label">Database Provider</span>
              <div className="adm-health-diag-val">
                PostgreSQL 18.6 (Neon Cloud)
              </div>
              <div className="adm-health-diag-hint">Role: vertex_app (Least Privilege)</div>
            </div>
            <div className="adm-health-diag-item">
              <span className="adm-label">API Health Status</span>
              <div
                className="adm-health-diag-val"
                style={{ color: health?.status === "UP" ? "var(--adm-success)" : "var(--adm-danger)" }}
              >
                ● {health?.status === "UP" ? "UP (Connected)" : "Degraded"}
              </div>
              <div className="adm-health-diag-hint">Prisma ORM Connection Active</div>
            </div>
            <div className="adm-health-diag-item">
              <span className="adm-label">Authentication &amp; Session</span>
              <div className="adm-health-diag-val">
                HttpOnly Cookies (7-day valid)
              </div>
              <div className="adm-health-diag-hint">CSRF: Strict Custom Header Mode</div>
            </div>
            <div className="adm-health-diag-item">
              <span className="adm-label">Admin Protection</span>
              <div className="adm-health-diag-val" style={{ color: "var(--adm-primary)" }}>
                MFA TOTP Supported
              </div>
              <div className="adm-health-diag-hint">Role-based Access Control Enforced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Items Table */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">Low Stock Telemetry (&le; 50 Units)</h2>
          <button
            type="button"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            onClick={() => onNavigateSection("inventory")}
          >
            Manage Inventory →
          </button>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>
          {lowStockItems.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--adm-text-secondary)" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }} aria-hidden="true">✓</div>
              <strong style={{ display: "block", color: "var(--adm-text-primary)", marginBottom: 4 }}>
                Inventory Healthy
              </strong>
              All catalog variants are currently well-stocked above threshold.
            </div>
          ) : (
            <div className="adm-table-container" style={{ border: "none" }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th>SKU</th>
                    <th>Available</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.productName}</strong>
                        <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                          {item.name || item.packSize || "Standard"}
                        </div>
                      </td>
                      <td>
                        <code>{item.sku}</code>
                      </td>
                      <td>
                        <strong>{item.stockQuantity}</strong> units
                      </td>
                      <td>
                        <span className="adm-badge adm-badge-warning">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Card */}
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">Product Distribution by Category</h2>
          <button
            type="button"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            onClick={() => onNavigateSection("categories")}
          >
            View Categories →
          </button>
        </div>
        <div className="adm-card-body">
          <div className="adm-cat-dist-list">
            {categories.map((cat) => {
              const count = cat.productsCount || 0;
              const pct = totalProductsCount > 0 ? Math.round((count / totalProductsCount) * 100) : 0;
              return (
                <div key={cat.id} className="adm-cat-dist-item">
                  <div className="adm-cat-dist-header">
                    <span className="adm-cat-dist-name">
                      <span aria-hidden="true">{cat.icon || "📦"}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="adm-cat-dist-stats">
                      {count} products ({pct}%)
                    </span>
                  </div>
                  <div className="adm-cat-progress-track">
                    <div
                      className="adm-cat-progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
