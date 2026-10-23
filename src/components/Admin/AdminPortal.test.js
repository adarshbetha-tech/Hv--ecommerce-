import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminLayout from "./AdminLayout";
import * as adminApi from "../../services/adminApi";
import * as authApi from "../../services/authApi";

// Mock adminApi and authApi
jest.mock("../../services/adminApi");
jest.mock("../../services/authApi");

describe("VERTEX Admin Portal Suite", () => {
  const mockAdminUser = {
    id: "admin-uuid-1",
    fullName: "Chief Engineer",
    email: "admin@vertex.local",
    role: "ADMIN",
    mfaEnabled: true,
  };

  const mockCategories = [
    {
      id: "cat-1",
      name: "Electronics",
      slug: "electronics",
      icon: "🔌",
      productsCount: 4,
      description: "Microcontrollers and PLCs",
    },
    {
      id: "cat-2",
      name: "Screws & Fasteners",
      slug: "fasteners",
      icon: "🔩",
      productsCount: 1,
      description: "Hex bolts and screws",
    },
  ];

  const mockProducts = [
    {
      id: "prod-1",
      name: "Arduino Uno R3 Microcontroller Board",
      slug: "arduino-uno-r3",
      brand: "Arduino",
      hsnCode: "8542",
      gstRate: 18,
      category: { id: "cat-1", name: "Electronics", slug: "electronics" },
      price: 1299,
      variants: [
        {
          id: "var-1",
          sku: "ELEC-ARD-UNO-R3",
          partNumber: "A000066",
          name: "Standard Unit",
          price: 1299,
          stockQuantity: 50,
        },
      ],
    },
    {
      id: "prod-2",
      name: "Stainless Steel Hex Bolt (M8 x 30mm)",
      slug: "ss-hex-bolt-m8-30",
      brand: "VERTEX",
      hsnCode: "7318",
      gstRate: 18,
      category: { id: "cat-2", name: "Screws & Fasteners", slug: "fasteners" },
      price: 250,
      variants: [
        {
          id: "var-2",
          sku: "FAST-HEX-M8-30-P10",
          partNumber: "SS304-HEX-M8-30",
          name: "Pack of 10",
          price: 250,
          stockQuantity: 200,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    adminApi.verifyAdminAuthorization.mockResolvedValue({
      status: "AUTHORIZED",
      user: mockAdminUser,
    });
    adminApi.getSystemHealth.mockResolvedValue({
      status: "UP",
      database: { connected: true, type: "PostgreSQL" },
    });
    adminApi.getAdminProducts.mockResolvedValue({
      products: mockProducts,
      pagination: { totalItems: 2, page: 1, totalPages: 1 },
    });
    adminApi.getAdminCategories.mockResolvedValue({
      categories: mockCategories,
    });
    adminApi.getAdminCategoryDetails.mockResolvedValue({
      category: mockCategories[0],
      products: [mockProducts[0]],
    });
    adminApi.getAdminOrders.mockResolvedValue({
      isImplemented: false,
      orders: [],
    });
    adminApi.getAdminCustomers.mockResolvedValue({
      isImplemented: false,
      customers: [],
    });
    adminApi.getAdminAuditLogs.mockResolvedValue({
      isImplemented: false,
      logs: [],
    });
    authApi.getCurrentUser.mockResolvedValue({
      user: mockAdminUser,
    });
  });

  test("1. Verifies server-side authorization and displays loading state", async () => {
    adminApi.verifyAdminAuthorization.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ user: mockAdminUser }), 100))
    );

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    expect(screen.getByText(/Verifying Admin Authorization/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });
  });

  test("2. Automatically redirects unauthenticated visitor to shared login page preserving destination", async () => {
    const error = new Error("Authentication required");
    error.status = 401;
    adminApi.verifyAdminAuthorization.mockRejectedValue(error);

    const mockNavigateLogin = jest.fn();
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={mockNavigateLogin} />);

    await waitFor(() => {
      expect(mockNavigateLogin).toHaveBeenCalledWith(expect.stringContaining("/admin"));
    });
  });

  test("3. Displays 403 Forbidden screen when user is logged in as non-admin", async () => {
    const error = new Error("Access denied. Insufficient permissions.");
    error.status = 403;
    adminApi.verifyAdminAuthorization.mockRejectedValue(error);

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Access Restricted/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Switch to Admin Account/i })).toBeInTheDocument();
    });
  });

  test("4. Renders Dashboard with live metrics, system health, and low-stock alerts", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText(/Active Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Orders & Revenue/i)).toBeInTheDocument();
    expect(screen.queryByText(/Total SKUs in Stock/i)).not.toBeInTheDocument();
    expect(screen.getByText(/PostgreSQL 18.6 Live/i)).toBeInTheDocument();

    // Check Low Stock telemetry item (Arduino Uno R3 has stock 50 <= 50)
    expect(screen.getByText(/Low Stock Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
  });

  test("5. Navigates to Products section and allows inspecting product specifications", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Click 'Products' in sidebar
    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getByText(/Product Catalog Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Arduino Uno R3 Microcontroller Board/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Stainless Steel Hex Bolt/i).length).toBeGreaterThan(0);
    });

    // Click 'Inspect' on first product
    const inspectBtns = screen.getAllByRole("button", { name: /Inspect/i });
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Product ID \(UUID\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ELEC-ARD-UNO-R3/i).length).toBeGreaterThan(0);
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  }, 15000);

  test("6. Navigates to Inventory section and displays variant SKU table with adjust modal and Needs Pricing badges", async () => {
    adminApi.getAdminProducts.mockResolvedValue({
      products: [
        ...mockProducts,
        {
          id: "prod-3",
          name: "Slotted CHHD Screw",
          slug: "slotted-chhd",
          brand: "VERTEX",
          category: { id: "cat-2", name: "Screws & Fasteners", slug: "fasteners" },
          price: null,
          variants: [
            {
              id: "var-3",
              sku: "FAST-SLOT-CHHD-P50",
              name: "Pack of 50",
              price: null,
              stockQuantity: 500,
            },
          ],
        },
      ],
      pagination: { totalItems: 3, page: 1, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Inventory"));

    await waitFor(() => {
      expect(screen.getByText(/Inventory Telemetry & Stock Control/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ELEC-ARD-UNO-R3/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/FAST-HEX-M8-30-P10/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Needs Pricing/i).length).toBeGreaterThan(0);
    });

    // Click 'Adjust Stock'
    const adjustBtns = screen.getAllByRole("button", { name: /Adjust Stock/i });
    fireEvent.click(adjustBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Adjust Inventory Stock: ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/New Stock Quantity/i)).toBeInTheDocument();
    });

    // Close adjust modal
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
  });

  test("7. Navigates to Categories, Orders, and Settings sections smoothly", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Categories
    fireEvent.click(screen.getByTitle("Categories"));
    await waitFor(() => {
      expect(screen.getByText(/Category Hierarchy Management/i)).toBeInTheDocument();
    });

    // Orders
    fireEvent.click(screen.getByTitle("Orders"));
    await waitFor(() => {
      expect(screen.getByText(/Orders & Fulfillment Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Phase 6 Engineering Roadmap Status/i)).toBeInTheDocument();
    });

    // Settings
    fireEvent.click(screen.getByTitle("Settings"));
    await waitFor(() => {
      expect(screen.getByText(/System Configuration & Store Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Neon Serverless PostgreSQL/i)).toBeInTheDocument();
    });
  });

  test("8. Triggers storefront return navigation and logout handlers", async () => {
    const mockNavigateHome = jest.fn();
    const mockNavigateLogin = jest.fn();
    authApi.logoutUser.mockResolvedValue({ success: true });

    render(
      <AdminLayout
        onNavigateHome={mockNavigateHome}
        onNavigateLogin={mockNavigateLogin}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Click 'Storefront ↗'
    fireEvent.click(screen.getByTitle("View customer storefront"));
    expect(mockNavigateHome).toHaveBeenCalled();

    // Click 'Sign Out'
    fireEvent.click(screen.getByRole("button", { name: /Sign Out/i }));
    await waitFor(() => {
      expect(authApi.logoutUser).toHaveBeenCalled();
      expect(mockNavigateLogin).toHaveBeenCalled();
    });
  });

  test("9. Navigates to Orders section and allows inspecting detailed order breakdown and discount notice", async () => {
    const mockOrder = {
      id: "ord-test-01",
      orderNumber: "VTX-20261018-74192",
      createdAt: "2026-10-18T10:15:30.000Z",
      shippingRecipient: "Browser Test Customer",
      shippingPhone: "+91 9876543210",
      shippingLine1: "42 Industrial Tech Park, Phase 1",
      shippingCity: "Bengaluru",
      shippingState: "Karnataka",
      shippingPostalCode: "560100",
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "COD",
      subtotal: 1299.0,
      taxAmount: 233.82,
      shippingFee: 0.0,
      totalAmount: 1532.82,
      items: [
        {
          id: "item-01",
          productName: "Arduino Uno R3 Microcontroller Board",
          sku: "ELEC-ARD-UNO-R3",
          quantity: 1,
          unitPrice: 1299.0,
          gstRate: 18.0,
          taxAmount: 233.82,
          lineTotal: 1532.82,
        },
      ],
    };
    adminApi.getAdminOrders.mockResolvedValue({
      isImplemented: true,
      orders: [mockOrder],
      pagination: { totalItems: 1, page: 1, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Orders"));

    await waitFor(() => {
      expect(screen.getByText(/Orders & Fulfillment Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/VTX-20261018-74192/i).length).toBeGreaterThan(0);
    });

    // Click 'Details' button
    const detailBtns = screen.getAllByRole("button", { name: /Details/i });
    fireEvent.click(detailBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/A. Order Summary & Fulfillment Tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/B. Order Items Snapshot/i)).toBeInTheDocument();
      expect(screen.getByText(/C. Authoritative Price & Discount Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend Discount Adjustment Capability Gap/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /Close Order Details/i }));
  });

  test("10. Navigates to Discounts section and verifies read-only architecture roadmap preview", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Discounts & Promos"));

    await waitFor(() => {
      expect(screen.getByText(/Discounts & Promotions Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/VTX-IND-BULK10/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Backend Architecture Roadmap Notice/i)).toBeInTheDocument();
    });
  });

  test("11. Navigates to Refunds section and verifies financial safety gateway boundary notice", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Refunds & Returns"));

    await waitFor(() => {
      expect(screen.getByText(/Refunds & Returns Operations/i)).toBeInTheDocument();
      expect(screen.getByText(/Financial Boundary & Non-Operational Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/REF-2026-001/i)).toBeInTheDocument();
    });
  });

  test("12. Navigates to Reviews section and verifies moderation standards and roadmap state", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Product Reviews"));

    await waitFor(() => {
      expect(screen.getByText(/Product Reviews & Ratings Moderation/i)).toBeInTheDocument();
      expect(screen.getByText(/Review Moderation Standards/i)).toBeInTheDocument();
      expect(screen.getByText(/REV-101/i)).toBeInTheDocument();
    });
  });

  test("13. Operational Order Monitoring KPI grid renders interactive summary tiles and refresh action", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Operational Order Monitoring Dashboard/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Dispatched/i)).toBeInTheDocument();
    expect(screen.getByText(/Refund Requests/i)).toBeInTheDocument();

    // Verify manual refresh action
    const refreshBtn = screen.getByTestId("refresh-telemetry-btn");
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(screen.getByText(/↻ Refresh Telemetry/i)).toBeInTheDocument();
    });
  });

  test("14. Option B: Off-canvas sliding drawer opens via mobile toggle, renders backdrop, and closes on backdrop or navigation", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    const sidebar = screen.getByRole("complementary", { name: /Admin Navigation/i });
    expect(sidebar).not.toHaveClass("mobile-open");
    expect(screen.queryByTestId("adm-sidebar-backdrop")).not.toBeInTheDocument();

    // 1. Open mobile drawer
    const mobileMenuBtn = screen.getByRole("button", { name: /Open navigation menu/i });
    fireEvent.click(mobileMenuBtn);

    expect(sidebar).toHaveClass("mobile-open");
    const backdrop = screen.getByTestId("adm-sidebar-backdrop");
    expect(backdrop).toBeInTheDocument();

    // 2. Click backdrop to close
    fireEvent.click(backdrop);
    expect(sidebar).not.toHaveClass("mobile-open");
    expect(screen.queryByTestId("adm-sidebar-backdrop")).not.toBeInTheDocument();

    // 3. Open drawer again and navigate to an item
    fireEvent.click(mobileMenuBtn);
    expect(sidebar).toHaveClass("mobile-open");

    const inventoryLink = screen.getByTitle("Inventory");
    fireEvent.click(inventoryLink);

    // Sidebar should close automatically after item selection
    expect(sidebar).not.toHaveClass("mobile-open");
    await waitFor(() => {
      expect(screen.getByText(/Inventory Telemetry & Stock Control/i)).toBeInTheDocument();
    });
  });

  test("15. Header breadcrumbs correctly display labels for all registered admin sections", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Check discounts breadcrumb
    fireEvent.click(screen.getByTitle("Discounts & Promos"));
    await waitFor(() => {
      expect(screen.getByText("Discounts & Promotions", { selector: ".adm-breadcrumbs-current" })).toBeInTheDocument();
    });

    // Check refunds breadcrumb
    fireEvent.click(screen.getByTitle("Refunds & Returns"));
    await waitFor(() => {
      expect(screen.getByText("Refunds & Returns", { selector: ".adm-breadcrumbs-current" })).toBeInTheDocument();
    });

    // Check reviews breadcrumb
    fireEvent.click(screen.getByTitle("Product Reviews"));
    await waitFor(() => {
      expect(screen.getByText("Product Reviews", { selector: ".adm-breadcrumbs-current" })).toBeInTheDocument();
    });
  });

  test("16. Customer Directory renders accounts, supports search/role filtering, and opens customer details modal", async () => {
    const mockCustomers = [
      {
        id: "cust-uuid-01",
        fullName: "Jane Customer",
        email: "customer@vertex.local",
        role: "CUSTOMER",
        phone: "+91 98765 43210",
        mfaEnabled: false,
        isActive: true,
        createdAt: "2026-01-15T10:00:00Z",
      },
      {
        id: "cust-uuid-02",
        fullName: "Apex Industrial Systems",
        email: "b2b@apex.local",
        role: "B2B",
        phone: "+91 98765 22222",
        companyName: "Apex Industrial Systems Pvt Ltd",
        gstin: "29AAAAA0000A1Z5",
        mfaEnabled: true,
        isActive: true,
        createdAt: "2026-02-10T11:00:00Z",
      },
    ];

    adminApi.getAdminCustomers.mockResolvedValue({
      isImplemented: true,
      customers: mockCustomers,
      pagination: { totalItems: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Customers section
    fireEvent.click(screen.getByTitle("Customers"));

    await waitFor(() => {
      expect(screen.getByText(/Customer & B2B Account Directory/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Apex Industrial Systems/i).length).toBeGreaterThan(0);
    });

    // Verify KPI summary cards
    expect(screen.getAllByText(/Total Accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B2B Wholesale/i).length).toBeGreaterThan(0);

    // Test Search input filtering
    const searchInput = screen.getByPlaceholderText(/Search by customer name, email, company, or GSTIN/i);
    fireEvent.change(searchInput, { target: { value: "Apex" } });

    expect(screen.getAllByText(/Apex Industrial Systems/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Jane Customer/i)).toHaveLength(0);

    // Reset search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);

    // Test Role filter dropdown
    const roleSelect = screen.getByLabelText(/Filter by customer role/i);
    fireEvent.change(roleSelect, { target: { value: "B2B" } });

    expect(screen.getAllByText(/Apex Industrial Systems/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Jane Customer/i)).toHaveLength(0);

    // Reset role filter
    fireEvent.change(roleSelect, { target: { value: "all" } });
    expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);

    // Test Search yielding zero matches and Clear Filters button
    fireEvent.change(searchInput, { target: { value: "NonExistentUserXYZ" } });
    expect(screen.getByText(/No Matching Customers Found/i)).toBeInTheDocument();

    const clearBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtns[0]);
    expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);

    // Test Inspect Profile Modal
    const inspectBtn = screen.getByTestId("inspect-customer-cust-uuid-02");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Customer Profile/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Apex Industrial Systems Pvt Ltd/i)).toBeInTheDocument();
      expect(within(modal).getByText(/29AAAAA0000A1Z5/i)).toBeInTheDocument();
      expect(within(modal).getByText(/TOTP RFC 6238 Enrolled/i)).toBeInTheDocument();
    });

    // Close Modal
    fireEvent.click(screen.getByRole("button", { name: /Close Profile/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("17. Orders page search, status filters, payment filters, empty states, and modal inspection", async () => {
    adminApi.getAdminOrders.mockResolvedValue({
      isImplemented: true,
      orders: [
        {
          id: "ord-test-01",
          orderNumber: "VTX-20261018-74192",
          createdAt: "2026-10-18T10:15:30.000Z",
          shippingRecipient: "Sunil Sharma",
          shippingPhone: "+91 9876543210",
          shippingLine1: "42 Industrial Tech Park, Phase 1",
          shippingCity: "Bengaluru",
          shippingState: "Karnataka",
          shippingPostalCode: "560100",
          orderStatus: "PROCESSING",
          paymentStatus: "PAID",
          paymentMethod: "ONLINE",
          subtotal: 12500,
          discountAmount: 0,
          taxAmount: 2250,
          shippingFee: 250,
          totalAmount: 15000,
          items: [
            {
              id: "item-01",
              productName: "High-Precision Hex Bolt M8x50mm",
              sku: "FAST-HEX-M8-50",
              quantity: 200,
              unitPrice: 50,
              gstRate: 18.0,
              taxAmount: 1800,
              lineTotal: 11800,
            },
          ],
        },
        {
          id: "ord-test-02",
          orderNumber: "VTX-20261019-88888",
          createdAt: "2026-10-19T14:15:00.000Z",
          shippingRecipient: "Rahul Verma",
          shippingPhone: "+91 9123456780",
          shippingLine1: "12 Industrial Area",
          shippingCity: "New Delhi",
          shippingState: "Delhi",
          shippingPostalCode: "110020",
          orderStatus: "DELIVERED",
          paymentStatus: "PENDING",
          paymentMethod: "COD",
          subtotal: 5000,
          discountAmount: 500,
          taxAmount: 810,
          shippingFee: 100,
          totalAmount: 5410,
          items: [
            {
              id: "item-02",
              productName: "Stainless Steel Washer M8",
              sku: "FAST-WASH-M8-SS",
              quantity: 500,
              unitPrice: 10,
              gstRate: 18.0,
              taxAmount: 900,
              lineTotal: 5900,
            },
          ],
        },
      ],
      pagination: { totalItems: 2, page: 1, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Orders"));

    await waitFor(() => {
      expect(screen.getByText(/Orders & Fulfillment Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/VTX-20261018-74192/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/VTX-20261019-88888/i).length).toBeGreaterThan(0);
    });

    // Verify KPI summary metrics
    expect(screen.getByText(/Total Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Fulfillment/i)).toBeInTheDocument();
    expect(screen.getByText(/Dispatched \/ Delivered/i)).toBeInTheDocument();
    expect(screen.getByText(/Gross Value/i)).toBeInTheDocument();

    // Verify search filter by recipient name
    const searchInput = screen.getByLabelText(/Search orders/i);
    fireEvent.change(searchInput, { target: { value: "Rahul" } });

    expect(screen.getAllByText(/VTX-20261019-88888/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/VTX-20261018-74192/i)).toHaveLength(0);

    // Reset search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getAllByText(/VTX-20261018-74192/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VTX-20261019-88888/i).length).toBeGreaterThan(0);

    // Verify order status filter
    const statusSelect = screen.getByLabelText(/Filter by order status/i);
    fireEvent.change(statusSelect, { target: { value: "DELIVERED" } });

    expect(screen.getAllByText(/VTX-20261019-88888/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/VTX-20261018-74192/i)).toHaveLength(0);

    // Reset status filter
    fireEvent.change(statusSelect, { target: { value: "all" } });
    expect(screen.getAllByText(/VTX-20261018-74192/i).length).toBeGreaterThan(0);

    // Verify payment status filter
    const paymentSelect = screen.getByLabelText(/Filter by payment status/i);
    fireEvent.change(paymentSelect, { target: { value: "PENDING" } });

    expect(screen.getAllByText(/VTX-20261019-88888/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/VTX-20261018-74192/i)).toHaveLength(0);

    // Reset payment filter
    fireEvent.change(paymentSelect, { target: { value: "all" } });

    // Verify empty search results state and Clear Filters button
    fireEvent.change(searchInput, { target: { value: "NonExistentOrderQuery999" } });
    expect(screen.getByText(/No Matching Orders Found/i)).toBeInTheDocument();

    const clearBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtns[0]);
    expect(screen.getAllByText(/VTX-20261018-74192/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VTX-20261019-88888/i).length).toBeGreaterThan(0);

    // Inspect Details Modal
    const inspectBtn = screen.getByTestId("inspect-order-VTX-20261019-88888");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Rahul Verma/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Stainless Steel Washer M8/i)).toBeInTheDocument();
      expect(within(modal).getByText(/A. Order Summary & Fulfillment Tracking/i)).toBeInTheDocument();
    });

    // Close Modal
    fireEvent.click(screen.getByRole("button", { name: /Close Order Details/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("18. Products page summary cards, category and stock filters, search, empty states, and inspection modal", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getByText(/Product Catalog Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Arduino Uno R3 Microcontroller Board/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Stainless Steel Hex Bolt/i).length).toBeGreaterThan(0);
    });

    // 1. Verify 4 Product Summary KPI cards
    expect(screen.getByText(/Total Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Catalog SKUs/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Stock Units/i)).toBeInTheDocument();

    // 2. Verify stock status filter:
    // Arduino has 50 units (low stock <= 50), Bolt has 200 units (in stock > 50)
    const stockSelect = screen.getByLabelText(/Filter by stock status/i);
    fireEvent.change(stockSelect, { target: { value: "in_stock" } });

    expect(screen.getAllByText(/Stainless Steel Hex Bolt/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Arduino Uno R3 Microcontroller Board/i)).toHaveLength(0);

    // Reset stock status filter
    fireEvent.change(stockSelect, { target: { value: "all" } });
    expect(screen.getAllByText(/Arduino Uno R3 Microcontroller Board/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stainless Steel Hex Bolt/i).length).toBeGreaterThan(0);

    // 3. Verify stock filter for low_stock (Arduino: 50 units)
    fireEvent.change(stockSelect, { target: { value: "low_stock" } });
    expect(screen.getAllByText(/Arduino Uno R3 Microcontroller Board/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Stainless Steel Hex Bolt/i)).toHaveLength(0);

    // Reset stock filter back to all
    fireEvent.change(stockSelect, { target: { value: "all" } });

    // 4. Verify search and Clear Filters
    const searchInput = screen.getByLabelText(/Search products/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentProductXYZ123" } });

    await waitFor(() => {
      expect(screen.getByText(/No Matching Products Found/i)).toBeInTheDocument();
    });

    const clearBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtns[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/Arduino Uno R3 Microcontroller Board/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Stainless Steel Hex Bolt/i).length).toBeGreaterThan(0);
    });

    // 5. Verify product inspection modal
    const inspectBtn = screen.getByTestId("inspect-product-prod-1");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/HSN & GST Telemetry/i)).toBeInTheDocument();
      expect(within(modal).getByText(/ELEC-ARD-UNO-R3/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Starting Price/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("19. Categories page summary cards, desktop table view, search/sorting filters, empty state, inspection modal, and Add Category modal", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Categories"));

    await waitFor(() => {
      expect(screen.getByText(/Category Hierarchy Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Screws & Fasteners/i).length).toBeGreaterThan(0);
    });

    // 1. Verify 4 Category KPI summary cards
    expect(screen.getByText(/Total Categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Classifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Associated Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Top-Level Taxonomies/i)).toBeInTheDocument();

    // Verify desktop table and columns
    expect(screen.getByRole("table", { name: /Product categories directory/i })).toBeInTheDocument();
    expect(screen.getByText(/URL Slug/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Assigned Products/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Taxonomy Level/i)).toBeInTheDocument();

    // 2. Refresh categories button
    const refreshBtn = screen.getByTestId("refresh-categories-btn");
    fireEvent.click(refreshBtn);
    expect(adminApi.getAdminCategories).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);
    });

    // 3. Sorting and Product Association filters
    const sortSelect = screen.getByLabelText(/Sort categories/i);
    fireEvent.change(sortSelect, { target: { value: "name_desc" } });
    expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);

    const filterSelect = screen.getByLabelText(/Filter by product association/i);
    fireEvent.change(filterSelect, { target: { value: "with_products" } });
    expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);

    // Reset filters
    const clearFilterBtn = screen.getByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearFilterBtn);

    // 4. Search filter: filter for "Electronics"
    const searchInput = screen.getByLabelText(/Search categories/i);
    fireEvent.change(searchInput, { target: { value: "Electronics" } });

    expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Screws & Fasteners/i)).toHaveLength(0);

    // Reset search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Screws & Fasteners/i).length).toBeGreaterThan(0);

    // 5. Search yields no matches & Clear Filters
    fireEvent.change(searchInput, { target: { value: "NonExistentCategoryXYZ" } });
    expect(screen.getByText(/No Matching Categories Found/i)).toBeInTheDocument();

    const clearBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtns[0]);
    expect(screen.getAllByText(/Electronics/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Screws & Fasteners/i).length).toBeGreaterThan(0);

    // 6. Inspect Category Modal
    const inspectBtn = screen.getByTestId("inspect-category-electronics");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Taxonomy Description/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Arduino Uno R3 Microcontroller Board/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 7. Add Category Modal opening and validation
    const addCatBtn = screen.getByTestId("add-category-btn");
    fireEvent.click(addCatBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Add New Category/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/Category Name \*/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/URL Slug \*/i)).toBeInTheDocument();
    });

    // Close Add Category modal
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("20. Inventory page summary cards, stock filters, search, empty state, and adjust stock modal", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Inventory"));

    await waitFor(() => {
      expect(screen.getByText(/Inventory Telemetry & Stock Control/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ELEC-ARD-UNO-R3/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/FAST-HEX-M8-30-P10/i).length).toBeGreaterThan(0);
    });

    // 1. Verify 4 Inventory KPI summary cards
    expect(screen.getByText(/Total SKUs/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Stock Units/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Stock Alerts/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Out of Stock/i).length).toBeGreaterThan(0);

    // 2. Search filter: filter for "FAST-HEX"
    const searchInput = screen.getByLabelText(/Search inventory/i);
    fireEvent.change(searchInput, { target: { value: "FAST-HEX" } });

    expect(screen.getAllByText(/FAST-HEX-M8-30-P10/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/ELEC-ARD-UNO-R3/i)).toHaveLength(0);

    // Reset search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getAllByText(/ELEC-ARD-UNO-R3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FAST-HEX-M8-30-P10/i).length).toBeGreaterThan(0);

    // 3. Stock status filter:
    // ELEC-ARD-UNO-R3 has 50 (low stock), FAST-HEX-M8-30-P10 has 200 (in stock)
    const stockSelect = screen.getByLabelText(/Filter by stock status/i);
    fireEvent.change(stockSelect, { target: { value: "in_stock" } });

    expect(screen.getAllByText(/FAST-HEX-M8-30-P10/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/ELEC-ARD-UNO-R3/i)).toHaveLength(0);

    // Filter by low_stock
    fireEvent.change(stockSelect, { target: { value: "low_stock" } });
    expect(screen.getAllByText(/ELEC-ARD-UNO-R3/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/FAST-HEX-M8-30-P10/i)).toHaveLength(0);

    // Reset stock status filter
    fireEvent.change(stockSelect, { target: { value: "all" } });

    // 4. Search yields no matches & Clear Filters
    fireEvent.change(searchInput, { target: { value: "NonExistentInventorySKU999" } });
    expect(screen.getByText(/No Matching Inventory Items Found/i)).toBeInTheDocument();

    const clearBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtns[0]);
    expect(screen.getAllByText(/ELEC-ARD-UNO-R3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FAST-HEX-M8-30-P10/i).length).toBeGreaterThan(0);

    // 5. Open Adjust Stock Modal
    const adjustBtn = screen.getByTestId("adjust-stock-FAST-HEX-M8-30-P10");
    fireEvent.click(adjustBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Adjust Inventory Stock: FAST-HEX-M8-30-P10/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Current Level/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/New Stock Quantity/i)).toBeInTheDocument();
    });

    // Close adjust modal
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("21. Validates Coupons section: KPI cards, Regular vs College tabs, search/filters, inspect modal, and creation flow", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Discounts & Promos"));

    await waitFor(() => {
      expect(screen.getByText(/Discounts & Promotions Management/i)).toBeInTheDocument();
    });

    // 1. Verify 4 KPI summary cards
    expect(screen.getByText(/Total Coupons/i)).toBeInTheDocument();
    expect(screen.getByText(/Regular Commercial/i)).toBeInTheDocument();
    expect(screen.getAllByText(/College Coupons/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Active Campaigns/i)).toBeInTheDocument();

    // 2. Tab switching: All, Regular, College
    const collegeTab = screen.getByRole("tab", { name: /College Coupons/i });
    fireEvent.click(collegeTab);

    // Only college coupons should be visible
    expect(screen.getAllByText(/VTX-COLLEGE-ROBO/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/VTX-IND-BULK10/i)).not.toBeInTheDocument();

    const regularTab = screen.getByRole("tab", { name: /Regular Coupons/i });
    fireEvent.click(regularTab);

    // Regular coupons visible, college not visible
    expect(screen.getAllByText(/VTX-IND-BULK10/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/VTX-COLLEGE-ROBO/i)).not.toBeInTheDocument();

    const allTab = screen.getByRole("tab", { name: /All Coupons/i });
    fireEvent.click(allTab);
    expect(screen.getAllByText(/VTX-IND-BULK10/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VTX-COLLEGE-ROBO/i).length).toBeGreaterThan(0);

    // 3. Search and filter
    const searchInput = screen.getByLabelText(/Search promotions/i);
    fireEvent.change(searchInput, { target: { value: "IISc" } });
    expect(screen.getAllByText(/VTX-COLLEGE-ROBO/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/VTX-IND-BULK10/i)).not.toBeInTheDocument();

    // Clear filters
    const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtn);
    expect(screen.getAllByText(/VTX-IND-BULK10/i).length).toBeGreaterThan(0);

    // 4. Open Inspect Details modal
    const inspectBtn = screen.getByTestId("inspect-coupon-VTX-COLLEGE-ROBO");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Coupon Specification: VTX-COLLEGE-ROBO/i)).toBeInTheDocument();
      expect(within(modal).getByText(/College & Institutional Verification/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Benefit & Commercial Terms/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Backend Architecture Guardrail/i)).toBeInTheDocument();
    });

    // Close inspect modal
    fireEvent.click(screen.getByRole("button", { name: /Close Details/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 5. Open Create Promotion Modal and switch to College
    fireEvent.click(screen.getByTestId("create-discount-btn"));
    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Create New Promotion Campaign/i)).toBeInTheDocument();
    });

    // Switch to College Coupon inside modal
    const colModalTab = screen.getByRole("tab", { name: /College Educational Coupon/i });
    fireEvent.click(colModalTab);

    // Fill in college coupon form
    const collegeNameInput = screen.getByLabelText(/College \/ University Name/i);
    fireEvent.change(collegeNameInput, { target: { value: "BITS Pilani Tech Lab" } });

    const campaignTitleInput = screen.getByLabelText(/Educational Campaign Title/i);
    fireEvent.change(campaignTitleInput, { target: { value: "BITS Autonomous Vehicles Grant" } });

    // Submit coupon
    fireEvent.click(screen.getByTestId("submit-create-coupon"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getAllByText(/BITS Pilani Tech Lab/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/successfully registered in admin session/i)).toBeInTheDocument();
    });

    // 6. Status Toggling (Active -> Disabled -> Active)
    const toggleBtn = screen.getByTestId("toggle-status-VTX-IND-BULK10");
    expect(toggleBtn).toHaveTextContent("Disable");
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Coupon status toggled successfully in admin session registry/i)).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("Enable");

    // Toggle back to active
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Disable");

    // Dismiss feedback notice
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    expect(screen.queryByText(/Coupon status toggled successfully/i)).not.toBeInTheDocument();

    // 7. Regular Coupon Creation with 2-day duration preset
    fireEvent.click(screen.getByTestId("create-discount-btn"));
    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Create New Promotion Campaign/i)).toBeInTheDocument();
    });

    // Fill in regular coupon details
    const regCampaignInput = screen.getByLabelText(/Campaign Name \*/i);
    fireEvent.change(regCampaignInput, { target: { value: "Flash Weekend Fastener Sale" } });

    // Select 2 Days preset
    const preset2DaysBtn = screen.getByRole("button", { name: /⚡ 2 Days \(48 Hours\)/i });
    fireEvent.click(preset2DaysBtn);

    // Submit coupon
    fireEvent.click(screen.getByTestId("submit-create-coupon"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getAllByText(/Flash Weekend Fastener Sale/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/created and registered in admin session/i)).toBeInTheDocument();
    });
  }, 15000);

  test("22. Validates Product Specification File Upload: format validation, fastener hints, dimension extraction, replacement, and product creation", async () => {
    adminApi.createAdminProduct.mockResolvedValue({
      success: true,
      product: {
        id: "prod-spec-new",
        name: "Stainless Steel Hex Bolt Grade 304",
        sku: "FAST-HEX-M8-30-SS",
      },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // 1. Navigate to Products
    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getByText(/Product Catalog Management/i)).toBeInTheDocument();
    });

    // 2. Open Add New Product modal
    const addBtn = screen.getByTestId("add-new-product-btn");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Add New Industrial Hardware Product/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Product Specification File/i).length).toBeGreaterThan(0);
    });

    // 3. Switch Category to Screws & Fasteners and verify contextual recommendation hint
    const catSelect = screen.getByLabelText(/Category \*/i);
    fireEvent.change(catSelect, { target: { value: "cat-2" } }); // cat-2 is "Screws & Fasteners"

    expect(
      screen.getByText(/Recommended for Fasteners & Hardware/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upload standard DIN\/ISO drawings/i)
    ).toBeInTheDocument();

    // 4. Test invalid file selection (.exe format)
    const fileInput = screen.getByTestId("prod-spec-file-input");
    const invalidFile = new File(["dummy binary"], "malware.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(
      screen.getByText(/Unsupported file format \(\.exe\)/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("spec-file-preview")).not.toBeInTheDocument();

    // 5. Test valid specification file selection (.pdf with fastener dimensions)
    const validPdfFile = new File(["%PDF-1.4 spec sheet content"], "DIN933_Hex_Bolt_M8-30mm.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(validPdfFile, "size", { value: 245760 }); // 240 KB

    fireEvent.change(fileInput, { target: { files: [validPdfFile] } });

    // Verify preview card and file details
    await waitFor(() => {
      expect(screen.getByTestId("spec-file-preview")).toBeInTheDocument();
      expect(screen.getByText("DIN933_Hex_Bolt_M8-30mm.pdf")).toBeInTheDocument();
      expect(screen.getByText(/240\.0 KB/i)).toBeInTheDocument();
      expect(screen.getByText(/Validated Specification/i)).toBeInTheDocument();
    });

    // Verify detected dimension suggestion
    expect(screen.getByText(/Detected Fastener Dimension:/i)).toBeInTheDocument();
    expect(screen.getByText(/M8 × 30mm/i)).toBeInTheDocument();

    // Click 'Apply to Specs'
    const applyBtn = screen.getByRole("button", { name: /Apply to Specs/i });
    fireEvent.click(applyBtn);

    // Verify part number input was updated with the suggested dimension
    const partNumInput = screen.getByLabelText(/Part Number/i);
    expect(partNumInput.value).toContain("M8 × 30mm");

    // 6. Test file removal
    const removeBtn = screen.getByRole("button", { name: /Remove specification file/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByTestId("spec-file-preview")).not.toBeInTheDocument();
    expect(screen.getByText(/Choose Product Specification File/i)).toBeInTheDocument();

    // 7. Select Excel engineering table (.xlsx)
    const validXlsxFile = new File(["spreadsheet binary"], "Fastener_Tensile_Load_Table.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    Object.defineProperty(validXlsxFile, "size", { value: 524288 }); // 512 KB

    fireEvent.change(fileInput, { target: { files: [validXlsxFile] } });

    await waitFor(() => {
      expect(screen.getByTestId("spec-file-preview")).toBeInTheDocument();
      expect(screen.getByText("Fastener_Tensile_Load_Table.xlsx")).toBeInTheDocument();
      expect(screen.getByText(/512\.0 KB/i)).toBeInTheDocument();
    });

    // 8. Fill in remaining required product fields and submit
    const nameInput = screen.getByLabelText(/Product Name \*/i);
    fireEvent.change(nameInput, { target: { value: "Stainless Steel Hex Bolt Grade 304" } });

    const skuInput = screen.getByLabelText(/Primary SKU \*/i);
    fireEvent.change(skuInput, { target: { value: "FAST-HEX-M8-30-SS" } });

    const priceInput = screen.getByLabelText(/Unit Price \(₹\) \*/i);
    fireEvent.change(priceInput, { target: { value: "185.00" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Save & Register Product/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createAdminProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Stainless Steel Hex Bolt Grade 304",
          sku: "FAST-HEX-M8-30-SS",
          price: 185,
          specificationFileName: "Fastener_Tensile_Load_Table.xlsx",
          specificationFileSize: 524288,
          hasSpecificationFile: true,
        })
      );
      expect(screen.getByText(/registered successfully!/i)).toBeInTheDocument();
    });
  });

  test("23. Validates Modal Scrolling: form flex propagation, footer persistence, and background scroll lock for Add Product and Add Coupon modals", async () => {
    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // 1. Verify Add Product Modal
    fireEvent.click(screen.getByTitle("Products"));
    await waitFor(() => {
      expect(screen.getByText(/Product Catalog Management/i)).toBeInTheDocument();
    });

    expect(document.body.style.overflow).toBe("");

    // Open Add Product modal
    fireEvent.click(screen.getByTestId("add-new-product-btn"));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Add New Industrial Hardware Product/i)).toBeInTheDocument();
    });

    // Verify background scroll locked
    expect(document.body.style.overflow).toBe("hidden");

    // Verify modal form flex wrapper and persistent footer
    const productModal = screen.getByRole("dialog");
    const productForm = productModal.querySelector("form");
    expect(productForm).toHaveClass("adm-modal-form");

    const saveProductBtn = within(productModal).getByRole("button", {
      name: /Save & Register Product/i,
    });
    expect(saveProductBtn).toBeInTheDocument();
    const cancelProductBtn = within(productModal).getByRole("button", { name: /Cancel/i });
    expect(cancelProductBtn).toBeInTheDocument();

    // Close modal and verify background scroll unlocked
    fireEvent.click(cancelProductBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("");

    // 2. Verify Add Coupon Modal
    fireEvent.click(screen.getByTitle("Discounts & Promos"));
    await waitFor(() => {
      expect(screen.getByText(/Discounts & Promotions Management/i)).toBeInTheDocument();
    });

    expect(document.body.style.overflow).toBe("");

    // Open Add Coupon modal
    fireEvent.click(screen.getByTestId("create-discount-btn"));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Create New Promotion Campaign/i)).toBeInTheDocument();
    });

    // Verify background scroll locked
    expect(document.body.style.overflow).toBe("hidden");

    // Verify coupon modal form flex wrapper and persistent footer
    const couponModal = screen.getByRole("dialog");
    const couponForm = couponModal.querySelector("form");
    expect(couponForm).toHaveClass("adm-modal-form");

    const submitCouponBtn = within(couponModal).getByTestId("submit-create-coupon");
    expect(submitCouponBtn).toBeInTheDocument();
    const cancelCouponBtn = within(couponModal).getByRole("button", { name: /Cancel/i });
    expect(cancelCouponBtn).toBeInTheDocument();

    // Close modal and verify background scroll unlocked
    fireEvent.click(cancelCouponBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("");
  });

  test("24. Validates Admin Users page: summary KPI cards, active admin card, search/role filters, users table, inspect profile modal, and RBAC matrix", async () => {
    adminApi.getAdminCustomers.mockResolvedValue({
      isImplemented: true,
      customers: [
        {
          id: "cust-1",
          fullName: "Jane Customer",
          email: "customer@vertex.local",
          role: "CUSTOMER",
          phone: "+91 98765 43210",
          mfaEnabled: false,
          status: "ACTIVE",
          createdAt: "2026-02-15T10:00:00.000Z",
        },
        {
          id: "cust-2",
          fullName: "Apex Industrial Systems",
          email: "b2b@apex.local",
          role: "B2B",
          companyName: "Apex Industrial Systems Pvt Ltd",
          gstin: "29AAAAA0000A1Z5",
          phone: "+91 98765 22222",
          mfaEnabled: true,
          status: "ACTIVE",
          createdAt: "2026-01-20T10:00:00.000Z",
        },
      ],
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Admin Users & Roles
    fireEvent.click(screen.getByTitle("Admin Users & Roles"));

    await waitFor(() => {
      expect(screen.getByText(/Admin Users & Role-Based Access Control/i)).toBeInTheDocument();
      expect(screen.getByText(/Controlled Administration Policy/i)).toBeInTheDocument();
      expect(screen.getByRole("table", { name: /System users list/i })).toBeInTheDocument();
    });

    // 1. Verify 4 Summary KPI Cards
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Users/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Admin Users/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Recent Registrations/i)).toBeInTheDocument();

    // 2. Verify Active Administrator Hero Card
    expect(screen.getByText(/Current Active Administrator/i)).toBeInTheDocument();
    expect(screen.getByText(/Session Active/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chief Engineer/i).length).toBeGreaterThan(0);

    // 3. Verify Table View and Columns
    expect(screen.getByRole("columnheader", { name: /User & Identity/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Email Address/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /System Role/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Security \/ MFA/i })).toBeInTheDocument();

    // Verify all users are rendered
    expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Apex Industrial Systems/i).length).toBeGreaterThan(0);

    // 4. Search filter: search for "Jane"
    const searchInput = screen.getByLabelText(/Search users/i);
    fireEvent.change(searchInput, { target: { value: "Jane" } });

    expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Apex Industrial Systems/i)).not.toBeInTheDocument();

    // Clear filters
    const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtn);
    expect(screen.getAllByText(/Apex Industrial Systems/i).length).toBeGreaterThan(0);

    // 5. Role filter: filter by "B2B"
    const roleSelect = screen.getByLabelText(/Filter by role/i);
    fireEvent.change(roleSelect, { target: { value: "B2B" } });
    expect(screen.getAllByText(/Apex Industrial Systems/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Jane Customer/i)).not.toBeInTheDocument();

    // Reset role filter
    fireEvent.change(roleSelect, { target: { value: "all" } });
    expect(screen.getAllByText(/Jane Customer/i).length).toBeGreaterThan(0);

    // 6. Inspect Profile Modal
    const inspectBtn = screen.getByTestId("inspect-user-cust-2");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/User Security Profile: Apex Industrial Systems/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Identity & Security Telemetry/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Corporate Wholesale Entity/i)).toBeInTheDocument();
      expect(within(modal).getByText(/29AAAAA0000A1Z5/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Role Privileges & Policy/i)).toBeInTheDocument();
    });

    // Close inspect modal
    fireEvent.click(screen.getByRole("button", { name: /Close Profile/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 7. Verify RBAC Permissions Matrix Table
    expect(screen.getByRole("table", { name: /RBAC Permissions matrix/i })).toBeInTheDocument();
    expect(screen.getByText(/Storefront Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Catalog & Inventory Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Order Fulfillment/i)).toBeInTheDocument();
  });

  test("25. Validates Admin Settings: authoritative parameters, operator identity, live health diagnostic, session preferences form, validation, and dirty state save/discard", async () => {
    adminApi.getSystemHealth.mockResolvedValue({
      status: "healthy",
      service: "vertex-backend",
      timestamp: "2026-10-21T14:30:00.000Z",
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Settings
    fireEvent.click(screen.getByTitle("Settings"));

    await waitFor(() => {
      expect(screen.getByText(/System Configuration & Store Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Administrative Operator/i)).toBeInTheDocument();
    });

    // 1. Verify Authoritative Server & Security Sections
    expect(screen.getByText(/Store Identity & Commercial Defaults/i)).toBeInTheDocument();
    expect(screen.getAllByText(/VERTEX/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/18.00% GST/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Security & Session Policies/i)).toBeInTheDocument();
    expect(screen.getByText(/7 Days \(168 Hours\)/i)).toBeInTheDocument();
    expect(screen.getByText(/bcrypt \(Salt Rounds: 10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Database & Cloud Infrastructure Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Neon Serverless PostgreSQL/i)).toBeInTheDocument();
    expect(screen.getByText(/vertex_app/i)).toBeInTheDocument();

    // 2. Trigger Live Health Diagnostic
    const runHealthBtn = screen.getByTestId("run-health-diagnostic-btn");
    fireEvent.click(runHealthBtn);

    await waitFor(() => {
      expect(screen.getByTestId("health-diagnostic-banner")).toBeInTheDocument();
      expect(screen.getByText(/Live Health Diagnostic Succeeded/i)).toBeInTheDocument();
    });

    // 3. Verify Session Preferences Form & Dirty State Handling
    const thresholdInput = screen.getByLabelText(/Low-Stock Alert Threshold \(Units\) \*/i);
    const saveBtn = screen.getByTestId("save-preferences-btn");

    // Initially pristine: save button disabled
    expect(saveBtn).toBeDisabled();
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();

    // Edit field to invalid number
    fireEvent.change(thresholdInput, { target: { value: "0" } });
    expect(saveBtn).not.toBeDisabled();
    expect(screen.getByTestId("unsaved-changes-badge")).toBeInTheDocument();

    // Submit invalid form
    fireEvent.click(saveBtn);
    expect(screen.getByText(/Low-stock alert threshold must be a positive integer/i)).toBeInTheDocument();

    // Edit field to valid number
    fireEvent.change(thresholdInput, { target: { value: "25" } });
    fireEvent.click(saveBtn);

    // Verify successful save and pristine state
    await waitFor(() => {
      expect(screen.getByTestId("settings-feedback-banner")).toBeInTheDocument();
      expect(screen.getByText(/Operational preferences updated successfully/i)).toBeInTheDocument();
      expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
      expect(saveBtn).toBeDisabled();
    });

    // 4. Test Discard Changes Action
    fireEvent.change(thresholdInput, { target: { value: "99" } });
    expect(screen.getByTestId("unsaved-changes-badge")).toBeInTheDocument();
    const discardBtn = screen.getByRole("button", { name: /Discard Changes/i });
    fireEvent.click(discardBtn);

    expect(thresholdInput.value).toBe("25");
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();

    // 5. Verify Refunds Modal Scroll Lock
    fireEvent.click(screen.getByTitle("Refunds & Returns"));
    await waitFor(() => {
      expect(screen.getByText(/Refunds & Returns Operations/i)).toBeInTheDocument();
    });

    const inspectRefundBtns = screen.getAllByRole("button", { name: /Inspect/i });
    fireEvent.click(inspectRefundBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("hidden");

    const closeBtns = screen.getAllByRole("button", { name: /Close/i });
    fireEvent.click(closeBtns[0]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("");
  });

  test("26. Navigates to Orders, renders orders table, inspects details, updates fulfillment status with state machine validation, and refreshes orders", async () => {
    const mockOrder = {
      id: "ord-test-99",
      orderNumber: "VTX-ORD-9001",
      createdAt: "2026-10-15T10:00:00.000Z",
      orderStatus: "PENDING",
      paymentStatus: "PAID",
      paymentMethod: "RAZORPAY",
      subtotal: 1299,
      taxAmount: 233.82,
      totalAmount: 1532.82,
      shippingRecipient: "Dr. Vikram Sarabhai",
      shippingCity: "Bengaluru",
      shippingState: "Karnataka",
      shippingPhone: "+91 9876543210",
      shippingLine1: "ISRO Telemetry Centre, Outer Ring Rd",
      items: [
        {
          id: "item-99",
          productName: "Arduino Uno R3 Microcontroller Board",
          sku: "ELEC-ARD-UNO-R3",
          quantity: 2,
          unitPrice: 1299,
          taxAmount: 467.64,
          lineTotal: 3065.64,
        },
      ],
    };

    adminApi.getAdminOrders.mockResolvedValue({
      isImplemented: true,
      orders: [mockOrder],
      pagination: { totalItems: 1, page: 1, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });

    // 1. Navigate to Orders section
    fireEvent.click(screen.getByTitle("Orders"));

    await waitFor(() => {
      expect(screen.getByText(/Orders & Fulfillment Management/i)).toBeInTheDocument();
    });

    // 2. Verify Table content and KPI cards
    expect(screen.getAllByText("VTX-ORD-9001")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Dr. Vikram Sarabhai")[0]).toBeInTheDocument();
    expect(screen.getByText(/Total Orders/i)).toBeInTheDocument();

    // 3. Open Order Details modal
    const detailsBtn = screen.getByTestId("inspect-order-VTX-ORD-9001");
    fireEvent.click(detailsBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Order Details: VTX-ORD-9001/i)).toBeInTheDocument();
    });

    // 4. Verify Fulfillment Lifecycle section and Target Status options
    expect(screen.getByText(/D. Fulfillment Lifecycle & Status Transition/i)).toBeInTheDocument();
    const statusSelect = screen.getByTestId("target-status-select");
    // Allowed transitions for PENDING: CONFIRMED, PROCESSING, CANCELLED
    expect(statusSelect).toBeInTheDocument();
    expect(within(statusSelect).getByRole("option", { name: "CONFIRMED" })).toBeInTheDocument();
    expect(within(statusSelect).getByRole("option", { name: "PROCESSING" })).toBeInTheDocument();
    expect(within(statusSelect).getByRole("option", { name: "CANCELLED" })).toBeInTheDocument();

    // 5. Test Error Handling (API failure)
    adminApi.updateAdminOrderStatus.mockRejectedValueOnce(
      new Error("Invalid transition: Server rejected status update.")
    );
    fireEvent.change(statusSelect, { target: { value: "CONFIRMED" } });
    const submitBtn = screen.getByTestId("update-order-status-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("order-status-feedback")).toBeInTheDocument();
      expect(
        screen.getByText(/Invalid transition: Server rejected status update./i)
      ).toBeInTheDocument();
    });

    // 6. Test Successful Transition to CONFIRMED
    const updatedOrder = {
      ...mockOrder,
      orderStatus: "CONFIRMED",
      carrier: "Blue Dart",
      trackingNumber: "BLD-77889900",
      notes: "Stock verified and dispatched for packing",
    };

    adminApi.updateAdminOrderStatus.mockResolvedValueOnce({
      success: true,
      order: updatedOrder,
    });

    fireEvent.change(screen.getByTestId("carrier-input"), {
      target: { value: "Blue Dart" },
    });
    fireEvent.change(screen.getByTestId("tracking-input"), {
      target: { value: "BLD-77889900" },
    });
    fireEvent.change(screen.getByTestId("notes-input"), {
      target: { value: "Stock verified and dispatched for packing" },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminOrderStatus).toHaveBeenCalledWith("ord-test-99", {
        orderStatus: "CONFIRMED",
        carrier: "Blue Dart",
        trackingNumber: "BLD-77889900",
        notes: "Stock verified and dispatched for packing",
      });
      expect(
        screen.getByText(/Order VTX-ORD-9001 fulfillment status updated to CONFIRMED successfully./i)
      ).toBeInTheDocument();
    });

    // 7. Verify subsequent transitions available for CONFIRMED (PROCESSING, SHIPPED, CANCELLED)
    await waitFor(() => {
      expect(within(statusSelect).getByRole("option", { name: "PROCESSING" })).toBeInTheDocument();
      expect(within(statusSelect).getByRole("option", { name: "SHIPPED" })).toBeInTheDocument();
      expect(within(statusSelect).getByRole("option", { name: "CANCELLED" })).toBeInTheDocument();
    });

    // 8. Close Modal and verify table shows updated status
    const closeBtn = screen.getByRole("button", { name: /Close Order Details/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("CONFIRMED").length).toBeGreaterThanOrEqual(1);
  });

  test("27. Validates Phase 10 Admin Customer API integration: loading state, API results rendering, telemetry inspection, error notice with retry recovery, and search filtering", async () => {
    const mockCustomersPhase10 = [
      {
        id: "cust-phase10-01",
        fullName: "Rohan Kulkarni",
        email: "rohan.k@vertex.local",
        phone: "+91 9123456780",
        companyName: null,
        gstin: null,
        role: "CUSTOMER",
        isActive: true,
        emailVerified: true,
        mfaEnabled: false,
        createdAt: "2026-03-01T10:00:00.000Z",
        ordersCount: 4,
        quotesCount: 0,
        totalSpent: 12450.0,
        lastOrderNumber: "VTX-ORD-5011",
      },
      {
        id: "cust-phase10-02",
        fullName: "Kaveri Robotics Lab",
        email: "procure@kaverirobotics.in",
        phone: "+91 9876543200",
        companyName: "Kaveri Robotics Pvt Ltd",
        gstin: "29AABCU9603R1ZM",
        role: "B2B",
        isActive: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: "2026-01-10T08:30:00.000Z",
        ordersCount: 12,
        quotesCount: 3,
        totalSpent: 185600.5,
        lastOrderNumber: "VTX-ORD-9020",
      },
    ];

    adminApi.getAdminCustomers.mockResolvedValueOnce({
      isImplemented: true,
      customers: mockCustomersPhase10,
      pagination: { totalItems: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });

    // 1. Navigate to Customers section
    fireEvent.click(screen.getByTitle("Customers"));

    await waitFor(() => {
      expect(screen.getByText(/Customer & B2B Account Directory/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Rohan Kulkarni/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Kaveri Robotics Lab/i).length).toBeGreaterThan(0);
    });

    // 2. Open Profile Inspection Modal and verify Order & Spend Telemetry
    const inspectBtn = screen.getByTestId("inspect-customer-cust-phase10-02");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Order & Procurement Telemetry/i)).toBeInTheDocument();
      expect(within(modal).getByText(/12 orders/i)).toBeInTheDocument();
      expect(within(modal).getByText(/VTX-ORD-9020/i)).toBeInTheDocument();
      expect(within(modal).getByText(/3 quote requests/i)).toBeInTheDocument();
    });

    // Close Modal
    fireEvent.click(screen.getByRole("button", { name: /Close Profile/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 3. Test API Error and Retry Recovery
    adminApi.getAdminCustomers.mockRejectedValueOnce(new Error("Database connection timeout."));
    const refreshBtn = screen.getByTestId("refresh-customers-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/Database connection timeout./i)).toBeInTheDocument();
      expect(screen.getByTestId("retry-customers-btn")).toBeInTheDocument();
    });

    // Test Retry button recovers customer directory
    adminApi.getAdminCustomers.mockResolvedValueOnce({
      isImplemented: true,
      customers: mockCustomersPhase10,
      pagination: { totalItems: 2, page: 1, limit: 10, totalPages: 1 },
    });

    fireEvent.click(screen.getByTestId("retry-customers-btn"));

    await waitFor(() => {
      expect(screen.getAllByText(/Rohan Kulkarni/i).length).toBeGreaterThan(0);
      expect(screen.queryByTestId("retry-customers-btn")).not.toBeInTheDocument();
    });
  });

  test("28. Validates Phase 11 Admin Audit Logs API integration: loading, log stream rendering, action filtering, search, metadata inspection, and error retry", async () => {
    const mockAuditLogs = [
      {
        id: "log-phase11-01",
        action: "ORDER_STATUS_UPDATE",
        entityType: "Order",
        entityId: "ord-test-8899",
        metadata: {
          orderNumber: "VTX-ORD-8899",
          previousStatus: "CONFIRMED",
          newStatus: "SHIPPED",
          carrier: "Blue Dart",
          trackingNumber: "BLD-88990011",
          notes: "Dispatched from central hub",
        },
        createdAt: "2026-10-20T14:30:00.000Z",
        actorId: "admin-uuid-1",
        actor: {
          id: "admin-uuid-1",
          email: "chief.engineer@vertex.local",
          fullName: "Chief Engineer",
          role: "ADMIN",
        },
      },
      {
        id: "log-phase11-02",
        action: "PRODUCT_VARIANT_STOCK_UPDATE",
        entityType: "ProductVariant",
        entityId: "var-sku-uno-01",
        metadata: {
          sku: "ELEC-ARD-UNO-R3",
          previousStock: 50,
          newStock: 75,
          reason: "Received shipment batch #440",
        },
        createdAt: "2026-10-21T09:15:00.000Z",
        actorId: "admin-uuid-1",
        actor: {
          id: "admin-uuid-1",
          email: "chief.engineer@vertex.local",
          fullName: "Chief Engineer",
          role: "ADMIN",
        },
      },
    ];

    adminApi.getAdminAuditLogs.mockResolvedValueOnce({
      isImplemented: true,
      logs: mockAuditLogs,
      pagination: { totalItems: 2, page: 1, limit: 20, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });

    // 1. Navigate to Audit Log section
    fireEvent.click(screen.getByTitle("Audit Log"));

    await waitFor(() => {
      expect(screen.getByText(/Security & Operational Audit Trail/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ORDER_STATUS_UPDATE/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/PRODUCT_VARIANT_STOCK_UPDATE/i).length).toBeGreaterThan(0);
      expect(screen.getByText("ord-test-8899")).toBeInTheDocument();
    });

    // 2. Open Event Details Inspection Modal
    const inspectBtn = screen.getByTestId("inspect-audit-log-log-phase11-01");
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Audit Record Details/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Target Entity Type/i)).toBeInTheDocument();
      expect(within(modal).getByText(/BLD-88990011/i)).toBeInTheDocument();
    });

    // Close Modal
    fireEvent.click(screen.getByRole("button", { name: /Close Record/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 3. Test Search filtering
    const searchInput = screen.getByPlaceholderText(/Search by action, entity type, ID/i);
    fireEvent.change(searchInput, { target: { value: "var-sku-uno" } });

    expect(screen.getAllByText(/PRODUCT_VARIANT_STOCK_UPDATE/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("ord-test-8899")).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("ord-test-8899")).toBeInTheDocument();

    // 4. Test API Failure and Retry Recovery
    adminApi.getAdminAuditLogs.mockRejectedValueOnce(new Error("Network gateway disconnected."));
    const refreshBtn = screen.getByTestId("refresh-audit-logs-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/Network gateway disconnected./i)).toBeInTheDocument();
      expect(screen.getByTestId("retry-audit-logs-btn")).toBeInTheDocument();
    });

    // Recover using Retry button
    adminApi.getAdminAuditLogs.mockResolvedValueOnce({
      isImplemented: true,
      logs: mockAuditLogs,
      pagination: { totalItems: 2, page: 1, limit: 20, totalPages: 1 },
    });

    fireEvent.click(screen.getByTestId("retry-audit-logs-btn"));

    await waitFor(() => {
      expect(screen.getAllByText(/ORDER_STATUS_UPDATE/i).length).toBeGreaterThan(0);
      expect(screen.queryByTestId("retry-audit-logs-btn")).not.toBeInTheDocument();
    });
  });

  test("29. Validates Admin Product Category integration: assigns category when editing product, validates active category, and reflects updated category in product view", async () => {
    adminApi.updateAdminProduct.mockResolvedValue({
      success: true,
      message: "Product updated successfully.",
      product: {
        ...mockProducts[0],
        categoryId: "cat-2",
        category: { id: "cat-2", name: "Screws & Fasteners", slug: "fasteners" },
      },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });

    // 1. Navigate to Products
    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getByText(/Product Catalog Management/i)).toBeInTheDocument();
      expect(screen.getAllByText("Arduino Uno R3 Microcontroller Board").length).toBeGreaterThan(0);
    });

    // 2. Open Edit Product Modal via the product card Edit button
    const editBtn = screen.getByTestId("edit-product-prod-1");
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Edit Product & Category Assignment/i)).toBeInTheDocument();
    });

    // 3. Category select dropdown is rendered with active categories
    const categorySelect = screen.getByTestId("edit-prod-category-select");
    expect(categorySelect).toBeInTheDocument();
    expect(within(categorySelect).getByRole("option", { name: /Electronics/i })).toBeInTheDocument();
    expect(within(categorySelect).getByRole("option", { name: /Screws & Fasteners/i })).toBeInTheDocument();

    // 4. Change Category from Electronics to Screws & Fasteners
    fireEvent.change(categorySelect, { target: { value: "cat-2" } });

    // 5. Submit the Edit Form
    const saveBtn = screen.getByTestId("save-edit-product-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminProduct).toHaveBeenCalledWith(
        "prod-1",
        expect.objectContaining({
          categoryId: "cat-2",
          name: "Arduino Uno R3 Microcontroller Board",
        })
      );
    });

    // 6. Verify success alert feedback is displayed
    await waitFor(() => {
      expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
    });
  });

  test("30. Validates official category hierarchy: Fasteners appears first, Electronics second, subcategories expand, and admin can edit and activate/deactivate categories", async () => {
    const mockOfficialCategories = [
      {
        id: "cat-fasteners",
        name: "Fasteners",
        slug: "fasteners",
        icon: "🔩",
        tint: "tint-orange",
        description: "Slotted, Phillips, and Hex screws, nuts, washers, and brass inserts.",
        productsCount: 19,
        isActive: true,
        children: [
          { id: "sub-screws-flat", name: "Screws — Flat (Slotted)", slug: "screws-flat-slotted", parentId: "cat-fasteners", isActive: true },
          { id: "sub-screws-cross", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips", parentId: "cat-fasteners", isActive: true },
          { id: "sub-screws-hex", name: "Screws — Hex (Allen)", slug: "screws-hex-allen", parentId: "cat-fasteners", isActive: true },
          { id: "sub-nuts", name: "Nuts", slug: "nuts", parentId: "cat-fasteners", isActive: true },
          { id: "sub-washers", name: "Washers", slug: "washers", parentId: "cat-fasteners", isActive: true },
          { id: "sub-brass-inserts", name: "Brass Inserts", slug: "brass-inserts", parentId: "cat-fasteners", isActive: true },
        ],
      },
      {
        id: "cat-electronics",
        name: "Electronic Products",
        slug: "electronics",
        icon: "🔌",
        tint: "tint-blue",
        description: "Lithium-ion cells, microcontroller boards, motor drivers, PLCs, and buck converters.",
        productsCount: 20,
        isActive: true,
        children: [
          { id: "sub-lithium-cells", name: "Lithium-Ion Batteries / Cells", slug: "lithium-ion-batteries", parentId: "cat-electronics", isActive: true },
          { id: "sub-electronic-components", name: "Electronic Components", slug: "electronic-components", parentId: "cat-electronics", isActive: true },
          { id: "sub-hvnex-mcu", name: "HVNEX – Microcontroller Boards", slug: "hvnex-microcontrollers", parentId: "cat-electronics", isActive: true },
          { id: "sub-hvnex-drivers", name: "HVNEX – DC Motor Drivers", slug: "hvnex-motor-drivers", parentId: "cat-electronics", isActive: true },
          { id: "sub-hvnex-plc", name: "HVNEX – PLC Controller", slug: "hvnex-plc-controllers", parentId: "cat-electronics", isActive: true },
          { id: "sub-hvnex-buck", name: "HVNEX – DC-DC Buck Converters", slug: "hvnex-buck-converters", parentId: "cat-electronics", isActive: true },
        ],
      },
    ];

    adminApi.getAdminCategories.mockResolvedValue({
      categories: mockOfficialCategories,
    });

    adminApi.updateAdminCategory = jest.fn().mockResolvedValue({
      success: true,
      message: "Category updated successfully.",
      category: {
        ...mockOfficialCategories[0],
        name: "Fasteners & Precision Hardware",
      },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/ADMIN CONSOLE/i)).toBeInTheDocument();
    });

    // 1. Navigate to Categories section
    fireEvent.click(screen.getByTitle("Categories"));

    await waitFor(() => {
      expect(screen.getByText(/Category Hierarchy Management/i)).toBeInTheDocument();
      expect(screen.getAllByText("Fasteners").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Electronic Products").length).toBeGreaterThan(0);
    });

    // 2. Verify Fasteners appears before Electronic Products in table order
    const categoryRows = screen.getAllByRole("row");
    let fastenersIndex = -1;
    let electronicsIndex = -1;

    categoryRows.forEach((row, idx) => {
      if (row.textContent.includes("Fasteners") && !row.textContent.includes("↳")) {
        if (fastenersIndex === -1) fastenersIndex = idx;
      }
      if (row.textContent.includes("Electronic Products") && !row.textContent.includes("↳")) {
        if (electronicsIndex === -1) electronicsIndex = idx;
      }
    });

    expect(fastenersIndex).toBeGreaterThan(0);
    expect(electronicsIndex).toBeGreaterThan(0);
    expect(fastenersIndex).toBeLessThan(electronicsIndex);

    // 3. Verify subcategories render under Fasteners (expanded by default for immediate admin visibility)
    expect(screen.getAllByText(/Screws.*Flat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Screws.*Cross/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Screws.*Hex/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Washers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brass Inserts").length).toBeGreaterThan(0);

    // Test Accordion toggle button (collapses and re-expands)
    const toggleFastenersBtn = screen.getAllByTestId("toggle-subcategories-fasteners")[0];
    expect(toggleFastenersBtn).toBeInTheDocument();
    fireEvent.click(toggleFastenersBtn); // collapses
    expect(screen.queryByText(/Screws.*Flat/i)).not.toBeInTheDocument();
    fireEvent.click(toggleFastenersBtn); // re-expands
    expect(screen.getAllByText(/Screws.*Flat/i).length).toBeGreaterThan(0);

    // 4. Test Edit Category Modal
    const editFastenersBtn = screen.getAllByTestId("edit-category-fasteners")[0];
    fireEvent.click(editFastenersBtn);

    await waitFor(() => {
      expect(screen.getByText(/Edit Category: Fasteners/i)).toBeInTheDocument();
    });

    const editNameInput = screen.getByTestId("edit-category-name-input");
    fireEvent.change(editNameInput, { target: { value: "Fasteners & Precision Hardware" } });

    const saveCatBtn = screen.getByTestId("save-category-btn");
    fireEvent.click(saveCatBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminCategory).toHaveBeenCalledWith(
        "cat-fasteners",
        expect.objectContaining({
          name: "Fasteners & Precision Hardware",
        })
      );
    });

    // 5. Test Quick Deactivate Toggle Button
    adminApi.updateAdminCategory.mockResolvedValueOnce({
      success: true,
      message: "Category status updated.",
      category: {
        ...mockOfficialCategories[0],
        isActive: false,
      },
    });

    const toggleStatusBtn = screen.getAllByTestId("toggle-status-fasteners")[0];
    expect(toggleStatusBtn).toHaveTextContent("Deactivate");
    fireEvent.click(toggleStatusBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminCategory).toHaveBeenCalledWith(
        "cat-fasteners",
        expect.objectContaining({
          isActive: false,
        })
      );
    });
  });

  test("31. Validates Commercial RFQ Management: renders quotes list, opens inspect modal, and updates status/pricing", async () => {
    adminApi.getAdminQuotes.mockResolvedValue({
      success: true,
      quotes: [
        {
          id: "rfq-test-01",
          contactName: "Aarav Sharma",
          email: "aarav@apexind.in",
          phone: "+91 9876543210",
          companyName: "Apex Industrial Systems",
          gstin: "29AAAAA0000A1Z5",
          productDetails: "Stainless Steel Hex Bolt (M8 x 50mm)",
          quantity: 500,
          message: "Urgent shipment required.",
          status: "PENDING",
          adminNotes: null,
          quotedAmount: null,
          createdAt: "2026-10-22T08:00:00Z",
        },
      ],
      pagination: { totalItems: 1, page: 1, limit: 10, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Commercial RFQs section
    fireEvent.click(screen.getByTitle("Commercial RFQs"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Commercial Quotes \(RFQ\)/i })).toBeInTheDocument();
      expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
      expect(screen.getByText(/Apex Industrial Systems/i)).toBeInTheDocument();
      expect(screen.getByText("Stainless Steel Hex Bolt (M8 x 50mm)")).toBeInTheDocument();
    });

    // Click Inspect & Quote
    fireEvent.click(screen.getByRole("button", { name: /Inspect quote for Aarav Sharma/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Inquiry: RFQ-RFQ-TEST/i)).toBeInTheDocument();
    });

    // Update status and pricing
    adminApi.updateAdminQuote.mockResolvedValueOnce({
      success: true,
      quote: {
        id: "rfq-test-01",
        contactName: "Aarav Sharma",
        status: "QUOTED",
        quotedAmount: 18500,
        adminNotes: "Dispatched volume quote.",
      },
    });

    const statusSelect = screen.getByLabelText(/Workflow Status/i);
    fireEvent.change(statusSelect, { target: { value: "QUOTED" } });

    const amountInput = screen.getByLabelText(/Quoted Total/i);
    fireEvent.change(amountInput, { target: { value: "18500" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Quote Updates/i }));

    await waitFor(() => {
      expect(adminApi.updateAdminQuote).toHaveBeenCalledWith("rfq-test-01", {
        status: "QUOTED",
        quotedAmount: 18500,
        adminNotes: null,
      });
      expect(screen.getByText(/Quote request status and pricing updated successfully/i)).toBeInTheDocument();
    });
  });

  test("32. Validates Newsletter Subscribers: renders subscriber metrics and subscriber table", async () => {
    adminApi.getAdminNewsletterSubscriptions.mockResolvedValue({
      success: true,
      subscriptions: [
        {
          id: "sub-1",
          email: "procurement@apexind.in",
          isActive: true,
          createdAt: "2026-10-22T08:00:00Z",
        },
      ],
      pagination: { totalItems: 1, page: 1, limit: 20, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Newsletter section
    fireEvent.click(screen.getByTitle("Newsletter"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Newsletter Subscribers/i })).toBeInTheDocument();
      expect(screen.getByText("procurement@apexind.in")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });
  });

  test("33. Admin Price Management: renders Needs Pricing badge and opens Edit Selling Price modal", async () => {
    const unpricedProduct = {
      id: "prod-unpriced-1",
      name: "Slotted CHHD",
      slug: "slotted-chhd",
      brand: "VERTEX",
      category: { id: "cat-2", name: "Fasteners", slug: "fasteners" },
      subcategory: { id: "sub-1", name: "Screws — Flat (Slotted)", slug: "screws-flat-slotted" },
      price: null,
      variants: [
        {
          id: "var-unpriced-1",
          sku: "FAST-SLOT-CHHD-P50",
          name: "Standard Pack",
          price: null,
          stockQuantity: 100,
        },
      ],
    };

    adminApi.getAdminProducts.mockResolvedValue({
      products: [unpricedProduct],
      pagination: { totalItems: 1, page: 1, totalPages: 1 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Products
    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getAllByText("Slotted CHHD").length).toBeGreaterThan(0);
    });

    // Verify "Needs Pricing" badge is displayed
    const badges = screen.getAllByText("Needs Pricing");
    expect(badges.length).toBeGreaterThan(0);

    // Click "Price" button to open modal
    const priceBtn = screen.getByTestId("edit-price-prod-unpriced-1");
    fireEvent.click(priceBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Selling Price/i })).toBeInTheDocument();
      expect(screen.getByTestId("edit-selling-price-input")).toBeInTheDocument();
    });

    // Test rejection of negative or zero price
    const input = screen.getByTestId("edit-selling-price-input");
    fireEvent.change(input, { target: { value: "-10" } });
    fireEvent.click(screen.getByTestId("save-edit-price-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-price-feedback")).toHaveTextContent(/Please enter a valid positive selling price/i);
    });

    // Close modal via Cancel
    fireEvent.click(screen.getByTestId("cancel-edit-price-btn"));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Edit Selling Price/i })).not.toBeInTheDocument();
    });
  });

  test("34. Admin Price Management: successfully saves price and calls updateProductPrice", async () => {
    const unpricedProduct = {
      id: "prod-unpriced-2",
      name: "Pan Head Screw",
      slug: "pan-head-screw",
      brand: "VERTEX",
      category: { id: "cat-2", name: "Fasteners", slug: "fasteners" },
      subcategory: { id: "sub-2", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips" },
      price: null,
      variants: [
        {
          id: "var-unpriced-2",
          sku: "FAST-PAN-HD-P50",
          name: "Standard Pack",
          price: null,
          stockQuantity: 100,
        },
      ],
    };

    adminApi.getAdminProducts.mockResolvedValue({
      products: [unpricedProduct],
      pagination: { totalItems: 1, page: 1, totalPages: 1 },
    });

    adminApi.updateProductPrice.mockResolvedValue({
      success: true,
      message: "Product selling price updated successfully.",
      product: { ...unpricedProduct, price: 175.50 },
      variant: { ...unpricedProduct.variants[0], price: 175.50 },
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Products
    fireEvent.click(screen.getByTitle("Products"));

    await waitFor(() => {
      expect(screen.getAllByText("Pan Head Screw").length).toBeGreaterThan(0);
    });

    // Click "Price" button
    fireEvent.click(screen.getByTestId("edit-price-prod-unpriced-2"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Selling Price/i })).toBeInTheDocument();
    });

    // Input new price
    const input = screen.getByTestId("edit-selling-price-input");
    fireEvent.change(input, { target: { value: "175.50" } });
    fireEvent.click(screen.getByTestId("save-edit-price-btn"));

    await waitFor(() => {
      expect(adminApi.updateProductPrice).toHaveBeenCalledWith("prod-unpriced-2", {
        price: 175.5,
        variantId: "var-unpriced-2",
      });
      expect(screen.getByTestId("edit-price-feedback")).toHaveTextContent(/successfully updated to/i);
    });
  });

  test("35. Admin Inventory strictly displays only official catalog products and excludes demo fixtures", async () => {
    // Provide a mix of official catalog products and demo/fixture products
    const mixedProducts = [
      {
        id: "prod-fast-1",
        name: "Slotted Countersunk (CSK) Head Screw",
        slug: "slotted-csk-head-screw",
        isOfficialCatalog: true,
        category: { id: "cat-fasteners", name: "Fasteners" },
        variants: [
          { id: "var-csk-1", sku: "FAST-SLOT-CSK-P50", stockQuantity: 120, price: 150 },
        ],
      },
      {
        id: "prod-elec-1",
        name: "Lithium-Ion Battery Cell 18650 (2600mAh, 3.7V)",
        slug: "lithium-ion-battery-cell-18650-2600mah-3-7v",
        isOfficialCatalog: true,
        category: { id: "cat-electronics", name: "Electronic Products" },
        variants: [
          { id: "var-18650-1", sku: "BATT-18650-2600", stockQuantity: 80, price: 290 },
        ],
      },
      // 8 Demo fixture products marked with isOfficialCatalog: false
      {
        id: "prod-arduino-uno-r3",
        name: "Arduino Uno R3 Microcontroller Board",
        slug: "arduino-uno-r3",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-electronics", name: "Electronic Products" },
        variants: [{ id: "var-ard", sku: "ELEC-ARD-UNO-R3", stockQuantity: 50, price: 1299 }],
      },
      {
        id: "prod-ss-hex-bolt-m8",
        name: "Stainless Steel Hex Bolt (M8 x 30mm)",
        slug: "ss-hex-bolt-m8-30",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-fasteners", name: "Fasteners" },
        variants: [{ id: "var-hex-bolt", sku: "FAST-HEX-M8-30-P10", stockQuantity: 150, price: 250 }],
      },
      {
        id: "prod-raspberry-pi-4b",
        name: "Raspberry Pi 4 Model B (4GB RAM)",
        slug: "raspberry-pi-4b-4gb",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-electronics", name: "Electronic Products" },
        variants: [{ id: "var-rpi4", sku: "ELEC-RPI4-4GB", stockQuantity: 25, price: 5850 }],
      },
      {
        id: "prod-l298n-driver",
        name: "L298N Dual H-Bridge Motor Driver Module",
        slug: "l298n-motor-driver-module",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-electronics", name: "Electronic Products" },
        variants: [{ id: "var-l298n", sku: "ELEC-DRV-L298N", stockQuantity: 95, price: 220 }],
      },
      {
        id: "prod-delta-plc-dvp14ss2",
        name: "Delta DVP-14SS2 Slim Programmable Logic Controller",
        slug: "delta-dvp-14ss2-plc",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-automation", name: "Automation & Wiring" },
        variants: [{ id: "var-plc", sku: "AUTO-PLC-DVP14SS2", stockQuantity: 12, price: 6200 }],
      },
      {
        id: "prod-flanged-hex-nut-m6",
        name: "Serrated Flanged Hex Nut (M6)",
        slug: "flanged-hex-nut-m6",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-fasteners", name: "Fasteners" },
        variants: [{ id: "var-flange", sku: "FAST-NUT-FLANGE-M6-P25", stockQuantity: 400, price: 180 }],
      },
      {
        id: "prod-solid-state-relay",
        name: "Single Phase Solid State Relay (SSR-40DA)",
        slug: "solid-state-relay-ssr-40da",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-automation", name: "Automation & Wiring" },
        variants: [{ id: "var-ssr", sku: "AUTO-SSR-40DA", stockQuantity: 40, price: 680 }],
      },
      {
        id: "prod-allen-key-set",
        name: "Industrial Ball-End Hex Key Set (9-Piece)",
        slug: "industrial-ball-end-hex-key-set",
        isOfficialCatalog: false,
        isFixture: true,
        category: { id: "cat-tools", name: "Precision Tools" },
        variants: [{ id: "var-hex-set", sku: "TOOL-HEX-SET-9P", stockQuantity: 65, price: 850 }],
      },
    ];

    adminApi.getAdminProducts.mockImplementation(async (params) => {
      let filtered = mixedProducts;
      if (params?.officialOnly) {
        filtered = filtered.filter((p) => p.isOfficialCatalog !== false);
      }
      return {
        products: filtered,
        pagination: { totalItems: filtered.length, page: 1, totalPages: 1 },
      };
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    // Navigate to Inventory section
    fireEvent.click(screen.getByTitle("Inventory"));

    await waitFor(() => {
      expect(screen.getByText(/Inventory Telemetry & Stock Control/i)).toBeInTheDocument();
    });

    // Verify official products ARE rendered (desktop table and mobile cards)
    expect(screen.getAllByText(/FAST-SLOT-CSK-P50/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BATT-18650-2600/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Slotted Countersunk \(CSK\) Head Screw/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lithium-Ion Battery Cell 18650/i).length).toBeGreaterThan(0);

    // Verify ALL 8 demo fixtures are strictly excluded
    expect(screen.queryByText(/Arduino Uno R3 Microcontroller Board/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ELEC-ARD-UNO-R3/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stainless Steel Hex Bolt \(M8 x 30mm\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FAST-HEX-M8-30-P10/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Raspberry Pi 4 Model B/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ELEC-RPI4-4GB/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/L298N Dual H-Bridge Motor Driver Module/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ELEC-DRV-L298N/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delta DVP-14SS2 Slim Programmable Logic Controller/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTO-PLC-DVP14SS2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Serrated Flanged Hex Nut \(M6\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FAST-NUT-FLANGE-M6-P25/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Single Phase Solid State Relay \(SSR-40DA\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTO-SSR-40DA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Industrial Ball-End Hex Key Set/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TOOL-HEX-SET-9P/i)).not.toBeInTheDocument();

    // Verify KPI Total SKUs shows 2 (only the official items)
    expect(screen.getByText("Total SKUs")).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 2 inventory variants/i)).toBeInTheDocument();
  });

  test("36. Admin Categories page displays exactly 2 official top-level categories (Fasteners, Electronic Products) with 6 subcategories each and correct product count", async () => {
    // Mock getAdminCategories returning the full categories array from mockData
    const { MOCK_CATEGORIES: fullCategories } = require("../../mock/mockData");
    adminApi.getAdminCategories.mockResolvedValue({
      categories: fullCategories,
    });

    render(<AdminLayout onNavigateHome={jest.fn()} onNavigateLogin={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Categories"));

    await waitFor(() => {
      expect(screen.getByText(/Category Hierarchy Management/i)).toBeInTheDocument();
      expect(screen.queryByText(/Loading categories from PostgreSQL/i)).not.toBeInTheDocument();
    });

    // 1. Verify exactly 2 top-level categories rendered in table
    await waitFor(() => {
      expect(screen.getAllByText("Fasteners").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Electronic Products").length).toBeGreaterThan(0);
    });

    // Legacy/duplicate top-level categories MUST NOT appear as separate top-level categories
    expect(screen.queryByText("Automation & Wiring")).not.toBeInTheDocument();
    expect(screen.queryByText("Nut Types")).not.toBeInTheDocument();
    expect(screen.queryByText("Precision Tools")).not.toBeInTheDocument();

    // 2. Expand Fasteners and verify all 6 subcategories
    const expandFastenersBtn = screen.getByTestId("toggle-subcategories-fasteners");
    fireEvent.click(expandFastenersBtn);
    expect(screen.getByText("Screws — Flat (Slotted)")).toBeInTheDocument();
    expect(screen.getByText("Screws — Cross (Phillips)")).toBeInTheDocument();
    expect(screen.getByText("Screws — Hex (Allen)")).toBeInTheDocument();
    expect(screen.getByText("Nuts")).toBeInTheDocument();
    expect(screen.getByText("Washers")).toBeInTheDocument();
    expect(screen.getByText("Brass Inserts")).toBeInTheDocument();

    // 3. Expand Electronic Products and verify all 6 subcategories
    const expandElectronicsBtn = screen.getByTestId("toggle-subcategories-electronics");
    fireEvent.click(expandElectronicsBtn);
    expect(screen.getByText("Lithium-Ion Batteries / Cells")).toBeInTheDocument();
    expect(screen.getByText("Electronic Components")).toBeInTheDocument();
    expect(screen.getByText("HVNEX – Microcontroller Boards")).toBeInTheDocument();
    expect(screen.getByText("HVNEX – DC Motor Drivers")).toBeInTheDocument();
    expect(screen.getByText("HVNEX – PLC Controller")).toBeInTheDocument();
    expect(screen.getByText("HVNEX – DC-DC Buck Converters")).toBeInTheDocument();

    // 4. Verify summary metrics reflect the 39 official products across 2 categories
    expect(screen.getByText("Total Categories")).toBeInTheDocument();
    expect(screen.getByText("Associated Products")).toBeInTheDocument();
    expect(screen.getByText("39")).toBeInTheDocument(); // 19 + 20
  });
});

