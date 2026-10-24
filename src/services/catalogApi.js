/**
 * VERTEX Customer Storefront Catalog API Service
 * 
 * Provides client methods to interact with catalog and category endpoints.
 * Integrates with live backend when available and provides seamless fallback
 * to centralized catalog data when backend is offline.
 */

import { isMockApiEnabled } from "../mock/mockConfig";
import * as mockCatalogApi from "../mock/mockCatalogApi";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const defaultHeaders = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

/**
 * Helper to process API responses safely
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      const error = new Error(`Server returned status ${response.status} (${response.statusText})`);
      error.status = response.status;
      throw error;
    }
    return { success: true };
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || "An unexpected error occurred.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || data?.code || "REQUEST_FAILED";
    err.status = response.status;
    err.details = data?.error?.details || [];
    throw err;
  }

  return data;
}

/**
 * Fetches all active top-level categories and subcategories.
 */
export async function getCategories() {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getCategories();
  }

  try {
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: "GET",
      headers: defaultHeaders,
      credentials: "include",
    });
    return await handleResponse(response);
  } catch (err) {
    // Graceful offline fallback to centralized catalog
    console.warn("Backend catalog service offline, utilizing local catalog data.", err.message);
    return mockCatalogApi.getCategories();
  }
}

/**
 * Fetches a single category and its products by slug.
 */
export async function getCategoryBySlug(slug) {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getCategoryBySlug(slug);
  }

  try {
    const response = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(slug)}`, {
      method: "GET",
      headers: defaultHeaders,
      credentials: "include",
    });
    return await handleResponse(response);
  } catch (err) {
    console.warn("Backend category endpoint offline, utilizing local catalog data.", err.message);
    return mockCatalogApi.getCategoryBySlug(slug);
  }
}

/**
 * Fetches active products with search, category/subcategory/brand filters, and sorting.
 */
export async function getProducts({
  q = "",
  category = "",
  subcategory = "",
  subcat = "",
  brand = "",
  minPrice = "",
  maxPrice = "",
  inStockOnly = false,
  sort = "newest",
  page = 1,
  limit = 100,
  officialOnly = true,
} = {}) {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getProducts({
      q,
      category,
      subcategory: subcategory || subcat,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
      page,
      limit,
      officialOnly,
    });
  }

  const query = new URLSearchParams();
  if (q && q.trim()) query.set("q", q.trim());
  if (category && category.trim() && category !== "all") query.set("category", category.trim());
  if ((subcategory || subcat) && (subcategory || subcat) !== "all") query.set("subcat", (subcategory || subcat).trim());
  if (brand && brand.trim() && brand !== "all") query.set("brand", brand.trim());
  if (minPrice !== "" && !isNaN(minPrice)) query.set("minPrice", minPrice);
  if (maxPrice !== "" && !isNaN(maxPrice)) query.set("maxPrice", maxPrice);
  if (inStockOnly) query.set("inStockOnly", "true");
  if (sort) query.set("sort", sort);
  if (page) query.set("page", page);
  if (limit) query.set("limit", limit);
  if (officialOnly !== undefined) query.set("officialOnly", String(officialOnly));

  try {
    const response = await fetch(`${API_BASE}/api/products?${query.toString()}`, {
      method: "GET",
      headers: defaultHeaders,
      credentials: "include",
    });
    return await handleResponse(response);
  } catch (err) {
    console.warn("Backend product service offline, utilizing local catalog data.", err.message);
    return mockCatalogApi.getProducts({
      q,
      category,
      subcategory: subcategory || subcat,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
      page,
      limit,
      officialOnly,
    });
  }
}

/**
 * Fetches a single product and its active variants by slug.
 */
export async function getProductBySlug(slug) {
  if (isMockApiEnabled()) {
    return mockCatalogApi.getProductBySlug(slug);
  }

  try {
    const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`, {
      method: "GET",
      headers: defaultHeaders,
      credentials: "include",
    });
    return await handleResponse(response);
  } catch (err) {
    console.warn("Backend product detail service offline, utilizing local catalog data.", err.message);
    return mockCatalogApi.getProductBySlug(slug);
  }
}
