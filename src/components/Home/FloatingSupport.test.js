import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FloatingSupport from "./FloatingSupport";

describe("FloatingSupport Component", () => {
  test("renders collapsed button with accessible label and toggles open on click", () => {
    render(<FloatingSupport />);

    const toggleBtn = screen.getByRole("button", { name: "Toggle technical support options" });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText("Need Help?")).toBeInTheDocument();

    // Open panel
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("region", { name: "Direct Technical Support" })).toBeInTheDocument();
    expect(screen.getByText("VERTEX Technical Desk")).toBeInTheDocument();
    expect(screen.getByText("Chat on WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Email Engineering Team")).toBeInTheDocument();
  });

  test("triggers onRequestQuote and onOpenPolicy when corresponding actions clicked", () => {
    const handleRequestQuote = jest.fn();
    const handleOpenPolicy = jest.fn();

    render(
      <FloatingSupport
        onRequestQuote={handleRequestQuote}
        onOpenPolicy={handleOpenPolicy}
      />
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: "Toggle technical support options" }));

    // Click RFQ
    const rfqBtn = screen.getByText("Request Bulk Quotation (RFQ)").closest("button");
    fireEvent.click(rfqBtn);
    expect(handleRequestQuote).toHaveBeenCalled();

    // Open again and click shipping FAQs
    fireEvent.click(screen.getByRole("button", { name: "Toggle technical support options" }));
    const faqsBtn = screen.getByText(/Pan-India Shipping & COD FAQs/i).closest("button");
    fireEvent.click(faqsBtn);
    expect(handleOpenPolicy).toHaveBeenCalledWith("shipping");
  });

  test("closes panel when Escape key is pressed", () => {
    render(<FloatingSupport />);

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: "Toggle technical support options" }));
    expect(screen.getByRole("region", { name: "Direct Technical Support" })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Direct Technical Support" })).not.toBeInTheDocument();
  });
});
