import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PolicyModal from "./PolicyModal";

describe("PolicyModal Component", () => {
  test("renders policy title, icon, and sections when open", () => {
    const handleClose = jest.fn();
    render(
      <PolicyModal
        policyId="shipping"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByRole("dialog", { name: "Pan-India Shipping & Delivery Policy" })).toBeInTheDocument();
    expect(screen.getByText("Pan-India Shipping & Delivery Policy")).toBeInTheDocument();
    expect(screen.getByText("Free Shipping Threshold")).toBeInTheDocument();
    expect(screen.getByText(/Prepaid orders with a subtotal of ₹799/i)).toBeInTheDocument();
  });

  test("allows switching between policies via tabs", () => {
    render(
      <PolicyModal
        policyId="shipping"
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const gstTab = screen.getByRole("tab", { name: /GST Tax Invoicing/i });
    fireEvent.click(gstTab);

    expect(screen.getByRole("heading", { name: "GST Tax Invoicing & B2B Compliance" })).toBeInTheDocument();
    expect(screen.getByText("Input Tax Credit (ITC) for Businesses")).toBeInTheDocument();

    const privacyTab = screen.getByRole("tab", { name: /Privacy/i });
    fireEvent.click(privacyTab);
    expect(screen.getByRole("heading", { name: "Privacy & Data Safeguards" })).toBeInTheDocument();
  });

  test("calls onClose when close button or backdrop is clicked", () => {
    const handleClose = jest.fn();
    render(
      <PolicyModal
        policyId="shipping"
        isOpen={true}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Close policy dialog" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  test("closes when Escape key is pressed", () => {
    const handleClose = jest.fn();
    render(
      <PolicyModal
        policyId="shipping"
        isOpen={true}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  test("returns null when isOpen is false", () => {
    const { container } = render(
      <PolicyModal
        policyId="shipping"
        isOpen={false}
        onClose={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
