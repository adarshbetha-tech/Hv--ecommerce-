import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrdersPage from "./OrdersPage";
import * as orderApi from "../../services/orderApi";

jest.mock("../../services/orderApi");

const mockCustomer = {
  id: "user-cust-123",
  fullName: "Alice Engineer",
  email: "alice@example.com",
  role: "CUSTOMER",
};

const sampleOrders = [
  {
    id: "ord-1",
    orderNumber: "VTX-20261022-00001",
    userId: "user-cust-123",
    orderStatus: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "COD",
    subtotal: 1299.0,
    taxAmount: 233.82,
    shippingFee: 0.0,
    totalAmount: 1532.82,
    createdAt: "2026-10-22T10:00:00.000Z",
    shippingAddress: {
      recipientName: "Alice Engineer",
      phone: "+91 98765 43210",
      line1: "42 Silicon Avenue",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
    },
    items: [
      {
        id: "item-1",
        productName: "Arduino Uno R3 Microcontroller",
        sku: "ELEC-ARD-UNO-R3",
        packSize: "1 Unit",
        quantity: 1,
        unitPrice: 1299.0,
        lineTotal: 1299.0,
      },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "VTX-20261022-00002",
    userId: "user-cust-123",
    orderStatus: "CONFIRMED",
    paymentStatus: "PENDING",
    paymentMethod: "COD",
    subtotal: 500.0,
    taxAmount: 90.0,
    shippingFee: 50.0,
    totalAmount: 640.0,
    createdAt: "2026-10-21T15:30:00.000Z",
    shippingAddress: {
      recipientName: "Alice Engineer",
      phone: "+91 98765 43210",
      line1: "42 Silicon Avenue",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
    },
    items: [
      {
        id: "item-2",
        productName: "Stainless Steel Hex Bolt M8",
        sku: "FAST-HEX-M8",
        packSize: "Pack of 10",
        quantity: 2,
        unitPrice: 250.0,
        lineTotal: 500.0,
      },
    ],
  },
  {
    id: "ord-3",
    orderNumber: "VTX-20261015-00003",
    userId: "user-cust-123",
    orderStatus: "DELIVERED",
    paymentStatus: "PAID",
    paymentMethod: "COD",
    subtotal: 800.0,
    taxAmount: 144.0,
    shippingFee: 0.0,
    totalAmount: 944.0,
    deliveredAt: "2026-10-15T09:00:00.000Z",
    notes: "[DeliveredAt: 2026-10-15T09:00:00.000Z]",
    createdAt: "2026-10-15T09:00:00.000Z",
    items: [
      {
        id: "item-3",
        productName: "Torx Security Screws",
        sku: "FAST-TORX-M4",
        packSize: "Pack of 50",
        quantity: 1,
        unitPrice: 800.0,
        lineTotal: 800.0,
      },
    ],
  },
  {
    id: "ord-4",
    orderNumber: "VTX-20261010-00004",
    userId: "user-cust-123",
    orderStatus: "CANCELLED",
    paymentStatus: "CANCELLED",
    paymentMethod: "COD",
    subtotal: 350.0,
    taxAmount: 63.0,
    shippingFee: 0.0,
    totalAmount: 413.0,
    notes: "Customer Cancellation: Ordered duplicate item",
    createdAt: "2026-10-10T12:00:00.000Z",
    items: [
      {
        id: "item-4",
        productName: "Brass Threaded Inserts M3",
        sku: "FAST-BRASS-M3",
        quantity: 1,
        unitPrice: 350.0,
        lineTotal: 350.0,
      },
    ],
  },
  {
    id: "ord-5",
    orderNumber: "VTX-20261023-00005",
    userId: "user-cust-123",
    orderStatus: "DELIVERED",
    paymentStatus: "PAID",
    paymentMethod: "COD",
    subtotal: 1200.0,
    taxAmount: 216.0,
    shippingFee: 0.0,
    totalAmount: 1416.0,
    deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: `[DeliveredAt: ${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}]`,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-5",
        productName: "High Precision Stepper Motor",
        sku: "ELEC-STEP-NEMA17",
        packSize: "NEMA 17 Frame",
        quantity: 2,
        unitPrice: 600.0,
        lineTotal: 1200.0,
      },
    ],
  },
];

