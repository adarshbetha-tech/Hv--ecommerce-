import React, { useState, useEffect, useCallback } from "react";
import logo from "./assets/logo.png";
import LoginPage from "./components/Login/LoginPage";
import AdminLayout from "./components/Admin/AdminLayout";
import CartDrawer from "./components/Cart/CartDrawer";
import CartPage from "./components/Cart/CartPage";
import CheckoutPage from "./components/Checkout/CheckoutPage";
import OrdersPage from "./components/Orders/OrdersPage";
import ProductListPage from "./components/Products/ProductListPage";
import ProductDetailPage from "./components/Products/ProductDetailPage";
import ProductCard from "./components/Products/ProductCard";
import WishlistDrawer from "./components/Products/WishlistDrawer";
import WishlistPage from "./components/Products/WishlistPage";
import "./components/CartWishlistPages.css";
import QuoteModal from "./components/Products/QuoteModal";
import AnnouncementBar from "./components/Home/AnnouncementBar";
import MegaMenu from "./components/Home/MegaMenu";
import HeroSlider from "./components/Home/HeroSlider";
import CategoryTiles from "./components/Home/CategoryTiles";
import ProductRail from "./components/Home/ProductRail";
import ShippingInfoStrip from "./components/Home/ShippingInfoStrip";
import ValueProps from "./components/Home/ValueProps";
import BulkInquirySection from "./components/Home/BulkInquirySection";
import FloatingSupport from "./components/Home/FloatingSupport";
import PolicyModal from "./components/Home/PolicyModal";
import SiteFooter from "./components/Home/SiteFooter";
import ScrollReveal from "./components/Common/ScrollReveal";
import { subscribeNewsletter } from "./services/newsletterApi";
import { getCurrentUser, logoutUser } from "./services/authApi";
import { getCategories, getProducts, getProductBySlug } from "./services/catalogApi";
import {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  mergeGuestCart,
} from "./services/cartApi";
import {
  getStoredGuestItems,
  clearStoredGuestCart,
  formatGuestCart,
  addGuestItem,
  updateGuestItemQuantity,
  removeGuestItem,
  clearGuestCart,
} from "./utils/guestCart";
import { getWishlistCount } from "./utils/wishlist";
import { isMockApiEnabled, setMockMode } from "./mock/mockConfig";
import { MOCK_USERS } from "./mock/mockData";
import "./App.css";
import "./components/Products/Products.css";

const topBarItems = [
  { icon: "✔", label: "Quality Products" },
  { icon: "📦", label: "Bulk Orders" },
  { icon: "🚚", label: "Pan India Delivery" },
  { icon: "👥", label: "Trusted by Engineers" },
  { icon: "🎧", label: "Help & Support" },
  { icon: "📋", label: "Track Order" },
];

const navItems = [
  "Home",
  "Shop Categories",
  "Products",
  "Fasteners",
  "Electronic Products",
  "Nuts",
  "Bulk Inquiry",
  "Offers",
  "Brands",
  "Resources",
  "About",
  "Contact",
];

const fastenerTypes = [
  "Flat (Slotted)",
  "Cross (Phillips)",
  "Hex (Allen)",
  "Star (Torx)",
  "Bolts",
  "Nuts",
  "Washers",
  "Brass Inserts",
];

const nutTypes = [
  "Hex Nuts",
  "Nyloc Nuts",
  "Flanged Nyloc Nut",
  "Wing Nuts",
  "Dome Nuts",
  "Flange Nuts",
];

const brands = ["DMEGC", "NORDA", "Panasonic", "HVNEX", "Arduino", "Raspberry Pi", "Delta", "Bosch"];

