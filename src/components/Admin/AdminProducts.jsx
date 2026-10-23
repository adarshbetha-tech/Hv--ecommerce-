import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getAdminProducts,
  getAdminCategories,
  createAdminProduct,
  updateAdminProduct,
  updateProductPrice,
} from "../../services/adminApi";
import {
  saveSpecificationFile,
  getSpecificationFile,
  deleteSpecificationFile,
  openOrDownloadSpecFile,
} from "../../utils/specFileStorage";

// Currency Formatter
const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper: Format file size in B, KB, or MB
const formatFileSize = (bytes) => {
  const num = Number(bytes);
  if (!num || isNaN(num) || num <= 0) return "0 KB";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
};

// Helper: Detect potential metric fastener dimensions from file name
const extractFastenerDimensions = (fileName = "") => {
  if (!fileName) return null;
  const metricMatch = fileName.match(/(?:^|[^a-zA-Z0-9])(M\d+(?:\.\d+)?)\s*[-xX_]\s*(\d+(?:\.\d+)?)(?:\s*mm)?/i);
  if (metricMatch) {
    return `${metricMatch[1].toUpperCase()} × ${metricMatch[2]}mm`;
  }
  const threadOnly = fileName.match(/(?:^|[^a-zA-Z0-9])(M\d+(?:\.\d+)?)(?:$|[^a-zA-Z0-9])/i);
  if (threadOnly) {
    return `${threadOnly[1].toUpperCase()} Standard Metric`;
  }
  return null;
};

const ALLOWED_SPEC_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv"];
const MAX_SPEC_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Helper: Calculate total stock quantity across all variants of a product
const getProductTotalStock = (p) => {
  if (p?.variants && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
  }
  return Number(p?.stockQuantity) || 0;
};

// Helper: Calculate minimum price across variants
const getProductMinPrice = (p) => {
  if (p?.variants && p.variants.length > 0) {
    const validPrices = p.variants
      .map((v) => v.price)
      .filter((pr) => pr !== null && pr !== undefined && !isNaN(Number(pr)) && Number(pr) > 0);
    if (validPrices.length > 0) {
      return Math.min(...validPrices.map(Number));
    }
  }
  if (p?.price !== null && p?.price !== undefined && !isNaN(Number(p.price)) && Number(p.price) > 0) {
    return Number(p.price);
  }
  return null;
};

// Helper: Get stock health badge
const getStockBadge = (totalStock) => {
  if (totalStock > 50) {
    return { label: `In Stock (${totalStock})`, className: "adm-badge-success" };
  }
  if (totalStock > 0) {
    return { label: `Low Stock (${totalStock})`, className: "adm-badge-warning" };
  }
  return { label: "Out of Stock (0)", className: "adm-badge-danger" };
};

