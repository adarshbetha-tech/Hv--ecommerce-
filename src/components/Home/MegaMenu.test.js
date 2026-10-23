import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MegaMenu from "./MegaMenu";

describe("MegaMenu Component", () => {
  const mockCategories = [
    {
      id: "cat-fasteners",
      name: "Fasteners",
      slug: "fasteners",
      icon: "🔩",
      productsCount: 18,
      children: [
        { id: "sub-1", name: "Screws — Flat (Slotted)", slug: "screws-flat-slotted" },
        { id: "sub-2", name: "Screws — Hex (Allen)", slug: "screws-hex-allen" },
      ],
    },
    {
      id: "cat-electronics",
      name: "Electronic Products",
      slug: "electronics",
      icon: "🔌",
      productsCount: 12,
      children: [
        { id: "sub-3", name: "Microcontroller Boards", slug: "hvnex-microcontrollers" },
      ],
    },
  ];

  test("does not render when isOpen is false", () => {
    const { container } = render(
      <MegaMenu
        isOpen={false}
        categories={mockCategories}
        onNavigateCategory={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders categories and subcategory lists when isOpen is true", () => {
    render(
      <MegaMenu
        isOpen={true}
        categories={mockCategories}
        onNavigateCategory={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("Browse Engineering Hardware & Components")).toBeInTheDocument();
    expect(screen.getByText("Fasteners")).toBeInTheDocument();
    expect(screen.getByText("Screws — Flat (Slotted)")).toBeInTheDocument();
    expect(screen.getByText("Screws — Hex (Allen)")).toBeInTheDocument();
    expect(screen.getByText("Electronic Products")).toBeInTheDocument();
    expect(screen.getByText("Microcontroller Boards")).toBeInTheDocument();
  });

  test("clicking category header navigates to category with all subcategories", () => {
    const onNav = jest.fn();
    const onClose = jest.fn();
    render(
      <MegaMenu
        isOpen={true}
        categories={mockCategories}
        onNavigateCategory={onNav}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTitle("View all Fasteners"));
    expect(onNav).toHaveBeenCalledWith("fasteners", "all");
    expect(onClose).toHaveBeenCalled();
  });

  test("clicking subcategory button navigates to specific category and subcategory", () => {
    const onNav = jest.fn();
    const onClose = jest.fn();
    render(
      <MegaMenu
        isOpen={true}
        categories={mockCategories}
        onNavigateCategory={onNav}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Screws — Hex \(Allen\)/i }));
    expect(onNav).toHaveBeenCalledWith("fasteners", "screws-hex-allen");
    expect(onClose).toHaveBeenCalled();
  });

  test("clicking Request Custom RFQ triggers onRequestQuote", () => {
    const onRFQ = jest.fn();
    const onClose = jest.fn();
    render(
      <MegaMenu
        isOpen={true}
        categories={mockCategories}
        onNavigateCategory={jest.fn()}
        onRequestQuote={onRFQ}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Request Custom RFQ/i }));
    expect(onRFQ).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("pressing Escape key calls onClose", () => {
    const onClose = jest.fn();
    render(
      <MegaMenu
        isOpen={true}
        categories={mockCategories}
        onNavigateCategory={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("clicking close button calls onClose", () => {
    const onClose = jest.fn();
    render(
      <MegaMenu
        isOpen={true}
        categories={mockCategories}
        onNavigateCategory={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Close category menu/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
