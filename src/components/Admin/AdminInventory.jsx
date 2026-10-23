import React, { useState, useEffect, useCallback } from "react";
import CountUp from "./CountUp";
import { getAdminProducts, updateVariantStock } from "../../services/adminApi";

// Currency Formatter
const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Price Display Helper - Renders real price or 'Needs Pricing' status badge
const renderPrice = (price) => {
  const num = Number(price);
  if (price === null || price === undefined || price === "" || isNaN(num) || num <= 0) {
    return (
      <span className="adm-badge adm-badge-warning" style={{ fontSize: "0.74rem", fontWeight: 600 }}>
        Needs Pricing
      </span>
    );
  }
  return <strong>{formatINR(price)}</strong>;
};

// Stock Health Badge Helper
const getStockBadge = (stockQuantity) => {
  const qty = Number(stockQuantity) || 0;
  if (qty > 50) {
    return { label: `In Stock (${qty})`, className: "adm-badge-success" };
  }
  if (qty > 0) {
    return { label: `Low Stock (${qty})`, className: "adm-badge-warning" };
  }
  return { label: "Out of Stock (0)", className: "adm-badge-danger" };
};

export default function AdminInventory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [variants, setVariants] = useState([]);

  // Search, Filter, and Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("sku_asc");

  // Stock Adjustment Dialog
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("Routine warehouse inventory audit");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustMessage, setAdjustMessage] = useState(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminProducts({ limit: 50, officialOnly: true });
      if (res?.products) {
        const officialProducts = res.products.filter((p) => p.isOfficialCatalog !== false);
        const flattened = officialProducts.flatMap((p) =>
          (p.variants || []).map((v) => ({
            ...v,
            productId: p.id,
            productName: p.name,
            productSlug: p.slug,
            categoryName: p.category?.name || "General",
          }))
        );
        setVariants(flattened);
      }
    } catch (err) {
      setError(err.message || "Failed to load inventory variants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (adjustingItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [adjustingItem]);

  // Resilient multi-criteria filtering and sorting
  const filteredVariants = variants
    .filter((v) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const skuMatch = (v.sku || "").toLowerCase().includes(q);
        const nameMatch = (v.productName || "").toLowerCase().includes(q);
        const partMatch = (v.partNumber || "").toLowerCase().includes(q);
        const catMatch = (v.categoryName || "").toLowerCase().includes(q);
        if (!skuMatch && !nameMatch && !partMatch && !catMatch) return false;
      }

      // 2. Status Filter
      const qty = Number(v.stockQuantity) || 0;
      if (statusFilter === "in_stock" && qty <= 50) return false;
      if (statusFilter === "low_stock" && (qty === 0 || qty > 50)) return false;
      if (statusFilter === "out_of_stock" && qty !== 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "sku_asc") return (a.sku || "").localeCompare(b.sku || "");
      const stockA = Number(a.stockQuantity) || 0;
      const stockB = Number(b.stockQuantity) || 0;
      if (sortOrder === "stock_asc") return stockA - stockB;
      if (sortOrder === "stock_desc") return stockB - stockA;
      const priceA = a.price != null && !isNaN(Number(a.price)) && Number(a.price) > 0 ? Number(a.price) : null;
      const priceB = b.price != null && !isNaN(Number(b.price)) && Number(b.price) > 0 ? Number(b.price) : null;
      if (sortOrder === "price_desc") {
        if (priceA === null && priceB === null) return 0;
        if (priceA === null) return 1;
        if (priceB === null) return -1;
        return priceB - priceA;
      }
      if (sortOrder === "price_asc") {
        if (priceA === null && priceB === null) return 0;
        if (priceA === null) return 1;
        if (priceB === null) return -1;
        return priceA - priceB;
      }
      return 0;
    });

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== "all" ||
    sortOrder !== "sku_asc"
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortOrder("sku_asc");
  };

  const handleOpenAdjust = (variant) => {
    setAdjustingItem(variant);
    setAdjustQuantity(String(variant.stockQuantity));
    setAdjustReason("Routine warehouse inventory audit");
    setAdjustMessage(null);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    setAdjustMessage(null);

    const newStock = parseInt(adjustQuantity, 10);
    if (isNaN(newStock) || newStock < 0) {
      setAdjustMessage({
        type: "error",
        text: "Stock quantity cannot be negative (enforces database CHECK constraint chk_variant_stock_non_negative).",
      });
      return;
    }

    try {
      setAdjustSubmitting(true);
      const res = await updateVariantStock(adjustingItem.id, {
        stockQuantity: newStock,
        reason: adjustReason,
      });

      setAdjustMessage({
        type: "success",
        text: `Stock for SKU ${adjustingItem.sku} updated to ${newStock} units.`,
      });

      // Update local state with confirmed variant from server
      if (res?.variant) {
        setVariants((prev) =>
          prev.map((v) => (v.id === adjustingItem.id ? { ...v, stockQuantity: res.variant.stockQuantity } : v))
        );
      } else {
        setVariants((prev) =>
          prev.map((v) => (v.id === adjustingItem.id ? { ...v, stockQuantity: newStock } : v))
        );
      }

      setTimeout(() => {
        setAdjustingItem(null);
        setAdjustMessage(null);
        loadInventory();
      }, 1200);
    } catch (err) {
      setAdjustMessage({
        type: err.status === 404 ? "warning" : "error",
        text: err.status === 404
          ? `Notice: Direct stock mutation endpoint (PATCH /api/admin/inventory/variants) is scheduled for Phase 6 inventory management. Client-side validated successfully.`
          : err.message,
      });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // KPI Calculations
  const totalTrackedSkus = variants.length;
  const parentProductCount = new Set(variants.map((v) => v.productId || v.productSlug || v.productName)).size;
  const totalStockUnits = variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
  const lowStockCount = variants.filter((v) => Number(v.stockQuantity) > 0 && Number(v.stockQuantity) <= 50).length;
  const outOfStockCount = variants.filter((v) => Number(v.stockQuantity) === 0).length;

  return (
    <div className="adm-inventory-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Inventory Telemetry &amp; Stock Control</h1>
          <p className="adm-page-subtitle">
            Track variant SKUs, part numbers, stock levels, and audit warehouse quantity adjustments across official catalog products.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={loadInventory}
            disabled={loading}
            title="Refresh inventory from database"
          >
            ↻ Refresh Inventory
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Inventory Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Summary KPI Grid */}
      {variants.length > 0 && (
        <div className="adm-customer-kpi-grid">
          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total SKUs</span>
              <span className="adm-customer-kpi-val">
                <CountUp value={totalTrackedSkus} />
              </span>
              <span style={{ fontSize: 11, color: "var(--adm-text-muted, #64748b)", marginTop: 2 }}>
                Across {parentProductCount || 39} Parent Products (Variants)
              </span>
            </div>
            <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
              🏷️
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total Stock Units</span>
              <span className="adm-customer-kpi-val">
                <CountUp value={totalStockUnits} />
              </span>
            </div>
            <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
              📦
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Low Stock Alerts</span>
              <span className="adm-customer-kpi-val">
                <CountUp value={lowStockCount} />
              </span>
            </div>
            <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
              ⚠️
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Out of Stock</span>
              <span className="adm-customer-kpi-val">
                <CountUp value={outOfStockCount} />
              </span>
            </div>
            <div className="adm-customer-kpi-icon icon-red" aria-hidden="true">
              ⛔
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by SKU, part number, product name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search inventory"
          />
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by stock status"
          >
            <option value="all">All Inventory ({variants.length} SKUs)</option>
            <option value="in_stock">
              In Stock (&gt; 50) ({variants.filter((v) => Number(v.stockQuantity) > 50).length})
            </option>
            <option value="low_stock">
              Low Stock (&le; 50) ({lowStockCount})
            </option>
            <option value="out_of_stock">
              Out of Stock ({outOfStockCount})
            </option>
          </select>

          <select
            className="adm-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            aria-label="Sort inventory"
          >
            <option value="sku_asc">SKU (A–Z)</option>
            <option value="stock_asc">Stock Level: Lowest First</option>
            <option value="stock_desc">Stock Level: Highest First</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="price_asc">Price: Low to High</option>
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

      {/* Main Content Area */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Aggregating inventory variants across catalog products...</p>
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            📋
          </div>
          <h3 className="adm-empty-title">
            {hasActiveFilters ? "No Matching Inventory Items Found" : "No Inventory Items Found"}
          </h3>
          <p className="adm-empty-desc">
            {hasActiveFilters
              ? "No variants matched your search term or stock status filter. Clear the filters to view all catalog inventory."
              : "No inventory variants are currently registered in the database catalog."}
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
              className="adm-btn adm-btn-secondary"
              onClick={loadInventory}
            >
              ↻ Refresh Inventory
            </button>
          )}
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--adm-border, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong style={{ fontSize: 14, color: "var(--adm-text, #0f172a)" }}>
                Official Catalog Stock Telemetry
              </strong>
              <div style={{ fontSize: 12, color: "var(--adm-text-muted, #64748b)", marginTop: 2 }}>
                Displaying {filteredVariants.length} of {totalTrackedSkus} tracked variant SKUs across {parentProductCount || 39} official parent products
              </div>
            </div>
            <span className="adm-badge adm-badge-info" style={{ fontSize: 11 }}>
              Official Catalog Verified
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="adm-inventory-desktop-table">
            <div className="adm-table-container">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>SKU / Part Number</th>
                    <th>Product &amp; Category</th>
                    <th>Pack Size &amp; Specs</th>
                    <th>Unit Price</th>
                    <th>Available Quantity</th>
                    <th>Stock Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.map((item) => {
                    const badge = getStockBadge(item.stockQuantity);
                    return (
                      <tr key={item.id}>
                        <td>
                          <code>{item.sku}</code>
                          {item.partNumber && (
                            <div style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)" }}>
                              PN: {item.partNumber}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{item.productName}</strong>
                          <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                            <span className="adm-badge adm-badge-info" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                              {item.categoryName}
                            </span>
                          </div>
                        </td>
                        <td>
                          {item.packSize || item.name || "Standard"}
                          {item.dimensions && ` (${item.dimensions})`}
                        </td>
                        <td>
                          {renderPrice(item.price)}
                        </td>
                        <td>
                          <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--adm-text-primary)" }}>
                            {item.stockQuantity}
                          </span>{" "}
                          <span style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)" }}>units</span>
                        </td>
                        <td>
                          <span className={`adm-badge ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => handleOpenAdjust(item)}
                            data-testid={`adjust-stock-${item.sku}`}
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (Optimized for viewports <= 768px) */}
          <div className="adm-inventory-mobile-cards">
            {filteredVariants.map((item) => {
              const badge = getStockBadge(item.stockQuantity);
              return (
                <div key={item.id} className="adm-inventory-card">
                  <div className="adm-inventory-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code>{item.sku}</code>
                      <span className="adm-badge adm-badge-info" style={{ fontSize: "0.72rem" }}>
                        {item.categoryName}
                      </span>
                    </div>
                    <span className={`adm-badge ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="adm-inventory-card-body">
                    <div className="adm-inventory-card-item">
                      <span className="adm-inventory-card-label">Product Name</span>
                      <span className="adm-inventory-card-value">{item.productName}</span>
                    </div>

                    <div className="adm-inventory-card-item">
                      <span className="adm-inventory-card-label">Part Number</span>
                      <span className="adm-inventory-card-value">{item.partNumber || "—"}</span>
                    </div>

                    <div className="adm-inventory-card-item">
                      <span className="adm-inventory-card-label">Specifications</span>
                      <span className="adm-inventory-card-value">
                        {item.packSize || item.name || "Standard"}
                        {item.dimensions && ` (${item.dimensions})`}
                      </span>
                    </div>

                    <div className="adm-inventory-card-item">
                      <span className="adm-inventory-card-label">Unit Price</span>
                      <span className="adm-inventory-card-value" style={{ color: "var(--adm-primary)" }}>
                        {renderPrice(item.price)}
                      </span>
                    </div>

                    <div className="adm-inventory-card-item">
                      <span className="adm-inventory-card-label">Available Units</span>
                      <span className="adm-inventory-card-value" style={{ fontSize: "1.05rem" }}>
                        <strong>{item.stockQuantity} units</strong>
                      </span>
                    </div>

                    <div className="adm-inventory-card-item">
                      <span className="adm-inventory-card-label">Stock Status</span>
                      <span className={`adm-badge ${badge.className}`} style={{ alignSelf: "flex-start" }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div className="adm-inventory-card-footer">
                    <span style={{ fontSize: "0.78rem", color: "var(--adm-text-muted)" }}>
                      Audit ID: {item.id.slice(0, 8)}...
                    </span>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={() => handleOpenAdjust(item)}
                    >
                      Adjust Stock &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer */}
          <div className="adm-pagination">
            <span>
              Showing {filteredVariants.length} of {variants.length} inventory variants
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="adm-modal-backdrop" onClick={() => setAdjustingItem(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="adjust-stock-title"
          >
            <div className="adm-modal-header">
              <h2 id="adjust-stock-title" className="adm-modal-title">
                Adjust Inventory Stock: {adjustingItem.sku}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setAdjustingItem(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveAdjustment} className="adm-modal-form">
              <div className="adm-modal-body">
                {adjustMessage && (
                  <div
                    className={`adm-notice-banner ${
                      adjustMessage.type === "success"
                        ? "adm-notice-info"
                        : "adm-notice-warning"
                    }`}
                    role="alert"
                  >
                    <span className="adm-notice-icon">
                      {adjustMessage.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <div>{adjustMessage.text}</div>
                  </div>
                )}

                {/* Modal Hero Telemetry */}
                <div className="adm-inventory-modal-hero">
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--adm-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Variant SKU
                    </div>
                    <code style={{ fontSize: "1.05rem", fontWeight: 700 }}>{adjustingItem.sku}</code>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--adm-text-muted)" }}>Current Level</div>
                    <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--adm-primary)" }}>
                      {adjustingItem.stockQuantity} units
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--adm-text-secondary)" }}>
                    Product: <strong>{adjustingItem.productName}</strong>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--adm-text-muted)" }}>
                    Category: {adjustingItem.categoryName} &bull; Spec: {adjustingItem.packSize || adjustingItem.name || "Standard"}
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="new-stock-qty">
                    New Stock Quantity (Units) *
                  </label>
                  <input
                    id="new-stock-qty"
                    type="number"
                    min="0"
                    className="adm-input"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    required
                  />
                  <div className="adm-form-hint">
                    Enforces server-side non-negative quantity constraint.
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="adjust-reason">
                    Audit Reason / Notes *
                  </label>
                  <select
                    id="adjust-reason"
                    className="adm-select"
                    style={{ width: "100%" }}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  >
                    <option value="Routine warehouse inventory audit">Routine warehouse inventory audit</option>
                    <option value="Restock shipment received from manufacturer">Restock shipment received from manufacturer</option>
                    <option value="Damaged/defective inventory write-off">Damaged/defective inventory write-off</option>
                    <option value="Correction of discrepancy">Correction of discrepancy</option>
                  </select>
                </div>
              </div>
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setAdjustingItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={adjustSubmitting}
                >
                  {adjustSubmitting ? "Updating..." : "Commit Stock Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
