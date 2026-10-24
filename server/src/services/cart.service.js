import { prisma } from "../config/db.js";
import { formatCart } from "../utils/cartSerializer.js";

/**
 * Standard query include definition for cart queries.
 */
const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
};

/**
 * Retrieves the authenticated user's cart, creating one if it does not yet exist.
 */
export async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: cartInclude,
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: cartInclude,
    });
  }

  return formatCart(cart);
}

/**
 * Adds a product variant with validated quantity to the user's cart.
 * Enforces server-side product and variant active checks and stock validation.
 */
export async function addItemToCart(userId, { variantId, quantity }) {
  // 1. Fetch variant and verify it exists and is active
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) {
    const error = new Error("Product variant not found.");
    error.code = "VARIANT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (!variant.isActive || !variant.product.isActive) {
    const error = new Error("This product or variant is currently unavailable and cannot be added to the cart.");
    error.code = "INACTIVE_PRODUCT_OR_VARIANT";
    error.status = 400;
    throw error;
  }

  const unitPrice = variant.price !== null && variant.price !== undefined ? Number(variant.price) : 0;
  if (isNaN(unitPrice) || unitPrice <= 0) {
    const error = new Error(`Product "${variant.product?.name || "Product"}" (${variant.sku}) is available for Quote on Request only and cannot be added to a retail cart.`);
    error.code = "RFQ_ONLY_PRODUCT";
    error.status = 400;
    throw error;
  }

  if (variant.stockQuantity <= 0) {
    const error = new Error("This item is currently out of stock.");
    error.code = "OUT_OF_STOCK";
    error.status = 400;
    throw error;
  }

  // 2. Perform atomic cart item addition inside a database transaction
  const updatedCart = await prisma.$transaction(async (tx) => {
    let cart = await tx.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { userId },
      });
    }

    const existingItem = await tx.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      const targetQuantity = existingItem.quantity + quantity;
      if (targetQuantity > variant.stockQuantity) {
        const error = new Error(`Cannot add ${quantity} more units. Maximum available stock is ${variant.stockQuantity} (you already have ${existingItem.quantity} in your cart).`);
        error.code = "INSUFFICIENT_STOCK";
        error.status = 400;
        throw error;
      }

      await tx.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: targetQuantity },
      });
    } else {
      if (quantity > variant.stockQuantity) {
        const error = new Error(`Requested quantity (${quantity}) exceeds available stock (${variant.stockQuantity}).`);
        error.code = "INSUFFICIENT_STOCK";
        error.status = 400;
        throw error;
      }

      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity,
        },
      });
    }

    return tx.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });
  });

  return formatCart(updatedCart);
}

/**
 * Updates the quantity of a specific cart item owned by the user.
 */
export async function updateCartItemQuantity(userId, { itemId, quantity }) {
  // 1. Fetch item and verify resource ownership
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true,
      variant: {
        include: { product: true },
      },
    },
  });

  if (!item || item.cart.userId !== userId) {
    const error = new Error("Cart item not found or does not belong to your cart.");
    error.code = "ITEM_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  // 2. Check variant and product activity
  if (!item.variant.isActive || !item.variant.product.isActive) {
    const error = new Error("This product is no longer active and cannot be updated.");
    error.code = "INACTIVE_PRODUCT_OR_VARIANT";
    error.status = 400;
    throw error;
  }

  const itemUnitPrice = item.variant.price !== null && item.variant.price !== undefined ? Number(item.variant.price) : 0;
  if (isNaN(itemUnitPrice) || itemUnitPrice <= 0) {
    const error = new Error(`Product "${item.variant.product?.name || "Product"}" (${item.variant.sku}) is available for Quote on Request only and cannot be purchased through retail checkout.`);
    error.code = "RFQ_ONLY_PRODUCT";
    error.status = 400;
    throw error;
  }

  // 3. Stock validation
  if (quantity > item.variant.stockQuantity) {
    const error = new Error(`Requested quantity (${quantity}) exceeds available stock (${item.variant.stockQuantity}).`);
    error.code = "INSUFFICIENT_STOCK";
    error.status = 400;
    throw error;
  }

  // 4. Update quantity
  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  const cart = await prisma.cart.findUnique({
    where: { id: item.cartId },
    include: cartInclude,
  });

  return formatCart(cart);
}

/**
 * Removes an item from the user's cart after checking ownership.
 */
export async function removeCartItem(userId, itemId) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== userId) {
    const error = new Error("Cart item not found or does not belong to your cart.");
    error.code = "ITEM_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  const cart = await prisma.cart.findUnique({
    where: { id: item.cartId },
    include: cartInclude,
  });

  return formatCart(cart);
}

/**
 * Clears all items from the user's cart.
 */
export async function clearCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  } else {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });

  return formatCart(updatedCart);
}

/**
 * Validates and merges guest cart items into the authenticated user's persistent cart.
 * Merge policy:
 * - Validates each item's variant existence and activity on the server.
 * - If item already exists in user's cart: combines quantities, capped by variant stock and max limit (999).
 * - If item does not exist: creates new cart item with quantity capped by available stock.
 * - Discards inactive or non-existent items safely.
 */
export async function mergeGuestCart(userId, guestItems = []) {
  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    return getOrCreateCart(userId);
  }

  const updatedCart = await prisma.$transaction(async (tx) => {
    let cart = await tx.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { userId },
      });
    }

    // Extract valid UUIDs
    const variantIds = guestItems
      .map((item) => item.variantId)
      .filter((id) => typeof id === "string");

    if (variantIds.length === 0) {
      return tx.cart.findUnique({
        where: { id: cart.id },
        include: cartInclude,
      });
    }

    // Fetch active variants and products from database
    const variants = await tx.productVariant.findMany({
      where: {
        id: { in: variantIds },
        isActive: true,
        product: { isActive: true },
      },
      include: { product: true },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const guestItem of guestItems) {
      const variant = variantMap.get(guestItem.variantId);
      if (!variant || variant.stockQuantity <= 0) continue;
      const vPrice = variant.price !== null && variant.price !== undefined ? Number(variant.price) : 0;
      if (isNaN(vPrice) || vPrice <= 0) continue;

      const requestedQty = Math.max(1, parseInt(guestItem.quantity, 10) || 1);

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: variant.id,
          },
        },
      });

      if (existing) {
        const mergedQty = Math.min(existing.quantity + requestedQty, variant.stockQuantity, 999);
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: mergedQty },
        });
      } else {
        const newQty = Math.min(requestedQty, variant.stockQuantity, 999);
        if (newQty > 0) {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              variantId: variant.id,
              quantity: newQty,
            },
          });
        }
      }
    }

    return tx.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });
  });

  return formatCart(updatedCart);
}
