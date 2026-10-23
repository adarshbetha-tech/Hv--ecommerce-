/**
 * VERTEX Guest Cart Utilities
 * 
 * Manages guest cart persistence in browser localStorage.
 * Synchronizes with authenticated user cart upon login via POST /api/cart/merge.
 */

const GUEST_CART_STORAGE_KEY = "vertex_guest_cart";

/**
 * Safely loads raw guest cart items from localStorage.
 */
export function getStoredGuestItems() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse guest cart from localStorage:", e);
    return [];
  }
}

/**
 * Persists guest cart items to localStorage.
 */
export function setStoredGuestItems(items) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (!items || items.length === 0) {
      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (e) {
    console.error("Failed to save guest cart to localStorage:", e);
  }
}

/**
 * Clears the guest cart from localStorage.
 */
export function clearStoredGuestCart() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear guest cart:", e);
  }
}

/**
 * Formats guest cart items into standard cart shape matching backend formatCart.
 */
export function formatGuestCart(items = []) {
  const safeItems = (items || []).map((item) => {
    const rawPrice = item.unitPrice !== undefined ? item.unitPrice : (item.variant?.price);
    const isQuoteRequired = rawPrice === null || rawPrice === undefined;
    const unitPrice = isQuoteRequired ? null : Number(rawPrice);
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = isQuoteRequired ? null : Number((unitPrice * qty).toFixed(2));

    return {
      id: item.id || `guest-${item.variantId}`,
      cartId: "guest",
      variantId: item.variantId,
      quantity: qty,
      unitPrice,
      lineTotal,
      isQuoteRequired,
      isAvailable: item.isAvailable !== false,
      variant: item.variant || null,
      product: item.product || null,
    };
  });

  const itemCount = safeItems.length;
  const totalQuantity = safeItems.reduce((acc, it) => acc + it.quantity, 0);
  const pricedItems = safeItems.filter((it) => it.isAvailable && it.lineTotal !== null);
  const quoteItems = safeItems.filter((it) => it.isQuoteRequired || it.lineTotal === null);
  const subtotal = Number(
    pricedItems.reduce((acc, it) => acc + it.lineTotal, 0).toFixed(2)
  );

  return {
    id: "guest",
    userId: null,
    items: safeItems,
    itemCount,
    totalQuantity,
    subtotal,
    hasQuoteOnlyItems: quoteItems.length > 0,
    quoteItemsCount: quoteItems.length,
    hasPricedItems: pricedItems.length > 0,
  };
}

/**
 * Adds an item or increments existing variant in guest cart.
 */
export function addGuestItem(product, variant, quantity = 1) {
  const items = getStoredGuestItems();
  const existingIndex = items.findIndex((it) => it.variantId === variant.id);
  const addQty = Math.max(1, parseInt(quantity, 10) || 1);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const newQty = existing.quantity + addQty;
    // Cap at stockQuantity if known, or 999
    const maxQty = variant.stockQuantity && variant.stockQuantity > 0 ? variant.stockQuantity : 999;
    items[existingIndex].quantity = Math.min(newQty, maxQty);
    items[existingIndex].lineTotal = Number((items[existingIndex].unitPrice * items[existingIndex].quantity).toFixed(2));
  } else {
    const isQuote = variant.price === null || variant.price === undefined;
    const unitPrice = isQuote ? null : Number(variant.price);
    const maxQty = variant.stockQuantity && variant.stockQuantity > 0 ? variant.stockQuantity : 999;
    const finalQty = Math.min(addQty, maxQty);

    items.push({
      id: `guest-${variant.id}`,
      variantId: variant.id,
      quantity: finalQty,
      unitPrice,
      lineTotal: isQuote ? null : Number((unitPrice * finalQty).toFixed(2)),
      isAvailable: true,
      variant: {
        id: variant.id,
        sku: variant.sku,
        partNumber: variant.partNumber || null,
        name: variant.name || null,
        packSize: variant.packSize || null,
        price: unitPrice,
        mrp: variant.mrp ? Number(variant.mrp) : null,
        stockQuantity: variant.stockQuantity ?? 100,
        inStock: variant.stockQuantity === undefined ? true : variant.stockQuantity > 0,
      },
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl || null,
        tag: product.tag || null,
      },
    });
  }

  setStoredGuestItems(items);
  return formatGuestCart(items);
}

/**
 * Updates quantity of a guest cart item.
 */
export function updateGuestItemQuantity(itemId, quantity) {
  const items = getStoredGuestItems();
  const targetIndex = items.findIndex(
    (it) => it.id === itemId || it.variantId === itemId
  );

  if (targetIndex >= 0) {
    const item = items[targetIndex];
    const maxQty = item.variant?.stockQuantity && item.variant.stockQuantity > 0
      ? item.variant.stockQuantity
      : 999;
    const safeQty = Math.min(Math.max(1, parseInt(quantity, 10) || 1), maxQty);
    item.quantity = safeQty;
    item.lineTotal = (item.unitPrice === null || item.unitPrice === undefined) ? null : Number((item.unitPrice * safeQty).toFixed(2));
    setStoredGuestItems(items);
  }

  return formatGuestCart(items);
}

/**
 * Removes an item from the guest cart.
 */
export function removeGuestItem(itemId) {
  const items = getStoredGuestItems().filter(
    (it) => it.id !== itemId && it.variantId !== itemId
  );
  setStoredGuestItems(items);
  return formatGuestCart(items);
}

/**
 * Clears the guest cart.
 */
export function clearGuestCart() {
  clearStoredGuestCart();
  return formatGuestCart([]);
}
