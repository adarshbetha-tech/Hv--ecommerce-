import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SiteFooter from "./SiteFooter";

describe("SiteFooter Component", () => {
  test("renders brand logo, tagline, catalogue navigation, contact, and legal links", () => {
    const handleNavigate = jest.fn();
    const handleWishlist = jest.fn();
    const handleQuote = jest.fn();
    const handlePolicy = jest.fn();

    render(
      <SiteFooter
        wishlistCount={3}
        onNavigateCategory={handleNavigate}
        onOpenWishlist={handleWishlist}
        onRequestQuote={handleQuote}
        onOpenPolicy={handlePolicy}
      />
    );

    // Brand and about
    expect(screen.getByRole("contentinfo", { name: "Store footer" })).toBeInTheDocument();
    expect(screen.getByText("VERTEX")).toBeInTheDocument();
    expect(screen.getByText("BUILD BETTER TOGETHER")).toBeInTheDocument();
    expect(screen.getByText(/VERTEX is an online engineering components/i)).toBeInTheDocument();

    // Catalogue navigation
    const allProdBtn = screen.getByRole("button", { name: "All Products" });
    fireEvent.click(allProdBtn);
    expect(handleNavigate).toHaveBeenCalledWith("all");

    const electBtn = screen.getByRole("button", { name: "Lithium Cells & Electronics" });
    fireEvent.click(electBtn);
    expect(handleNavigate).toHaveBeenCalledWith("electronics");

    // Wishlist with count
    const wishlistBtn = screen.getByRole("button", { name: "Saved Wishlist (3)" });
    fireEvent.click(wishlistBtn);
    expect(handleWishlist).toHaveBeenCalled();

    // Request quote
    const quoteBtn = screen.getByRole("button", { name: "Request Commercial Quote (RFQ)" });
    fireEvent.click(quoteBtn);
    expect(handleQuote).toHaveBeenCalled();

    // Policy links in column 3
    const shipPolicyBtn = screen.getByRole("button", { name: "Pan-India Shipping Policy" });
    fireEvent.click(shipPolicyBtn);
    expect(handlePolicy).toHaveBeenCalledWith("shipping");

    const gstPolicyBtn = screen.getByRole("button", { name: "GST Tax Invoicing (B2B ITC)" });
    fireEvent.click(gstPolicyBtn);
    expect(handlePolicy).toHaveBeenCalledWith("gst");

    // Legal bottom links
    const privacyBtn = screen.getByRole("button", { name: "Privacy Policy" });
    fireEvent.click(privacyBtn);
    expect(handlePolicy).toHaveBeenCalledWith("privacy");

    const termsBtn = screen.getByRole("button", { name: "Terms of Service" });
    fireEvent.click(termsBtn);
    expect(handlePolicy).toHaveBeenCalledWith("terms");
  });
});
