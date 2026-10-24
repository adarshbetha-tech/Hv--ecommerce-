import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminRefunds from "./AdminRefunds";
import * as adminApi from "../../services/adminApi";

jest.mock("../../services/adminApi");

describe("AdminRefunds Component — 7-Day Replacements & Historical Refunds", () => {
  const sampleReplacements = [
    {
      id: "repl-1",
      orderNumber: "VTX-20261022-38104",
      customer: {
        id: "usr-1",
        fullName: "Jane Customer",
        email: "jane@example.com",
        companyName: "Alpha Robotics Corp",
      },
      deliveryDate: "2026-10-22T10:00:00.000Z",
      windowDeadline: "2026-10-29T10:00:00.000Z",
      isWithinWindow: true,
      status: "PENDING_REVIEW",
      reason: "Dead on Arrival (DOA) / Component Defect",
      details: "Hex bolts stripped threading upon initial torquing test.",
      items: [
        {
          sku: "FAST-HEX-M8-30-P10",
          productName: "Stainless Steel Hex Bolt (M8 x 30mm)",
          quantity: 1,
        },
      ],
      requestedAt: "2026-10-23T14:20:00.000Z",
    },
  ];

  const sampleOrders = [
    {
      id: "ord-ref-1",
      orderNumber: "VTX-REF-HIST-001",
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-19T10:00:00.000Z",
      customer: { fullName: "Historical Client" },
      totalAmount: 1500.0,
      refundAmount: 1500.0,
      notes: "Recorded administrative credit note",
      paymentStatus: "REFUNDED",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    adminApi.getAdminReplacements.mockResolvedValue({
      success: true,
      count: sampleReplacements.length,
      replacements: sampleReplacements,
    });
    adminApi.getAdminOrders.mockResolvedValue({
      success: true,
      orders: sampleOrders,
    });
  });

  test("1. Renders 7-Day Replacement Requests and Historical Refund tabs", async () => {
    render(<AdminRefunds onNavigateOrders={jest.fn()} />);

    expect(screen.getByTestId("tab-replacements")).toBeInTheDocument();
    expect(screen.getByTestId("tab-refunds")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("VTX-20261022-38104")).toBeInTheDocument();
    });

    expect(screen.getByText("Within 7 Days")).toBeInTheDocument();
    expect(screen.getByText("PENDING REVIEW")).toBeInTheDocument();
  });

  test("2. Opens review modal and submits admin decision", async () => {
    adminApi.reviewAdminReplacement.mockResolvedValueOnce({
      success: true,
      message: "Replacement request for Order #VTX-20261022-38104 successfully updated.",
    });

    render(<AdminRefunds onNavigateOrders={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("review-replacement-btn-VTX-20261022-38104")).toBeInTheDocument();
    });

    // Click Review button
    fireEvent.click(screen.getByTestId("review-replacement-btn-VTX-20261022-38104"));

    // Modal appears
    expect(screen.getByTestId("admin-replacement-review-modal")).toBeInTheDocument();
    expect(screen.getByText(/Inventory Dispatch Only/i)).toBeInTheDocument();

    // Select status and enter notes
    const statusSelect = screen.getByTestId("admin-review-status-select");
    fireEvent.change(statusSelect, { target: { value: "APPROVED_FOR_DISPATCH" } });

    const notesInput = screen.getByTestId("admin-review-notes-input");
    fireEvent.change(notesInput, {
      target: { value: "Approved by lead engineer; replacement batch packaged for express courier." },
    });

    // Submit decision
    const confirmBtn = screen.getByTestId("confirm-admin-review-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.reviewAdminReplacement).toHaveBeenCalledWith(
        "VTX-20261022-38104",
        expect.objectContaining({
          status: "APPROVED_FOR_DISPATCH",
          adminNotes: "Approved by lead engineer; replacement batch packaged for express courier.",
        })
      );
    });
  });

  test("3. Switches to Historical Refund Records tab and verifies records remain intact", async () => {
    render(<AdminRefunds onNavigateOrders={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-refunds")).toBeInTheDocument();
    });

    // Switch to Historical Refund Records
    fireEvent.click(screen.getByTestId("tab-refunds"));

    expect(screen.getByText(/Historical Refund Records Registry/i)).toBeInTheDocument();
    expect(screen.getByText("VTX-REF-HIST-001")).toBeInTheDocument();
    expect(screen.getByText(/Historical Financial Boundary/i)).toBeInTheDocument();
  });
});