// Helper: Category iconography
const getCategoryIcon = (slugOrName = "") => {
  const s = String(slugOrName).toLowerCase();
  if (s.includes("micro") || s.includes("elec") || s.includes("board")) return "⚡";
  if (s.includes("screw") || s.includes("fastener") || s.includes("bolt")) return "🔩";
  if (s.includes("sensor")) return "📡";
  if (s.includes("wire") || s.includes("cable")) return "🔌";
  return "📦";
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Inspection
  const [inspectingProduct, setInspectingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // Edit Product & Category Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    categoryId: "",
    brand: "VERTEX",
    hsnCode: "8542",
    gstRate: "18.00",
    tag: "",
    imageUrl: "",
    description: "",
    price: "",
    stockQuantity: "",
    specificationFileName: "",
    isActive: true,
  });
  const [editModalSubmitting, setEditModalSubmitting] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState(null);

  // Dedicated Price Editing State
  const [pricingProduct, setPricingProduct] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState("");
  const [priceModalSubmitting, setPriceModalSubmitting] = useState(false);
  const [priceModalMessage, setPriceModalMessage] = useState(null);

  // Specification File Upload State
  const [specFile, setSpecFile] = useState(null);
  const [specFileError, setSpecFileError] = useState("");
  const [extractedDimensions, setExtractedDimensions] = useState(null);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    categoryId: "",
    brand: "VERTEX",
    hsnCode: "8542",
    gstRate: "18.00",
    tag: "",
    description: "",
    sku: "",
    partNumber: "",
    price: "",
    stockQuantity: "50",
  });

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminProducts({
        q: searchQuery,
        category: selectedCategory,
        sort: selectedSort,
        page: currentPage,
        limit: 10,
        officialOnly: true,
      });

      if (res?.products) {
        // Enforce official catalog products on client in case API returns unfiltered results
        const officialProducts = res.products.filter((p) => p.isOfficialCatalog !== false);
        setProducts(officialProducts);
        setPagination(
          res.pagination
            ? res.pagination
            : {
                page: currentPage,
                limit: 10,
                totalItems: officialProducts.length,
                totalPages: Math.max(1, Math.ceil(officialProducts.length / 10)),
              }
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load products from catalog API.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedSort, currentPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    async function loadCats() {
      try {
        const catRes = await getAdminCategories();
        if (catRes?.categories) {
          // Keep only official categories (Fasteners and Electronic Products)
          const legacyFixtureCategoryIds = new Set(["cat-nuts", "cat-automation", "cat-tools"]);
          const officialCats = catRes.categories.filter((c) => {
            if (c.isOfficial === false) return false;
            if (catRes.categories.some((cat) => cat.id === "cat-fasteners" || cat.id === "cat-electronics")) {
              if (legacyFixtureCategoryIds.has(c.id)) return false;
            }
            return true;
          });
          setCategories(officialCats);
          if (officialCats.length > 0 && !newProduct.categoryId) {
            setNewProduct((prev) => ({ ...prev, categoryId: officialCats[0].id }));
          }
        }
      } catch (e) {
        // Ignored
      }
    }
    loadCats();
  }, [newProduct.categoryId]);

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (isAddModalOpen || inspectingProduct || editingProduct || pricingProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddModalOpen, inspectingProduct, editingProduct, pricingProduct]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setNewProduct((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === prev.name.toLowerCase().replace(/\s+/g, "-") ? slug : prev.slug,
      sku: prev.sku === "" ? `VTX-${slug.slice(0, 8).toUpperCase()}` : prev.sku,
    }));
  };

  // File selection and validation handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSpecFileError("");

    const name = file.name || "";
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();

    if (!ALLOWED_SPEC_EXTENSIONS.includes(ext)) {
      setSpecFile(null);
      setExtractedDimensions(null);
      setSpecFileError(
        `Unsupported file format (${ext || "unknown"}). Allowed formats: PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv).`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SPEC_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setSpecFile(null);
      setExtractedDimensions(null);
      setSpecFileError(
        `File size exceeds 10 MB limit (${sizeMB} MB). Please attach a compressed technical datasheet.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSpecFile(file);
    setSpecFileError("");

    const extracted = extractFastenerDimensions(file.name);
    if (extracted) {
      setExtractedDimensions(extracted);
    } else {
      setExtractedDimensions(null);
    }
  };

  const handleRemoveSpecFile = () => {
    setSpecFile(null);
    setSpecFileError("");
    setExtractedDimensions(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApplyExtractedDimensions = () => {
    if (extractedDimensions) {
      setNewProduct((prev) => ({
        ...prev,
        partNumber: prev.partNumber ? `${prev.partNumber} (${extractedDimensions})` : extractedDimensions,
        description: prev.description
          ? `${prev.description}\nDimensions: ${extractedDimensions}`
          : `Dimensions: ${extractedDimensions}`,
      }));
      setExtractedDimensions(null);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setModalMessage(null);

    if (!newProduct.name.trim() || !newProduct.sku.trim() || !newProduct.price) {
      setModalMessage({
        type: "error",
        text: "Please provide a product name, variant SKU, and unit price.",
      });
      return;
    }

    try {
      setModalSubmitting(true);
      const res = await createAdminProduct({
        ...newProduct,
        price: parseFloat(newProduct.price),
        stockQuantity: parseInt(newProduct.stockQuantity, 10) || 0,
        gstRate: parseFloat(newProduct.gstRate) || 18.0,
        specificationFileName: specFile ? specFile.name : null,
        specificationFileSize: specFile ? specFile.size : null,
        specificationFileType: specFile ? specFile.type : null,
        hasSpecificationFile: Boolean(specFile),
      });

      if (specFile && (res?.product?.id || res?.product?.slug || newProduct.slug)) {
        try {
          await saveSpecificationFile(res?.product?.id || res?.product?.slug || newProduct.slug, specFile);
        } catch {
          // Fallback handled gracefully
        }
      }

      setModalMessage({
        type: "success",
        text: `Product '${res?.product?.name || newProduct.name}' registered successfully!`,
      });

      await loadProducts();

      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewProduct({
          name: "",
          slug: "",
          categoryId: categories[0]?.id || "",
          brand: "VERTEX",
          hsnCode: "8542",
          gstRate: "18.00",
          tag: "",
          description: "",
          sku: "",
          partNumber: "",
          price: "",
          stockQuantity: "50",
        });
        handleRemoveSpecFile();
        setModalMessage(null);
      }, 1200);
    } catch (err) {
      setModalMessage({
        type: err.status === 404 ? "warning" : "error",
        text: err.status === 404
          ? "Notice: The backend product creation endpoint (POST /api/admin/products) is scheduled for Phase 4/6 catalog mutation. Form validated successfully on the client."
          : err.message,
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStartEditProduct = (product) => {
    setEditingProduct(product);
    const initialCatId =
      product.subcategory?.id ||
      product.categoryId ||
      product.category?.id ||
      (categories[0]?.id || "");
    const firstVariant = product.variants?.[0] || {};
    const effectivePrice =
      firstVariant.price !== undefined && firstVariant.price !== null
        ? String(firstVariant.price)
        : product.price !== undefined && product.price !== null
        ? String(product.price)
        : "";
    const effectiveStock =
      firstVariant.stockQuantity !== undefined && firstVariant.stockQuantity !== null
        ? String(firstVariant.stockQuantity)
        : product.stockQuantity !== undefined && product.stockQuantity !== null
        ? String(product.stockQuantity)
        : "50";

    setEditForm({
      name: product.name || "",
      slug: product.slug || "",
      categoryId: initialCatId,
      brand: product.brand || "VERTEX",
      hsnCode: product.hsnCode || "8542",
      gstRate: product.gstRate !== undefined && product.gstRate !== null ? String(product.gstRate) : "18.00",
      tag: product.tag || "",
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      price: effectivePrice,
      stockQuantity: effectiveStock,
      specificationFileName: product.specificationFileName || "",
      isActive: product.isActive !== false,
    });
    setEditModalMessage(null);
  };

  const handleEditSpecFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name || "";
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();

    if (!ALLOWED_SPEC_EXTENSIONS.includes(ext)) {
      setEditModalMessage({
        type: "error",
        text: `Unsupported file format (${ext || "unknown"}). Allowed formats: PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv).`,
      });
      if (editFileInputRef.current) editFileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SPEC_FILE_SIZE) {
      setEditModalMessage({
        type: "error",
        text: `File size exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      });
      if (editFileInputRef.current) editFileInputRef.current.value = "";
      return;
    }

    try {
      await saveSpecificationFile(editingProduct.id, file);
      setEditForm((prev) => ({
        ...prev,
        specificationFileName: file.name,
      }));
      setEditModalMessage({
        type: "success",
        text: `Specification file "${file.name}" uploaded and attached to product.`,
      });
    } catch {
      setEditModalMessage({
        type: "error",
        text: "Failed to store specification file.",
      });
    }
  };

  const handleDeleteEditSpecFile = () => {
    if (editingProduct?.id) {
      deleteSpecificationFile(editingProduct.id);
    }
    setEditForm((prev) => ({
      ...prev,
      specificationFileName: "",
    }));
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    setEditModalMessage({
      type: "success",
      text: "Specification attachment removed.",
    });
  };

  const handleViewEditSpecFile = () => {
    const record = getSpecificationFile(editingProduct?.id) || getSpecificationFile(editForm.specificationFileName);
    openOrDownloadSpecFile(editForm.specificationFileName, record?.dataUrl);
  };

  const handleSaveEditProduct = async (e) => {
    e.preventDefault();
    setEditModalMessage(null);

    if (!editForm.name.trim()) {
      setEditModalMessage({
        type: "error",
        text: "Product name is required.",
      });
      return;
    }

    if (!editForm.categoryId) {
      setEditModalMessage({
        type: "error",
        text: "Please select a valid category for this product.",
      });
      return;
    }

    if (editForm.price !== "" && (isNaN(Number(editForm.price)) || Number(editForm.price) <= 0)) {
      setEditModalMessage({
        type: "error",
        text: "Selling price must be a positive number.",
      });
      return;
    }

    if (
      editForm.stockQuantity !== "" &&
      (isNaN(Number(editForm.stockQuantity)) ||
        Number(editForm.stockQuantity) < 0 ||
        !Number.isInteger(Number(editForm.stockQuantity)))
    ) {
      setEditModalMessage({
        type: "error",
        text: "Stock quantity must be a non-negative integer.",
      });
      return;
    }

    // Verify the chosen category is active (search top-level categories and subcategories)
    let selectedCatObj = categories.find((c) => c.id === editForm.categoryId);
    let selectedSubObj = null;

    if (!selectedCatObj) {
      for (const parent of categories) {
        const found = (parent.children || []).find((sub) => sub.id === editForm.categoryId);
        if (found) {
          selectedCatObj = parent;
          selectedSubObj = found;
          break;
        }
      }
    }

    if (!selectedCatObj) {
      setEditModalMessage({
        type: "error",
        text: "The selected category is not active or could not be found. Please choose an active category.",
      });
      return;
    }

    try {
      setEditModalSubmitting(true);
      const updatePayload = {
        name: editForm.name.trim(),
        categoryId: editForm.categoryId,
        brand: editForm.brand.trim() || null,
        tag: editForm.tag.trim() || null,
        description: editForm.description.trim() || null,
        imageUrl: editForm.imageUrl.trim() || null,
        hsnCode: editForm.hsnCode.trim() || null,
        gstRate: !isNaN(parseFloat(editForm.gstRate)) ? parseFloat(editForm.gstRate) : 18.0,
        specificationFileName: editForm.specificationFileName.trim() || null,
        isActive: editForm.isActive,
      };

      if (editForm.price !== "") {
        updatePayload.price = parseFloat(editForm.price);
      }
      if (editForm.stockQuantity !== "") {
        updatePayload.stockQuantity = parseInt(editForm.stockQuantity, 10);
      }

      const res = await updateAdminProduct(editingProduct.id, updatePayload);

      // If price was edited and dedicated endpoint exists, synchronize
      if (editForm.price !== "" && Number(editForm.price) > 0) {
        try {
          await updateProductPrice(editingProduct.id, { price: parseFloat(editForm.price) });
        } catch {
          // Fallback if price was handled via updateAdminProduct
        }
      }

      const updated = res?.product || {
        ...editingProduct,
        ...editForm,
        ...updatePayload,
        categoryId: selectedCatObj.id,
        category: { id: selectedCatObj.id, name: selectedCatObj.name, slug: selectedCatObj.slug },
        subcategory: selectedSubObj ? { id: selectedSubObj.id, name: selectedSubObj.name, slug: selectedSubObj.slug } : null,
      };

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== editingProduct.id) return p;
          // Protect and update variant records atomically without losing variant array
          const updatedVariants = (p.variants || []).map((v, idx) => {
            if (idx === 0) {
              return {
                ...v,
                ...(editForm.price !== "" ? { price: parseFloat(editForm.price) } : {}),
                ...(editForm.stockQuantity !== "" ? { stockQuantity: parseInt(editForm.stockQuantity, 10) } : {}),
              };
            }
            return v;
          });
          return {
            ...p,
            ...updated,
            ...updatePayload,
            price: editForm.price !== "" ? parseFloat(editForm.price) : p.price,
            stockQuantity: editForm.stockQuantity !== "" ? parseInt(editForm.stockQuantity, 10) : p.stockQuantity,
            variants: updatedVariants.length > 0 ? updatedVariants : p.variants,
          };
        })
      );

      if (inspectingProduct?.id === editingProduct.id) {
        setInspectingProduct((prev) => ({
          ...prev,
          ...updated,
          ...updatePayload,
          price: editForm.price !== "" ? parseFloat(editForm.price) : prev.price,
          stockQuantity: editForm.stockQuantity !== "" ? parseInt(editForm.stockQuantity, 10) : prev.stockQuantity,
        }));
      }

      setEditModalMessage({
        type: "success",
        text: `Product "${updated.name}" updated successfully across catalog.`,
      });

      setTimeout(() => {
        setEditingProduct(null);
        setEditModalMessage(null);
      }, 1000);
    } catch (err) {
      setEditModalMessage({
        type: "error",
        text: err.message || "Failed to update product category and details.",
      });
    } finally {
      setEditModalSubmitting(false);
    }
  };

  const handleStartEditPrice = (product) => {
    setPricingProduct(product);
    const currentPrice = getProductMinPrice(product);
    setNewPriceValue(currentPrice !== null && currentPrice !== undefined ? String(currentPrice) : "");
    setPriceModalMessage(null);
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    setPriceModalMessage(null);

    const parsedPrice = parseFloat(newPriceValue);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setPriceModalMessage({
        type: "error",
        text: "Please enter a valid positive selling price (greater than ₹0).",
      });
      return;
    }

    try {
      setPriceModalSubmitting(true);
      const targetVariantId = pricingProduct.variants?.[0]?.id || null;
      await updateProductPrice(pricingProduct.id, {
        price: parsedPrice,
        variantId: targetVariantId,
      });

      // Update local products state immediately
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === pricingProduct.id) {
            const updatedVariants = (p.variants || []).map((v, i) =>
              i === 0 || v.id === targetVariantId ? { ...v, price: parsedPrice } : v
            );
            return {
              ...p,
              price: parsedPrice,
              variants: updatedVariants.length > 0 ? updatedVariants : [{ price: parsedPrice }],
            };
          }
          return p;
        })
      );

      setPriceModalMessage({
        type: "success",
        text: `Selling price for "${pricingProduct.name}" successfully updated to ${formatINR(parsedPrice)}.`,
      });

      setTimeout(() => {
        setPricingProduct(null);
        setPriceModalMessage(null);
        loadProducts();
      }, 1000);
    } catch (err) {
      setPriceModalMessage({
        type: "error",
        text: err.message || "Failed to update product selling price.",
      });
    } finally {
      setPriceModalSubmitting(false);
    }
  };

  // Resilient multi-criteria client filtering
  const filteredProducts = products.filter((p) => {
    // 1. Stock filter
    if (stockFilter !== "all") {
      const stock = getProductTotalStock(p);
      if (stockFilter === "in_stock" && stock <= 50) return false;
      if (stockFilter === "low_stock" && (stock === 0 || stock > 50)) return false;
      if (stockFilter === "out_of_stock" && stock !== 0) return false;
    }
    // 2. Search query (matches name, slug, brand, or variant SKUs)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (p.name || "").toLowerCase().includes(q);
      const slugMatch = (p.slug || "").toLowerCase().includes(q);
      const brandMatch = (p.brand || "").toLowerCase().includes(q);
      const skuMatch = (p.variants || []).some((v) => (v.sku || "").toLowerCase().includes(q));
      if (!nameMatch && !slugMatch && !brandMatch && !skuMatch) return false;
    }
    // 3. Category filter
    if (selectedCategory) {
      const catSlug = (p.category?.slug || "").toLowerCase();
      const catId = (p.categoryId || p.category?.id || "").toLowerCase();
      const subSlug = (p.subcategory?.slug || "").toLowerCase();
      const subId = (p.subcategory?.id || "").toLowerCase();
      const sel = selectedCategory.toLowerCase();
      if (catSlug !== sel && catId !== sel && subSlug !== sel && subId !== sel) return false;
    }
    return true;
  });

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory ||
    stockFilter !== "all" ||
    selectedSort !== "newest"
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setStockFilter("all");
    setSelectedSort("newest");
    setCurrentPage(1);
  };

  // KPI Calculations
  const totalProductsCount = pagination.totalItems || products.length;
  const officialCategoriesList = categories.filter((c) => {
    if (c.isOfficial === false) return false;
    const legacyIds = new Set(["cat-nuts", "cat-automation", "cat-tools"]);
    if (categories.some((cat) => cat.id === "cat-fasteners" || cat.id === "cat-electronics")) {
      if (legacyIds.has(c.id)) return false;
    }
    return true;
  });
  const activeCategoriesCount = officialCategoriesList.length || (products.length ? new Set(products.map((p) => p.category?.id || p.categoryId)).size : 0);
  const totalVariantsCount = products.reduce((acc, p) => acc + (p.variants?.length || 1), 0);
  const totalStockUnits = products.reduce((acc, p) => acc + getProductTotalStock(p), 0);

  return (
    <div className="adm-products-view">
      {/* Page Header */}
      <div className="adm-page-header">
        <div className="adm-page-title-group">
          <h1>Product Catalog Management</h1>
          <p className="adm-page-subtitle">
            Search, filter, inspect specifications, and manage industrial electronics &amp; hardware products.
          </p>
        </div>
        <div className="adm-page-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => loadProducts()}
            disabled={loading}
            title="Refresh products from database"
          >
            ↻ Refresh Catalog
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            data-testid="add-new-product-btn"
          >
            + Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-notice-banner adm-notice-warning" role="alert">
          <span className="adm-notice-icon">⚠️</span>
          <div>
            <strong>Catalog Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Product Summary KPI Cards */}
      {products.length > 0 && (
        <div className="adm-customer-kpi-grid">
          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total Products</span>
              <span className="adm-customer-kpi-val">{totalProductsCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-blue" aria-hidden="true">
              📦
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Active Categories</span>
              <span className="adm-customer-kpi-val">{activeCategoriesCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-purple" aria-hidden="true">
              🗂️
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Catalog SKUs</span>
              <span className="adm-customer-kpi-val">{totalVariantsCount}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-green" aria-hidden="true">
              🏷️
            </div>
          </div>

          <div className="adm-customer-kpi-card">
            <div className="adm-customer-kpi-info">
              <span className="adm-customer-kpi-label">Total Stock Units</span>
              <span className="adm-customer-kpi-val">{totalStockUnits.toLocaleString("en-IN")}</span>
            </div>
            <div className="adm-customer-kpi-icon icon-amber" aria-hidden="true">
              ⚡
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="adm-filter-bar">
        <div className="adm-search-input-wrap">
          <span className="adm-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="adm-search-input"
            placeholder="Search by name, SKU, or brand..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search products"
          />
          {searchQuery && (
            <button
              type="button"
              className="adm-search-clear-btn"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              aria-label="Clear search query"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="adm-filter-group">
          <select
            className="adm-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by category"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <React.Fragment key={c.id}>
                <option value={c.slug}>
                  {c.name}
                </option>
                {(c.children || []).map((sub) => (
                  <option key={sub.id} value={sub.slug}>
                    &nbsp;&nbsp;↳ {sub.name}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </select>

          <select
            className="adm-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            aria-label="Filter by stock status"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt;50 units)</option>
            <option value="low_stock">Low Stock (1–50 units)</option>
            <option value="out_of_stock">Out of Stock (0 units)</option>
          </select>

          <select
            className="adm-select"
            value={selectedSort}
            onChange={(e) => {
              setSelectedSort(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Sort products"
          >
            <option value="newest">Newest First</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="adm-btn adm-btn-secondary adm-btn-sm"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Content */}
      {loading ? (
        <div className="adm-loading-screen" role="status">
          <span className="adm-spinner adm-spinner-dark" aria-hidden="true" />
          <p>Loading products from PostgreSQL catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon" aria-hidden="true">
            📦
          </div>
          <h3 className="adm-empty-title">
            {hasActiveFilters ? "No Matching Products Found" : "No Products Found"}
          </h3>
          <p className="adm-empty-desc">
            {hasActiveFilters
              ? "No products matched your active search query, category, or stock filter. Clear the filters to view the full catalog."
              : "No active products are currently registered in the database catalog."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          ) : (
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              + Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="adm-card" style={{ padding: 0 }}>
          {/* Desktop Table View */}
          <div className="adm-product-desktop-table">
            <div className="adm-table-container">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Product &amp; Brand</th>
                    <th>Category</th>
                    <th>SKU / Variants</th>
                    <th>HSN / Tax</th>
                    <th>Price</th>
                    <th>Stock Health</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const variants = p.variants || [];
                    const minPrice = getProductMinPrice(p);
                    const totalStock = getProductTotalStock(p);
                    const stockBadge = getStockBadge(totalStock);
                    const primarySku = variants[0]?.sku || p.sku || "—";

                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="adm-product-cell">
                            <div className="adm-product-thumb-wrap">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="adm-product-thumb"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = "flex";
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className="adm-product-thumb-fallback"
                                style={{ display: p.imageUrl ? "none" : "flex" }}
                              >
                                {getCategoryIcon(p.category?.slug || p.category?.name)}
                              </div>
                            </div>
                            <div className="adm-product-meta">
                              <span className="adm-product-name">{p.name}</span>
                              <div style={{ fontSize: "0.76rem", color: "var(--adm-text-muted)" }}>
                                <code>{p.slug}</code> &bull; <span>{p.brand || "VERTEX"}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="adm-badge adm-badge-info" style={{ alignSelf: "flex-start" }}>
                              {p.category?.name || "Uncategorized"}
                            </span>
                            {p.subcategory?.name && (
                              <span style={{ fontSize: "0.75rem", color: "var(--adm-text-secondary)", fontWeight: 500 }}>
                                ↳ {p.subcategory.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <code>{primarySku}</code>
                            <span style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)" }}>
                              {variants.length} SKU{variants.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.82rem" }}>HSN: {p.hsnCode || "8542"}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)" }}>
                            GST: {p.gstRate || 18}%
                          </div>
                        </td>
                        <td>
                          {minPrice !== null ? (
                            <strong style={{ color: "var(--adm-primary)" }}>{formatINR(minPrice)}</strong>
                          ) : (
                            <span className="adm-badge adm-badge-warning" style={{ fontSize: "0.74rem" }} title="Awaiting verified selling price from administrator">
                              Needs Pricing
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`adm-badge ${stockBadge.className}`}>
                            {stockBadge.label}
                          </span>
                        </td>
                        <td>
                          {p.isActive === false ? (
                            <span className="adm-badge adm-badge-neutral">
                              Inactive
                            </span>
                          ) : minPrice === null ? (
                            <span className="adm-badge adm-badge-warning" title="Catalog item registered — awaiting selling price">
                              Needs Pricing
                            </span>
                          ) : (
                            <span className="adm-badge adm-badge-success">
                              Active
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="adm-table-actions">
                            <button
                              type="button"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              onClick={() => handleStartEditProduct(p)}
                              data-testid={`edit-product-${p.id}`}
                              title="Edit product and category assignment"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              onClick={() => handleStartEditPrice(p)}
                              data-testid={`edit-price-${p.id}`}
                              title="Edit selling price (Admin only)"
                            >
                              Price
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              onClick={() => setInspectingProduct(p)}
                              data-testid={`inspect-product-${p.id}`}
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (Optimized for viewports <= 768px) */}
          <div className="adm-product-mobile-cards">
            {filteredProducts.map((p) => {
              const variants = p.variants || [];
              const minPrice = getProductMinPrice(p);
              const totalStock = getProductTotalStock(p);
              const stockBadge = getStockBadge(totalStock);
              const primarySku = variants[0]?.sku || p.sku || "—";

              return (
                <div key={p.id} className="adm-product-card">
                  <div className="adm-product-card-header">
                    <div className="adm-product-cell">
                      <div className="adm-product-thumb-wrap">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="adm-product-thumb"
                            onError={(e) => {
                              e.target.style.display = "none";
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="adm-product-thumb-fallback"
                          style={{ display: p.imageUrl ? "none" : "flex" }}
                        >
                          {getCategoryIcon(p.category?.slug || p.category?.name)}
                        </div>
                      </div>
                      <div className="adm-product-meta">
                        <span className="adm-product-name">{p.name}</span>
                        <div style={{ fontSize: "0.76rem", color: "var(--adm-text-muted)" }}>
                          {p.brand || "VERTEX"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                      <span className="adm-badge adm-badge-info">
                        {p.category?.name || "General"}
                      </span>
                      {p.subcategory?.name && (
                        <span style={{ fontSize: "0.72rem", color: "var(--adm-text-secondary)" }}>
                          ↳ {p.subcategory.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="adm-product-card-body">
                    <div className="adm-product-card-item">
                      <span className="adm-product-card-label">Primary SKU</span>
                      <span className="adm-product-card-value">
                        <code>{primarySku}</code>
                      </span>
                    </div>

                    <div className="adm-product-card-item">
                      <span className="adm-product-card-label">Variants Count</span>
                      <span className="adm-product-card-value">
                        {variants.length} SKU{variants.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="adm-product-card-item">
                      <span className="adm-product-card-label">Starting Price</span>
                      <span className="adm-product-card-value" style={{ color: "var(--adm-primary)" }}>
                        {minPrice !== null ? formatINR(minPrice) : (
                          <span className="adm-badge adm-badge-warning" style={{ fontSize: "0.72rem" }}>Needs Pricing</span>
                        )}
                      </span>
                    </div>

                    <div className="adm-product-card-item">
                      <span className="adm-product-card-label">Stock Status</span>
                      <span className={`adm-badge ${stockBadge.className}`} style={{ alignSelf: "flex-start" }}>
                        {stockBadge.label}
                      </span>
                    </div>

                    <div className="adm-product-card-item">
                      <span className="adm-product-card-label">HSN &amp; GST</span>
                      <span className="adm-product-card-value">
                        {p.hsnCode || "8542"} ({p.gstRate || 18}%)
                      </span>
                    </div>

                    <div className="adm-product-card-item">
                      <span className="adm-product-card-label">Catalog Status</span>
                      {p.isActive === false ? (
                        <span className="adm-badge adm-badge-neutral" style={{ alignSelf: "flex-start" }}>Inactive</span>
                      ) : minPrice === null ? (
                        <span className="adm-badge adm-badge-warning" style={{ alignSelf: "flex-start" }}>Needs Pricing</span>
                      ) : (
                        <span className="adm-badge adm-badge-success" style={{ alignSelf: "flex-start" }}>Active</span>
                      )}
                    </div>
                  </div>

                  <div className="adm-product-card-footer">
                    <code style={{ fontSize: "0.76rem", color: "var(--adm-text-muted)" }}>{p.slug}</code>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => handleStartEditProduct(p)}
                        data-testid={`edit-product-card-${p.id || p.slug}`}
                        title="Edit product and category assignment"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => handleStartEditPrice(p)}
                        data-testid={`edit-price-card-${p.id || p.slug}`}
                        title="Edit selling price (Admin only)"
                      >
                        💰 Price
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => setInspectingProduct(p)}
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="adm-pagination">
            <span>
              Showing {filteredProducts.length} of {pagination.totalItems || products.length} products
            </span>
            <div className="adm-pagination-btns">
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                &larr; Previous
              </button>
              <span style={{ margin: "0 8px", fontWeight: 600 }}>
                Page {pagination.page || currentPage} of {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                disabled={currentPage >= (pagination.totalPages || 1)}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Product Modal */}
      {inspectingProduct && (
        <div className="adm-modal-backdrop" onClick={() => setInspectingProduct(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="inspect-product-title"
          >
            <div className="adm-modal-header">
              <h2 id="inspect-product-title" className="adm-modal-title">
                {inspectingProduct.name}
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setInspectingProduct(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="adm-modal-body">
              {/* Product Hero Info */}
              <div className="adm-product-modal-hero">
                <div className="adm-product-modal-thumb">
                  {inspectingProduct.imageUrl ? (
                    <img src={inspectingProduct.imageUrl} alt={inspectingProduct.name} />
                  ) : (
                    <span>{getCategoryIcon(inspectingProduct.category?.slug || inspectingProduct.category?.name)}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--adm-text-primary)" }}>
                    {inspectingProduct.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--adm-text-muted)", marginBottom: 8 }}>
                    <code>{inspectingProduct.slug}</code>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="adm-badge adm-badge-info">
                      {inspectingProduct.category?.name || "General"}
                    </span>
                    <span className="adm-badge adm-badge-neutral">
                      {inspectingProduct.brand || "VERTEX"}
                    </span>
                    <span className="adm-badge adm-badge-success">
                      Active
                    </span>
                    <span className={`adm-badge ${getStockBadge(getProductTotalStock(inspectingProduct)).className}`}>
                      {getStockBadge(getProductTotalStock(inspectingProduct)).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catalog Completeness & Quality Audit */}
              {(() => {
                const inspectPrice = getProductMinPrice(inspectingProduct);
                const inspectStock = getProductTotalStock(inspectingProduct);
                const inspectPrimarySku = inspectingProduct.variants?.[0]?.sku || inspectingProduct.sku;
                const isComplete = inspectPrice !== null && Boolean(inspectPrimarySku) && Boolean(inspectingProduct.specificationFileName) && Boolean(inspectingProduct.imageUrl);

                return (
                  <div className="adm-readiness-checklist" style={{ margin: "16px 0 20px" }}>
                    <div className="adm-readiness-header">
                      <strong className="adm-readiness-title" style={{ fontSize: "0.86rem" }}>
                        📋 Catalog Readiness &amp; Quality Audit
                      </strong>
                      <span className={`adm-badge ${isComplete ? "adm-badge-success" : "adm-badge-warning"}`}>
                        {isComplete ? "✓ All Data Verified" : "⚠️ Needs Completion"}
                      </span>
                    </div>
                    <div className="adm-readiness-grid">
                      <div className={`adm-readiness-item ${inspectPrice !== null ? "is-ready" : "is-missing"}`}>
                        <span className="adm-readiness-icon" aria-hidden="true">{inspectPrice !== null ? "✓" : "⚠️"}</span>
                        <div>
                          <strong>Pricing</strong>
                          <div className="adm-readiness-sub">{inspectPrice !== null ? formatINR(inspectPrice) : "Price Missing (Awaiting Setup)"}</div>
                        </div>
                      </div>
                      <div className={`adm-readiness-item ${inspectPrimarySku ? "is-ready" : "is-missing"}`}>
                        <span className="adm-readiness-icon" aria-hidden="true">{inspectPrimarySku ? "✓" : "⚠️"}</span>
                        <div>
                          <strong>SKU Code</strong>
                          <div className="adm-readiness-sub">{inspectPrimarySku ? "SKU Configured & Verified" : "No SKU Assigned"}</div>
                        </div>
                      </div>
                      <div className={`adm-readiness-item ${inspectingProduct.specificationFileName ? "is-ready" : "is-missing"}`}>
                        <span className="adm-readiness-icon" aria-hidden="true">{inspectingProduct.specificationFileName ? "✓" : "ℹ️"}</span>
                        <div>
                          <strong>Spec Drawing</strong>
                          <div className="adm-readiness-sub">{inspectingProduct.specificationFileName ? "PDF/Drawing Attached" : "No Spec Sheet Attached"}</div>
                        </div>
                      </div>
                      <div className={`adm-readiness-item ${inspectStock > 0 ? "is-ready" : "is-missing"}`}>
                        <span className="adm-readiness-icon" aria-hidden="true">{inspectStock > 0 ? "✓" : "⚠️"}</span>
                        <div>
                          <strong>Stock Level</strong>
                          <div className="adm-readiness-sub">{inspectStock > 0 ? `${inspectStock} units available` : "0 Units (Out of Stock)"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Technical Specifications */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <span className="adm-label">Product ID (UUID)</span>
                  <code style={{ fontSize: "0.78rem" }}>{inspectingProduct.id}</code>
                </div>
                <div>
                  <span className="adm-label">URL Slug</span>
                  <code style={{ fontSize: "0.78rem" }}>{inspectingProduct.slug}</code>
                </div>
                <div>
                  <span className="adm-label">Category &amp; Tag</span>
                  <div style={{ fontWeight: 600 }}>
                    {inspectingProduct.category?.name || "General"} {inspectingProduct.tag && `(${inspectingProduct.tag})`}
                  </div>
                </div>
                <div>
                  <span className="adm-label">Brand &amp; Manufacturer</span>
                  <div style={{ fontWeight: 600 }}>{inspectingProduct.brand || "VERTEX"}</div>
                </div>
                <div>
                  <span className="adm-label">HSN &amp; GST Telemetry</span>
                  <div style={{ fontWeight: 600 }}>
                    HSN: {inspectingProduct.hsnCode || "8542"} &bull; GST: {inspectingProduct.gstRate || 18}%
                  </div>
                </div>
                <div>
                  <span className="adm-label">Starting Price</span>
                  <div style={{ fontWeight: 700, color: "var(--adm-primary)" }}>
                    {formatINR(getProductMinPrice(inspectingProduct))}
                  </div>
                </div>
              </div>

              {inspectingProduct.description && (
                <div style={{ marginBottom: 20 }}>
                  <span className="adm-label">Technical Description</span>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--adm-text-secondary)", lineHeight: 1.5 }}>
                    {inspectingProduct.description}
                  </p>
                </div>
              )}

              {inspectingProduct.specificationFileName && (
                <div style={{ marginBottom: 20 }}>
                  <span className="adm-label">Technical Specification Sheet</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1px solid var(--adm-border)",
                      borderRadius: "var(--adm-radius-sm)",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>
                      {inspectingProduct.specificationFileName.endsWith(".pdf")
                        ? "📕"
                        : inspectingProduct.specificationFileName.endsWith(".csv")
                          ? "📑"
                          : "📊"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "0.88rem", display: "block" }}>
                        {inspectingProduct.specificationFileName}
                      </strong>
                      {inspectingProduct.specificationFileSize && (
                        <span style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)" }}>
                          Size: {formatFileSize(inspectingProduct.specificationFileSize)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                      onClick={() => {
                        const record = getSpecificationFile(inspectingProduct.id) || getSpecificationFile(inspectingProduct.specificationFileName);
                        openOrDownloadSpecFile(inspectingProduct.specificationFileName, record?.dataUrl);
                      }}
                      data-testid="inspect-view-datasheet-btn"
                    >
                      👁️ View Datasheet
                    </button>
                    <span className="adm-badge adm-badge-success" style={{ fontSize: "0.72rem" }}>
                      Attached
                    </span>
                  </div>
                </div>
              )}

              <span className="adm-label">Product Variants &amp; Stock Telemetry</span>
              <div className="adm-table-container" style={{ marginTop: 8 }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Variant Name / Pack</th>
                      <th>Price</th>
                      <th>Available Units</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inspectingProduct.variants || []).map((v) => (
                      <tr key={v.id}>
                        <td>
                          <code>{v.sku}</code>
                        </td>
                        <td>
                          {v.name || v.packSize || "Standard"}
                          {v.dimensions && ` (${v.dimensions})`}
                        </td>
                        <td>{formatINR(v.price)}</td>
                        <td>
                          <strong>{v.stockQuantity}</strong>
                        </td>
                        <td>
                          <span
                            className={`adm-badge ${v.stockQuantity > 50
                                ? "adm-badge-success"
                                : v.stockQuantity > 0
                                  ? "adm-badge-warning"
                                  : "adm-badge-danger"
                              }`}
                          >
                            {v.stockQuantity > 50
                              ? "In Stock"
                              : v.stockQuantity > 0
                                ? "Low Stock"
                                : "Out of Stock"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setInspectingProduct(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-primary"
                onClick={() => {
                  const p = inspectingProduct;
                  setInspectingProduct(null);
                  handleStartEditProduct(p);
                }}
                data-testid="inspect-edit-btn"
              >
                ✏️ Edit Product &amp; Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="adm-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-product-title"
          >
            <div className="adm-modal-header">
              <h2 id="add-product-title" className="adm-modal-title">
                Add New Industrial Hardware Product
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="adm-modal-form">
              <div className="adm-modal-body">
                {modalMessage && (
                  <div
                    className={`adm-notice-banner ${modalMessage.type === "success"
                        ? "adm-notice-info"
                        : "adm-notice-warning"
                      }`}
                    role="alert"
                  >
                    <span className="adm-notice-icon">
                      {modalMessage.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <div>{modalMessage.text}</div>
                  </div>
                )}

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-name">
                      Product Name *
                    </label>
                    <input
                      id="prod-name"
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Arduino Nano RP2040 Connect"
                      value={newProduct.name}
                      onChange={handleNameChange}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-slug">
                      URL Slug *
                    </label>
                    <input
                      id="prod-slug"
                      type="text"
                      className="adm-input"
                      value={newProduct.slug}
                      onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-cat">
                      Category *
                    </label>
                    <select
                      id="prod-cat"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                      required
                    >
                      {categories.map((c) => (
                        <optgroup key={c.id} label={c.name}>
                          <option value={c.id}>{c.name} (Main Category)</option>
                          {(c.children || []).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              ↳ {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-brand">
                      Brand / Manufacturer
                    </label>
                    <input
                      id="prod-brand"
                      type="text"
                      className="adm-input"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-hsn">
                      HSN Code
                    </label>
                    <input
                      id="prod-hsn"
                      type="text"
                      className="adm-input"
                      placeholder="8542 / 7318"
                      value={newProduct.hsnCode}
                      onChange={(e) => setNewProduct({ ...newProduct, hsnCode: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="prod-gst">
                      GST Rate (%)
                    </label>
                    <input
                      id="prod-gst"
                      type="number"
                      step="0.01"
                      className="adm-input"
                      value={newProduct.gstRate}
                      onChange={(e) => setNewProduct({ ...newProduct, gstRate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="prod-desc">
                    Technical Description
                  </label>
                  <textarea
                    id="prod-desc"
                    className="adm-textarea"
                    rows="2"
                    placeholder="Provide hardware specifications, pinout features, or bolt specs..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                {/* Product Specification File Upload Section */}
                <div className="adm-form-group" style={{ margin: "16px 0" }}>
                  <label className="adm-label" htmlFor="prod-spec-file">
                    Product Specification File
                  </label>
                  <div style={{ fontSize: "0.78rem", color: "var(--adm-text-secondary)", marginBottom: 8 }}>
                    Attach technical datasheet, mechanical drawing (DIN/ISO), thread pitch chart, or Excel/CSV specifications table.
                  </div>

                  {/* Contextual Hint for Fasteners & Hardware Category */}
                  {Boolean(
                    categories.find((c) => c.id === newProduct.categoryId)?.name?.toLowerCase().includes("fastener") ||
                    categories.find((c) => c.id === newProduct.categoryId)?.name?.toLowerCase().includes("screw") ||
                    categories.find((c) => c.id === newProduct.categoryId)?.slug?.toLowerCase().includes("fastener")
                  ) && (
                      <div className="adm-fastener-hint-banner" role="status">
                        <span style={{ fontSize: "1.1rem" }}>🔩</span>
                        <div>
                          <strong>Recommended for Fasteners &amp; Hardware:</strong> Upload standard DIN/ISO drawings (e.g. DIN 933, ISO 4017), thread pitch schedules (M2–M20), tensile proof load charts (Grade 8.8/10.9), or dimensional inspection sheets.
                        </div>
                      </div>
                    )}

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    id="prod-spec-file"
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    data-testid="prod-spec-file-input"
                    aria-label="Product Specification File"
                  />

                  {/* Empty / Dropzone State */}
                  {!specFile ? (
                    <div
                      className="adm-file-upload-zone"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          fileInputRef.current?.click();
                        }
                      }}
                      aria-label="Click to select specification file"
                    >
                      <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📑</div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--adm-text-primary)" }}>
                        Choose Product Specification File
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)", marginTop: 4 }}>
                        Supported formats: <strong>PDF, XLSX, XLS, CSV</strong> (Max 10 MB)
                      </div>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        style={{ marginTop: 10 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Browse Files
                      </button>
                    </div>
                  ) : (
                    /* File Selected Preview Card */
                    <div className="adm-file-preview-card" data-testid="spec-file-preview">
                      <div className="adm-file-preview-header">
                        <div className="adm-file-preview-info">
                          <span style={{ fontSize: "1.8rem" }}>
                            {specFile.name.endsWith(".pdf") ? "📕" : specFile.name.endsWith(".csv") ? "📑" : "📊"}
                          </span>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.88rem",
                                color: "var(--adm-text-primary)",
                                wordBreak: "break-all",
                              }}
                            >
                              {specFile.name}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "var(--adm-text-secondary)", marginTop: 2 }}>
                              {formatFileSize(specFile.size)} &bull;{" "}
                              <span className="adm-badge adm-badge-success" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                                Validated Specification
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="adm-file-preview-actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Replace File
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn-outline adm-btn-sm"
                            onClick={handleRemoveSpecFile}
                            aria-label="Remove specification file"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Extracted Dimensions Suggestion */}
                      {extractedDimensions && (
                        <div className="adm-spec-suggestion-banner" role="status">
                          <div>
                            <strong>💡 Detected Fastener Dimension:</strong> <code>{extractedDimensions}</code>
                            <div style={{ fontSize: "0.74rem", color: "var(--adm-text-secondary)", marginTop: 2 }}>
                              Extracted from file name. Confirm to apply to primary part number/specifications.
                            </div>
                          </div>
                          <button
                            type="button"
                            className="adm-btn adm-btn-primary adm-btn-sm"
                            onClick={handleApplyExtractedDimensions}
                          >
                            Apply to Specs
                          </button>
                        </div>
                      )}

                      {/* Backend Persistence Roadmap Notice */}
                      <div
                        className="adm-notice-banner adm-notice-info"
                        style={{ marginTop: 8, padding: "8px 12px", fontSize: "0.78rem" }}
                      >
                        <span className="adm-notice-icon">ℹ️</span>
                        <div>
                          <strong>Storage Notice:</strong> Specification file validated in client memory. Persistent binary storage requires backend S3/Blob storage configuration. Metadata will be staged with product registration.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invalid File Error Banner */}
                  {specFileError && (
                    <div
                      className="adm-notice-banner adm-notice-danger"
                      style={{ marginTop: 10, padding: "8px 12px", fontSize: "0.82rem" }}
                      role="alert"
                    >
                      <span className="adm-notice-icon">⚠️</span>
                      <div style={{ flex: 1 }}>{specFileError}</div>
                      <button
                        type="button"
                        className="adm-btn-text"
                        onClick={() => setSpecFileError("")}
                        style={{ fontSize: "0.82rem", cursor: "pointer", marginLeft: 8 }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>

                <h4 style={{ margin: "16px 0 10px", fontSize: "0.95rem", color: "var(--adm-text-primary)" }}>
                  Primary Variant &amp; Inventory Specifications
                </h4>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-sku">
                      Primary SKU *
                    </label>
                    <input
                      id="var-sku"
                      type="text"
                      className="adm-input"
                      placeholder="ELEC-NANO-RP2040"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-part">
                      Part Number
                    </label>
                    <input
                      id="var-part"
                      type="text"
                      className="adm-input"
                      placeholder="ABX00053"
                      value={newProduct.partNumber}
                      onChange={(e) => setNewProduct({ ...newProduct, partNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-price">
                      Unit Price (₹) *
                    </label>
                    <input
                      id="var-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="adm-input"
                      placeholder="1499.00"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="var-stock">
                      Initial Stock Quantity *
                    </label>
                    <input
                      id="var-stock"
                      type="number"
                      min="0"
                      className="adm-input"
                      value={newProduct.stockQuantity}
                      onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? (
                    <>
                      <span className="adm-spinner" aria-hidden="true" /> Saving...
                    </>
                  ) : (
                    "Save & Register Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product & Category Modal */}
      {editingProduct && (
        <div className="adm-modal-backdrop" onClick={() => !editModalSubmitting && setEditingProduct(null)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 680, display: "flex", flexDirection: "column", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="edit-product-title"
          >
            <div className="adm-modal-header">
              <h2 id="edit-product-title" className="adm-modal-title">
                Edit Product &amp; Category Assignment
              </h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => !editModalSubmitting && setEditingProduct(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="adm-modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {editModalMessage && (
                  <div className={`adm-modal-alert adm-modal-alert-${editModalMessage.type}`} role="alert" style={{ marginBottom: 16 }}>
                    <span className="adm-alert-icon" aria-hidden="true">
                      {editModalMessage.type === "success" ? "✓" : "⚠️"}
                    </span>
                    <div>{editModalMessage.text}</div>
                  </div>
                )}

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-name">
                      Product Name *
                    </label>
                    <input
                      id="edit-prod-name"
                      type="text"
                      className="adm-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-slug">
                      URL Slug
                    </label>
                    <input
                      id="edit-prod-slug"
                      type="text"
                      className="adm-input"
                      value={editForm.slug}
                      disabled
                      title="Product URL slug identifier"
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-category">
                      Assigned Category *
                    </label>
                    <select
                      id="edit-prod-category"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={editForm.categoryId}
                      onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                      required
                      data-testid="edit-prod-category-select"
                    >
                      {categories.map((c) => (
                        <optgroup key={c.id} label={c.name}>
                          <option value={c.id}>{c.name} (Main Category)</option>
                          {(c.children || []).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              ↳ {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-brand">
                      Brand / Manufacturer
                    </label>
                    <input
                      id="edit-prod-brand"
                      type="text"
                      className="adm-input"
                      value={editForm.brand}
                      onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-tag">
                      Promotional Tag / Badge
                    </label>
                    <input
                      id="edit-prod-tag"
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Best Seller, EV Grade, Marine Grade"
                      value={editForm.tag}
                      onChange={(e) => setEditForm({ ...editForm, tag: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-status">
                      Storefront Catalog Visibility
                    </label>
                    <select
                      id="edit-prod-status"
                      className="adm-select"
                      style={{ width: "100%" }}
                      value={editForm.isActive ? "true" : "false"}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
                    >
                      <option value="true">Active (Visible to Customers)</option>
                      <option value="false">Inactive (Hidden from Customer Catalog)</option>
                    </select>
                  </div>
                </div>

                {/* Price and Stock */}
                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-price">
                      Selling Price (₹ Tax-Exclusive) *
                    </label>
                    <input
                      id="edit-prod-price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="adm-input"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      placeholder="e.g. 150.00"
                      data-testid="edit-prod-price-input"
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-stock">
                      Stock Quantity (Units)
                    </label>
                    <input
                      id="edit-prod-stock"
                      type="number"
                      step="1"
                      min="0"
                      className="adm-input"
                      value={editForm.stockQuantity}
                      onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                      placeholder="e.g. 500"
                      data-testid="edit-prod-stock-input"
                    />
                  </div>
                </div>

                {/* HSN & GST */}
                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-hsn">
                      HSN / Tax Classification Code
                    </label>
                    <input
                      id="edit-prod-hsn"
                      type="text"
                      className="adm-input"
                      placeholder="e.g. 7318 (Fasteners) or 8542 (Semiconductors)"
                      value={editForm.hsnCode}
                      onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-gst">
                      GST Rate (%)
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        id="edit-prod-gst"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="adm-input"
                        placeholder="e.g. 18.00"
                        value={editForm.gstRate}
                        onChange={(e) => setEditForm({ ...editForm, gstRate: e.target.value })}
                        style={{ flex: 1 }}
                        data-testid="edit-prod-gst-input"
                      />
                      <select
                        aria-label="GST Rate Presets"
                        className="adm-select"
                        style={{ width: "auto", minWidth: 125 }}
                        value={["0", "5", "12", "18", "28"].includes(String(parseFloat(editForm.gstRate))) ? String(parseFloat(editForm.gstRate)) : "custom"}
                        onChange={(e) => {
                          if (e.target.value !== "custom") {
                            setEditForm({ ...editForm, gstRate: e.target.value });
                          }
                        }}
                      >
                        <option value="custom">Presets...</option>
                        <option value="0">0% (Nil / Exempt)</option>
                        <option value="5">5% (Concessional)</option>
                        <option value="12">12%</option>
                        <option value="18">18% (Standard)</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Media & Specification Attachments */}
                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-image">
                      Product Image URL / Asset Reference
                    </label>
                    <input
                      id="edit-prod-image"
                      type="text"
                      className="adm-input"
                      placeholder="/images/products/fasteners/din912.png"
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    />
                    {editForm.imageUrl && (
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                          src={editForm.imageUrl}
                          alt="Preview"
                          style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, border: "1px solid var(--adm-border, #e2e8f0)", background: "#fff" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                        <span style={{ fontSize: 11, color: "var(--adm-text-muted, #64748b)" }}>Image reference verified</span>
                      </div>
                    )}
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-label" htmlFor="edit-prod-spec">
                      Technical Spec / PDF Attachment Reference
                    </label>
                    <input
                      id="edit-prod-spec"
                      type="text"
                      className="adm-input"
                      placeholder="e.g. DIN912-Spec-Sheet.pdf"
                      value={editForm.specificationFileName}
                      onChange={(e) => setEditForm({ ...editForm, specificationFileName: e.target.value })}
                    />
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditSpecFileSelect}
                      accept=".pdf,.xlsx,.xls,.csv"
                      style={{ display: "none" }}
                      data-testid="edit-prod-spec-file-input"
                    />
                    {editForm.specificationFileName ? (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 12px",
                          borderRadius: "var(--adm-radius-sm, 6px)",
                          border: "1px solid var(--adm-border, #222d3d)",
                          background: "var(--adm-surface-alt, #1f2836)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                          <span style={{ fontSize: "1.2rem" }}>
                            {editForm.specificationFileName.endsWith(".pdf") ? "📕" : "📊"}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: "var(--adm-text-primary, #f4f6f8)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 180,
                            }}
                            title={editForm.specificationFileName}
                          >
                            {editForm.specificationFileName}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={handleViewEditSpecFile}
                            title="View or download attached specification"
                            data-testid="view-edit-spec-btn"
                          >
                            👁️ View
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn-secondary"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={() => editFileInputRef.current?.click()}
                            title="Replace specification file"
                            data-testid="replace-edit-spec-btn"
                          >
                            🔄 Replace
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn-danger"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={handleDeleteEditSpecFile}
                            title="Delete specification file"
                            data-testid="delete-edit-spec-btn"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="adm-btn adm-btn-secondary"
                          style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                          onClick={() => editFileInputRef.current?.click()}
                          data-testid="upload-edit-spec-btn"
                        >
                          📎 Upload PDF / Datasheet File
                        </button>
                        <small style={{ fontSize: 11, color: "var(--adm-text-muted, #717d8f)", display: "block", marginTop: 4 }}>
                          Supports PDF, Excel (.xlsx/.xls), and CSV (Max 10 MB). Stored persistently.
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="edit-prod-desc">
                    Technical Description
                  </label>
                  <textarea
                    id="edit-prod-desc"
                    className="adm-input"
                    rows={4}
                    style={{ resize: "vertical" }}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  disabled={editModalSubmitting}
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={editModalSubmitting}
                  data-testid="save-edit-product-btn"
                >
                  {editModalSubmitting ? "Saving..." : "✓ Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Dedicated Edit Product Selling Price Modal (Admin Only) */}
      {pricingProduct && (
        <div
          className="adm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-price-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !priceModalSubmitting) {
              setPricingProduct(null);
              setPriceModalMessage(null);
            }
          }}
        >
          <div className="adm-modal" style={{ maxWidth: 540 }}>
            <div className="adm-modal-header">
              <div>
                <h3 id="edit-price-modal-title" className="adm-modal-title">
                  Edit Selling Price
                </h3>
                <p className="adm-modal-subtitle">
                  Authorized Admin Price Management &bull; Instant Storefront Synchronization
                </p>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => {
                  setPricingProduct(null);
                  setPriceModalMessage(null);
                }}
                disabled={priceModalSubmitting}
                aria-label="Close edit price modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePrice}>
              <div className="adm-modal-body">
                {priceModalMessage && (
                  <div
                    className={`adm-alert ${
                      priceModalMessage.type === "error" ? "adm-alert-danger" : "adm-alert-success"
                    }`}
                    role="alert"
                    data-testid="edit-price-feedback"
                  >
                    <span>{priceModalMessage.type === "error" ? "⚠️" : "✓"}</span>
                    <span>{priceModalMessage.text}</span>
                  </div>
                )}

                <div
                  style={{
                    background: "var(--adm-bg-surface, #f8fafc)",
                    border: "1px solid var(--adm-border, #e2e8f0)",
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: "0.94rem", fontWeight: 700, color: "var(--adm-text, #0f172a)", marginBottom: 4 }}>
                    {pricingProduct.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--adm-text-secondary, #64748b)", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    <span><strong>SKU:</strong> <code>{pricingProduct.variants?.[0]?.sku || pricingProduct.sku || "—"}</code></span>
                    <span><strong>Category:</strong> {pricingProduct.category?.name || "General"}</span>
                    {pricingProduct.subcategory?.name && (
                      <span><strong>Subcategory:</strong> {pricingProduct.subcategory.name}</span>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--adm-text-secondary, #64748b)" }}>Current Price:</span>
                    {getProductMinPrice(pricingProduct) !== null ? (
                      <strong style={{ color: "var(--adm-primary, #ea580c)" }}>
                        {formatINR(getProductMinPrice(pricingProduct))}
                      </strong>
                    ) : (
                      <span className="adm-badge adm-badge-warning" style={{ fontSize: "0.72rem" }}>
                        Needs Pricing
                      </span>
                    )}
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-label" htmlFor="edit-selling-price-input">
                    Customer Selling Price (INR ₹) *
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--adm-text-secondary, #64748b)",
                        pointerEvents: "none",
                      }}
                    >
                      ₹
                    </span>
                    <input
                      id="edit-selling-price-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="adm-input"
                      style={{ paddingLeft: 32, fontSize: "1.05rem", fontWeight: 600 }}
                      placeholder="e.g. 249.00"
                      value={newPriceValue}
                      onChange={(e) => setNewPriceValue(e.target.value)}
                      required
                      autoFocus
                      data-testid="edit-selling-price-input"
                      disabled={priceModalSubmitting}
                    />
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: "0.76rem", color: "var(--adm-text-secondary, #64748b)" }}>
                    Setting this price will immediately update the public storefront, product detail page, and enable Add-to-Cart. Historical orders are strictly preserved.
                  </p>
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  disabled={priceModalSubmitting}
                  onClick={() => {
                    setPricingProduct(null);
                    setPriceModalMessage(null);
                  }}
                  data-testid="cancel-edit-price-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                  disabled={priceModalSubmitting}
                  data-testid="save-edit-price-btn"
                >
                  {priceModalSubmitting ? "Saving Price..." : "✓ Save Price"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
