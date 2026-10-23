import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryTiles from "./CategoryTiles";

const mockCategories = [
  {
    id: "cat-fasteners",
    name: "Fasteners",
    slug: "fasteners",
    icon: "🔩",
    description: "Slotted, Phillips, and Hex screws, nuts, washers, and brass inserts.",
    productsCount: 18,
    children: [
      { id: "sub-1", name: "Screws — Flat (Slotted)", slug: "screws-flat-slotted" },
      { id: "sub-2", name: "Screws — Cross (Phillips)", slug: "screws-cross-phillips" },
    ],
  },
  {
    id: "cat-electronics",
    name: "Electronic Products",
    slug: "electronics",
    icon: "🔌",
    description: "Microcontroller boards, motor drivers, and PLCs.",
    productsCount: 19,
    children: [],
  },
  {
    id: "cat-custom",
    name: "Custom Hardware",
    slug: "custom-hardware",
    icon: "⚙️",
    description: "Specialized machined components.",
    imageUrl: "https://example.com/custom.jpg",
    children: [],
  },
];

describe("CategoryTiles Component", () => {
  test("renders image-led category tiles from category records", () => {
    const handleSelect = jest.fn();
    render(
      <CategoryTiles
        categories={mockCategories}
        onSelectCategory={handleSelect}
      />
    );

    expect(screen.getByRole("heading", { name: "Shop by Category" })).toBeInTheDocument();
    expect(screen.getByText("CATALOGUE BROWSING")).toBeInTheDocument();
    expect(screen.getByText("Fasteners")).toBeInTheDocument();
    expect(screen.getByText("Electronic Products")).toBeInTheDocument();
    expect(screen.getByText("Custom Hardware")).toBeInTheDocument();

    // Check count badges
    expect(screen.getByText("2 Subcategories")).toBeInTheDocument();
    expect(screen.getByText("19 Products")).toBeInTheDocument();

    // Check action links
    expect(screen.getByText("Explore Fasteners →")).toBeInTheDocument();
    expect(screen.getByText("Explore Electronic Products →")).toBeInTheDocument();
    expect(screen.getByText("Explore Custom Hardware →")).toBeInTheDocument();
  });

  test("uses mapped or passed image URLs and handles fallback when missing", () => {
    render(<CategoryTiles categories={mockCategories} />);

    // Fasteners & Electronics use mapped local artwork
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(3);
    expect(images[0]).toHaveAttribute("alt", "Fasteners");
    expect(images[1]).toHaveAttribute("alt", "Electronic Products");
    expect(images[2]).toHaveAttribute("alt", "Custom Hardware");
    expect(images[2]).toHaveAttribute("src", "https://example.com/custom.jpg");
  });

  test("renders consistent icon fallback when category has no image or mapping", () => {
    const unmappedCat = [
      {
        id: "cat-unmapped",
        name: "Unmapped Specialty",
        slug: "unmapped-specialty",
        icon: "🔬",
        description: "Special laboratory equipment.",
      },
    ];

    render(<CategoryTiles categories={unmappedCat} />);
    expect(screen.getByText("Unmapped Specialty")).toBeInTheDocument();
    expect(screen.getAllByText("🔬").length).toBe(2);
  });

  test("triggers onSelectCategory when a tile is clicked or activated via keyboard", () => {
    const handleSelect = jest.fn();
    render(
      <CategoryTiles
        categories={mockCategories}
        onSelectCategory={handleSelect}
      />
    );

    const fastenerTile = screen.getByTitle("Explore Fasteners");
    fireEvent.click(fastenerTile);
    expect(handleSelect).toHaveBeenCalledWith("fasteners", "all");

    // Keyboard activation (Enter and Space)
    fireEvent.keyDown(fastenerTile, { key: "Enter" });
    expect(handleSelect).toHaveBeenCalledWith("fasteners", "all");

    fireEvent.keyDown(fastenerTile, { key: " " });
    expect(handleSelect).toHaveBeenCalledWith("fasteners", "all");
  });

  test("triggers onSelectCategory('all') when View All Categories is clicked", () => {
    const handleSelect = jest.fn();
    render(
      <CategoryTiles
        categories={mockCategories}
        onSelectCategory={handleSelect}
      />
    );

    const viewAllBtn = screen.getByRole("button", { name: "View All Categories →" });
    fireEvent.click(viewAllBtn);
    expect(handleSelect).toHaveBeenCalledWith("all");
  });

  test("renders loading skeleton state when loading is true", () => {
    render(<CategoryTiles categories={[]} loading={true} />);
    expect(screen.getByRole("status", { name: "Loading categories" })).toBeInTheDocument();
  });

  test("renders error alert and calls onRetry when retry button clicked", () => {
    const handleRetry = jest.fn();
    render(
      <CategoryTiles
        categories={[]}
        error="Network timeout loading categories"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network timeout loading categories")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "↻ Retry" });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalled();
  });

  test("keeps tile count strictly data-driven", () => {
    const twoCategories = [mockCategories[0], mockCategories[1]];
    render(<CategoryTiles categories={twoCategories} />);

    expect(screen.queryByText("Custom Hardware")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Explore/i }).length).toBe(2);
  });
});
