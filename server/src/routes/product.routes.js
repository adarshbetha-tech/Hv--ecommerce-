import { Router } from "express";
import * as productController from "../controllers/product.controller.js";
import { validateQuery, validateParams } from "../middleware/validate.middleware.js";
import {
  listProductsQuerySchema,
  productParamSchema,
} from "../validators/catalog.validator.js";

export const productRouter = Router();

// List active products with pagination, search, category filter, and sorting
productRouter.get(
  "/",
  validateQuery(listProductsQuerySchema),
  productController.listProducts
);

// Explicit slug route (matches API.md: /products/slug/:slug)
productRouter.get(
  "/slug/:slug",
  validateParams(productParamSchema),
  productController.getProduct
);

// Explicit ID route (matches API.md: /products/:id)
productRouter.get(
  "/id/:slug",
  validateParams(productParamSchema),
  productController.getProduct
);

// Get product details and active variants by slug
productRouter.get(
  "/:slug",
  validateParams(productParamSchema),
  productController.getProduct
);

// Stream product specification PDF/document
productRouter.get(
  "/:slug/specification",
  validateParams(productParamSchema),
  productController.getProductSpecification
);

// Optional variant retrieval endpoint
productRouter.get(
  "/:slug/variants",
  validateParams(productParamSchema),
  productController.getProductVariants
);
