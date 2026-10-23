import React, { useState, useEffect, useCallback } from "react";
import logo from "./assets/logo.png";
import arduinoImg from "./assets/hardware/arduino.jpg";
import LoginPage from "./components/Login/LoginPage";
import AdminLayout from "./components/Admin/AdminLayout";
import CartDrawer from "./components/Cart/CartDrawer";
import CheckoutPage from "./components/Checkout/CheckoutPage";
import OrdersPage from "./components/Orders/OrdersPage";
import ProductListPage from "./components/Products/ProductListPage";
import ProductDetailPage from "./components/Products/ProductDetailPage";
import ProductCard from "./components/Products/ProductCard";
import WishlistDrawer from "./components/Products/WishlistDrawer";
import QuoteModal from "./components/Products/QuoteModal";
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
  "Products",
  "Fasteners",
  "Electronic Products",
  "Nuts",
  "Brands",
  "Offers",
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

  // Dedicated Product Detail state
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailRelated, setDetailRelated] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // RFQ Modal State
  const [quoteProduct, setQuoteProduct] = useState(null);

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

  // Close mobile drawer on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
        limit: 12,
        officialOnly: true,
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
  }, [activeSearch, selectedCategory]);

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
      return;
    }

    // If product has no price or is quote-only, open quote modal
    if (product.price === null || product.price === undefined) {
      setQuoteProduct(product);
      return;
    }

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
    } catch (err) {
      setCartError(err.message || "Failed to add item to cart.");
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
              >
                <span aria-hidden="true">👤</span> Login / Register
              </button>
            )}

            {/* Wishlist Header Action */}
            <button
              type="button"
              className="header-action wishlist-action"
              onClick={() => setWishlistOpen(true)}
              aria-label={`Saved Wishlist with ${wishlistCount} items`}
              title="View saved wishlist components"
            >
              <span aria-hidden="true">❤️</span> Wishlist
              <span className="cart-badge" data-testid="wishlist-badge">
                {wishlistCount}
              </span>
            </button>

            {/* Cart Header Action */}
            <button
              type="button"
              className="header-action cart-action"
              onClick={() => setCartOpen(true)}
              aria-label={`Shopping cart with ${cart?.totalQuantity || 0} items`}
              data-testid="cart-button"
            >
              <span aria-hidden="true">🛒</span> Cart
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
                  navigate("home");
                  handleClearAllFilters();
                } else if (item === "Products") {
                  handleNavigateCatalogWithCategory("all");
                } else if (item === "Fasteners" || item === "Screws & Fasteners") {
                  handleNavigateCatalogWithCategory("fasteners");
                } else if (item === "Electronic Products" || item === "Electronics") {
                  handleNavigateCatalogWithCategory("electronics");
                } else if (item === "Nuts") {
                  handleNavigateCatalogWithCategory("nuts");
                } else if (item === "Offers") {
                  setIsOffersOnly(true);
                  if (currentView !== "home") navigate("home");
                  const prodSection = document.getElementById("featured-products");
                  if (prodSection && typeof prodSection.scrollIntoView === "function") {
                    prodSection.scrollIntoView({ behavior: "smooth" });
                  }
                }
              };

              const isNavActive =
                (item === "Home" && currentView === "home" && selectedCategory === "all" && !isOffersOnly) ||
                (item === "Products" && currentView === "products" && selectedCatalogCategory === "all") ||
                ((item === "Fasteners" || item === "Screws & Fasteners") && (selectedCategory === "fasteners" || selectedCatalogCategory === "fasteners")) ||
                ((item === "Electronic Products" || item === "Electronics") && (selectedCategory === "electronics" || selectedCatalogCategory === "electronics")) ||
                (item === "Nuts" && (selectedCategory === "nuts" || selectedCatalogCategory === "nuts")) ||
                (item === "Offers" && isOffersOnly);

              return (
                <button
                  type="button"
                  key={item}
                  className={"nav-link" + (isNavActive ? " active" : "")}
                  onClick={handleNavClick}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </nav>
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
            role="region"
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
                <div className="vtx-mobile-nav-links">
                  {navItems.map((item) => {
                    const handleMobileNavClick = (e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      if (item === "Home") {
                        navigate("home");
                        handleClearAllFilters();
                      } else if (item === "Products") {
                        handleNavigateCatalogWithCategory("all");
                      } else if (item === "Fasteners" || item === "Screws & Fasteners") {
                        handleNavigateCatalogWithCategory("fasteners");
                      } else if (item === "Electronic Products" || item === "Electronics") {
                        handleNavigateCatalogWithCategory("electronics");
                      } else if (item === "Nuts") {
                        handleNavigateCatalogWithCategory("nuts");
                      } else if (item === "Offers") {
                        setIsOffersOnly(true);
                        if (currentView !== "home") navigate("home");
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
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <div className="brand footer-brand">
            <img src={logo} alt="HV Vertex logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">VERTEX</span>
              <span className="brand-tagline">BUILD BETTER TOGETHER</span>
            </div>
          </div>
          <p className="footer-about">
            VERTEX is an online engineering components and precision hardware store.
            Supplying automotive lithium-ion cells, microcontroller hardware, motor drivers,
            and metric fasteners across India.
          </p>
        </div>

        <div className="footer-col">
          <h4>Catalogue</h4>
          <ul>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavigateCatalogWithCategory("all")}
              >
                All Products
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavigateCatalogWithCategory("electronics")}
              >
                Lithium Cells &amp; Electronics
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavigateCatalogWithCategory("fasteners")}
              >
                Screws &amp; Fasteners
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavigateCatalogWithCategory("nuts")}
              >
                Nuts &amp; Washers
              </button>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Support &amp; Commercial</h4>
          <ul>
            <li>
              <button type="button" className="footer-link-btn" onClick={() => setWishlistOpen(true)}>
                Saved Wishlist ({wishlistCount})
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => setQuoteProduct({ name: "Bulk Component Order", sku: "VTX-BULK-RFQ" })}
              >
                Request Commercial Quote
              </button>
            </li>
            <li>
              <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                Pan-India Shipping Policy
              </button>
            </li>
            <li>
              <button type="button" className="footer-link-btn" onClick={(e) => e.preventDefault()}>
                GST Tax Invoicing
              </button>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contact &amp; Hub</h4>
          <p>📍 Hyderabad, Telangana, India</p>
          <p>✉️ sales@vertex.in</p>
          <p>📞 +91 98765 43210</p>
          <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            ⚡ Verified Technical Specifications
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} VERTEX Engineering &amp; Supplies. All rights reserved.</p>
      </div>
    </footer>
  );

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
    // 0. Only official catalog products (excludes demo fixtures)
    if (p.isOfficialCatalog === false) return false;
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

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-badge">
              <span>⚡ Industrial Components &amp; Precision Fasteners</span>
            </div>
            <h1>
              Precision Electronics &amp; Hardware Fasteners
              <br />
              <span className="hero-accent">Built for Engineering &amp; B2B Supply</span>
            </h1>
            <p className="hero-sub">
              Source factory-tested microcontrollers, industrial automation modules, SS304 metric fasteners, and lab components with transparent volume pricing and pan-India dispatch.
            </p>
            <div className="hero-ctas">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExploreProducts}
              >
                Explore Products ↓
              </button>
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => handleCategorySelect("electronics")}
              >
                Shop Electronics →
              </button>
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => handleNavigateCatalogWithCategory("all")}
              >
                Browse Catalogue →
              </button>
            </div>
            <div className="hero-perks-row">
              <span className="hero-perk-item">✓ Factory Verified Sourcing</span>
              <span className="hero-perk-item">✓ SS304 Precision Tolerances</span>
              <span className="hero-perk-item">✓ GST Tax Invoicing</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-card-preview">
              <div className="hero-preview-header">
                <span className="hero-pill-category">Hardware Showcase</span>
                <span className="hero-pill-status">● Ready to Dispatch</span>
              </div>
              <div className="hero-preview-img-wrap">
                <img src={arduinoImg} alt="Industrial Microcontroller" className="hero-preview-img" />
              </div>
              <div className="hero-preview-body">
                <div className="hero-preview-title">Arduino Uno R3 &amp; SS304 Metric Hardware</div>
                <div className="hero-preview-sku">SKU: ELEC-ARD-UNO-R3 • SS304 M3-M10</div>
                <div className="hero-preview-footer">
                  <span className="hero-preview-price">Verified B2B Direct Sourcing</span>
                  <span className="hero-preview-tag">ISO 9001 Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Value Propositions */}
      <section className="vtx-values-bar" aria-label="Why choose VERTEX">
        <div className="vtx-values-inner">
          <div className="vtx-value-card vtx-reveal vtx-stagger-1">
            <div className="vtx-value-icon" aria-hidden="true">🔌</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Industrial Component Selection</h3>
              <p className="vtx-value-desc">
                Factory-tested microcontrollers, motor drivers, PLCs, and development boards for production and lab prototypes.
              </p>
            </div>
          </div>
          <div className="vtx-value-card vtx-reveal vtx-stagger-2">
            <div className="vtx-value-icon" aria-hidden="true">🔩</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Technical Specifications</h3>
              <p className="vtx-value-desc">
                Standard metric pitches, SS304 tensile tolerance, and documented pack sizes for every fastener SKU.
              </p>
            </div>
          </div>
          <div className="vtx-value-card vtx-reveal vtx-stagger-3">
            <div className="vtx-value-icon" aria-hidden="true">📦</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Bulk Purchasing Options</h3>
              <p className="vtx-value-desc">
                Volume-tiered pricing and direct quote requests for workshops, educational institutions, and OEMs.
              </p>
            </div>
          </div>
          <div className="vtx-value-card vtx-reveal vtx-stagger-4">
            <div className="vtx-value-icon" aria-hidden="true">🚚</div>
            <div className="vtx-value-content">
              <h3 className="vtx-value-title">Order Visibility &amp; Support</h3>
              <p className="vtx-value-desc">
                Transparent shipment dispatch, GST-compliant tax invoices, and dedicated technical inquiry assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="section" id="shop-categories">
        <div className="section-head">
          <h2>Shop by Category</h2>
          <button
            type="button"
            onClick={() => handleNavigateCatalogWithCategory("all")}
            className="link-arrow"
          >
            View All Categories →
          </button>
        </div>

        {categoriesLoading ? (
          <div className="category-grid" role="status" aria-label="Loading categories">
            {[1, 2, 3].map((n) => (
              <div className="category-card-skeleton" key={n}>
                <div className="skeleton-line" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line" style={{ width: "90%" }} />
                <div className="skeleton-line" style={{ width: "60%" }} />
              </div>
            ))}
          </div>
        ) : categoriesError ? (
          <div className="catalog-error-state" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h3>Unable to Load Categories</h3>
            <p>{categoriesError}</p>
            <button type="button" className="btn-retry" onClick={loadCategories}>
              ↻ Retry
            </button>
          </div>
        ) : (
          <div className="category-grid">
            {categories.filter((cat) => cat.isActive !== false).map((cat, idx) => {
              const tint = cat.tint || ["tint-blue", "tint-orange", "tint-green"][idx % 3];
              const icon = cat.icon || (cat.slug?.includes("elect") ? "🔌" : cat.slug?.includes("fast") ? "🔩" : cat.slug?.includes("nut") ? "⬡" : "📦");
              const subCountText = cat.children && cat.children.length > 0
                ? `${cat.children.length} Subcategories`
                : cat.productsCount !== undefined
                  ? `${cat.productsCount} Products`
                  : "Verified Catalog";

              return (
                <div className={`category-card ${tint} vtx-reveal vtx-stagger-${(idx % 3) + 1}`} key={cat.id || cat.slug}>
                  <div className="category-icon">{icon}</div>
                  <h3>{cat.name}</h3>
                  <p>{cat.description || "High-precision components engineered for industrial & prototyping applications."}</p>
                  <div className="category-foot">
                    <button
                      type="button"
                      className="link-text"
                      onClick={() => handleNavigateCatalogWithCategory(cat.slug)}
                    >
                      Explore {cat.name} →
                    </button>
                    <span>{subCountText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
        ) : (
          <div className="product-grid">
            {visibleProducts.map((p) => (
              <ProductCard
                key={p.id || p.slug}
                product={p}
                onAddToCart={handleAddToCart}
                onViewDetails={handleOpenProductDetail}
                onRequestQuote={(prod) => setQuoteProduct(prod)}
                isAdding={pendingCartAction?.id === p.variants?.[0]?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reference lists: fastener & nut types from the official category list */}
      <section className="section reference-section">
        <div className="reference-grid">
          <div className="reference-card vtx-reveal vtx-stagger-1">
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
          <div className="reference-card vtx-reveal vtx-stagger-2">
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
        </div>
      </section>

      {/* Bulk Orders Banner */}
      <section className="bulk-banner vtx-reveal">
        <div className="bulk-copy">
          <h3>
            Bulk Orders
            <br />
            Better Prices
          </h3>
          <p>
            Get special pricing for bulk orders. Ideal for industries,
            educational institutions and makers.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setQuoteProduct({ name: "Bulk Hardware Inquiry", sku: "VTX-BULK-TIER" })}
          >
            Request a Quote →
          </button>
        </div>
        <div className="bulk-perks">
          <div>
            <span>💎</span>
            <p>Genuine Products</p>
          </div>
          <div>
            <span>🚚</span>
            <p>Pan India Delivery</p>
          </div>
          <div>
            <span>🛡️</span>
            <p>Secure Payments</p>
          </div>
          <div>
            <span>🎧</span>
            <p>Dedicated Support</p>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
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
      </section>

      {/* Brands Strip */}
      <section className="brands-strip">
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
    </div>
  );
}
