import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductRail from "./ProductRail";

const mockProducts = [
  {
    id: "p-1",
    name: "Stainless Steel Hex Bolt (M8 x 30mm)",
    slug: "ss-hex-bolt-m8",
    price: 250,
    mrp: 300,
    tag: "10% OFF",
    inStock: true,
    variants: [{ id: "v-1", sku: "BOLT-HEX-M8", packSize: "Pack of 10", price: 250, stockQuantity: 100 }],
  },
  {
    id: "p-2",
    name: "Socket Head Cap Screw (M5 x 20mm)",
    slug: "socket-cap-m5",
    price: 180,
    mrp: null,
    inStock: true,
    variants: [{ id: "v-2", sku: "SCR-SOC-M5", packSize: "Pack of 20", price: 180, stockQuantity: 50 }],
  },
  {
    id: "p-3",
    name: "Countersunk CSK Machine Screw (M4 x 16mm)",
    slug: "csk-screw-m4",
    price: 140,
    mrp: null,
    inStock: true,
    variants: [{ id: "v-3", sku: "SCR-CSK-M4", packSize: "Pack of 25", price: 140, stockQuantity: 80 }],
  },
  {
    id: "p-4",
    name: "Button Head Allen Screw (M6 x 25mm)",
    slug: "button-allen-m6",
    price: 220,
    mrp: null,
    inStock: true,
    variants: [{ id: "v-4", sku: "SCR-BTN-M6", packSize: "Pack of 15", price: 220, stockQuantity: 40 }],
  },
];

describe("ProductRail Component", () => {
  test("renders title, subtitle, badge, and products in a horizontal track", () => {
    const handleAddToCart = jest.fn();
    const handleViewDetails = jest.fn();
    const handleViewAll = jest.fn();

    render(
      <ProductRail
        title="Mini Assorted Packs & Fasteners"
        subtitle="High-tensile SS304 fasteners for industrial prototyping."
        badge="ASSORTED PACKS"
        products={mockProducts}
        onAddToCart={handleAddToCart}
        onViewDetails={handleViewDetails}
        onViewAll={handleViewAll}
      />
    );

    expect(screen.getByRole("heading", { name: "Mini Assorted Packs & Fasteners" })).toBeInTheDocument();
    expect(screen.getByText("ASSORTED PACKS")).toBeInTheDocument();
    expect(screen.getByText("High-tensile SS304 fasteners for industrial prototyping.")).toBeInTheDocument();

    // Renders all product cards
    expect(screen.getByText("Stainless Steel Hex Bolt (M8 x 30mm)")).toBeInTheDocument();
    expect(screen.getByText("Socket Head Cap Screw (M5 x 20mm)")).toBeInTheDocument();
    expect(screen.getByText("Countersunk CSK Machine Screw (M4 x 16mm)")).toBeInTheDocument();
    expect(screen.getByText("Button Head Allen Screw (M6 x 25mm)")).toBeInTheDocument();

    // Check View All button
    const viewAllBtn = screen.getByRole("button", { name: "View all →" });
    fireEvent.click(viewAllBtn);
    expect(handleViewAll).toHaveBeenCalled();
  });

  test("returns null when product list is empty and no error/loading", () => {
    const { container } = render(
      <ProductRail
        title="Empty Rail"
        products={[]}
        loading={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test("renders loading skeleton state when loading is true", () => {
    render(
      <ProductRail
        title="Loading Rail"
        products={[]}
        loading={true}
      />
    );

    expect(screen.getByRole("status", { name: "Loading Loading Rail" })).toBeInTheDocument();
  });

  test("renders error message when error prop is provided", () => {
    render(
      <ProductRail
        title="Error Rail"
        products={[]}
        error="Unable to fetch rail products"
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Unable to fetch rail products")).toBeInTheDocument();
  });

  test("displays scroll arrow buttons when products length exceeds 3 and executes scroll", () => {
    render(
      <ProductRail
        title="Scrollable Rail"
        products={mockProducts}
      />
    );

    const prevBtn = screen.getByLabelText("Scroll Scrollable Rail left");
    const nextBtn = screen.getByLabelText("Scroll Scrollable Rail right");

    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    // Mock scrollBy on the track element
    const track = screen.getByLabelText("Scrollable Rail scroll rail");
    track.scrollBy = jest.fn();

    fireEvent.click(nextBtn);
    expect(track.scrollBy).toHaveBeenCalledWith({ left: 320, behavior: "smooth" });

    fireEvent.click(prevBtn);
    expect(track.scrollBy).toHaveBeenCalledWith({ left: -320, behavior: "smooth" });
  });

  test("does not display arrow buttons when product count is 3 or less", () => {
    render(
      <ProductRail
        title="Short Rail"
        products={mockProducts.slice(0, 3)}
      />
    );

    expect(screen.queryByLabelText("Scroll Short Rail left")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Scroll Short Rail right")).not.toBeInTheDocument();
  });
});