describe("OrdersPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Renders authentication required card when currentUser is null", () => {
    const onNavigateLogin = jest.fn();
    render(
      <OrdersPage
        currentUser={null}
        onNavigateHome={jest.fn()}
        onNavigateLogin={onNavigateLogin}
      />
    );

    expect(screen.getByTestId("orders-auth-required")).toBeInTheDocument();
    expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();

    const loginBtn = screen.getByTestId("orders-login-btn");
    fireEvent.click(loginBtn);
    expect(onNavigateLogin).toHaveBeenCalledWith("/orders");
    expect(orderApi.getOrders).not.toHaveBeenCalled();
  });

  test("2. Displays loading state while fetching orders", () => {
    orderApi.getOrders.mockReturnValue(new Promise(() => {})); // pending promise

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    expect(screen.getByTestId("orders-loading")).toBeInTheDocument();
    expect(screen.getByText(/Loading your orders/i)).toBeInTheDocument();
  });

  test("3. Displays empty state when customer has no orders", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: [],
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("orders-empty")).toBeInTheDocument();
    });

    expect(screen.getByText(/No Orders Placed Yet/i)).toBeInTheDocument();
  });

  test("4. Displays orders with items, quantities, totals, and delivery addresses", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    });

    // Order 1 verification
    expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    expect(screen.getByText("Arduino Uno R3 Microcontroller")).toBeInTheDocument();
    expect(screen.getByText("SKU: ELEC-ARD-UNO-R3")).toBeInTheDocument();
    expect(screen.getByText("(1 Unit)")).toBeInTheDocument();
    expect(screen.getAllByText("42 Silicon Avenue")[0]).toBeInTheDocument();

    // Status badges
    expect(screen.getByTestId("order-status-VTX-20261022-00001")).toHaveTextContent("Pending");
    expect(screen.getByTestId("order-status-VTX-20261022-00002")).toHaveTextContent("Confirmed");
    expect(screen.getByTestId("order-status-VTX-20261015-00003")).toHaveTextContent("Delivered");
    expect(screen.getByTestId("order-status-VTX-20261010-00004")).toHaveTextContent("Cancelled");

    // Notes displayed for cancelled order
    expect(screen.getByTestId("order-notes-VTX-20261010-00004")).toHaveTextContent(
      "Customer Cancellation: Ordered duplicate item"
    );
  });

  test("5. Displays Cancel Order button ONLY for PENDING and CONFIRMED orders", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    });

    // PENDING order (ord-1) MUST have cancel button
    expect(screen.getByTestId("cancel-order-btn-VTX-20261022-00001")).toBeInTheDocument();

    // CONFIRMED order (ord-2) MUST have cancel button
    expect(screen.getByTestId("cancel-order-btn-VTX-20261022-00002")).toBeInTheDocument();

    // DELIVERED order (ord-3) MUST NOT have cancel button
    expect(screen.queryByTestId("cancel-order-btn-VTX-20261015-00003")).not.toBeInTheDocument();

    // CANCELLED order (ord-4) MUST NOT have cancel button
    expect(screen.queryByTestId("cancel-order-btn-VTX-20261010-00004")).not.toBeInTheDocument();
  });

  test("6. Requires confirmation modal before cancellation and handles user dismissal", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("cancel-order-btn-VTX-20261022-00001")).toBeInTheDocument();
    });

    // Click cancel button
    fireEvent.click(screen.getByTestId("cancel-order-btn-VTX-20261022-00001"));

    // Confirmation modal should be visible
    expect(screen.getByTestId("cancel-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText(/Cancel Order #VTX-20261022-00001/i)).toBeInTheDocument();

    // Click "Keep Order" to dismiss
    fireEvent.click(screen.getByTestId("cancel-dismiss-btn"));

    // Modal should now be closed and cancelOrder should NOT have been called
    expect(screen.queryByTestId("cancel-confirm-modal")).not.toBeInTheDocument();
    expect(orderApi.cancelOrder).not.toHaveBeenCalled();
  });

  test("7. Successfully confirms cancellation, calls API, displays success alert, and refreshes list", async () => {
    orderApi.getOrders
      .mockResolvedValueOnce({
        success: true,
        orders: sampleOrders,
      })
      .mockResolvedValueOnce({
        success: true,
        orders: [
          {
            ...sampleOrders[0],
            orderStatus: "CANCELLED",
            notes: "Customer Cancellation: Ordered by mistake",
          },
          ...sampleOrders.slice(1),
        ],
      });

    orderApi.cancelOrder.mockResolvedValueOnce({
      success: true,
      message: "Order cancelled successfully.",
      order: {
        ...sampleOrders[0],
        orderStatus: "CANCELLED",
      },
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("cancel-order-btn-VTX-20261022-00001")).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId("cancel-order-btn-VTX-20261022-00001"));

    // Select reason
    fireEvent.change(screen.getByTestId("cancel-reason-select"), {
      target: { value: "Ordered by mistake" },
    });

    // Confirm cancel
    fireEvent.click(screen.getByTestId("confirm-cancel-btn"));

    await waitFor(() => {
      expect(orderApi.cancelOrder).toHaveBeenCalledWith("ord-1", {
        reason: "Ordered by mistake",
      });
    });

    // Success alert should be displayed
    await waitFor(() => {
      expect(screen.getByTestId("orders-success-alert")).toBeInTheDocument();
      expect(
        screen.getByText(/Order #VTX-20261022-00001 has been successfully cancelled/i)
      ).toBeInTheDocument();
    });

    // getOrders should have been called again to refresh authoritative data
    expect(orderApi.getOrders).toHaveBeenCalledTimes(2);
  });

  test("8. Handles cancellation API errors inside modal without crashing", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    orderApi.cancelOrder.mockRejectedValueOnce(
      new Error("Cannot cancel order in 'PROCESSING' status. Order is already packed.")
    );

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("cancel-order-btn-VTX-20261022-00001")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("cancel-order-btn-VTX-20261022-00001"));
    fireEvent.click(screen.getByTestId("confirm-cancel-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("cancel-modal-error")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Cannot cancel order in 'PROCESSING' status/i)
    ).toBeInTheDocument();
  });

  test("9. Handles order listing fetch error and provides working Retry button", async () => {
    orderApi.getOrders
      .mockRejectedValueOnce(new Error("Database connection timed out"))
      .mockResolvedValueOnce({
        success: true,
        orders: sampleOrders,
      });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("orders-error-alert")).toBeInTheDocument();
      expect(screen.getByText(/Database connection timed out/i)).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByTestId("retry-orders-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    });
  });

  test("10. Supports status filtering pills and keyword search without mutating data", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    });

    // All 4 orders initially visible
    expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-VTX-20261022-00002")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-VTX-20261015-00003")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-VTX-20261010-00004")).toBeInTheDocument();

    // Click "Delivered" filter pill
    const deliveredPill = screen.getByRole("tab", { name: /Delivered/i });
    fireEvent.click(deliveredPill);

    // Only delivered order visible
    expect(screen.queryByTestId("order-card-VTX-20261022-00001")).not.toBeInTheDocument();
    expect(screen.getByTestId("order-card-VTX-20261015-00003")).toBeInTheDocument();

    // Reset to "All Orders"
    const allPill = screen.getByRole("tab", { name: /All Orders/i });
    fireEvent.click(allPill);
    expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();

    // Search by SKU
    const searchInput = screen.getByPlaceholderText(/Search order #, SKU, or product/i);
    fireEvent.change(searchInput, { target: { value: "ELEC-ARD" } });

    expect(screen.getByTestId("order-card-VTX-20261022-00001")).toBeInTheDocument();
    expect(screen.queryByTestId("order-card-VTX-20261022-00002")).not.toBeInTheDocument();
  });

  test("11. Closes cancellation modal on Escape key press", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("cancel-order-btn-VTX-20261022-00001")).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId("cancel-order-btn-VTX-20261022-00001"));
    expect(screen.getByTestId("cancel-confirm-modal")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    // Modal should close
    expect(screen.queryByTestId("cancel-confirm-modal")).not.toBeInTheDocument();
    expect(orderApi.cancelOrder).not.toHaveBeenCalled();
  });

  test("12. Renders Request Replacement button for order within 7-day delivery window and never offers refund button", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("request-replacement-btn-VTX-20261023-00005")).toBeInTheDocument();
    });

    // Ensure strictly no "Request Refund" or "Refund" buttons exist in customer order workflow
    expect(screen.queryByRole("button", { name: /refund/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/request refund/i)).not.toBeInTheDocument();
  });

  test("13. Displays 7-Day Window Ended badge for order delivered more than 7 days ago", async () => {
    orderApi.getOrders.mockResolvedValueOnce({
      success: true,
      orders: sampleOrders,
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("replacement-status-expired-VTX-20261015-00003")).toBeInTheDocument();
    });

    expect(screen.getByText(/7-Day Window Ended/i)).toBeInTheDocument();
    expect(screen.queryByTestId("request-replacement-btn-VTX-20261015-00003")).not.toBeInTheDocument();
  });

  test("14. Opens 7-day replacement modal and submits request with items selection", async () => {
    orderApi.getOrders.mockResolvedValue({
      success: true,
      orders: sampleOrders,
    });
    orderApi.requestOrderReplacement.mockResolvedValueOnce({
      success: true,
      status: "PENDING_REVIEW",
      orderNumber: "VTX-20261023-00005",
      message: "Replacement request submitted successfully.",
    });

    render(
      <OrdersPage
        currentUser={mockCustomer}
        onNavigateHome={jest.fn()}
        onNavigateLogin={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("request-replacement-btn-VTX-20261023-00005")).toBeInTheDocument();
    });

    // Click Request Replacement
    fireEvent.click(screen.getByTestId("request-replacement-btn-VTX-20261023-00005"));

    // Modal opens
    expect(screen.getByTestId("replacement-request-modal")).toBeInTheDocument();
    expect(screen.getByText(/Strict Replacement-Only Policy/i)).toBeInTheDocument();

    // Select reason and enter details
    const reasonSelect = screen.getByTestId("replacement-reason-select");
    fireEvent.change(reasonSelect, { target: { value: "Transit Damage / Broken in Transit" } });

    const detailsInput = screen.getByTestId("replacement-details-input");
    fireEvent.change(detailsInput, {
      target: { value: "Shaft is bent and connector pins sheared off during courier transit." },
    });

    // Submit replacement request
    const submitBtn = screen.getByTestId("confirm-replacement-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(orderApi.requestOrderReplacement).toHaveBeenCalledWith(
        "ord-5",
        expect.objectContaining({
          reason: "Transit Damage / Broken in Transit",
          details: "Shaft is bent and connector pins sheared off during courier transit.",
          unboxingProofConfirmed: true,
        })
      );
    });
  });
});


