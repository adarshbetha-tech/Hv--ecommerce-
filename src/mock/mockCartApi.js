/**
 * VERTEX Mock Cart API Service
 * 
 * Provides simulated persistent shopping cart interactions for frontend development.
 * Persists to browser localStorage under "vertex_mock_cart" so cart persists across page reloads.
 */

import { MOCK_PRODUCTS } from "./mockData";

const CART_STORAGE_KEY = "vertex_mock_cart";

function findProductAndVariant(variantId) {
  for (const product of MOCK_PRODUCTS) {
    const variant = product.variants?.find((v) => v.id === variantId || v.sku === variantId);
    if (variant) {
      return { product, variant };
    }
  }
  return null;
}

function getStoredCartItems() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartItems(items) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatMockCart(items = []) {
  const safeItems = (items || []).map((item) => {
    const rawPrice = item.unitPrice !== undefined ? item.unitPrice : (item.variant?.price);
    const isQuoteRequired = rawPrice === null || rawPrice === undefined;
    const unitPrice = isQuoteRequired ? null : Number(rawPrice);
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = isQuoteRequired ? null : Number((unitPrice * qty).toFixed(2));

    return {
      id: item.id || `mock-item-${item.variantId}`,
      cartId: "mock-cart-id",
      variantId: item.variantId,
      quantity: qty,
      unitPrice,
      lineTotal,
      isQuoteRequired,
      isAvailable: true,
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
    id: "mock-cart-id",
    userId: "mock-user-customer-1",
    items: safeItems,
    itemCount,
    totalQuantity,
    subtotal,
    hasQuoteOnlyItems: quoteItems.length > 0,
    quoteItemsCount: quoteItems.length,
    hasPricedItems: pricedItems.length > 0,
  };
}

export async function getCart() {
  await new Promise((r) => setTimeout(r, 40));
  const items = getStoredCartItems();
  return {
    success: true,
    cart: formatMockCart(items),
  };
}

export async function addItemToCart({ variantId, quantity = 1 }) {
  await new Promise((r) => setTimeout(r, 50));
  const items = getStoredCartItems();
  const existingIdx = items.findIndex((it) => it.variantId === variantId);
  const addQty = Math.max(1, parseInt(quantity, 10) || 1);

  if (existingIdx >= 0) {
    items[existingIdx].quantity += addQty;
  } else {
    const found = findProductAndVariant(variantId);
    if (!found) {
      const error = new Error(`Product variant "${variantId}" not found in mock catalog.`);
      error.status = 404;
      error.code = "VARIANT_NOT_FOUND";
      throw error;
    }

    const { product, variant } = found;
    const isQuote = variant.price === null || variant.price === undefined;
    const unitPrice = isQuote ? null : Number(variant.price);

    items.push({
      id: `mock-item-${variant.id}`,
      variantId: variant.id,
      quantity: addQty,
      unitPrice,
      variant: {
        id: variant.id,
        sku: variant.sku,
        partNumber: variant.partNumber || null,
        name: variant.name || null,
        packSize: variant.packSize || null,
        price: unitPrice,
        mrp: variant.mrp ? Number(variant.mrp) : null,
        stockQuantity: variant.stockQuantity ?? 100,
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

  saveCartItems(items);
  return {
    success: true,
    message: "Item added to cart.",
    cart: formatMockCart(items),
  };
}

export async function updateCartItemQuantity(itemId, quantity) {
  await new Promise((r) => setTimeout(r, 40));
  let items = getStoredCartItems();
  const newQty = parseInt(quantity, 10) || 0;

  if (newQty <= 0) {
    items = items.filter((it) => it.id !== itemId && it.variantId !== itemId);
  } else {
    const target = items.find((it) => it.id === itemId || it.variantId === itemId);
    if (target) {
      target.quantity = newQty;
    }
  }

  saveCartItems(items);
  return {
    success: true,
    message: "Cart updated.",
    cart: formatMockCart(items),
  };
}

export async function removeCartItem(itemId) {
  await new Promise((r) => setTimeout(r, 40));
  const items = getStoredCartItems().filter(
    (it) => it.id !== itemId && it.variantId !== itemId
  );
  saveCartItems(items);
  return {
    success: true,
    message: "Item removed from cart.",
    cart: formatMockCart(items),
  };
}

export async function clearCart() {
  await new Promise((r) => setTimeout(r, 30));
  saveCartItems([]);
  return {
    success: true,
    message: "Cart cleared.",
    cart: formatMockCart([]),
  };
}

export async function mergeGuestCart(incomingItems = []) {
  await new Promise((r) => setTimeout(r, 50));
  const items = getStoredCartItems();

  for (const guestItem of incomingItems || []) {
    const existing = items.find((it) => it.variantId === guestItem.variantId);
    if (existing) {
      existing.quantity += Math.max(1, parseInt(guestItem.quantity, 10) || 1);
    } else {
      const found = findProductAndVariant(guestItem.variantId);
      if (found) {
        const { product, variant } = found;
        const unitPrice = Number(variant.price || 0);
        items.push({
          id: `mock-item-${variant.id}`,
          variantId: variant.id,
          quantity: Math.max(1, parseInt(guestItem.quantity, 10) || 1),
          unitPrice,
          variant: {
            id: variant.id,
            sku: variant.sku,
            packSize: variant.packSize || null,
            price: unitPrice,
          },
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            imageUrl: product.imageUrl || null,
          },
        });
      }
    }
  }

  saveCartItems(items);
  return {
    success: true,
    message: "Guest cart merged successfully.",
    cart: formatMockCart(items),
  };
}
