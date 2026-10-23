import React, { useState, useEffect, useCallback } from "react";
import {
  getAdminCategories,
  getAdminCategoryDetails,
  createAdminCategory,
  updateAdminCategory,
} from "../../services/adminApi";

// Currency Formatter
const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");

  // Expanded subcategories per parent category
  const [expandedCategories, setExpandedCategories] = useState(
    () => new Set(["cat-fasteners", "cat-electronics", "fasteners", "electronics"])
  );

  // Category inspection modal
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Add Category modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // Edit Category modal
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryForm, setEditCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "📁",
    tint: "tint-blue",
    parentId: "",
    isActive: true,
  });
  const [editModalSubmitting, setEditModalSubmitting] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState(null);

  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "⚙️",
    tint: "tint-blue",
    parentId: "",
  });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminCategories();
      if (res?.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      setError(err.message || "Failed to load categories from API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (isAddModalOpen || selectedCategorySlug || editingCategory) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddModalOpen, selectedCategorySlug, editingCategory]);

  const toggleExpandCategory = (cat) => {
    const idKey = typeof cat === "object" ? cat.id : cat;
    const slugKey = typeof cat === "object" ? cat.slug : cat;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      const isAlreadyExpanded = next.has(idKey) || next.has(slugKey);
      if (isAlreadyExpanded) {
        if (idKey) next.delete(idKey);
        if (slugKey) next.delete(slugKey);
      } else {
        if (idKey) next.add(idKey);
        if (slugKey) next.add(slugKey);
      }
      return next;
    });
  };

  const handleOpenEditCategory = (cat, defaultParentId = "") => {
    setEditingCategory(cat);
    setEditCategoryForm({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      icon: cat.icon || "📁",
      tint: cat.tint || "tint-blue",
      parentId: cat.parentId || defaultParentId || "",
      isActive: cat.isActive !== false,
    });
    setEditModalMessage(null);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    setEditModalMessage(null);

    if (!editCategoryForm.name.trim() || !editCategoryForm.slug.trim()) {
      setEditModalMessage({
        type: "error",
        text: "Please provide both category name and URL slug.",
      });
      return;
    }

    try {
      setEditModalSubmitting(true);
      await updateAdminCategory(editingCategory.id, editCategoryForm);
      setEditModalMessage({
        type: "success",
        text: `Category '${editCategoryForm.name}' updated successfully!`,
      });

      await loadCategories();

      setTimeout(() => {
        setEditingCategory(null);
        setEditModalMessage(null);
      }, 1000);
    } catch (err) {
      setEditModalMessage({
        type: "error",
        text: err.message || "Failed to update category.",
      });
    } finally {
      setEditModalSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
    const nextStatus = cat.isActive === false ? true : false;
    try {
      await updateAdminCategory(cat.id, { isActive: nextStatus });
      await loadCategories();
    } catch (err) {
      setError(err.message || "Failed to update category status.");
    }
  };

  const handleInspectCategory = async (slug) => {
    try {
      setSelectedCategorySlug(slug);
      setInspectLoading(true);
      const res = await getAdminCategoryDetails(slug);
      setInspectData(res);
    } catch (err) {
      setInspectData({ error: err.message });
    } finally {
      setInspectLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setModalMessage(null);

    if (!newCategory.name.trim() || !newCategory.slug.trim()) {
      setModalMessage({
        type: "error",
        text: "Please provide both category name and URL slug.",
      });
      return;
    }

    try {
      setModalSubmitting(true);
      const res = await createAdminCategory(newCategory);
      setModalMessage({
        type: "success",
        text: `Category '${res?.category?.name || newCategory.name}' created successfully!`,
      });

      // Reload categories from database to verify persistence
      await loadCategories();

      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewCategory({
          name: "",
          slug: "",
          description: "",
          icon: "⚙️",
          tint: "tint-blue",
          parentId: "",
        });
        setModalMessage(null);
      }, 1200);
    } catch (err) {
      setModalMessage({
        type: err.status === 404 ? "warning" : "error",
        text: err.status === 404
          ? "Notice: Category creation endpoint (POST /api/admin/categories) is scheduled for Phase 4 admin catalog mutation. Form validated successfully on the client."
          : err.message,
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const categoryPriority = {
    fasteners: 1,
    "cat-fasteners": 1,
    electronics: 2,
    "cat-electronics": 2,
  };

  // Resilient multi-criteria filtering & sorting (Fasteners 1st, Electronic Products 2nd)
  // Display only official top-level categories matching the approved PDF
  const filteredCategories = categories
    .filter((c) => {
      // 0. Only official top-level categories if isOfficial flag is present, or exclude legacy fixture categories
      if (c.isOfficial === false) return false;
      const legacyFixtureCategoryIds = new Set(["cat-nuts", "cat-automation", "cat-tools"]);
      if (categories.some((cat) => cat.id === "cat-fasteners" || cat.id === "cat-electronics")) {
        if (legacyFixtureCategoryIds.has(c.id)) return false;
      }

      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const slugMatch = (c.slug || "").toLowerCase().includes(q);
        const descMatch = (c.description || "").toLowerCase().includes(q);
        const subcatMatch = c.children?.some(
          (sub) =>
            (sub.name || "").toLowerCase().includes(q) ||
            (sub.slug || "").toLowerCase().includes(q)
        );
        if (!nameMatch && !slugMatch && !descMatch && !subcatMatch) return false;
      }

      // 2. Product count association filter
      const count = Number(c.productsCount || c._count?.products || 0);
      if (statusFilter === "with_products" && count === 0) return false;
      if (statusFilter === "empty" && count > 0) return false;
      if (statusFilter === "active" && c.isActive === false) return false;
      if (statusFilter === "inactive" && c.isActive !== false) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "default" || sortOrder === "name_asc") {
        const pA = categoryPriority[a.slug?.toLowerCase()] || categoryPriority[a.id] || 99;
        const pB = categoryPriority[b.slug?.toLowerCase()] || categoryPriority[b.id] || 99;
        if (pA !== pB) return pA - pB;
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortOrder === "name_desc") return (b.name || "").localeCompare(a.name || "");
      const countA = Number(a.productsCount || a._count?.products || 0);
      const countB = Number(b.productsCount || b._count?.products || 0);
      if (sortOrder === "products_desc") return countB - countA;
      if (sortOrder === "products_asc") return countA - countB;
      return 0;
    });

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== "all" ||
    (sortOrder !== "default" && sortOrder !== "name_asc")
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortOrder("default");
  };

  // Base official category set for summary metrics
  const displayedCategories = categories.filter((c) => {
    if (c.isOfficial === false) return false;
    const legacyFixtureCategoryIds = new Set(["cat-nuts", "cat-automation", "cat-tools"]);
    if (categories.some((cat) => cat.id === "cat-fasteners" || cat.id === "cat-electronics")) {
      if (legacyFixtureCategoryIds.has(c.id)) return false;
    }
    return true;
  });

  // Summary KPI Calculations reflecting the official catalog
  const totalCategoriesCount = displayedCategories.length;
  const activeClassificationsCount = displayedCategories.filter((c) => c.isActive !== false).length;
  const totalAssociatedProducts = displayedCategories.reduce(
    (acc, c) => acc + (Number(c.productsCount || c._count?.products) || 0),
    0
  );
  const topLevelTaxonomiesCount = displayedCategories.filter((c) => !c.parentId).length || displayedCategories.length;

  return (
    <div className="adm-categories-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Category Hierarchy Management</h1>
          <p className="adm-page-subtitle">
            Configure product classification, parent-child hierarchies, and catalog taxonomy.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadCategories()}
            disabled={loading}
            title="Refresh categories from database"
            data-testid="refresh-categories-btn"
          >
            ↻ Refresh Categories
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            data-testid="add-category-btn"
          >
            + Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Category Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Category Summary KPI Grid */}
      {categories.length > 0 && (
        <div className="adm-customer-kpi-grid">
          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total Categories</span>
              <span className="adm-customer-kpi-val">{totalCategoriesCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
              🗂️
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Active Classifications</span>
              <span className="adm-customer-kpi-val">{activeClassificationsCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-green" aria-hidden="true">
              ✓
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Associated Products</span>
              <span className="adm-customer-kpi-val">{totalAssociatedProducts}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
              📦
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Top-Level Taxonomies</span>
              <span className="adm-customer-kpi-val">{topLevelTaxonomiesCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
              🏷️
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
            placeholder="Search by category name, slug, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search categories"
          />
          {searchQuery && (
            <button
              type="button"
              className="adm-search-clear-btn"
              onClick={() => setSearchQuery("")}
              title="Clear search query"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by product association"
          >
            <option value="all">All Categories ({totalCategoriesCount})</option>
            <option value="with_products">With Assigned Products</option>
            <option value="empty">Empty Categories (0 Products)</option>
            <option value="active">Active Categories Only</option>
            <option value="inactive">Inactive Categories Only</option>
          </select>

          <select
            className="adm-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            aria-label="Sort categories"
          >
            <option value="default">Default (Fasteners 1st, Electronics 2nd)</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="products_desc">Products Count: High to Low</option>
            <option value="products_asc">Products Count: Low to High</option>
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
          <p>Loading categories from PostgreSQL...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            🗂️
          </div>
          <h3 className="adm-empty-title">
            {hasActiveFilters ? "No Matching Categories Found" : "No Categories Found"}
          </h3>
          <p className="adm-empty-desc">
            {hasActiveFilters
              ? "No product categories matched your search term or filter parameters. Reset your filters to view all catalog categories."
              : "No product categories are currently registered in the database catalog."}
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
              onClick={() => setIsAddModalOpen(true)}
            >
              + Add First Category
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (Optimized for viewports > 768px) */}
          <div className="adm-category-desktop-table">
            <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="adm-table-container">
                <table className="adm-table" aria-label="Product categories directory">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>URL Slug</th>
                      <th>Description</th>
                      <th>Assigned Products</th>
                      <th>Taxonomy Level</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat) => {
                      const prodCount = Number(cat.productsCount || cat._count?.products || 0);
                      const hasChildren = Boolean(cat.children && cat.children.length > 0);
                      const isExpanded = expandedCategories.has(cat.id) || expandedCategories.has(cat.slug);

                      return (
                        <React.Fragment key={cat.id || cat.slug}>
                          <tr className={cat.parentId ? "adm-subcat-row" : "adm-parent-cat-row"}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                  className={`adm-category-avatar ${cat.tint || "tint-blue"}`}
                                  style={{ width: 34, height: 34, fontSize: "1.1rem", borderRadius: 8 }}
                                >
                                  {cat.icon || "📁"}
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <strong style={{ color: "var(--adm-text-primary)", fontSize: "0.88rem" }}>
                                      {cat.name}
                                    </strong>
                                    {hasChildren && (
                                      <button
                                        type="button"
                                        className="adm-btn adm-btn-secondary adm-btn-sm"
                                        style={{ fontSize: "0.68rem", padding: "1px 6px", height: "auto" }}
                                        onClick={() => toggleExpandCategory(cat)}
                                        data-testid={`toggle-subcategories-${cat.slug}`}
                                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                                      >
                                        {isExpanded ? `▲ ${cat.children.length} Subcategories` : `▼ ${cat.children.length} Subcategories`}
                                      </button>
                                    )}
                                  </div>
                                  {cat.id && (
                                    <div
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "var(--adm-text-muted)",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      ID: {String(cat.id).slice(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <code style={{ fontSize: "0.78rem" }}>/{cat.slug}</code>
                            </td>
                            <td style={{ maxWidth: 280 }}>
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  color: "var(--adm-text-secondary)",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                                title={cat.description || "No description"}
                              >
                                {cat.description || "No extended category description provided."}
                              </span>
                            </td>
                            <td>
                              <span className="adm-badge adm-badge-info" style={{ fontWeight: 600 }}>
                                📦 {prodCount} Product{prodCount !== 1 ? "s" : ""}
                              </span>
                            </td>
                            <td>
                              <span
                                className="adm-badge adm-badge-neutral"
                                style={{ fontSize: "0.72rem" }}
                              >
                                {cat.parentId ? "Sub-Category" : "Top-Level"}
                              </span>
                            </td>
                            <td>
                              <span className={`adm-badge ${cat.isActive !== false ? "adm-badge-success" : "adm-badge-neutral"}`}>
                                {cat.isActive !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn-secondary adm-btn-sm"
                                  onClick={() => handleInspectCategory(cat.slug)}
                                  data-testid={`inspect-category-${cat.slug}`}
                                  title={`Inspect products for ${cat.name}`}
                                >
                                  Inspect Products &rarr;
                                </button>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn-outline adm-btn-sm"
                                  onClick={() => handleOpenEditCategory(cat)}
                                  data-testid={`edit-category-${cat.slug || cat.id}`}
                                  title={`Edit ${cat.name}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn-outline adm-btn-sm"
                                  onClick={() => handleToggleCategoryStatus(cat)}
                                  data-testid={`toggle-status-${cat.slug || cat.id}`}
                                  title={cat.isActive !== false ? "Deactivate category" : "Activate category"}
                                >
                                  {cat.isActive !== false ? "Deactivate" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Nested Subcategories rendered directly under parent */}
                          {hasChildren && isExpanded &&
                            cat.children.map((sub) => {
                              const subCount = Number(sub.productsCount || sub._count?.products || 0);
                              return (
                                <tr
                                  key={sub.id || sub.slug}
                                  className="adm-subcat-row"
                                  style={{ backgroundColor: "rgba(240, 244, 248, 0.45)" }}
                                  data-testid={`subcat-row-${sub.slug}`}
                                >
                                  <td style={{ paddingLeft: 42 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ color: "var(--adm-text-muted)", fontSize: "0.9rem" }}>↳</span>
                                      <span
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: "50%",
                                          backgroundColor: "var(--vtx-accent, #ea580c)",
                                          display: "inline-block",
                                        }}
                                      />
                                      <div>
                                        <strong style={{ color: "var(--adm-text-primary)", fontSize: "0.85rem" }}>
                                          {sub.name}
                                        </strong>
                                        {sub.id && (
                                          <div
                                            style={{
                                              fontSize: "0.68rem",
                                              color: "var(--adm-text-muted)",
                                              fontFamily: "monospace",
                                            }}
                                          >
                                            ID: {String(sub.id).slice(0, 8)}...
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <code style={{ fontSize: "0.76rem" }}>/{sub.slug}</code>
                                  </td>
                                  <td style={{ maxWidth: 280 }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--adm-text-secondary)" }}>
                                      Subcategory under {cat.name}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="adm-badge adm-badge-info" style={{ fontWeight: 600, fontSize: "0.74rem" }}>
                                      📦 {subCount} Product{subCount !== 1 ? "s" : ""}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="adm-badge adm-badge-neutral" style={{ fontSize: "0.72rem" }}>
                                      Sub-Category
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`adm-badge ${sub.isActive !== false ? "adm-badge-success" : "adm-badge-neutral"}`}>
                                      {sub.isActive !== false ? "Active" : "Inactive"}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                      <button
                                        type="button"
                                        className="adm-btn adm-btn-secondary adm-btn-sm"
                                        onClick={() => handleInspectCategory(sub.slug)}
                                        data-testid={`inspect-category-${sub.slug}`}
                                        title={`Inspect products for ${sub.name}`}
                                      >
                                        Inspect
                                      </button>
                                      <button
                                        type="button"
                                        className="adm-btn adm-btn-outline adm-btn-sm"
                                        onClick={() => handleOpenEditCategory(sub, cat.id)}
                                        data-testid={`edit-category-${sub.slug || sub.id}`}
                                        title={`Edit ${sub.name}`}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="adm-btn adm-btn-outline adm-btn-sm"
                                        onClick={() => handleToggleCategoryStatus(sub)}
                                        data-testid={`toggle-status-${sub.slug || sub.id}`}
                                        title={sub.isActive !== false ? "Deactivate subcategory" : "Activate subcategory"}
                                      >
                                        {sub.isActive !== false ? "Deactivate" : "Activate"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Cards View (Optimized for viewports <= 768px) */}
          <div className="adm-category-mobile-cards">
            {filteredCategories.map((cat) => {
              const prodCount = Number(cat.productsCount || cat._count?.products || 0);
              const hasChildren = Boolean(cat.children && cat.children.length > 0);
              const isExpanded = expandedCategories.has(cat.id) || expandedCategories.has(cat.slug);

              return (
                <div key={cat.id || cat.slug} className="adm-category-card">
                  <div className="adm-category-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className={`adm-category-avatar ${cat.tint || "tint-blue"}`}>
                        {cat.icon || "📁"}
                      </div>
                      <div className="adm-category-title-wrap">
                        <h3 className="adm-category-name">{cat.name}</h3>
                        <code style={{ fontSize: "0.74rem", color: "var(--adm-text-muted)" }}>
                          /{cat.slug}
                        </code>
                      </div>
                    </div>
                    <span className={`adm-badge ${cat.isActive !== false ? "adm-badge-success" : "adm-badge-neutral"}`}>
                      {cat.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="adm-category-card-body">
                    <p className="adm-category-desc">
                      {cat.description || "No extended category description provided."}
                    </p>

                    <div className="adm-category-meta-bar">
                      <span style={{ fontWeight: 600, color: "var(--adm-text-primary)" }}>
                        📦 {prodCount} Product{prodCount !== 1 ? "s" : ""}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="adm-btn adm-btn-secondary adm-btn-sm"
                          onClick={() => handleInspectCategory(cat.slug)}
                          title={`Inspect products for ${cat.name}`}
                        >
                          Inspect Products &rarr;
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn-outline adm-btn-sm"
                          onClick={() => handleOpenEditCategory(cat)}
                          title={`Edit ${cat.name}`}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Subcategories list in mobile card */}
                    {hasChildren && (
                      <div style={{ marginTop: 12, borderTop: "1px solid var(--adm-border)", paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--adm-text-secondary)" }}>
                            Subcategories ({cat.children.length})
                          </span>
                          <button
                            type="button"
                            className="adm-btn-text"
                            onClick={() => toggleExpandCategory(cat)}
                            style={{ fontSize: "0.74rem" }}
                          >
                            {isExpanded ? "Hide ▲" : "Show ▼"}
                          </button>
                        </div>
                        {isExpanded && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {cat.children.map((sub) => (
                              <div
                                key={sub.id || sub.slug}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  background: "var(--adm-surface-alt, #f8fafc)",
                                  borderRadius: 6,
                                  fontSize: "0.8rem",
                                }}
                              >
                                <div>
                                  <strong>↳ {sub.name}</strong>
                                  <div style={{ fontSize: "0.7rem", color: "var(--adm-text-muted)" }}>
                                    /{sub.slug} &bull; {Number(sub.productsCount || sub._count?.products || 0)} products
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    type="button"
                                    className="adm-btn adm-btn-secondary adm-btn-sm"
                                    onClick={() => handleInspectCategory(sub.slug)}
                                    style={{ padding: "2px 6px", fontSize: "0.72rem" }}
                                  >
                                    Inspect
                                  </button>
                                  <button
                                    type="button"
                                    className="adm-btn adm-btn-outline adm-btn-sm"
                                    onClick={() => handleOpenEditCategory(sub, cat.id)}
                                    style={{ padding: "2px 6px", fontSize: "0.72rem" }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Inspect Category Products Modal */}
      {selectedCategorySlug && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedCategorySlug(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="inspect-cat-title"
          >
            <div className="adm-modal-header">
              <h2 id="inspect-cat-title" className="adm-modal-title">
                Category: {inspectData?.category?.name || selectedCategorySlug}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedCategorySlug(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="adm-modal-body">
              {inspectLoading ? (
                <div className="adm-loading-screen" style={{ minHeight: 180 }}>
                  <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
                  <p>Fetching associated products...</p>
                </div>
              ) : inspectData?.error ? (
                <div className="adm-notice-banner adm-notice-warning">
                  ⚠️ {inspectData.error}
                </div>
              ) : (
                <>
                  {/* Category Hero Banner */}
                  <div className="adm-category-modal-hero">
                    <div className="adm-category-modal-avatar">
                      {inspectData?.category?.icon || "📁"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--adm-text-primary)" }}>
                        {inspectData?.category?.name || selectedCategorySlug}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--adm-text-muted)", marginBottom: 8 }}>
                        <code>/{inspectData?.category?.slug || selectedCategorySlug}</code>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="adm-badge adm-badge-success">Active</span>
                        <span className="adm-badge adm-badge-info">
                          📦 {inspectData?.products?.length || 0} Products
                        </span>
                        {inspectData?.category?.id && (
                          <span className="adm-badge adm-badge-neutral" style={{ fontFamily: "monospace" }}>
                            ID: {inspectData.category.id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {inspectData?.category?.description && (
                    <div style={{ marginBottom: 16 }}>
                      <span className="adm-label">Taxonomy Description</span>
                      <p style={{ margin: 0, color: "var(--adm-text-secondary)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                        {inspectData.category.description}
                      </p>
                    </div>
                  )}

                  <span className="adm-label">
                    Active Catalog Products ({inspectData?.products?.length || 0})
                  </span>

                  {(inspectData?.products || []).length === 0 ? (
                    <div className="adm-empty-state" style={{ padding: "24px 16px" }}>
                      <p className="adm-empty-desc" style={{ margin: 0 }}>
                        No products are currently assigned to this category classification.
                      </p>
                    </div>
                  ) : (
                    <div className="adm-table-container" style={{ marginTop: 8 }}>
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Slug</th>
                            <th>Brand</th>
                            <th>Variants</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(inspectData?.products || []).map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.name}</strong>
                              </td>
                              <td>
                                <code>{p.slug}</code>
                              </td>
                              <td>{p.brand || "VERTEX"}</td>
                              <td>{p.variants?.length || 1} SKU(s)</td>
                              <td>
                                <strong style={{ color: "var(--adm-primary)" }}>
                                  {formatINR(p.price || 0)}
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setSelectedCategorySlug(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="adm-modal-backdrop" onClick={() => setEditingCategory(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="edit-cat-title"
          >
            <div className="adm-modal-header">
              <h2 id="edit-cat-title" className="adm-modal-title">
                Edit Category: {editingCategory.name}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setEditingCategory(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateCategory} className="adm-modal-form">
              <div className="adm-modal-body">
                {editModalMessage && (
                  <div
                    className={`adm-notice-banner ${
                      editModalMessage.type === "success"
                        ? "adm-notice-info"
                        : "adm-notice-warning"
                    }`}
                    role="alert"
                  >
                    <span className="adm-notice-icon">
                      {editModalMessage.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <div>{editModalMessage.text}</div>
                  </div>
                )}

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="edit-cat-name">
                    Category Name *
                  </label>
                  <input
                    id="edit-cat-name"
                    type="text"
                    className="adm-input"
                    value={editCategoryForm.name}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                    data-testid="edit-category-name-input"
                    required
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="edit-cat-slug">
                    URL Slug *
                  </label>
                  <input
                    id="edit-cat-slug"
                    type="text"
                    className="adm-input"
                    value={editCategoryForm.slug}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, slug: e.target.value })}
                    required
                  />
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-cat-icon">
                      Emoji / Icon
                    </label>
                    <input
                      id="edit-cat-icon"
                      type="text"
                      className="adm-input"
                      value={editCategoryForm.icon}
                      onChange={(e) => setEditCategoryForm({ ...editCategoryForm, icon: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-cat-status">
                      Catalog Visibility
                    </label>
                    <select
                      id="edit-cat-status"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={editCategoryForm.isActive ? "true" : "false"}
                      onChange={(e) => setEditCategoryForm({ ...editCategoryForm, isActive: e.target.value === "true" })}
                    >
                      <option value="true">Active (Visible to Customers)</option>
                      <option value="false">Inactive (Hidden from Storefront)</option>
                    </select>
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="edit-cat-desc">
                    Description
                  </label>
                  <textarea
                    id="edit-cat-desc"
                    className="adm-textarea"
                    rows="2"
                    placeholder="Brief description of products in this category..."
                    value={editCategoryForm.description}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={editModalSubmitting}
                  data-testid="save-category-btn"
                >
                  {editModalSubmitting ? "Saving..." : "Save Category Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="adm-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-cat-title"
          >
            <div className="adm-modal-header">
              <h2 id="add-cat-title" className="adm-modal-title">
                Add New Category
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="adm-modal-form">
              <div className="adm-modal-body">
                {modalMessage && (
                  <div
                    className={`adm-notice-banner ${
                      modalMessage.type === "success"
                        ? "adm-notice-info"
                        : "adm-notice-warning"
                    }`}
                    role="alert"
                  >
                    <span className="adm-notice-icon">
                      {modalMessage.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <div>{modalMessage.text}</div>
                  </div>
                )}

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="cat-name">
                    Category Name *
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    className="adm-input"
                    placeholder="e.g. Sensors & Modules"
                    value={newCategory.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/[\s_-]+/g, "-");
                      setNewCategory({ ...newCategory, name, slug });
                    }}
                    required
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="cat-slug">
                    URL Slug *
                  </label>
                  <input
                    id="cat-slug"
                    type="text"
                    className="adm-input"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                    required
                  />
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="cat-icon">
                      Emoji / Icon
                    </label>
                    <input
                      id="cat-icon"
                      type="text"
                      className="adm-input"
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="cat-tint">
                      Color Tint Class
                    </label>
                    <select
                      id="cat-tint"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={newCategory.tint}
                      onChange={(e) => setNewCategory({ ...newCategory, tint: e.target.value })}
                    >
                      <option value="tint-blue">Blue Tint (Electronics)</option>
                      <option value="tint-orange">Orange Tint (Fasteners)</option>
                      <option value="tint-green">Green Tint (Nuts)</option>
                    </select>
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="cat-desc">
                    Description
                  </label>
                  <textarea
                    id="cat-desc"
                    className="adm-textarea"
                    rows="2"
                    placeholder="Brief description of products in this category..."
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
