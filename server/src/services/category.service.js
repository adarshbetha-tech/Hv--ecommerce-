import { prisma } from "../config/db.js";
import { formatCategory, formatProduct } from "../utils/catalogSerializer.js";

/**
 * Lists all active categories, optionally organized with subcategories and active product counts.
 */
export async function listActiveCategories() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null, // Top-level categories
    },
    include: {
      children: {
        where: { isActive: true },
        include: {
          _count: {
            select: {
              products: { where: { isActive: true } },
            },
          },
        },
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
        },
      },
    },
  });

  // Fasteners must appear first and Electronic Products second
  const priorityMap = {
    fasteners: 1,
    electronics: 2,
  };

  categories.sort((a, b) => {
    const pA = priorityMap[a.slug?.toLowerCase()] || 99;
    const pB = priorityMap[b.slug?.toLowerCase()] || 99;
    if (pA !== pB) return pA - pB;
    return (a.name || "").localeCompare(b.name || "");
  });

  return categories.map(formatCategory);
}

/**
 * Retrieves a single active category by its slug, including its active products.
 */
export async function getCategoryBySlug(slug) {
  const normalizedSlug = slug.trim().toLowerCase();

  const category = await prisma.category.findUnique({
    where: { slug: normalizedSlug },
    include: {
      children: {
        where: { isActive: true },
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
        },
      },
    },
  });

  if (!category || !category.isActive) {
    const error = new Error("Category not found.");
    error.code = "CATEGORY_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  // Fetch active products in this category or its subcategories
  const categoryIds = [category.id, ...(category.children || []).map((c) => c.id)];
  const products = await prisma.product.findMany({
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        include: {
          tieredPrices: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    category: formatCategory(category),
    products: products.map(formatProduct),
  };
}