function MockDevBanner({ currentUser, currentView, onSimulateUser, onToggleMock, onNavigate }) {
  if (!isMockApiEnabled()) return null;

  return (
    <aside className="mock-dev-banner" data-testid="mock-dev-banner" aria-label="Development mock API indicator">
      <div className="mock-dev-banner-left">
        <span className="mock-dev-tag">⚡ Mock Dev Mode</span>
        <span className="mock-dev-desc">
          Neon DB &amp; Backend Bypassed • Local UI Development Active
        </span>
      </div>
      <div className="mock-dev-controls">
        <span className="mock-dev-label">Simulate:</span>
        <button
          type="button"
          className={`mock-dev-btn ${!currentUser ? "is-active" : ""}`}
          onClick={() => onSimulateUser(null)}
          title="Simulate Guest Visitor session"
        >
          Guest
        </button>
        <button
          type="button"
          className={`mock-dev-btn ${currentUser?.role === "CUSTOMER" ? "is-active" : ""}`}
          onClick={() => onSimulateUser("customer")}
          title="Simulate Customer session"
        >
          Customer
        </button>
        <button
          type="button"
          className={`mock-dev-btn ${currentUser?.role === "ADMIN" ? "is-active" : ""}`}
          onClick={() => onSimulateUser("admin")}
          title="Simulate Admin session and open Admin Portal directly"
          data-testid="mock-admin-btn"
        >
          Admin
        </button>
        {currentView === "admin" && (
          <button
            type="button"
            className="mock-dev-btn mock-dev-btn-storefront"
            onClick={() => onNavigate && onNavigate("home")}
            title="Return to Customer Storefront"
          >
            ← Storefront
          </button>
        )}
        <button
          type="button"
          className="mock-dev-btn mock-dev-btn-toggle"
          onClick={onToggleMock}
          title="Disable mock mode and switch to Real Backend"
        >
          Disable Mock
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return "admin";
      if (path === "/login") return "login";
      if (path === "/checkout") return "checkout";
      if (path === "/cart") return "cart-page";
      if (path === "/wishlist") return "wishlist-page";
      if (path === "/orders" || path === "/my-orders") return "orders";
      if (path.startsWith("/product/")) return "product-detail";
      if (path === "/products" || path === "/catalog") return "products";
    }
    return "home";
  });

  const [selectedProductSlug, setSelectedProductSlug] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/product/")) {
      return decodeURIComponent(window.location.pathname.replace("/product/", "").split("/")[0] || "");
    }
    return null;
  });

  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const p = new URLSearchParams(window.location.search);
      return p.get("category") || "all";
    }
    return "all";
  });

  const [selectedCatalogSubcat, setSelectedCatalogSubcat] = useState(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const p = new URLSearchParams(window.location.search);
      return p.get("subcat") || "all";
    }
    return "all";
  });

  const [adminSection, setAdminSection] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/")) {
      return window.location.pathname.replace("/admin/", "").split("/")[0] || "dashboard";
    }
    return "dashboard";
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);

  // Storefront Shopping Cart state
  const [cart, setCart] = useState(() => formatGuestCart(getStoredGuestItems()));
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [pendingCartAction, setPendingCartAction] = useState(null);

  // Wishlist state
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());

  // Storefront Catalog state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [pagination, setPagination] = useState({ totalItems: 0, page: 1, limit: 12, totalPages: 1 });

  // Search & Filtering state for Home view
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isOffersOnly, setIsOffersOnly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false);

  // Dedicated Product Detail state
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailRelated, setDetailRelated] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // RFQ Modal State
  const [quoteProduct, setQuoteProduct] = useState(null);

  // Policy Modal State (Shipping, GST, Returns, Privacy, Terms)
  const [activePolicyModal, setActivePolicyModal] = useState(null);

  // Newsletter state
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [newsletterError, setNewsletterError] = useState(null);

  // Quick Technical Specs Modal state (home specs button fallback)
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);

  // Micro-interaction: Animated cart badge on item addition
  const [cartBadgeBumped, setCartBadgeBumped] = useState(false);

  // Listen for Wishlist updates across components
  useEffect(() => {
    const handleWishlistChange = (e) => {
      setWishlistCount(e.detail?.count ?? getWishlistCount());
    };
    window.addEventListener("vertex_wishlist_updated", handleWishlistChange);
    return () => window.removeEventListener("vertex_wishlist_updated", handleWishlistChange);
  }, []);

  // Close mobile drawer or mega menu on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (megaMenuOpen) setMegaMenuOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, megaMenuOpen]);

  useEffect(() => {
    // Check initial authentication status via secure HttpOnly cookie
    getCurrentUser()
      .then(async (res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          try {
            const cartRes = await getCart();
            if (cartRes?.cart) setCart(cartRes.cart);
          } catch (e) {
            console.error("Failed to load authenticated cart:", e);
          }
        }
      })
      .catch(() => {
        // Unauthenticated visitor
      });

    // Handle browser back/forward buttons
    const handlePopState = () => {
      setMobileMenuOpen(false);
      const path = window.location.pathname;
      if (path.startsWith("/admin")) {
        const sec = path.replace("/admin/", "").split("/")[0] || "dashboard";
        setAdminSection(sec);
        setCurrentView("admin");
      } else if (path === "/login") {
        setCurrentView("login");
      } else if (path === "/checkout") {
        setCurrentView("checkout");
      } else if (path === "/cart") {
        setCurrentView("cart-page");
      } else if (path === "/wishlist") {
        setCurrentView("wishlist-page");
      } else if (path === "/orders" || path === "/my-orders") {
        setCurrentView("orders");
      } else if (path.startsWith("/product/")) {
        const slug = decodeURIComponent(path.replace("/product/", "").split("/")[0] || "");
        setSelectedProductSlug(slug);
        setCurrentView("product-detail");
      } else if (path === "/products" || path === "/catalog") {
        const p = new URLSearchParams(window.location.search);
        setSelectedCatalogCategory(p.get("category") || "all");
        setSelectedCatalogSubcat(p.get("subcat") || "all");
        setCurrentView("products");
      } else {
        setCurrentView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const res = await getCategories();
      setCategories(res.categories || []);
    } catch (err) {
      setCategoriesError(err.message || "Failed to load categories from VERTEX catalog.");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const params = {
        limit: currentView === "products" ? 100 : 12,
      };
      if (activeSearch) params.q = activeSearch;
      if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;

      const res = await getProducts(params);
      setProducts(res.products || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setProductsError(err.message || "Failed to load products from VERTEX catalog.");
    } finally {
      setProductsLoading(false);
    }
  }, [activeSearch, selectedCategory, currentView]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handleCatalogUpdate = () => {
      loadProducts();
      if (selectedProductSlug) {
        getProductBySlug(selectedProductSlug)
          .then((res) => {
            if (res?.product) setDetailProduct(res.product);
          })
          .catch(() => {});
      }
    };
    window.addEventListener("vertex_catalog_updated", handleCatalogUpdate);
    return () => window.removeEventListener("vertex_catalog_updated", handleCatalogUpdate);
  }, [loadProducts, selectedProductSlug]);

  // Load Product Detail when in product-detail view
  useEffect(() => {
    if (currentView !== "product-detail" || !selectedProductSlug) return;

    let isMounted = true;
    setDetailLoading(true);

    getProductBySlug(selectedProductSlug)
      .then((res) => {
        if (!isMounted) return;
        if (res?.product) {
          setDetailProduct(res.product);
          setDetailRelated(res.relatedProducts || []);
        } else {
          // Fallback search in already loaded products
          const found = products.find((p) => p.slug === selectedProductSlug || p.id === selectedProductSlug);
          if (found) {
            setDetailProduct(found);
            setDetailRelated(products.filter((p) => p.id !== found.id && p.categoryId === found.categoryId).slice(0, 4));
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Product slug fetch fallback:", err.message);
        const found = products.find((p) => p.slug === selectedProductSlug || p.id === selectedProductSlug);
        if (found) {
          setDetailProduct(found);
          setDetailRelated(products.filter((p) => p.id !== found.id && p.categoryId === found.categoryId).slice(0, 4));
        }
      })
      .finally(() => {
        if (isMounted) setDetailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentView, selectedProductSlug, products]);

  // Scroll-triggered reveals with fail-safe visibility
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) return;
    } catch (e) {
      // Ignore
    }

    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.1,
    });

    const pageEl = document.querySelector(".page");
    if (pageEl) {
      pageEl.classList.add("vtx-observer-ready");
    }

    const elements = document.querySelectorAll(".vtx-reveal:not(.is-revealed)");
    elements.forEach((el) => observer.observe(el));

    const safetyTimer = setTimeout(() => {
      document.querySelectorAll(".vtx-reveal:not(.is-revealed)").forEach((el) => {
        el.classList.add("is-revealed");
      });
    }, 1200);

    return () => {
      observer.disconnect();
      clearTimeout(safetyTimer);
    };
  }, [products, categories, currentView]);

  const navigate = (view, section = "dashboard", redirectParam = null, slug = null, searchParams = "") => {
    setMobileMenuOpen(false);
    setCurrentView(view);
    let targetPath = "/";

    if (view === "login") {
      targetPath = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";
    } else if (view === "checkout") {
      targetPath = "/checkout";
    } else if (view === "cart-page") {
      targetPath = "/cart";
      setCartOpen(false);
      setWishlistOpen(false);
    } else if (view === "wishlist-page") {
      targetPath = "/wishlist";
      setCartOpen(false);
      setWishlistOpen(false);
    } else if (view === "orders") {
      targetPath = "/orders";
    } else if (view === "admin") {
      setAdminSection(section);
      targetPath = section === "dashboard" ? "/admin" : `/admin/${section}`;
    } else if (view === "product-detail") {
      const targetSlug = slug || selectedProductSlug;
      setSelectedProductSlug(targetSlug);
      targetPath = `/product/${encodeURIComponent(targetSlug)}`;
    } else if (view === "products") {
      targetPath = searchParams ? `/products?${searchParams}` : "/products";
    }

    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleOpenProductDetail = (productOrSlug) => {
    const slug = typeof productOrSlug === "string" ? productOrSlug : productOrSlug.slug || productOrSlug.id;
    setSelectedProductSlug(slug);
    navigate("product-detail", "dashboard", null, slug);
  };

  const handleNavigateCatalogWithCategory = (catSlug = "all", subcatSlug = "all") => {
    setSelectedCatalogCategory(catSlug);
    setSelectedCatalogSubcat(subcatSlug);
    const params = new URLSearchParams();
    if (catSlug && catSlug !== "all") params.set("category", catSlug);
    if (subcatSlug && subcatSlug !== "all") params.set("subcat", subcatSlug);
    navigate("products", "dashboard", null, null, params.toString());
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    const guestItems = getStoredGuestItems();
    if (guestItems.length > 0) {
      try {
        setCartLoading(true);
        const itemsToMerge = guestItems.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
        }));
        const res = await mergeGuestCart(itemsToMerge);
        clearStoredGuestCart();
        if (res?.cart) {
          setCart(res.cart);
        }
        setFlashMessage(`Welcome back, ${user.fullName || user.email}! Your guest cart items have been merged.`);
      } catch (mergeErr) {
        console.error("Cart merge error:", mergeErr);
        try {
          const cartRes = await getCart();
          if (cartRes?.cart) setCart(cartRes.cart);
        } catch (e) {
          // Ignored
        }
        setFlashMessage(`Welcome back, ${user.fullName || user.email}!`);
      } finally {
        setCartLoading(false);
      }
    } else {
      try {
        setCartLoading(true);
        const cartRes = await getCart();
        if (cartRes?.cart) setCart(cartRes.cart);
      } catch (err) {
        console.error("Failed to fetch cart on login:", err);
      } finally {
        setCartLoading(false);
      }
      setFlashMessage(`Welcome back, ${user.fullName || user.email}!`);
    }

    let redirectDestination = null;
    if (typeof window !== "undefined" && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      redirectDestination = searchParams.get("redirect");
    }

    if (user.role === "ADMIN") {
      if (redirectDestination && redirectDestination.startsWith("/admin")) {
        const section = redirectDestination.replace("/admin", "").replace(/^\//, "").split("/")[0] || "dashboard";
        navigate("admin", section);
      } else {
        navigate("admin", "dashboard");
      }
    } else if (redirectDestination === "/checkout") {
      navigate("checkout");
    } else if (redirectDestination === "/cart") {
      navigate("cart-page");
    } else if (redirectDestination === "/wishlist") {
      navigate("wishlist-page");
    } else if (redirectDestination === "/orders" || redirectDestination === "/my-orders") {
      navigate("orders");
    } else {
      navigate("home");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignored
    }
    setCurrentUser(null);
    clearStoredGuestCart();
    setCart(formatGuestCart([]));
    setFlashMessage("You have been signed out successfully.");
  };

  // Cart operations
  const handleAddToCart = async (product, variant, quantity = 1) => {
    const targetVariant = variant || product?.variants?.[0];
    if (!targetVariant) {
      setCartError("Unable to add product: no purchasable variant found.");
      return false;
    }
    // Quote-only items can be added directly to cart as quote-required items

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    setPendingCartAction({ type: "add", id: targetVariant.id });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await addItemToCart({ variantId: targetVariant.id, quantity: qty });
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = addGuestItem(product, targetVariant, qty);
        setCart(updatedCart);
      }
      setFlashMessage(
        qty > 1
          ? `Added ${qty} × "${product.name}" to your cart.`
          : `Added "${product.name}" to your cart.`
      );
      setCartBadgeBumped(true);
      setTimeout(() => setCartBadgeBumped(false), 550);
      return true;
    } catch (err) {
      setCartError(err.message || "Failed to add item to cart.");
      return false;
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      return handleRemoveItem(itemId);
    }

    setPendingCartAction({ type: "update", id: itemId });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await updateCartItemQuantity(itemId, newQuantity);
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = updateGuestItemQuantity(itemId, newQuantity);
        setCart(updatedCart);
      }
    } catch (err) {
      setCartError(err.message || "Failed to update item quantity.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setPendingCartAction({ type: "remove", id: itemId });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await removeCartItem(itemId);
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = removeGuestItem(itemId);
        setCart(updatedCart);
      }
    } catch (err) {
      setCartError(err.message || "Failed to remove item from cart.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleClearCart = async () => {
    setPendingCartAction({ type: "clear" });
    setCartError(null);

    try {
      if (currentUser) {
        const res = await clearCart();
        if (res?.cart) {
          setCart(res.cart);
        }
      } else {
        const updatedCart = clearGuestCart();
        setCart(updatedCart);
      }
    } catch (err) {
      setCartError(err.message || "Failed to clear cart.");
    } finally {
      setPendingCartAction(null);
    }
  };

  const handleProceedToCheckout = () => {
    setCartOpen(false);
    if (currentUser) {
      navigate("checkout");
    } else {
      navigate("login", null, "/checkout");
    }
  };

  const handleOrderSuccess = (order) => {
    getCart()
      .then((res) => {
        if (res?.cart) setCart(res.cart);
      })
      .catch(() => {
        setCart(formatGuestCart([]));
      });
    setFlashMessage(`Order #${order.orderNumber} placed successfully!`);
  };

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = searchInput.trim();
    setActiveSearch(query);
    setIsOffersOnly(false);
    if (currentView !== "home") {
      setCurrentView("home");
    }
    const prodSection = document.getElementById("featured-products");
    if (prodSection && typeof prodSection.scrollIntoView === "function") {
      prodSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleClearAllFilters = () => {
    setSearchInput("");
    setActiveSearch("");
    setSelectedCategory("all");
    setIsOffersOnly(false);
  };

  const handleExploreProducts = () => {
    handleClearAllFilters();
    const prodSection = document.getElementById("featured-products");
    if (prodSection && typeof prodSection.scrollIntoView === "function") {
      prodSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCategorySelect = (categorySlug) => {
    setSelectedCategory(categorySlug);
    setIsOffersOnly(false);
    const prodSection = document.getElementById("featured-products");
    if (prodSection && typeof prodSection.scrollIntoView === "function") {
      prodSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    setMegaMenuOpen(false);
    if (currentView !== "home") {
      navigate("home");
      setTimeout(() => {
        const el = document.getElementById(sectionId) || document.querySelector(`.${sectionId}`);
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const el = document.getElementById(sectionId) || document.querySelector(`.${sectionId}`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || subscribing) return;
    setSubscribing(true);
    setNewsletterError(null);
    try {
      await subscribeNewsletter(email.trim());
      setSubscribed(true);
    } catch (err) {
      setNewsletterError(err.message || "Failed to subscribe. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleSimulateUser = (role) => {
    if (!role) {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("vertex_mock_user");
      }
      setCurrentUser(null);
      setCart(formatGuestCart(getStoredGuestItems()));
      setFlashMessage("Simulated session: Guest visitor");
      if (currentView === "admin") {
        navigate("home");
      }
    } else if (role === "admin") {
      const admin = { ...MOCK_USERS.admin };
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vertex_mock_user", JSON.stringify(admin));
      }
      setCurrentUser(admin);
      setFlashMessage("Simulated session: Chief Engineer (ADMIN) • Opening Admin Portal");
      navigate("admin", "dashboard");
    } else if (role === "customer") {
      const cust = { ...MOCK_USERS.customer };
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vertex_mock_user", JSON.stringify(cust));
      }
      setCurrentUser(cust);
      setFlashMessage("Simulated session: Jane Customer (CUSTOMER)");
      if (currentView === "admin") {
        navigate("home");
      }
    }
  };

  const handleToggleMockMode = () => {
    setMockMode(false);
    if (typeof window !== "undefined") {
      window.location.href = window.location.pathname;
    }
  };

  // 1. ADMIN PORTAL ROUTE
  if (currentView === "admin") {
    return (
      <>
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        <AdminLayout
          currentUser={currentUser}
          onNavigateHome={() => navigate("home")}
          onNavigateLogin={(destination) => navigate("login", null, destination || "/admin")}
          initialSection={adminSection}
        />
      </>
    );
  }

  // 2. LOGIN ROUTE
  if (currentView === "login") {
    return (
      <>
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateHome={() => navigate("home")}
        />
      </>
    );
  }

  // 3. CHECKOUT ROUTE
  if (currentView === "checkout") {
    return (
      <div className="page">
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        <div className="top-bar">
          <div className="top-bar-inner">
            {topBarItems.map((item) => (
              <span className="top-bar-item" key={item.label}>
                <span className="top-bar-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <header className="header">
          <div className="header-inner">
            <div
              className="brand"
              onClick={() => {
                navigate("home");
                handleClearAllFilters();
              }}
              style={{ cursor: "pointer" }}
            >
              <img src={logo} alt="HV Vertex logo" className="brand-logo" />
              <div className="brand-text">
                <span className="brand-name">VERTEX</span>
                <span className="brand-tagline">BUILD BETTER TOGETHER</span>
              </div>
            </div>

            <div className="header-actions">
              {currentUser ? (
                <div className="header-user-menu">
                  <span className="header-action header-user-profile" title={`Signed in as ${currentUser.email}`}>
                    <span aria-hidden="true">👤</span>
                    <span className="user-name">{currentUser.fullName?.split(" ")[0] || currentUser.email}</span>
                  </span>
                  <button type="button" className="btn-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="header-action header-action-btn"
                  onClick={() => navigate("login", null, "/checkout")}
                >
                  <span aria-hidden="true">👤</span> Login / Register
                </button>
              )}
            </div>
          </div>
        </header>

        <CheckoutPage
          currentUser={currentUser}
          cart={cart}
          onNavigateHome={() => navigate("home")}
          onNavigateLogin={(destination) => navigate("login", null, destination || "/checkout")}
          onOrderSuccess={handleOrderSuccess}
          onNavigateOrders={() => navigate("orders")}
        />

        <footer className="footer">
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} VERTEX. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Common Header component for Home, Products Catalogue, and Product Detail
  const renderSharedHeader = () => (
    <>
      {/* Top Announcement Bar — 3 Rotating Tiered Offers */}
      <AnnouncementBar />

      {flashMessage && (
        <div className="vtx-flash-banner" role="status">
          <span>{flashMessage}</span>
          <button
            type="button"
            className="vtx-flash-close"
            onClick={() => setFlashMessage(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top utility bar */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <div className="top-bar-features">
            {topBarItems.map((item) => {
              if (item.label === "Track Order") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="top-bar-item top-bar-action-btn"
                    onClick={() => {
                      if (currentUser) {
                        navigate("orders");
                      } else {
                        navigate("login", null, "/orders");
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit", padding: 0 }}
                    title="Track your orders"
                    data-testid="topbar-track-order-btn"
                  >
                    <span className="top-bar-icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </button>
                );
              }
              return (
                <span className="top-bar-item" key={item.label}>
                  <span className="top-bar-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
              );
            })}
          </div>
          <div className="top-bar-badge" aria-hidden="true">
            <span>⚡ Certified Hardware &amp; Fasteners</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header">
        <div className="header-inner">
          <button
            type="button"
            className={`vtx-hamburger-btn ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <span className="vtx-hamburger-line" aria-hidden="true" />
            <span className="vtx-hamburger-line" aria-hidden="true" />
            <span className="vtx-hamburger-line" aria-hidden="true" />
          </button>

          <div
            className="brand"
            onClick={() => {
              navigate("home");
              handleClearAllFilters();
              setMobileMenuOpen(false);
              setMegaMenuOpen(false);
            }}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="HV Vertex logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">VERTEX</span>
              <span className="brand-tagline">BUILD BETTER TOGETHER</span>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="search-bar" role="search">
            <span className="search-icon-prefix" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Search for electronics, screws, nuts, part numbers..."
              aria-label="Search products"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="btn-search-clear"
                onClick={() => {
                  setSearchInput("");
                  setActiveSearch("");
                }}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
            <button type="submit" aria-label="Search" className="btn-search-submit">
              Search
            </button>
          </form>

          <div className="header-actions">
            {currentUser ? (
              <div className="header-user-menu">
                <span className="header-action header-user-profile" title={`Signed in as ${currentUser.email}`}>
                  <span aria-hidden="true">👤</span>
                  <span className="user-name">{currentUser.fullName?.split(" ")[0] || currentUser.email}</span>
                  {currentUser.role && currentUser.role !== "CUSTOMER" && (
                    <span className="user-role-badge">{currentUser.role}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn-orders-nav"
                  onClick={() => navigate("orders")}
                  title="View your orders"
                  data-testid="header-my-orders-btn"
                >
                  📦 My Orders
                </button>
                {currentUser.role === "ADMIN" && (
                  <button
                    type="button"
                    className="btn-admin-console"
                    onClick={() => navigate("admin")}
                    title="Open VERTEX Admin Console"
                  >
                    ⚙️ Admin Console
                  </button>
                )}
                <button
                  type="button"
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Sign out of your account"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="header-action header-action-btn"
                onClick={() => navigate("login")}
                aria-label="Login / Register"
              >
                <span aria-hidden="true">👤</span>{" "}
                <span className="header-action-label">Login / Register</span>
              </button>
            )}

            {/* Wishlist Header Action */}
            <button
              type="button"
              className="header-action header-action-btn wishlist-action"
              onClick={() => navigate("wishlist-page")}
              aria-label={`Saved Wishlist with ${wishlistCount} items`}
              title="View saved wishlist components"
            >
              <span aria-hidden="true">❤️</span>{" "}
              <span className="header-action-label">Wishlist</span>
              <span className="cart-badge" data-testid="wishlist-badge">
                {wishlistCount}
              </span>
            </button>

            {/* Cart Header Action */}
            <button
              type="button"
              className="header-action cart-action"
              onClick={() => navigate("cart-page")}
              aria-label={`Shopping cart with ${cart?.totalQuantity || 0} items`}
              data-testid="cart-button"
            >
              <span aria-hidden="true">🛒</span>{" "}
              <span className="header-action-label">Cart</span>
              <span
                className={`cart-badge${cartBadgeBumped ? " is-bumped" : ""}`}
                data-testid="cart-badge"
              >
                {cart?.totalQuantity || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation bar */}
        <nav className="nav-bar" aria-label="Main store navigation">
          <div className="nav-bar-inner">
            {navItems.map((item) => {
              const handleNavClick = (e) => {
                e.preventDefault();
                if (item === "Home") {
                  setMegaMenuOpen(false);
                  navigate("home");
                  handleClearAllFilters();
                } else if (item === "Shop Categories") {
                  setMegaMenuOpen((prev) => !prev);
                } else if (item === "Products") {
                  setMegaMenuOpen(false);
                  handleNavigateCatalogWithCategory("all");
                } else if (item === "Fasteners" || item === "Screws & Fasteners") {
                  setMegaMenuOpen(false);
                  handleNavigateCatalogWithCategory("fasteners");
                } else if (item === "Electronic Products" || item === "Electronics") {
                  setMegaMenuOpen(false);
                  handleNavigateCatalogWithCategory("electronics");
                } else if (item === "Nuts") {
                  setMegaMenuOpen(false);
                  handleNavigateCatalogWithCategory("nuts");
                } else if (item === "Bulk Inquiry") {
                  setMegaMenuOpen(false);
                  setQuoteProduct({
                    name: "Custom Bulk Fasteners & Electronics",
                    sku: "VTX-BULK-CUSTOM",
                    id: "bulk-rfq",
                  });
                } else if (item === "Offers") {
                  setMegaMenuOpen(false);
                  setIsOffersOnly(true);
                  if (currentView !== "home") navigate("home");
                  const prodSection = document.getElementById("featured-products");
                  if (prodSection && typeof prodSection.scrollIntoView === "function") {
                    prodSection.scrollIntoView({ behavior: "smooth" });
                  }
                } else if (item === "Brands") {
                  handleScrollToSection("brands-strip");
                } else if (item === "Resources") {
                  handleScrollToSection("reference-section");
                } else if (item === "About") {
                  handleScrollToSection("footer");
                } else if (item === "Contact") {
                  handleScrollToSection("footer");
                }
              };

              const isNavActive =
                (item === "Home" && currentView === "home" && selectedCategory === "all" && !isOffersOnly) ||
                (item === "Shop Categories" && megaMenuOpen) ||
                (item === "Products" && currentView === "products" && selectedCatalogCategory === "all") ||
                ((item === "Fasteners" || item === "Screws & Fasteners") && (selectedCategory === "fasteners" || selectedCatalogCategory === "fasteners")) ||
                ((item === "Electronic Products" || item === "Electronics") && (selectedCategory === "electronics" || selectedCatalogCategory === "electronics")) ||
                (item === "Nuts" && (selectedCategory === "nuts" || selectedCatalogCategory === "nuts")) ||
                (item === "Offers" && isOffersOnly);

              return (
                <button
                  type="button"
                  key={item}
                  className={
                    "nav-link" +
                    (isNavActive ? " active" : "") +
                    (item === "Shop Categories" ? " nav-link-dropdown-trigger" + (megaMenuOpen ? " is-open" : "") : "")
                  }
                  onClick={handleNavClick}
                  aria-haspopup={item === "Shop Categories" ? "true" : undefined}
                  aria-expanded={item === "Shop Categories" ? megaMenuOpen : undefined}
                  aria-controls={item === "Shop Categories" ? "vtx-mega-menu" : undefined}
                >
                  <span>{item}</span>
                  {item === "Shop Categories" && (
                    <span className="nav-chevron" aria-hidden="true">▾</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Category Mega Menu */}
        <MegaMenu
          isOpen={megaMenuOpen}
          categories={categories}
          onNavigateCategory={(catSlug, subSlug) => {
            setMegaMenuOpen(false);
            handleNavigateCatalogWithCategory(catSlug, subSlug);
          }}
          onRequestQuote={() => {
            setMegaMenuOpen(false);
            setQuoteProduct({
              name: "Custom Bulk Fasteners & Electronics",
              sku: "VTX-BULK-CUSTOM",
              id: "bulk-rfq",
            });
          }}
          onClose={() => setMegaMenuOpen(false)}
        />
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="vtx-mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            className="vtx-mobile-nav-drawer is-open"
            aria-label="Mobile Navigation"
            role="dialog"
            aria-modal="true"
          >
            <div className="vtx-mobile-nav-header">
              <div className="vtx-mobile-brand">
                <span className="brand-name">VERTEX</span>
                <span className="brand-tagline">ENGINEERING STORE</span>
              </div>
              <button
                type="button"
                className="vtx-mobile-nav-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="vtx-mobile-nav-content">
              <div className="vtx-mobile-nav-section">
                <span className="vtx-mobile-nav-title">Catalog Navigation</span>

                {/* Mobile Categories Accordion */}
                <div className="vtx-mobile-category-accordion">
                  <button
                    type="button"
                    className="vtx-mobile-category-summary"
                    onClick={() => setMobileCategoriesExpanded((prev) => !prev)}
                    aria-expanded={mobileCategoriesExpanded}
                  >
                    <span>📦 Shop Categories &amp; Subcategories</span>
                    <span>{mobileCategoriesExpanded ? "▲" : "▼"}</span>
                  </button>

                  {mobileCategoriesExpanded && (
                    <div className="vtx-mobile-subcat-links">
                      {categories.map((cat) => (
                        <div key={cat.id || cat.slug} style={{ marginBottom: "8px" }}>
                          <button
                            type="button"
                            className="vtx-mobile-subcat-item"
                            style={{ fontWeight: 700, color: "var(--navy)" }}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              handleNavigateCatalogWithCategory(cat.slug, "all");
                            }}
                          >
                            <span>{cat.icon || "📦"} {cat.name}</span>
                            <span>→</span>
                          </button>
                          {cat.children && cat.children.length > 0 && (
                            <div style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "2px" }}>
                              {cat.children.map((sub) => (
                                <button
                                  type="button"
                                  key={sub.id || sub.slug}
                                  className="vtx-mobile-subcat-item"
                                  onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleNavigateCatalogWithCategory(cat.slug, sub.slug);
                                  }}
                                >
                                  <span>› {sub.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="vtx-mobile-nav-links">
                  {navItems
                    .filter((item) => item !== "Shop Categories")
                    .map((item) => {
                      const handleMobileNavClick = (e) => {
                        e.preventDefault();
                        setMobileMenuOpen(false);
                        if (item === "Home") {
                          navigate("home");
                          handleClearAllFilters();
                        } else if (item === "Products") {
                          handleNavigateCatalogWithCategory("all");
                        } else if (item === "Electronics") {
                          handleNavigateCatalogWithCategory("electronics");
                        } else if (item === "Screws & Fasteners") {
                          handleNavigateCatalogWithCategory("fasteners");
                        } else if (item === "Nuts") {
                          handleNavigateCatalogWithCategory("nuts");
                        } else if (item === "Bulk Inquiry") {
                          setQuoteProduct({
                            name: "Custom Bulk Fasteners & Electronics",
                            sku: "VTX-BULK-CUSTOM",
                            id: "bulk-rfq",
                          });
                        } else if (item === "Offers") {
                          setIsOffersOnly(true);
                          if (currentView !== "home") navigate("home");
                        } else if (item === "Brands") {
                          handleScrollToSection("brands-strip");
                        } else if (item === "Resources") {
                          handleScrollToSection("reference-section");
                        } else if (item === "About") {
                          handleScrollToSection("footer");
                        } else if (item === "Contact") {
                          handleScrollToSection("footer");
                        }
                      };

                      return (
                        <button
                          type="button"
                          key={`mobile-${item}`}
                          className="vtx-mobile-nav-link"
                          onClick={handleMobileNavClick}
                        >
                          <span>{item}</span>
                          <span aria-hidden="true" style={{ opacity: 0.5 }}>→</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="vtx-mobile-nav-footer">
                {currentUser ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-dark)" }}>
                      👤 Signed in as {currentUser.fullName || currentUser.email}
                    </div>
                    <button
                      type="button"
                      className="btn-orders-nav"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("orders");
                      }}
                      style={{ width: "100%", justifyContent: "center", padding: "8px" }}
                      data-testid="mobile-my-orders-btn"
                    >
                      📦 My Orders
                    </button>
                    {currentUser.role === "ADMIN" && (
                      <button
                        type="button"
                        className="btn-admin-console"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("admin");
                        }}
                        style={{ width: "100%", justifyContent: "center", padding: "8px" }}
                      >
                        ⚙️ Open Admin Console
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-logout"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      style={{ width: "100%", padding: "8px" }}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("login");
                    }}
                    style={{ width: "100%" }}
                  >
                    👤 Sign In / Register
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  // Common Shared Footer
  const renderSharedFooter = () => (
    <SiteFooter
      wishlistCount={wishlistCount}
      onNavigateCategory={(slug) => handleNavigateCatalogWithCategory(slug)}
      onOpenWishlist={() => navigate("wishlist-page")}
      onRequestQuote={() => setQuoteProduct({ name: "Bulk Component Order", sku: "VTX-BULK-RFQ", id: "footer-rfq" })}
      onOpenPolicy={(policyId) => setActivePolicyModal(policyId)}
    />
  );

  // Dedicated full-page shopping cart
  if (currentView === "cart-page") {
    return (
      <div className="page">
        <MockDevBanner currentUser={currentUser} currentView={currentView} onSimulateUser={handleSimulateUser} onToggleMock={handleToggleMockMode} onNavigate={navigate} />
        {renderSharedHeader()}
        <CartPage
          cart={cart}
          loading={cartLoading}
          pendingAction={pendingCartAction}
          cartError={cartError}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onContinueShopping={() => navigate("products")}
          onProceedToCheckout={handleProceedToCheckout}
        />
        {renderSharedFooter()}
        <CartDrawer
          isOpen={cartOpen} onClose={() => setCartOpen(false)} cart={cart} loading={cartLoading}
          pendingAction={pendingCartAction} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart} cartError={cartError} onClearError={() => setCartError(null)}
          onNavigateLogin={() => navigate("login", null, "/cart")} onProceedToCheckout={handleProceedToCheckout} currentUser={currentUser}
        />
        <WishlistDrawer isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} onAddToCart={handleAddToCart} onViewDetails={handleOpenProductDetail} />
      </div>
    );
  }

  // Dedicated full-page wishlist
  if (currentView === "wishlist-page") {
    const handleWishlistAddToCart = async (savedItem) => {
      const product = products.find((item) => item.id === savedItem.id || item.slug === savedItem.slug || item.id === savedItem.slug || item.slug === savedItem.id);
      if (!product) {
        handleOpenProductDetail(savedItem);
        return false;
      }
      const variant = product.variants?.[0];
      if (!variant) {
        handleOpenProductDetail(product);
        return false;
      }
      const added = await handleAddToCart(product, variant, 1);
      return added !== false;
    };
    return (
      <div className="page">
        <MockDevBanner currentUser={currentUser} currentView={currentView} onSimulateUser={handleSimulateUser} onToggleMock={handleToggleMockMode} onNavigate={navigate} />
        {renderSharedHeader()}
        <WishlistPage
          onAddToCart={handleWishlistAddToCart}
          onViewDetails={handleOpenProductDetail}
          onContinueShopping={() => navigate("products")}
        />
        {renderSharedFooter()}
        <CartDrawer
          isOpen={cartOpen} onClose={() => setCartOpen(false)} cart={cart} loading={cartLoading}
          pendingAction={pendingCartAction} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart} cartError={cartError} onClearError={() => setCartError(null)}
          onNavigateLogin={() => navigate("login", null, "/wishlist")} onProceedToCheckout={handleProceedToCheckout} currentUser={currentUser}
        />
        <WishlistDrawer isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} onAddToCart={handleAddToCart} onViewDetails={handleOpenProductDetail} />
      </div>
    );
  }

  // 3.5 DEDICATED CUSTOMER ORDERS VIEW
  if (currentView === "orders") {
    return (
      <div className="page">
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        {renderSharedHeader()}

        <main className="main-content">
          <OrdersPage
            currentUser={currentUser}
            onNavigateHome={() => navigate("home")}
            onNavigateLogin={(dest) => navigate("login", null, dest || "/orders")}
          />
        </main>

        {renderSharedFooter()}

        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          loading={cartLoading}
          pendingAction={pendingCartAction}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          cartError={cartError}
          onClearError={() => setCartError(null)}
          onNavigateLogin={() => navigate("login", null, "/orders")}
          onProceedToCheckout={handleProceedToCheckout}
          currentUser={currentUser}
        />

        <WishlistDrawer
          isOpen={wishlistOpen}
          onClose={() => setWishlistOpen(false)}
          onAddToCart={handleAddToCart}
          onViewDetails={handleOpenProductDetail}
        />
      </div>
    );
  }

  // 4. DEDICATED PRODUCTS CATALOGUE VIEW
  if (currentView === "products") {
    return (
      <div className="page">
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        {renderSharedHeader()}

        <ProductListPage
          categories={categories}
          products={products}
          loading={productsLoading}
          error={productsError}
          initialCategory={selectedCatalogCategory}
          initialSubcat={selectedCatalogSubcat}
          initialSearch={activeSearch}
          onAddToCart={handleAddToCart}
          onViewDetails={handleOpenProductDetail}
          onNavigateHome={() => navigate("home")}
          currentUser={currentUser}
        />

        {renderSharedFooter()}

        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          loading={cartLoading}
          pendingAction={pendingCartAction}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          cartError={cartError}
          onClearError={() => setCartError(null)}
          onNavigateLogin={() => navigate("login", null, "/")}
          onProceedToCheckout={handleProceedToCheckout}
          currentUser={currentUser}
        />

        <WishlistDrawer
          isOpen={wishlistOpen}
          onClose={() => setWishlistOpen(false)}
          onAddToCart={handleAddToCart}
          onViewDetails={handleOpenProductDetail}
        />

        <QuoteModal
          product={quoteProduct}
          isOpen={Boolean(quoteProduct)}
          onClose={() => setQuoteProduct(null)}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // 5. DEDICATED PRODUCT DETAIL VIEW
  if (currentView === "product-detail") {
    return (
      <div className="page">
        <MockDevBanner
          currentUser={currentUser}
          currentView={currentView}
          onSimulateUser={handleSimulateUser}
          onToggleMock={handleToggleMockMode}
          onNavigate={navigate}
        />
        {renderSharedHeader()}

        {detailLoading ? (
          <div className="vtx-detail-page" style={{ padding: "60px 20px", textAlign: "center" }}>
            <div className="product-card-skeleton" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="skeleton-thumb" style={{ height: "300px" }} />
              <div className="skeleton-body">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-price" />
              </div>
            </div>
          </div>
        ) : (
          <ProductDetailPage
            product={detailProduct}
            relatedProducts={detailRelated}
            onAddToCart={handleAddToCart}
            onNavigateHome={() => navigate("home")}
            onNavigateCatalog={(catSlug, subSlug) => handleNavigateCatalogWithCategory(catSlug || "all", subSlug || "all")}
            onSelectRelatedProduct={(rel) => handleOpenProductDetail(rel)}
            currentUser={currentUser}
          />
        )}

        {renderSharedFooter()}

        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          loading={cartLoading}
          pendingAction={pendingCartAction}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          cartError={cartError}
          onClearError={() => setCartError(null)}
          onNavigateLogin={() => navigate("login", null, "/")}
          onProceedToCheckout={handleProceedToCheckout}
          currentUser={currentUser}
        />

        <WishlistDrawer
          isOpen={wishlistOpen}
          onClose={() => setWishlistOpen(false)}
          onAddToCart={handleAddToCart}
          onViewDetails={handleOpenProductDetail}
        />

        <QuoteModal
          product={quoteProduct}
          isOpen={Boolean(quoteProduct)}
          onClose={() => setQuoteProduct(null)}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // 6. DEFAULT STOREFRONT HOME VIEW
  const categoryTabs = categories.length > 0
    ? categories.filter((c) => c.isActive !== false).map((c) => ({ key: c.slug, label: c.name }))
    : [
      { key: "fasteners", label: "Fasteners" },
      { key: "electronics", label: "Electronic Products" },
      { key: "nuts", label: "Nuts" },
    ];

  const filterTabs = [
    { key: "all", label: "All" },
    ...categoryTabs,
    { key: "offers", label: "Offers" },
  ];

  const visibleProducts = products.filter((p) => {
    // 1. Only active products
    if (p.isActive === false) return false;
    // 2. Only products in active categories
    const cat = categories.find((c) => c.id === p.categoryId || c.slug === p.category?.slug);
    if (cat && cat.isActive === false) return false;
    // 3. Offers filter
    if (isOffersOnly) {
      return p.tag || (p.mrp && Number(p.mrp) > Number(p.price));
    }
    return true;
  });

  const fastenersRailProducts = visibleProducts.filter(
    (p) =>
      p.category?.slug === "fasteners" ||
      p.categoryId === "cat-fasteners" ||
      p.category?.slug?.includes("fastener") ||
      p.category?.slug?.includes("screw")
  );

  const electronicsRailProducts = visibleProducts.filter(
    (p) =>
      p.category?.slug === "electronics" ||
      p.categoryId === "cat-electronics" ||
      p.category?.slug?.includes("elect")
  );

  const nutsRailProducts = visibleProducts.filter(
    (p) =>
      p.category?.slug === "nuts" ||
      p.categoryId === "cat-nuts" ||
      p.subcategory?.slug === "nuts" ||
      p.subcategory?.id === "sub-nuts" ||
      p.categoryIds?.includes("cat-nuts") ||
      p.category?.slug?.includes("nut")
  );

  const otherRailProducts = visibleProducts.filter(
    (p) =>
      !fastenersRailProducts.includes(p) &&
      !electronicsRailProducts.includes(p) &&
      !nutsRailProducts.includes(p)
  );

  return (
    <div className="page">
      <a href="#shop-categories" className="skip-link">
        Skip to content
      </a>
      <MockDevBanner
        currentUser={currentUser}
        currentView={currentView}
        onSimulateUser={handleSimulateUser}
        onToggleMock={handleToggleMockMode}
        onNavigate={navigate}
      />
      {renderSharedHeader()}

      {/* Hero Section — 4-Slide Interactive Slider */}
      <HeroSlider
        onExploreProducts={handleExploreProducts}
        onNavigateCategory={handleCategorySelect}
        onNavigateCatalog={() => handleNavigateCatalogWithCategory("all")}
        onRequestQuote={() =>
          setQuoteProduct({
            name: "Custom Bulk Fasteners & Electronics",
            sku: "VTX-BULK-CUSTOM",
            id: "bulk-rfq",
          })
        }
      />

      {/* Shipping & Store Guarantees Info Strip */}
      <ShippingInfoStrip onOpenPolicy={(policyId) => setActivePolicyModal(policyId)} />

      {/* Shop by Category Section */}
      <CategoryTiles
        categories={categories}
        loading={categoriesLoading}
        error={categoriesError}
        onRetry={loadCategories}
        onSelectCategory={(catSlug, subSlug) => handleNavigateCatalogWithCategory(catSlug, subSlug)}
      />

      {/* Featured Products Section */}
      <section className="section" id="featured-products">
        <div className="section-head">
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h2>Featured Products</h2>
            {!productsLoading && !productsError && (
              <span className="catalog-count-badge">
                ({pagination.totalItems > 0 ? pagination.totalItems : visibleProducts.length}{" "}
                {(pagination.totalItems || visibleProducts.length) === 1 ? "product" : "products"})
              </span>
            )}
          </div>
          <div className="filter-tabs" role="tablist" aria-label="Category filter tabs">
            {filterTabs.map((tab) => {
              const isActive =
                (tab.key === "all" && selectedCategory === "all" && !isOffersOnly) ||
                (tab.key === "offers" && isOffersOnly) ||
                (!isOffersOnly && selectedCategory === tab.key);

              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  className={"filter-tab" + (isActive ? " active" : "")}
                  onClick={() => {
                    if (tab.key === "all") {
                      setSelectedCategory("all");
                      setIsOffersOnly(false);
                    } else if (tab.key === "offers") {
                      setIsOffersOnly(true);
                    } else {
                      setSelectedCategory(tab.key);
                      setIsOffersOnly(false);
                    }
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => handleNavigateCatalogWithCategory("all")}
            className="link-arrow"
          >
            Open Full Catalogue →
          </button>
        </div>

        {activeSearch && (
          <div className="search-active-bar" role="status">
            <span className="search-active-label">
              Search results for: <span className="search-active-term">"{activeSearch}"</span>
            </span>
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => {
                setActiveSearch("");
                setSearchInput("");
              }}
            >
              ✕ Clear Search
            </button>
          </div>
        )}

        {productsLoading ? (
          <div className="product-grid" role="status" aria-label="Loading products">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div className="product-card-skeleton" key={n}>
                <div className="skeleton-thumb" />
                <div className="skeleton-body">
                  <div className="skeleton-line skeleton-title" />
                  <div className="skeleton-line skeleton-price" />
                  <div className="skeleton-line skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : productsError ? (
          <div className="catalog-error-state" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h3>Unable to Load Products</h3>
            <p>{productsError}</p>
            <button type="button" className="btn-retry" onClick={loadProducts}>
              ↻ Retry
            </button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="catalog-empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">🔍</div>
            <h3>No products found</h3>
            <p>
              {activeSearch
                ? `We couldn't find any products matching "${activeSearch}".`
                : "No products are currently available in this category."}
            </p>
            <button type="button" className="btn btn-primary" onClick={handleClearAllFilters}>
              Clear All Filters
            </button>
          </div>
        ) : activeSearch || selectedCategory !== "all" || isOffersOnly ? (
          <div className="product-grid">
            {visibleProducts.map((p, idx) => (
              <ProductCard
                key={p.id || p.slug}
                product={p}
                onAddToCart={handleAddToCart}
                onViewDetails={handleOpenProductDetail}
                onRequestQuote={(prod) => setQuoteProduct(prod)}
                isAdding={pendingCartAction?.id === p.variants?.[0]?.id}
                revealIndex={idx}
              />
            ))}
          </div>
        ) : (
          <div className="vtx-home-rails-container">
            {fastenersRailProducts.length > 0 && (
              <ProductRail
                title="Mini Assorted Packs & Fasteners"
                subtitle="Precision metric machine screws, SS304 hex bolts, and assorted packs."
                badge="MINI ASSORTED PACKS"
                products={fastenersRailProducts}
                onAddToCart={handleAddToCart}
                onViewDetails={handleOpenProductDetail}
                onRequestQuote={(prod) => setQuoteProduct(prod)}
                onViewAll={() => handleNavigateCatalogWithCategory("fasteners")}
                pendingCartAction={pendingCartAction}
              />
            )}
            {electronicsRailProducts.length > 0 && (
              <ProductRail
                title="Power Tools & Development Boards"
                subtitle="Industrial-grade microcontrollers, motor drivers, and lab hardware."
                badge="ELECTRONICS"
                products={electronicsRailProducts}
                onAddToCart={handleAddToCart}
                onViewDetails={handleOpenProductDetail}
                onRequestQuote={(prod) => setQuoteProduct(prod)}
                onViewAll={() => handleNavigateCatalogWithCategory("electronics")}
                pendingCartAction={pendingCartAction}
              />
            )}
            {nutsRailProducts.length > 0 && (
              <ProductRail
                title="Assorted Screw Packs & Nut Types"
                subtitle="High-durability Nyloc nuts, hex nuts, and precision lock assemblies."
                badge="POPULAR PICKS"
                products={nutsRailProducts}
                onAddToCart={handleAddToCart}
                onViewDetails={handleOpenProductDetail}
                onRequestQuote={(prod) => setQuoteProduct(prod)}
                onViewAll={() => handleNavigateCatalogWithCategory("nuts")}
                pendingCartAction={pendingCartAction}
              />
            )}
            {otherRailProducts.length > 0 && (
              <ProductRail
                title="Industrial Components & Automation"
                subtitle="Sensors, precision assembly tools, and verified engineering accessories."
                badge="HARDWARE"
                products={otherRailProducts}
                onAddToCart={handleAddToCart}
                onViewDetails={handleOpenProductDetail}
                onRequestQuote={(prod) => setQuoteProduct(prod)}
                onViewAll={() => handleNavigateCatalogWithCategory("all")}
                pendingCartAction={pendingCartAction}
              />
            )}
          </div>
        )}
      </section>

      {/* Reference lists: fastener & nut types from the official category list */}
      <section className="section reference-section">
        <div className="reference-grid">
          <ScrollReveal staggerIndex={0} yOffset={18} duration={0.45}>
            <div className="reference-card vtx-reveal is-revealed vtx-stagger-1">
              <h3>Screws &amp; Fasteners — Types</h3>
              <ul>
                {fastenerTypes.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className="vtx-ref-link"
                      onClick={() => handleNavigateCatalogWithCategory("fasteners")}
                    >
                      {t} →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal staggerIndex={1} yOffset={18} duration={0.45}>
            <div className="reference-card vtx-reveal is-revealed vtx-stagger-2">
              <h3>Nut Types</h3>
              <ul>
                {nutTypes.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className="vtx-ref-link"
                      onClick={() => handleNavigateCatalogWithCategory("nuts")}
                    >
                      {t} →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Value Propositions */}
      <ValueProps />

      {/* Bulk Procurement & RFQ */}
      <BulkInquirySection
        onRequestQuote={() =>
          setQuoteProduct({
            name: "Bulk Hardware & Component Inquiry",
            sku: "VTX-BULK-TIER",
            id: "bulk-rfq",
          })
        }
      />

      {/* Newsletter */}
      <section className="newsletter">
        <ScrollReveal yOffset={18} duration={0.45}>
          <div className="newsletter-inner">
            <h3>Stay Updated on New Arrivals &amp; Tech Guides</h3>
            <p>
              Get product updates, technical datasheets and exclusive offers
              delivered to your inbox.
            </p>
            {subscribed ? (
              <p className="newsletter-success">
                ✓ Thank you for subscribing to VERTEX updates!
              </p>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubscribe}>
                {newsletterError && (
                  <div className="newsletter-error" style={{ color: "#ef4444", fontSize: "13px", marginBottom: "8px" }} role="alert">
                    {newsletterError}
                  </div>
                )}
                <input
                  type="email"
                  placeholder="Enter your work email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Work email address"
                  required
                  disabled={subscribing}
                />
                <button className="btn btn-primary" type="submit" disabled={subscribing}>
                  {subscribing ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            )}
          </div>
        </ScrollReveal>
      </section>

      {/* Brands Strip */}
      <section className="brands-strip">
        <ScrollReveal yOffset={16} duration={0.42}>
          <div className="brands-inner">
            <span className="brands-label">Featured Brands</span>
            <div className="brand-tags">
              {brands.map((b) => (
                <span
                  className="brand-tag"
                  key={b}
                  onClick={() => {
                    navigate("products", "dashboard", null, null, `brand=${encodeURIComponent(b)}`);
                  }}
                  style={{ cursor: "pointer" }}
                  title={`Browse ${b} products`}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {renderSharedFooter()}

      {/* Quick Specs Modal (if opened via Specs button modal fallback) */}
      {selectedQuickProduct && (
        <div
          className="vtx-modal-backdrop"
          onClick={() => setSelectedQuickProduct(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="vtx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vtx-modal-header">
              <div>
                <span className="vtx-modal-badge">{selectedQuickProduct.category?.name || "Hardware Component"}</span>
                <h3 className="vtx-modal-title">{selectedQuickProduct.name}</h3>
              </div>
              <button
                type="button"
                className="vtx-modal-close"
                onClick={() => setSelectedQuickProduct(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="vtx-modal-body">
              <div className="vtx-spec-grid">
                <div className="vtx-spec-thumb">
                  {selectedQuickProduct.imageUrl ? (
                    <img src={selectedQuickProduct.imageUrl} alt={selectedQuickProduct.name} className="vtx-spec-img" />
                  ) : (
                    <div className="vtx-spec-placeholder">
                      {selectedQuickProduct.name ? selectedQuickProduct.name[0].toUpperCase() : "P"}
                    </div>
                  )}
                </div>
                <div className="vtx-spec-details">
                  <div className="vtx-spec-line">
                    <strong>SKU Code:</strong> <code>{selectedQuickProduct.variants?.[0]?.sku || selectedQuickProduct.sku || "VTX-GEN-SKU"}</code>
                  </div>
                  <div className="vtx-spec-line">
                    <strong>Price:</strong>{" "}
                    {selectedQuickProduct.price !== null && selectedQuickProduct.price !== undefined ? (
                      <span className="vtx-spec-price">₹{Number(selectedQuickProduct.price).toLocaleString("en-IN")}</span>
                    ) : (
                      <span className="vtx-spec-price" style={{ color: "var(--orange-dark)" }}>Quote on Request</span>
                    )}
                  </div>
                  <p className="vtx-spec-desc">{selectedQuickProduct.description}</p>
                </div>
              </div>
            </div>
            <div className="vtx-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedQuickProduct(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleOpenProductDetail(selectedQuickProduct);
                  setSelectedQuickProduct(null);
                }}
              >
                Full Product Page →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commercial Request a Quote Modal */}
      <QuoteModal
        product={quoteProduct}
        isOpen={Boolean(quoteProduct)}
        onClose={() => setQuoteProduct(null)}
        currentUser={currentUser}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        loading={cartLoading}
        pendingAction={pendingCartAction}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        cartError={cartError}
        onClearError={() => setCartError(null)}
        onNavigateLogin={() => navigate("login", null, "/")}
        onProceedToCheckout={handleProceedToCheckout}
        currentUser={currentUser}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        onAddToCart={handleAddToCart}
        onViewDetails={handleOpenProductDetail}
      />

      {/* Official VERTEX Policy Modal */}
      <PolicyModal
        policyId={activePolicyModal}
        isOpen={Boolean(activePolicyModal)}
        onClose={() => setActivePolicyModal(null)}
      />

      {/* Floating Technical Support Assistance */}
      <FloatingSupport
        onRequestQuote={() =>
          setQuoteProduct({
            name: "Bulk Hardware & Component Inquiry",
            sku: "VTX-BULK-TIER",
            id: "bulk-rfq",
          })
        }
        onOpenPolicy={(policyId) => setActivePolicyModal(policyId)}
      />
    </div>
  );
}
