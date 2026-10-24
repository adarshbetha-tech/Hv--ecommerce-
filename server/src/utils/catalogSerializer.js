/**
 * Formats a ProductVariant record for public consumption.
 * Ensures precise numeric prices and excludes internal fields.
 */
export function formatVariant(variant) {
  if (!variant) return null;

  const numericPrice = variant.price !== null && variant.price !== undefined ? Number(variant.price) : null;
  const isPositivePrice = numericPrice !== null && !isNaN(numericPrice) && numericPrice > 0;

  const numericMrp = variant.mrp !== null && variant.mrp !== undefined ? Number(variant.mrp) : null;
  const isPositiveMrp = numericMrp !== null && !isNaN(numericMrp) && numericMrp > 0;

  return {
    id: variant.id,
    sku: variant.sku,
    partNumber: variant.partNumber || null,
    name: variant.name || null,
    packSize: variant.packSize || null,
    dimensions: variant.dimensions || null,
    price: isPositivePrice ? numericPrice : null,
    mrp: isPositiveMrp ? numericMrp : null,
    stockQuantity: variant.stockQuantity,
    inStock: variant.stockQuantity > 0,
    tieredPrices: (variant.tieredPrices || []).map((tp) => ({
      minQuantity: tp.minQuantity,
      maxQuantity: tp.maxQuantity,
      unitPrice: Number(tp.unitPrice),
    })),
  };
}

/**
 * Formats a Product record with its Category and active Variants.
 * Base price is the minimum positive price across active variants.
 * If no active variant has a positive price, base price is null (RFQ / Quote on Request).
 */
export function formatProduct(product) {
  if (!product) return null;

  // Filter only active variants for public customer safety
  const activeVariants = (product.variants || [])
    .filter((v) => v.isActive)
    .map(formatVariant);

  // Compute lowest base price and corresponding MRP from active variants with positive prices
  let minPrice = null;
  let correspondingMrp = null;
  let totalStock = 0;

  for (const v of activeVariants) {
    totalStock += v.stockQuantity;
    if (v.price !== null && v.price > 0) {
      if (minPrice === null || v.price < minPrice) {
        minPrice = v.price;
        correspondingMrp = v.mrp;
      }
    }
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || null,
    brand: product.brand || null,
    hsnCode: product.hsnCode || null,
    gstRate: Number(product.gstRate),
    tag: product.tag || null,
    imageUrl: product.imageUrl || null,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null,
    price: minPrice,
    mrp: correspondingMrp,
    inStock: totalStock > 0,
    variants: activeVariants,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Formats a Category record.
 */
export function formatCategory(category) {
  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || null,
    icon: category.icon || null,
    tint: category.tint || null,
    imageUrl: category.imageUrl || null,
    parentId: category.parentId || null,
    children: (category.children || [])
      .filter((c) => c.isActive)
      .map(formatCategory),
    productsCount: category._count?.products ?? undefined,
  };
}
