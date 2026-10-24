import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CheckoutPage from "./CheckoutPage";
import * as orderApi from "../../services/orderApi";

jest.mock("../../services/orderApi");

describe("CheckoutPage Component Suite", () => {
  const mockUser = {
    id: "user-123",
    email: "customer@vertex.local",
    fullName: "Jane Customer",
    phone: "+91 98765 43210",
  };

  const mockCart = {
    id: "cart-123",
    userId: "user-123",
    totalQuantity: 3,
    subtotal: 1799.00,
    items: [
      {
        id: "item-1",
        variantId: "var-1",
        quantity: 1,
        unitPrice: 1299.00,
        lineTotal: 1299.00,
        isAvailable: true,
        variant: {
          id: "var-1",
          sku: "ARD-UNO-R3",
          packSize: "1 Unit",
        },
        product: {
          id: "prod-1",
          name: "Arduino Uno R3 Microcontroller Board",
        },
      },
      {
        id: "item-2",
        variantId: "var-2",
        quantity: 2,
        unitPrice: 250.00,
        lineTotal: 500.00,
        isAvailable: true,
        variant: {
          id: "var-2",
          sku: "BOLT-HEX-M8",
          packSize: "Pack of 10",
        },
        product: {
          id: "prod-2",
          name: "Stainless Steel Hex Bolt (M8 x 30mm)",
        },
      },
    ],
  };

  const mockAddresses = [
    {
      id: "addr-1",
      userId: "user-123",
      recipientName: "Jane Customer",
      phone: "+91 98765 43210",
      line1: "123 Tech Park, Hitech City",
      line2: "Floor 4",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
      country: "India",
      isDefault: true,
    },
    {
      id: "addr-2",
      userId: "user-123",
      recipientName: "Jane Alternate",
      phone: "+91 98765 99999",
      line1: "456 Industrial Colony",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      isDefault: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    orderApi.getAddresses.mockResolvedValue({ success: true, addresses: mockAddresses });
  });

  test("1. Renders authentication required card when currentUser is null", () => {
    const handleLogin = jest.fn();
    render(
      <CheckoutPage
        currentUser={null}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={handleLogin}
      />
    );

    expect(screen.getByTestId("checkout-auth-required")).toBeInTheDocument();
    expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();

    const loginBtn = screen.getByTestId("checkout-login-btn");
    fireEvent.click(loginBtn);
    expect(handleLogin).toHaveBeenCalledWith("/checkout");
  });

  test("2. Displays saved addresses and selects default address", async () => {
    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("address-card-addr-1")).toBeInTheDocument();
      expect(screen.getByTestId("address-card-addr-2")).toBeInTheDocument();
    });

    const defaultRadio = screen.getByDisplayValue("addr-1");
    expect(defaultRadio).toBeChecked();
  });

  test("3. Displays cart items and server-calculated totals in order summary", async () => {
    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("checkout-summary-card")).toBeInTheDocument();
      expect(screen.getByText("Arduino Uno R3 Microcontroller Board")).toBeInTheDocument();
      expect(screen.getByText("Stainless Steel Hex Bolt (M8 x 30mm)")).toBeInTheDocument();
      expect(screen.getByTestId("summary-subtotal")).toHaveTextContent("₹1,799.00");
      // Verify Estimated GST row is removed from UI
      expect(screen.queryByText(/Estimated GST/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("summary-tax")).not.toBeInTheDocument();
      // Verify Total Amount equals Subtotal + Shipping only
      expect(screen.getByTestId("summary-grand-total")).toHaveTextContent("₹1,799.00");
    });
  });

  test("4. Submits order using selected address and shows confirmation screen", async () => {
    const mockCreatedOrder = {
      id: "ord-new-123",
      orderNumber: "VTX-20261018-99999",
      userId: "user-123",
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "COD",
      subtotal: 1799.00,
      taxAmount: 269.82,
      shippingFee: 0.00,
      totalAmount: 2068.82,
      shippingAddress: {
        recipientName: "Jane Customer",
        phone: "+91 98765 43210",
        line1: "123 Tech Park, Hitech City",
        line2: "Floor 4",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500081",
        country: "India",
      },
      items: [
        {
          id: "it-1",
          sku: "ARD-UNO-R3",
          productName: "Arduino Uno R3 Microcontroller Board",
          packSize: "1 Unit",
          quantity: 1,
          unitPrice: 1299.00,
          gstRate: 18.00,
          taxAmount: 233.82,
          lineTotal: 1532.82,
        },
      ],
    };

    orderApi.placeOrder.mockResolvedValue({
      success: true,
      order: mockCreatedOrder,
    });

    const handleSuccess = jest.fn();

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
        onOrderSuccess={handleSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("place-order-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(orderApi.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          addressId: "addr-1",
          paymentMethod: "COD",
        })
      );
      expect(screen.getByTestId("order-confirmation-view")).toBeInTheDocument();
      expect(screen.getByTestId("confirmed-order-number")).toHaveTextContent("VTX-20261018-99999");
      expect(screen.getByTestId("confirmed-order-status")).toHaveTextContent("PENDING");
      expect(screen.getByTestId("confirmed-payment-status")).toHaveTextContent(/PENDING \(COD\)/i);
      expect(handleSuccess).toHaveBeenCalledWith(mockCreatedOrder);
    });
  });

  test("5. Validates new address form inputs when no saved address is used", async () => {
    orderApi.getAddresses.mockResolvedValue({ success: true, addresses: [] });

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("input-address-line1")).toBeInTheDocument();
    });

    // Clear city and postal code to trigger errors
    fireEvent.change(screen.getByTestId("input-address-city"), { target: { value: "" } });
    fireEvent.change(screen.getByTestId("input-address-postal"), { target: { value: "" } });

    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(screen.getByText(/Address Line 1 must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/City is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Postal code is required/i)).toBeInTheDocument();
      expect(orderApi.placeOrder).not.toHaveBeenCalled();
    });
  });

  test("6. Displays error banner when order placement fails with server error", async () => {
    orderApi.placeOrder.mockRejectedValue(
      new Error("Insufficient stock for Arduino Uno R3. Available: 0, Requested: 1.")
    );

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("address-card-addr-1")).toBeInTheDocument();
      expect(screen.getByTestId("place-order-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-error-banner")).toBeInTheDocument();
      expect(screen.getByText(/Insufficient stock for Arduino Uno R3/i)).toBeInTheDocument();
    });

    // Dismiss error banner
    fireEvent.click(screen.getByRole("button", { name: /Dismiss error/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("checkout-error-banner")).not.toBeInTheDocument();
    });
  });

  test("7. Selecting UPI payment method displays QR code, merchant VPA, and UTR input", async () => {
    orderApi.getPaymentConfig.mockResolvedValue({
      success: true,
      config: {
        merchantUpiId: "vertex.industrial@hdfcbank",
        merchantName: "VERTEX Industrial Components",
        upiEnabled: true,
        qrMode: "DYNAMIC",
        instructions: "Scan QR code and enter 12-digit UTR reference.",
        hasStaticQr: false,
      },
    });

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("payment-upi-option")).toBeInTheDocument();
    });

    // Select UPI option
    const upiRadio = screen.getByRole("radio", { name: /UPI \/ QR Code Payment/i });
    fireEvent.click(upiRadio);

    await waitFor(() => {
      expect(screen.getByTestId("upi-payment-panel")).toBeInTheDocument();
      expect(screen.getByTestId("merchant-vpa-display")).toHaveTextContent("vertex.industrial@hdfcbank");
      expect(screen.getByTestId("copy-upi-btn")).toBeInTheDocument();
      expect(screen.getByTestId("upi-qr-card")).toBeInTheDocument();
      expect(screen.getByTestId("upi-qr-image")).toBeInTheDocument();
      expect(screen.getByTestId("input-upi-reference")).toBeInTheDocument();
      expect(screen.getByTestId("upi-security-notice")).toBeInTheDocument();
    });

    // Click copy button
    fireEvent.click(screen.getByTestId("copy-upi-btn"));
    expect(screen.getByText(/✔ Copied!/i)).toBeInTheDocument();
  });

  test("8. Submits order with UPI and customer-entered UTR reference, showing verification notice", async () => {
    orderApi.getPaymentConfig.mockResolvedValue({
      success: true,
      config: {
        merchantUpiId: "billing.vertex@icici",
        merchantName: "VERTEX Industrial E-Commerce",
        upiEnabled: true,
      },
    });

    const mockUpiOrder = {
      id: "ord-upi-789",
      orderNumber: "VTX-UPI-20261023-01",
      userId: "user-123",
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "UPI",
      paymentId: "UTR-998877665544",
      subtotal: 1799.0,
      taxAmount: 269.82,
      shippingFee: 0.0,
      totalAmount: 2068.82,
      shippingAddress: mockAddresses[0],
      items: [],
    };

    orderApi.placeOrder.mockResolvedValue({
      success: true,
      order: mockUpiOrder,
    });

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("payment-upi-option")).toBeInTheDocument();
    });

    // Switch to UPI
    fireEvent.click(screen.getByRole("radio", { name: /UPI \/ QR Code Payment/i }));

    await waitFor(() => {
      expect(screen.getByTestId("input-upi-reference")).toBeInTheDocument();
    });

    // Enter customer transaction UTR reference
    fireEvent.change(screen.getByTestId("input-upi-reference"), {
      target: { value: "UTR-998877665544" },
    });

    // Submit order
    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(orderApi.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          addressId: "addr-1",
          paymentMethod: "UPI",
          paymentId: "UTR-998877665544",
        })
      );
      expect(screen.getByTestId("order-confirmation-view")).toBeInTheDocument();
      expect(screen.getByTestId("confirmed-order-number")).toHaveTextContent("VTX-UPI-20261023-01");
      expect(screen.getByTestId("confirmed-payment-status")).toHaveTextContent(/PENDING \(UPI\)/i);
      expect(screen.getByTestId("confirmed-upi-reference")).toHaveTextContent("UTR-998877665544");
      expect(screen.getByTestId("confirmed-upi-notice")).toBeInTheDocument();
      expect(screen.getByText(/billing team will verify your transaction reference/i)).toBeInTheDocument();
    });
  });

  test("9. Submits UTR reference on confirmation view if not entered during checkout", async () => {
    const mockOrderWithoutUtr = {
      id: "ord-upi-pending-utr",
      orderNumber: "VTX-UPI-NO-UTR",
      userId: "user-123",
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "UPI",
      paymentId: null, // No UTR provided yet
      subtotal: 1799.0,
      taxAmount: 269.82,
      shippingFee: 0.0,
      totalAmount: 2068.82,
      shippingAddress: mockAddresses[0],
      items: [],
    };

    orderApi.placeOrder.mockResolvedValue({
      success: true,
      order: mockOrderWithoutUtr,
    });

    const updatedOrderWithUtr = {
      ...mockOrderWithoutUtr,
      paymentId: "UTR-LATE-123456",
    };

    orderApi.submitPaymentReference.mockResolvedValue({
      success: true,
      order: updatedOrderWithUtr,
    });

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("payment-upi-option")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("radio", { name: /UPI \/ QR Code Payment/i }));
    fireEvent.click(screen.getByTestId("place-order-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("input-confirm-utr")).toBeInTheDocument();
      expect(screen.getByTestId("submit-ref-btn")).toBeInTheDocument();
    });

    // Enter UTR reference and submit
    fireEvent.change(screen.getByTestId("input-confirm-utr"), {
      target: { value: "UTR-LATE-123456" },
    });
    fireEvent.click(screen.getByTestId("submit-ref-btn"));

    await waitFor(() => {
      expect(orderApi.submitPaymentReference).toHaveBeenCalledWith(
        "ord-upi-pending-utr",
        "UTR-LATE-123456"
      );
      expect(screen.getByText(/UTR reference submitted successfully/i)).toBeInTheDocument();
      expect(screen.getByTestId("confirmed-upi-reference")).toHaveTextContent("UTR-LATE-123456");
    });
  });

  test("10. Saved merchant UPI ID updates the checkout merchant VPA display and generates matching transaction QR", async () => {
    orderApi.getPaymentConfig.mockResolvedValue({
      success: true,
      config: {
        merchantUpiId: "custom.accounts@icici",
        merchantName: "VERTEX Industrial India Pvt Ltd",
        upiEnabled: true,
        qrMode: "DYNAMIC",
      },
    });

    orderApi.generateUpiQr.mockResolvedValue({
      success: true,
      qrDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAA==",
      upiUri: "upi://pay?pa=custom.accounts@icici&pn=VERTEX+Industrial+India+Pvt+Ltd&am=2122.82&cu=INR&tn=Order+Payment",
      merchantUpiId: "custom.accounts@icici",
      merchantName: "VERTEX Industrial India Pvt Ltd",
      amount: 2122.82,
      mode: "DYNAMIC",
      isDynamic: true,
    });

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("payment-upi-option")).toBeInTheDocument();
    });

    // Select UPI option
    fireEvent.click(screen.getByRole("radio", { name: /UPI \/ QR Code Payment/i }));

    // Verify merchant VPA display reflects the newly saved merchant UPI ID
    await waitFor(() => {
      expect(screen.getByTestId("merchant-vpa-display")).toHaveTextContent("custom.accounts@icici");
      expect(screen.getByText(/VERTEX Industrial India Pvt Ltd/i)).toBeInTheDocument();
      expect(screen.getByTestId("upi-qr-image")).toHaveAttribute(
        "src",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAA=="
      );
      expect(screen.getByTestId("upi-intent-link")).toHaveAttribute(
        "href",
        expect.stringContaining("custom.accounts@icici")
      );
    });
  });

  test("11. Temporarily excludes GST from Order Summary and calculates Total Amount as Subtotal + Shipping only", async () => {
    // 1. With free shipping: Total Amount equals Subtotal only
    const { unmount } = render(
      <CheckoutPage
        currentUser={mockUser}
        cart={mockCart}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("checkout-summary-card")).toBeInTheDocument();
    });

    // Ensure GST row is not rendered
    expect(screen.queryByText(/Estimated GST/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("summary-tax")).not.toBeInTheDocument();

    // Verify subtotal, shipping, and grand total
    expect(screen.getByTestId("summary-subtotal")).toHaveTextContent("₹1,799.00");
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByTestId("summary-grand-total")).toHaveTextContent("₹1,799.00");
    unmount();

    // 2. With non-zero shipping: Total Amount equals Subtotal + Shipping (no GST added)
    const cartWithShipping = {
      ...mockCart,
      shippingFee: 120.00,
    };

    render(
      <CheckoutPage
        currentUser={mockUser}
        cart={cartWithShipping}
        onNavigateHome={() => {}}
        onNavigateLogin={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("checkout-summary-card")).toBeInTheDocument();
    });

    // Ensure GST row is not rendered
    expect(screen.queryByText(/Estimated GST/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("summary-tax")).not.toBeInTheDocument();

    // Verify subtotal, non-zero shipping, and grand total = 1799 + 120 = 1919.00
    expect(screen.getByTestId("summary-subtotal")).toHaveTextContent("₹1,799.00");
    expect(screen.getByText("₹120.00")).toBeInTheDocument();
    expect(screen.getByTestId("summary-grand-total")).toHaveTextContent("₹1,919.00");
  });
});


