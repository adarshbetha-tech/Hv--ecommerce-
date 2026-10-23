/**
 * VERTEX Customer Wishlist Drawer
 * 
 * Provides an accessible slide-out drawer displaying all saved components,
 * with quick "Move to Cart" actions and persistent localStorage storage.
 */

import React, { useEffect, useState } from "react";
import { getWishlistItems, removeFromWishlist, clearWishlist } from "../../utils/wishlist";

export default function WishlistDrawer({
  isOpen,
  onClose,
  onAddToCart,
  onViewDetails,
}) {
  const [items, setItems] = useState(() => getWishlistItems());
  const [movingItemId, setMovingItemId] = useState(null);

  const refreshItems = () => {
    setItems(getWishlistItems());
  };

  useEffect(() => {
    refreshItems();
    const handleUpdate = () => refreshItems();
    window.addEventListener("vertex_wishlist_updated", handleUpdate);
    return () => window.removeEventListener("vertex_wishlist_updated", handleUpdate);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMoveToCart = (item) => {
    const itemId = item.id || item.slug;
    if (movingItemId === itemId) return;
    setMovingItemId(itemId);
    if (onAddToCart) {
      onAddToCart(item);
    }
    removeFromWishlist(itemId);
    refreshItems();
    window.setTimeout(() => setMovingItemId(null), 1800);
  };

  const handleRemove = (productId) => {
    removeFromWishlist(productId);
    refreshItems();
  };

  return (
    <>
      <div
        className="vtx-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="vtx-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Saved Wishlist Components"
      >
        <div className="vtx-drawer-header">
          <div className="vtx-drawer-title-group">
            <h3>❤️ Saved Wishlist</h3>
            <span className="vtx-drawer-count">
              {items.length} {items.length === 1 ? "Item" : "Items"}
            </span>
          </div>
          <button
            type="button"
            className="vtx-drawer-close"
            onClick={onClose}
            aria-label="Close wishlist"
          >
            ✕
          </button>
        </div>

        <div className="vtx-drawer-body">
          {items.length === 0 ? (
            <div className="vtx-drawer-empty">
              <div className="empty-icon" aria-hidden="true">🤍</div>
              <h4>Your wishlist is empty</h4>
              <p>Save components, lithium cells, and fasteners here to track technical specifications and pricing.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Browse Catalogue
              </button>
            </div>
          ) : (
            <div className="vtx-wishlist-items-list">
              {items.map((item) => (
                <div className="vtx-wishlist-item" key={item.id || item.slug}>
                  <div
                    className="vtx-wishlist-thumb"
                    onClick={() => {
                      onViewDetails && onViewDetails(item);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${item.name}`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} />
                    ) : (
                      <span className="thumb-placeholder">
                        {item.name ? item.name[0].toUpperCase() : "P"}
                      </span>
                    )}
                  </div>

                  <div className="vtx-wishlist-info">
                    <h4
                      className="vtx-wishlist-title"
                      onClick={() => {
                        onViewDetails && onViewDetails(item);
                        onClose();
                      }}
                    >
                      {item.name}
                    </h4>
                    <div className="vtx-wishlist-price">
                      {item.price !== null && item.price !== undefined
                        ? `₹${Number(item.price).toLocaleString("en-IN")}`
                        : "Quote on Request"}
                    </div>

                    <div className="vtx-wishlist-actions">
                      {item.price !== null && item.price !== undefined ? (
                        <button
                          type="button"
                          className="btn-move-cart"
                          onClick={() => handleMoveToCart(item)}
                          disabled={movingItemId === (item.id || item.slug)}
                        >
                          {movingItemId === (item.id || item.slug) ? "✓ Added" : "🛒 Move to Cart"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-move-cart"
                          onClick={() => {
                            onViewDetails && onViewDetails(item);
                            onClose();
                          }}
                        >
                          📋 Inquire Quote
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-remove-wishlist"
                        onClick={() => handleRemove(item.id || item.slug)}
                        aria-label="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="vtx-drawer-footer">
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: "100%" }}
              onClick={() => {
                clearWishlist();
                refreshItems();
              }}
            >
              Clear Entire Wishlist
            </button>
          </div>
        )}
      </div>
    </>
  );
}
