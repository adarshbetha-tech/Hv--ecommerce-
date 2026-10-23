import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ShippingInfoStrip from "./ShippingInfoStrip";

describe("ShippingInfoStrip Component", () => {
  test("renders 4 store and shipping guarantee cards", () => {
    const handleOpenPolicy = jest.fn();
    render(<ShippingInfoStrip onOpenPolicy={handleOpenPolicy} />);

    expect(screen.getByRole("region", { name: "Shipping and Store Guarantees" })).toBeInTheDocument();
    expect(screen.getByText("Free Pan-India Delivery")).toBeInTheDocument();
    expect(screen.getByText("On all prepaid orders above ₹799")).toBeInTheDocument();
    expect(screen.getByText("Cash on Delivery")).toBeInTheDocument();
    expect(screen.getByText("GST Tax Invoicing")).toBeInTheDocument();
    expect(screen.getByText("24-Hour Dispatch")).toBeInTheDocument();
  });

  test("triggers onOpenPolicy callback with correct policy key when policy button is clicked", () => {
    const handleOpenPolicy = jest.fn();
    render(<ShippingInfoStrip onOpenPolicy={handleOpenPolicy} />);

    const shippingBtn = screen.getByRole("button", { name: "Shipping Info →" });
    fireEvent.click(shippingBtn);
    expect(handleOpenPolicy).toHaveBeenCalledWith("shipping");

    const gstBtn = screen.getByRole("button", { name: "Tax Details →" });
    fireEvent.click(gstBtn);
    expect(handleOpenPolicy).toHaveBeenCalledWith("gst");
  });
});
