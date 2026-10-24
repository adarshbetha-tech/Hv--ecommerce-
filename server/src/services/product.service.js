import { prisma } from "../config/db.js";
import { formatProduct, formatVariant } from "../utils/catalogSerializer.js";

/**
 * Lists active products with pagination, search, category/brand/price filtering, and sorting.
 */
export async function listProducts({
  q,
  category,
  subcat,
  brand,
  minPrice,
  maxPrice,
  inStockOnly,
  sort = "newest",
  page = 1,
  limit = 12,
}) {
  const where = {
    isActive: true,
    category: {
      isActive: true,
    },
  };

  // Subcategory filter has highest specificity
  if (subcat) {
    where.category = {
      isActive: true,
      OR: [{ slug: subcat.toLowerCase() }, { id: subcat }],
    };
  } else if (category) {
    // Category filter matches direct category or any child subcategories
    where.category = {
      isActive: true,
      OR: [
        { slug: category.toLowerCase() },
        { id: category },
        { parent: { OR: [{ slug: category.toLowerCase() }, { id: category }] } },
      ],
    };
  }

  // Brand filter
  if (brand) {
    where.brand = {
      equals: brand,
      mode: "insensitive",
    };
  }

  // Keyword search
  if (q) {
    const trimmedQ = q.trim();
    where.OR = [
      { name: { contains: trimmedQ, mode: "insensitive" } },
      { description: { contains: trimmedQ, mode: "insensitive" } },
      { brand: { contains: trimmedQ, mode: "insensitive" } },
      { tag: { contains: trimmedQ, mode: "insensitive" } },
      {
        category: {
          name: { contains: trimmedQ, mode: "insensitive" },
          isActive: true,
        },
      },
      {
        variants: {
          some: {
            isActive: true,
            OR: [
              { sku: { contains: trimmedQ, mode: "insensitive" } },
              { partNumber: { contains: trimmedQ, mode: "insensitive" } },
              { name: { contains: trimmedQ, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  // In-stock filtering on active variants
  if (inStockOnly) {
    where.variants = {
      ...(where.variants || {}),
      some: {
        ...(where.variants?.some || {}),
        isActive: true,
        stockQuantity: { gt: 0 },
      },
    };
  }

  // Price range filtering based on product base price (minimum active variant price)
  if (minPrice !== undefined) {
    where.variants = {
      ...(where.variants || {}),
      none: {
        ...(where.variants?.none || {}),
        isActive: true,
        price: { lt: minPrice },
      },
      some: {
        ...(where.variants?.some || {}),
        isActive: true,
      },
    };
  }

  if (maxPrice !== undefined) {
    where.variants = {
      ...(where.variants || {}),
      some: {
        ...(where.variants?.some || {}),
        isActive: true,
        price: { lte: maxPrice },
      },
    };
  }

  // Price-based sorting: aggregate and paginate at the database level using Prisma groupBy
  // Documents price rule: product base price is defined as the minimum active variant price.
  if (sort === "price_asc" || sort === "price_desc") {
    const orderDir = sort === "price_asc" ? "asc" : "desc";

    const variantWhere = {
      isActive: true,
      product: where,
      ...(inStockOnly ? { stockQuantity: { gt: 0 } } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    };

    // Ensure totalItems strictly reflects active products that have active variants
    // matching any price filters, ensuring complete consistency with prisma.productVariant.groupBy
    const priceCountWhere = {
      ...where,
      variants: {
        ...(where.variants || {}),
        some: {
          ...(where.variants?.some || {}),
          isActive: true,
          ...(minPrice !== undefined || maxPrice !== undefined
            ? {
                price: {
                  ...(minPrice !== undefined ? { gte: minPrice } : {}),
                  ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                },
              }
            : {}),
        },
      },
    };

    // 1. Concurrently query total matching products count and paginated product IDs at the database level
    const [totalItems, priceGroups] = await Promise.all([
      prisma.product.count({ where: priceCountWhere }),
      prisma.productVariant.groupBy({
        by: ["productId"],
        where: variantWhere,
        _min: { price: true },
        orderBy: [
          { _min: { price: orderDir } },
          { productId: "asc" }, // Deterministic tie-breaker for identical variant prices
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginatedIds = priceGroups.map((g) => g.productId);

    if (paginatedIds.length === 0) {
      return {
        products: [],
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }

    // 2. Fetch full product details only for the requested page slice
    const products = await prisma.product.findMany({
      where: {
        id: { in: paginatedIds },
        isActive: true,
      },
      include: {
        category: true,
        variants: {
          where: {
            isActive: true,
            ...(minPrice !== undefined || maxPrice !== undefined
              ? {
                  price: {
                    ...(minPrice !== undefined ? { gte: minPrice } : {}),
                    ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                  },
                }
              : {}),
          },
          include: { tieredPrices: true },
        },
      },
    });

    // 3. Preserve the exact database-sorted order
    const productMap = new Map(products.map((p) => [p.id, p]));
    const sortedProducts = paginatedIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map(formatProduct);

    return {
      products: sortedProducts,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // Standard non-variant sorting
  let orderBy = { createdAt: "desc" };
  if (sort === "name_asc") orderBy = { name: "asc" };
  if (sort === "name_desc") orderBy = { name: "desc" };

  const [totalItems, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: {
            isActive: true,
            ...(minPrice !== undefined || maxPrice !== undefined
              ? {
                  price: {
                    ...(minPrice !== undefined ? { gte: minPrice } : {}),
                    ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                  },
                }
              : {}),
          },
          include: { tieredPrices: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    products: products.map(formatProduct),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Retrieves a single active product by slug or UUID.
 * Returns 404 if product is not found or is marked inactive.
 */
export async function getProductBySlugOrId(identifier) {
  const normalized = identifier.trim();

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { slug: normalized.toLowerCase() },
        { id: normalized },
      ],
      isActive: true,
      category: {
        isActive: true,
      },
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        include: { tieredPrices: true },
      },
    },
  });

  if (!product || !product.isActive) {
    const error = new Error("Product not found.");
    error.code = "PRODUCT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return formatProduct(product);
}

/**
 * Retrieves only the active variants for a given product.
 */
export async function getProductVariants(identifier) {
  const product = await getProductBySlugOrId(identifier);
  return product.variants;
}
