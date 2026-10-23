import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App.jsx';
import * as authApi from './services/authApi';
import * as adminApi from './services/adminApi';
import * as catalogApi from './services/catalogApi';
import * as cartApi from './services/cartApi';
import * as orderApi from './services/orderApi';

jest.mock('./services/authApi');
jest.mock('./services/adminApi');
jest.mock('./services/catalogApi');
jest.mock('./services/cartApi');
jest.mock('./services/orderApi');

describe('VERTEX Unified Login & Role-Based Routing Suite', () => {
  const mockAdminUser = {
    id: 'admin-uuid-1',
    fullName: 'Chief Engineer',
    email: 'admin@vertex.local',
    role: 'ADMIN',
    mfaEnabled: true,
  };

  const mockCustomerUser = {
    id: 'cust-uuid-1',
    fullName: 'Jane Customer',
    email: 'customer@vertex.local',
    role: 'CUSTOMER',
    mfaEnabled: false,
  };

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
      icon: '🔌',
      tint: 'tint-blue',
      description: 'Microcontrollers, Motor Drives, PLC, Development Boards',
      children: [],
      productsCount: 4,
    },
    {
      id: 'cat-2',
      name: 'Screws & Fasteners',
      slug: 'fasteners',
      icon: '🔩',
      tint: 'tint-orange',
      description: 'Flat, Phillips, Hex, Torx, Bolts, Washers, Brass Inserts',
      children: [],
      productsCount: 8,
    },
    {
      id: 'cat-3',
      name: 'Nut Types',
      slug: 'nuts',
      icon: '⬡',
      tint: 'tint-green',
      description: 'Hex, Nyloc, Flanged Nyloc, Wing, Dome, Flange Nuts',
      children: [],
      productsCount: 6,
    },
  ];

  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Arduino Uno R3 Microcontroller Board',
      slug: 'arduino-uno-r3',
      price: 1299,
      mrp: null,
      tag: 'Best Seller',
      imageUrl: 'https://images.vertex.local/arduino.jpg',
      inStock: true,
      category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
      variants: [{ id: 'var-1', sku: 'ARD-UNO-R3', packSize: '1 Unit', price: 1299, stockQuantity: 50 }],
    },
    {
      id: 'prod-2',
      name: 'Stainless Steel Hex Bolt (M8 x 30mm)',
      slug: 'ss-hex-bolt-m8',
      price: 250,
      mrp: 300,
      tag: '10% OFF',
      imageUrl: null,
      inStock: true,
      category: { id: 'cat-2', name: 'Screws & Fasteners', slug: 'fasteners' },
      variants: [{ id: 'var-2', sku: 'BOLT-HEX-M8', packSize: 'Pack of 10', price: 250, stockQuantity: 100 }],
    },
    {
      id: 'prod-3',
      name: 'Nyloc Nut (M8)',
      slug: 'nyloc-nut-m8',
      price: 120,
      mrp: null,
      tag: null,
      imageUrl: null,
      inStock: false,
      category: { id: 'cat-3', name: 'Nut Types', slug: 'nuts' },
      variants: [{ id: 'var-3', sku: 'NUT-NYLOC-M8', packSize: 'Pack of 20', price: 120, stockQuantity: 0 }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage and URL history
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    window.history.pushState({}, '', '/');

    // Default: unauthenticated visitor
    authApi.getCurrentUser.mockResolvedValue({ user: null });
    authApi.logoutUser.mockResolvedValue({ success: true });

    adminApi.verifyAdminAuthorization.mockResolvedValue({
      status: 'AUTHORIZED',
      user: mockAdminUser,
    });
    adminApi.getSystemHealth.mockResolvedValue({
      status: 'UP',
      database: { connected: true, type: 'PostgreSQL' },
    });
    adminApi.getAdminProducts.mockResolvedValue({ products: [], pagination: { totalItems: 0 } });
    adminApi.getAdminCategories.mockResolvedValue({ categories: [] });

    // Catalog API mocks
    catalogApi.getCategories.mockResolvedValue({ success: true, categories: mockCategories });
    catalogApi.getProducts.mockResolvedValue({
      success: true,
      products: mockProducts,
      pagination: { totalItems: 3, page: 1, limit: 12, totalPages: 1 },
    });

    // Cart API mocks
    cartApi.getCart.mockResolvedValue({
      success: true,
      cart: {
        id: 'cart-init',
        userId: null,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
      },
    });
    cartApi.addItemToCart.mockImplementation(async ({ variantId, quantity = 1 }) => ({
      success: true,
      cart: {
        id: 'cart-auth-1',
        userId: 'cust-uuid-1',
        items: [
          {
            id: `item-${variantId}`,
            variantId,
            quantity,
            unitPrice: 1299,
            lineTotal: 1299 * quantity,
            isAvailable: true,
            variant: { id: variantId, sku: 'ARD-UNO-R3', price: 1299, stockQuantity: 50 },
            product: { id: 'prod-1', name: 'Arduino Uno R3 Microcontroller Board' },
          },
        ],
        itemCount: 1,
        totalQuantity: quantity,
        subtotal: 1299 * quantity,
      },
    }));
    cartApi.updateCartItemQuantity.mockImplementation(async (itemId, quantity) => ({
      success: true,
      cart: {
        id: 'cart-auth-1',
        userId: 'cust-uuid-1',
        items: [
          {
            id: itemId,
            variantId: 'var-1',
            quantity,
            unitPrice: 1299,
            lineTotal: 1299 * quantity,
            isAvailable: true,
            variant: { id: 'var-1', sku: 'ARD-UNO-R3', price: 1299, stockQuantity: 50 },
            product: { id: 'prod-1', name: 'Arduino Uno R3 Microcontroller Board' },
          },
        ],
        itemCount: 1,
        totalQuantity: quantity,
        subtotal: 1299 * quantity,
      },
    }));
    cartApi.removeCartItem.mockResolvedValue({
      success: true,
      cart: {
        id: 'cart-auth-1',
        userId: 'cust-uuid-1',
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
      },
    });
    cartApi.clearCart.mockResolvedValue({
      success: true,
      cart: {
        id: 'cart-auth-1',
        userId: 'cust-uuid-1',
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
      },
    });
    cartApi.mergeGuestCart.mockImplementation(async (items) => {
      const mergedQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
      return {
        success: true,
        cart: {
          id: 'cart-merged-1',
          userId: 'cust-uuid-1',
          items: items.map((it) => ({
            id: `item-${it.variantId}`,
            variantId: it.variantId,
            quantity: it.quantity,
            unitPrice: 1299,
            lineTotal: 1299 * it.quantity,
            isAvailable: true,
            variant: { id: it.variantId, sku: 'ARD-UNO-R3', price: 1299, stockQuantity: 50 },
            product: { id: 'prod-1', name: 'Arduino Uno R3 Microcontroller Board' },
          })),
          itemCount: items.length,
          totalQuantity: mergedQuantity,
          subtotal: 1299 * mergedQuantity,
        },
      };
    });

    // Order API mocks
    orderApi.getAddresses.mockResolvedValue({ success: true, addresses: [] });
    orderApi.placeOrder.mockResolvedValue({
      success: true,
      order: {
        id: 'ord-app-1',
        orderNumber: 'VTX-20261018-11111',
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'COD',
        subtotal: 1299,
        taxAmount: 233.82,
        shippingFee: 0,
        totalAmount: 1532.82,
        items: [],
      },
    });
  });

  test('1. Renders VERTEX storefront header and brand tagline', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText(/VERTEX/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/BUILD BETTER TOGETHER/i).length).toBeGreaterThan(0);
    });
  });

  test('2. Storefront Login/Register button opens shared login page', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    const loginBtn = screen.getByRole('button', { name: /Login \/ Register/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    });
  }, 15000);

  test('3. Admin signs in through the shared login page and reaches /admin', async () => {
    authApi.loginUser.mockResolvedValue({
      success: true,
      user: mockAdminUser,
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@vertex.local' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AdminPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
    });
  });

  test('4. Customer signs in through the same login page and reaches the storefront', async () => {
    authApi.loginUser.mockResolvedValue({
      success: true,
      user: mockCustomerUser,
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'customer@vertex.local' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'CustomerPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Jane Customer!/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/');
      expect(screen.queryByLabelText(/Admin Navigation/i)).not.toBeInTheDocument();
      expect(screen.queryByText('ADMIN CONSOLE')).not.toBeInTheDocument();
    });
  });

  test('5. MFA works within the same shared login flow before routing admin to /admin', async () => {
    authApi.loginUser.mockResolvedValue({
      mfaRequired: true,
      mfaChallengeToken: 'test-challenge-token-123',
    });
    authApi.verifyMfaLogin.mockResolvedValue({
      success: true,
      user: mockAdminUser,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@vertex.local' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AdminPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Two-Factor Authentication/i })).toBeInTheDocument();
    });

    const mfaInput = screen.getByLabelText(/6-Digit Security Code/i);
    fireEvent.change(mfaInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Continue →/i }));

    await waitFor(() => {
      expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
    });
  });

  test('6. Direct navigation to /admin while logged out redirects to shared login page preserving destination', async () => {
    window.history.pushState({}, '', '/admin/inventory');
    const err401 = new Error('Authentication required');
    err401.status = 401;
    adminApi.verifyAdminAuthorization.mockRejectedValue(err401);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
      expect(window.location.search).toContain('redirect=%2Fadmin');
    });
  });

  test('7. Authenticated customer attempting to access /admin sees access-denied screen', async () => {
    window.history.pushState({}, '', '/admin');
    const err403 = new Error('Access denied. Insufficient permissions.');
    err403.status = 403;
    adminApi.verifyAdminAuthorization.mockRejectedValue(err403);
    authApi.getCurrentUser.mockResolvedValue({ user: mockCustomerUser });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Access Restricted/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Storefront/i })).toBeInTheDocument();
    });
  });

  test('8. Refreshing /admin with an existing valid admin session preserves admin access directly', async () => {
    window.history.pushState({}, '', '/admin');
    authApi.getCurrentUser.mockResolvedValue({ user: mockAdminUser });
    adminApi.verifyAdminAuthorization.mockResolvedValue({
      status: 'AUTHORIZED',
      user: mockAdminUser,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
    });
  });

  // ==============================================================================
  // Phase 1: Storefront Catalog API Integration Tests
  // ==============================================================================

  test('9. Displays loading state while catalog products and categories are being fetched', async () => {
    // Keep promise pending to inspect loading state
    catalogApi.getProducts.mockReturnValue(new Promise(() => {}));
    catalogApi.getCategories.mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByLabelText(/Loading products/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Loading categories/i)).toBeInTheDocument();
  });

  test('10. Renders live catalog categories and products from the API', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
      expect(screen.getByText('Stainless Steel Hex Bolt (M8 x 30mm)')).toBeInTheDocument();
      expect(screen.getByText('Nyloc Nut (M8)')).toBeInTheDocument();
      expect(screen.getByText('₹1,299')).toBeInTheDocument();
      expect(screen.getByText('₹250')).toBeInTheDocument();
      expect(screen.getByText('(Pack of 10)')).toBeInTheDocument();
      expect(screen.getByText('Best Seller')).toBeInTheDocument();
    });

    // Check categories rendered in Shop by Category
    expect(screen.getByText('Explore Electronics →')).toBeInTheDocument();
    expect(screen.getByText('Explore Screws & Fasteners →')).toBeInTheDocument();
    expect(screen.getByText('Explore Nut Types →')).toBeInTheDocument();
  });

  test('11. Category tab filter invokes getProducts with category slug parameter', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    const categoryTab = screen.getByRole('tab', { name: /Electronics/i });
    fireEvent.click(categoryTab);

    await waitFor(() => {
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'electronics' })
      );
    });
  });

  test('12. Search input triggers keyword search and displays active search badge', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox', { name: /Search products/i });
    fireEvent.change(searchInput, { target: { value: 'Arduino' } });
    fireEvent.submit(searchInput.closest('form'));

    await waitFor(() => {
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Arduino' })
      );
      expect(screen.getByText(/Search results for:/i)).toBeInTheDocument();
      expect(screen.getByText('"Arduino"')).toBeInTheDocument();
    });

    // Clearing search restores full catalog
    const clearBtn = screen.getByRole('button', { name: /Clear Search/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Search results for:/i)).not.toBeInTheDocument();
    });
  });

  test('13. Displays empty state when 0 products match, and Clear Filters resets catalog', async () => {
    catalogApi.getProducts.mockResolvedValue({
      success: true,
      products: [],
      pagination: { totalItems: 0, page: 1, limit: 12, totalPages: 0 },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /No products found/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear All Filters/i })).toBeInTheDocument();
    });

    // Resetting filters calls getProducts without active filter
    catalogApi.getProducts.mockResolvedValueOnce({
      success: true,
      products: mockProducts,
      pagination: { totalItems: 3, page: 1, limit: 12, totalPages: 1 },
    });

    fireEvent.click(screen.getByRole('button', { name: /Clear All Filters/i }));

    await waitFor(() => {
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 12 })
      );
    });
  });

  test('14. Displays retryable error state on API failure and retries on button click', async () => {
    catalogApi.getProducts.mockRejectedValue(new Error('Network connectivity error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Unable to Load Products/i })).toBeInTheDocument();
      expect(screen.getByText(/Network connectivity error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    // When clicking Retry, getProducts is called again
    catalogApi.getProducts.mockResolvedValueOnce({
      success: true,
      products: mockProducts,
      pagination: { totalItems: 3, page: 1, limit: 12, totalPages: 1 },
    });

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });
  });

  test('15. Gracefully handles missing product image and image load errors with fallback placeholder', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Stainless Steel Hex Bolt (M8 x 30mm)')).toBeInTheDocument();
    });

    // Product without imageUrl renders letter placeholder
    const boltCard = screen.getByTestId('product-card-prod-2');
    expect(boltCard.querySelector('.thumb-placeholder')).toHaveTextContent('S');

    // Product with imageUrl renders img element
    const ardCard = screen.getByTestId('product-card-prod-1');
    const ardImg = ardCard.querySelector('img.product-image');
    expect(ardImg).toBeInTheDocument();

    // Triggering image onError replaces it with placeholder
    fireEvent.error(ardImg);
    expect(ardCard.querySelector('.thumb-placeholder')).toHaveTextContent('A');
  });

  test('16. Hero section CTA button filters catalog by category', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    const shopElectronicsBtn = screen.getByRole('button', { name: /Shop Electronics →/i });
    fireEvent.click(shopElectronicsBtn);

    await waitFor(() => {
      expect(catalogApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'electronics' })
      );
    });
  });

  /* ============================================================
     PHASE 2: SHOPPING CART STOREFRONT INTEGRATION TESTS
     ============================================================ */

  test('17. Header displays cart button with initial badge count 0', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cart-button')).toBeInTheDocument();
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('0');
    });
  });

  test('18. Clicking cart button opens cart drawer showing empty state', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cart-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('cart-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    });

    // Close button dismisses drawer
    fireEvent.click(screen.getByTestId('cart-close-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('cart-drawer')).not.toBeInTheDocument();
    });
  });

  test('19. Adding an item as guest updates cart badge count and persists in localStorage', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    const addBtn = screen.getByTestId('add-to-cart-prod-1');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
      expect(screen.getByText(/Added "Arduino Uno R3 Microcontroller Board" to your cart/i)).toBeInTheDocument();
    });

    // Verifies localStorage has the guest item
    const rawStorage = window.localStorage.getItem('vertex_guest_cart');
    expect(rawStorage).toBeTruthy();
    const parsed = JSON.parse(rawStorage);
    expect(parsed.length).toBe(1);
    expect(parsed[0].variantId).toBe('var-1');
    expect(parsed[0].quantity).toBe(1);
  });

  test('20. Guest opens cart drawer with added item, correct title, price, quantity, and subtotal', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-to-cart-prod-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });

    // Open cart drawer
    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-cart-count')).toHaveTextContent('1 item');
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('₹1,299.00');
      expect(screen.getByTestId('qty-val-guest-var-1')).toHaveTextContent('1');
      expect(screen.getByTestId('guest-cart-banner')).toBeInTheDocument();
    });
  });

  test('21. Changing quantity with [+] and [-] updates quantity, line total, and subtotal', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-to-cart-prod-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('qty-inc-guest-var-1')).toBeInTheDocument();
    });

    // Click increment [+]
    fireEvent.click(screen.getByTestId('qty-inc-guest-var-1'));

    await waitFor(() => {
      expect(screen.getByTestId('qty-val-guest-var-1')).toHaveTextContent('2');
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('₹2,598.00');
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('2');
    });

    // Click decrement [-]
    fireEvent.click(screen.getByTestId('qty-dec-guest-var-1'));

    await waitFor(() => {
      expect(screen.getByTestId('qty-val-guest-var-1')).toHaveTextContent('1');
      expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('₹1,299.00');
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });
  });

  test('22. Removing item from cart drawer updates badge and returns to empty state', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-to-cart-prod-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('remove-item-guest-var-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('remove-item-guest-var-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('0');
    });
  });

  test('23. Clear Cart button removes all items and resets cart', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-to-cart-prod-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('clear-cart-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('clear-cart-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('0');
    });
  });

  test('24. Authenticated customer adds item and updates cart state via API', async () => {
    authApi.getCurrentUser.mockResolvedValue({ user: mockCustomerUser });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jane/i)).toBeInTheDocument();
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-to-cart-prod-1'));

    await waitFor(() => {
      expect(cartApi.addItemToCart).toHaveBeenCalledWith({
        variantId: 'var-1',
        quantity: 1,
      });
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });
  });

  test('25. Out-of-stock product has disabled Add to Cart button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Nyloc Nut (M8)')).toBeInTheDocument();
    });

    const outOfStockBtn = screen.getByTestId('add-to-cart-prod-3');
    expect(outOfStockBtn).toBeDisabled();
    expect(outOfStockBtn.closest('.product-card')).toHaveTextContent(/Out of Stock/i);
  });

  test('26. Customer login merges guest cart items via mergeGuestCart API', async () => {
    // Seed guest cart in localStorage
    window.localStorage.setItem(
      'vertex_guest_cart',
      JSON.stringify([
        {
          id: 'guest-var-1',
          variantId: 'var-1',
          quantity: 2,
          unitPrice: 1299,
          lineTotal: 2598,
        },
      ])
    );

    authApi.loginUser = jest.fn().mockResolvedValue({
      success: true,
      user: mockCustomerUser,
    });

    render(<App />);

    // Initial load reflects guest cart badge count
    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('2');
    });

    // Navigate to login
    fireEvent.click(screen.getByRole('button', { name: /Login \/ Register/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    });

    // Fill in credentials and submit
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'customer@vertex.local' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'CustomerSecret123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In →/i }));

    await waitFor(() => {
      expect(cartApi.mergeGuestCart).toHaveBeenCalledWith([
        { variantId: 'var-1', quantity: 2 },
      ]);
      expect(window.localStorage.getItem('vertex_guest_cart')).toBeNull();
      expect(screen.getByText(/guest cart items have been merged/i)).toBeInTheDocument();
    });
  });

  /* ============================================================
     PHASE 3: CHECKOUT INTEGRATION TESTS
     ============================================================ */

  test('27. Authenticated user clicks Proceed to Checkout in cart drawer and navigates to checkout view', async () => {
    authApi.getCurrentUser.mockResolvedValue({ user: mockCustomerUser });
    cartApi.getCart.mockResolvedValue({
      success: true,
      cart: {
        id: 'cart-auth-1',
        userId: 'cust-uuid-1',
        items: [
          {
            id: 'item-1',
            variantId: 'var-1',
            quantity: 1,
            unitPrice: 1299,
            lineTotal: 1299,
            isAvailable: true,
            variant: { id: 'var-1', sku: 'ARD-UNO-R3', price: 1299, stockQuantity: 50 },
            product: { id: 'prod-1', name: 'Arduino Uno R3 Microcontroller Board' },
          },
        ],
        itemCount: 1,
        totalQuantity: 1,
        subtotal: 1299,
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });

    // Open drawer
    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('proceed-checkout-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('proceed-checkout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('checkout-page')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Secure Checkout/i })).toBeInTheDocument();
    });
  });

  test('28. Guest clicks Proceed to Checkout in cart drawer and is directed to login with /checkout redirect', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-to-cart-prod-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByTestId('cart-button'));

    await waitFor(() => {
      expect(screen.getByTestId('proceed-checkout-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('proceed-checkout-btn'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
      expect(window.location.search).toContain('redirect=%2Fcheckout');
    });
  });

  test('29. Direct navigation to /checkout renders CheckoutPage', async () => {
    window.history.pushState({}, '', '/checkout');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('checkout-auth-required')).toBeInTheDocument();
    });
  });

  test('30. Mock Dev Mode: clicking Admin button in banner opens Admin Portal directly and updates session state', async () => {
    window.sessionStorage.setItem('vertex_mock_mode', 'true');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-dev-banner')).toBeInTheDocument();
      expect(screen.getByTestId('mock-admin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mock-admin-btn'));

    await waitFor(() => {
      // Confirms navigation to Admin view
      expect(window.location.pathname).toBe('/admin');
      // Confirms Chief Engineer mock admin session persisted to localStorage
      const stored = JSON.parse(window.localStorage.getItem('vertex_mock_user') || '{}');
      expect(stored.role).toBe('ADMIN');
      expect(stored.email).toBe('admin@vertex.local');
      // Confirms Storefront return button is now visible in the banner
      expect(screen.getByText('← Storefront')).toBeInTheDocument();
    });
  });

  test('31. Mock Dev Mode: clicking ← Storefront from Admin Portal returns to storefront', async () => {
    window.sessionStorage.setItem('vertex_mock_mode', 'true');
    window.localStorage.setItem('vertex_mock_user', JSON.stringify(mockAdminUser));
    window.history.pushState({}, '', '/admin');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('← Storefront')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Storefront'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
      expect(screen.getByText('Arduino Uno R3 Microcontroller Board')).toBeInTheDocument();
    });
  });
});
