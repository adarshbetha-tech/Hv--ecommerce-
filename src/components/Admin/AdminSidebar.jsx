import React from "react";
import logo from "../../assets/logo.png";

const navGroups = [
  {
    groupTitle: "Operations & Orders",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "orders", label: "Orders", icon: "🚚" },
      { id: "payments", label: "Payments", icon: "💳" },
      { id: "quotes", label: "Commercial RFQs", icon: "📑" },
      { id: "refunds", label: "Refunds & Returns", icon: "↩️" },
      { id: "discounts", label: "Discounts & Promos", icon: "🏷️" },
      { id: "reviews", label: "Product Reviews", icon: "⭐" },
    ],
  },
  {
    groupTitle: "Catalog & Stock",
    items: [
      { id: "products", label: "Products", icon: "📦" },
      { id: "categories", label: "Categories", icon: "📑" },
      { id: "inventory", label: "Inventory", icon: "📋" },
    ],
  },
  {
    groupTitle: "Management & Governance",
    items: [
      { id: "customers", label: "Customers", icon: "👥" },
      { id: "newsletter", label: "Newsletter", icon: "✉️" },
      { id: "reports", label: "Reports & Analytics", icon: "📈" },
      { id: "users", label: "Admin Users & Roles", icon: "🛡️" },
      { id: "settings", label: "Settings", icon: "⚙️" },
      { id: "audit-logs", label: "Audit Log", icon: "📜" },
    ],
  },
];

export default function AdminSidebar({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNavigateStorefront,
  healthStatus,
}) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div
          className="adm-modal-backdrop"
          onClick={onCloseMobile}
          style={{ zIndex: 95 }}
          aria-hidden="true"
          data-testid="adm-sidebar-backdrop"
        />
      )}

      <aside
        className={`adm-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
        aria-label="Admin Navigation"
      >
        <div className="adm-sidebar-brand">
          <button
            type="button"
            className="adm-brand-link"
            onClick={() => onSelectSection("dashboard")}
            title="VERTEX Admin Console"
          >
            <img src={logo} alt="VERTEX Logo" className="adm-brand-logo" />
            {!collapsed && (
              <div className="adm-brand-text">
                <span className="adm-brand-name">VERTEX</span>
                <span className="adm-brand-badge">ADMIN CONSOLE</span>
              </div>
            )}
          </button>
          {mobileOpen ? (
            <button
              type="button"
              className="adm-sidebar-close-mobile"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              title="Close navigation"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              className="adm-sidebar-toggle"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "»" : "«"}
            </button>
          )}
        </div>

        <nav className="adm-sidebar-nav" role="navigation">
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="adm-nav-group">
              {!collapsed && (
                <div className="adm-nav-group-title">{group.groupTitle}</div>
              )}
              <ul className="adm-nav-list">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <li
                      key={item.id}
                      className={`adm-nav-item ${isActive ? "active" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSection(item.id);
                          if (mobileOpen) onCloseMobile();
                        }}
                        title={item.label}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="adm-nav-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="adm-nav-label">{item.label}</span>
                            {item.badge && (
                              <span className="adm-nav-badge">{item.badge}</span>
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <button
            type="button"
            className="adm-storefront-link"
            onClick={onNavigateStorefront}
            title="View customer storefront"
          >
            <span aria-hidden="true">🏪</span>
            {!collapsed && <span>Storefront ↗</span>}
          </button>

          {!collapsed && (
            <div className="adm-system-status-indicator">
              <span
                className={`adm-status-dot ${
                  healthStatus?.status === "UP" ? "" : "degraded"
                }`}
                aria-hidden="true"
              />
              <span className="adm-status-text">
                {healthStatus?.status === "UP"
                  ? "PostgreSQL 18.6 Live"
                  : "Database Disconnected"}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
