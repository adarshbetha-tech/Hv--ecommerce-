import React, { useEffect, useRef } from "react";

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  loading = false,
  pendingAction = null,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  cartError = null,
  onClearError,
  onNavigateLogin,
  onProceedToCheckout,
  currentUser = null,
}) {
  const drawerRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isItemPending = (itemId) => {
    return pendingAction?.id === itemId || pendingAction?.type === "clear" || loading;
  };

  return (
    <div
      className="vtx-cart-overlay"
      onClick={handleBackdropClick}
      data-testid="cart-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
    >
      <div className="vtx-cart-drawer" ref={drawerRef} data-testid="cart-drawer">
        {/* Cart Header */}
        <div className="vtx-cart-header">
          <div className="vtx-cart-header-title">
            <h2>Shopping Cart</h2>
            <span className="vtx-cart-count-badge" data-testid="drawer-cart-count">
              {cart?.totalQuantity || 0} {cart?.totalQuantity === 1 ? "item" : "items"}
            </span>
          </div>
          <button
            type="button"
            className="vtx-cart-close-btn"
            onClick={onClose}
            aria-label="Close cart drawer"
            data-testid="cart-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Guest Warning / Login Suggestion */}
        {!currentUser && !isEmpty && (
          <div className="vtx-cart-guest-banner" data-testid="guest-cart-banner">
            <span>Guest Cart: Sign in to sync across devices.</span>
            <button
              type="button"
              className="vtx-cart-login-link"
              onClick={() => {
                onClose();
                onNavigateLogin();
              }}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Error notification */}
        {cartError && (
          <div className="vtx-cart-error-banner" role="alert" data-testid="cart-error-banner">
            <span>{cartError}</span>
            {onClearError && (
              <button
                type="button"
                className="vtx-cart-error-dismiss"
                onClick={onClearError}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Cart Body */}
        <div className="vtx-cart-body">
          {isEmpty ? (
            <div className="vtx-cart-empty" data-testid="cart-empty-state">
              <div className="vtx-cart-empty-icon" aria-hidden="true">
                🛒
              </div>
              <h3>Your cart is empty</h3>
              <p>Looks like you haven't added any products or fasteners to your cart yet.</p>
              <button
                type="button"
                className="btn btn-primary vtx-cart-shop-btn"
                onClick={onClose}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="vtx-cart-items-list" data-testid="cart-items-list">
              {items.map((item) => {
                const isPending = isItemPending(item.id);
                const isAvailable = item.isAvailable;
                const maxStock = item.variant?.stockQuantity;
                const canIncrease =
                  !isPending &&
                  isAvailable &&
                  (maxStock === undefined || item.quantity < maxStock);

                return (
                  <div
                    key={item.id}
                    className={`vtx-cart-item ${!isAvailable ? "unavailable" : ""}`}
                    data-testid={`cart-item-${item.id}`}
                  >
                    <div className="vtx-cart-item-thumb">
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="vtx-cart-item-img"
                        />
                      ) : (
                        <span className="vtx-cart-item-placeholder" aria-hidden="true">
                          {item.product?.name ? item.product.name[0].toUpperCase() : "P"}
                        </span>
                      )}
                    </div>

                    <div className="vtx-cart-item-info">
                      <div className="vtx-cart-item-top">
                        <h4 className="vtx-cart-item-title">{item.product?.name || "Product"}</h4>
                        <button
                          type="button"
                          className="vtx-cart-remove-btn"
                          onClick={() => onRemoveItem(item.id)}
                          disabled={isPending}
                          aria-label={`Remove ${item.product?.name || "item"} from cart`}
                          data-testid={`remove-item-${item.id}`}
                          title="Remove item"
                        >
                          🗑️
                        </button>
                      </div>

                      {item.variant?.packSize && (
                        <p className="vtx-cart-item-variant">Pack: {item.variant.packSize}</p>
                      )}
                      {item.variant?.sku && (
                        <p className="vtx-cart-item-sku">SKU: {item.variant.sku}</p>
                      )}

                      {!isAvailable && (
                        <p className="vtx-cart-item-warning">
                          ⚠️ This item is currently unavailable.
                        </p>
                      )}

                      <div className="vtx-cart-item-actions">
                        <div className="vtx-qty-control" aria-label="Quantity selector">
                          <button
                            type="button"
                            className="vtx-qty-btn"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={isPending || item.quantity <= 1}
                            aria-label="Decrease quantity"
                            data-testid={`qty-dec-${item.id}`}
                          >
                            −
                          </button>
                          <span
                            className="vtx-qty-value"
                            aria-live="polite"
                            data-testid={`qty-val-${item.id}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="vtx-qty-btn"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={!canIncrease}
                            aria-label="Increase quantity"
                            data-testid={`qty-inc-${item.id}`}
                          >
                            +
                          </button>
                        </div>

                        <div className="vtx-cart-item-price-block">
                          {item.lineTotal === null || item.isQuoteRequired || item.unitPrice === null ? (
                            <span className="vtx-cart-item-quote-badge" data-testid={`line-total-${item.id}`}>
                              Price on Request
                            </span>
                          ) : (
                            <>
                              <span className="vtx-cart-item-total" data-testid={`line-total-${item.id}`}>
                                ₹{Number(item.lineTotal || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="vtx-cart-item-unit">
                                (₹{Number(item.unitPrice || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} each)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {!isEmpty && (
          <div className="vtx-cart-footer">
            <div className="vtx-cart-summary">
              <div className="vtx-cart-subtotal-row">
                <span className="vtx-cart-subtotal-label">Subtotal</span>
                <span className="vtx-cart-subtotal-amount" data-testid="cart-subtotal">
                  {cart?.hasQuoteOnlyItems && !cart?.hasPricedItems ? (
                    <span className="vtx-cart-quote-subtotal-note">Quote Required</span>
                  ) : (
                    `₹${Number(cart?.subtotal || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  )}
                </span>
              </div>
              {cart?.hasQuoteOnlyItems && (
                <p className="vtx-cart-quote-alert" data-testid="cart-quote-alert">
                  ℹ️ Quote-required items included. Commercial pricing will be verified by sales engineering upon order review.
                </p>
              )}
              <p className="vtx-cart-tax-notice">
                Applicable GST and shipping calculated at checkout.
              </p>
            </div>

            <div className="vtx-cart-footer-buttons">
              <button
                type="button"
                className="btn btn-outline vtx-cart-clear-btn"
                onClick={onClearCart}
                disabled={loading || pendingAction?.type === "clear"}
                data-testid="clear-cart-btn"
              >
                {pendingAction?.type === "clear" ? "Clearing..." : "Clear Cart"}
              </button>
              <button
                type="button"
                className="btn btn-primary vtx-cart-checkout-btn"
                onClick={() => {
                  if (onProceedToCheckout) {
                    onProceedToCheckout();
                  }
                }}
                disabled={loading || pendingAction?.type === "clear"}
                data-testid="proceed-checkout-btn"
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
