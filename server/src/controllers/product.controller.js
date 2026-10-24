import * as productService from "../services/product.service.js";

/**
 * Controller to list active products with pagination, search, category/price filter, and sorting.
 */
export async function listProducts(req, res, next) {
  try {
    const { q, category, brand, minPrice, maxPrice, sort, page, limit } = req.query;

    const result = await productService.listProducts({
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      products: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get product details and active variants by slug or ID.
 */
export async function getProduct(req, res, next) {
  try {
    const identifier = req.params.slug || req.params.id;
    const product = await productService.getProductBySlugOrId(identifier);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to retrieve active variants of a specific product.
 */
export async function getProductVariants(req, res, next) {
  try {
    const identifier = req.params.slug || req.params.id;
    const variants = await productService.getProductVariants(identifier);

    return res.status(200).json({
      success: true,
      variants,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to retrieve and stream a stored specification document for a product.
 */
export async function getProductSpecification(req, res, next) {
  try {
    const identifier = req.params.slug || req.params.id;
    const product = await productService.getProductBySlugOrId(identifier);

    if (!product) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Product not found.",
        },
      });
    }

    const { getProductSpecification: getSpec } = await import("../services/admin.service.js");
    const spec = await getSpec(product.id);

    if (!spec || !spec.filePath) {
      return res.status(404).json({
        error: {
          code: "SPECIFICATION_NOT_FOUND",
          message: "No specification document is attached to this product.",
        },
      });
    }

    res.setHeader("Content-Type", spec.meta.fileType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${spec.meta.fileName}"`);
    return res.sendFile(spec.filePath);
  } catch (error) {
    next(error);
  }
}
