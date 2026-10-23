import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BulkInquirySection from "./BulkInquirySection";

describe("BulkInquirySection Component", () => {
  test("renders heading, enterprise perks, and CTA button", () => {
    const handleRequestQuote = jest.fn();
    render(<BulkInquirySection onRequestQuote={handleRequestQuote} />);

    expect(screen.getByRole("region", { name: "Bulk Orders and RFQ" })).toBeInTheDocument();
    expect(screen.getByText("COMMERCIAL PROCUREMENT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bulk Hardware Procurement/i })).toBeInTheDocument();

    expect(screen.getByText("Volume-Tiered Discounts")).toBeInTheDocument();
    expect(screen.getByText("B2B GST Tax Invoicing")).toBeInTheDocument();
    expect(screen.getByText("Material Certification")).toBeInTheDocument();
    expect(screen.getByText("24-Hour RFQ Response")).toBeInTheDocument();

    const ctaBtn = screen.getByRole("button", { name: "Request a Commercial Quote (RFQ) →" });
    expect(ctaBtn).toBeInTheDocument();
    fireEvent.click(ctaBtn);
    expect(handleRequestQuote).toHaveBeenCalled();
  });
});
