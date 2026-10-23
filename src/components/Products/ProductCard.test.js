import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductCard from "./ProductCard";

const mockProduct = {
  id: "prod-1",
  slug: "arduino-uno-r3",
  name: "Arduino Uno R3 Microcontroller",
  price: 1250,
  mrp: 1450,
  tag: "15% OFF",
  brand: "Arduino",
  sku: "ELEC-ARD-UNO-R3",
  inStock: true,
  category: { slug: "electronics", name: "Electronics" },
  subcategory: { slug: "microcontrollers", name: "Development Boards" },
  specs: {
    "Microcontroller": "ATmega328P",
    "Operating Voltage": "5V",
  },
  variants: [
    {
      sku: "ELEC-ARD-UNO-R3",
      packSize: "1 Unit",
      stockQuantity: 25,
      dimensions: "68.6mm x 53.4mm",
    },
  ],
};

const mockQuoteProduct = {
  id: "prod-2",
  slug: "ss304-hex-bolt-m8",
  name: "SS304 Metric Hex Bolt M8 x 40",
  price: null,
  mrp: null,
  tag: "Marine Grade",
  brand: "HV VERTEX",
  sku: "FAST-HEX-M8-40",
  inStock: true,
  category: { slug: "fasteners", name: "Fasteners" },
  specs: {
    "Drive Type": "Hex (Allen)",
    "Head Type": "Hex Socket",
    "Material Grade": "SS304",
    "Standard": "DIN 912 / ISO 4762",
  },
};

describe("VERTEX ProductCard Component with 3D Tilt Suite", () => {
  const onAddToCart = jest.fn();
  const onViewDetails = jest.fn();
  const onRequestQuote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Renders product title, price, SKU, brand, and specifications", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    expect(screen.getByText("Arduino Uno R3 Microcontroller")).toBeInTheDocument();
    expect(screen.getByText("₹1,250")).toBeInTheDocument();
    expect(screen.getByText("₹1,450")).toBeInTheDocument();
    expect(screen.getByText("ELEC-ARD-UNO-R3")).toBeInTheDocument();
    expect(screen.getByText("Arduino")).toBeInTheDocument();
    expect(screen.getByText("15% OFF")).toBeInTheDocument();
    expect(screen.getByText(/In Stock/i)).toBeInTheDocument();
  });

  test("2. Pointer movement triggers interactive 3D tilt state and neutralizes on pointer leave", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const card = screen.getByTestId("product-card-prod-1");
    expect(card).toBeInTheDocument();

    // Mock getBoundingClientRect
    jest.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 100,
      width: 250,
      height: 350,
      right: 350,
      bottom: 450,
    });

    // Simulate mouse move over top-left quadrant
    fireEvent.pointerMove(card, {
      clientX: 150,
      clientY: 150,
      pointerType: "mouse",
    });

    expect(card).toHaveClass("is-tilting");

    // Pointer leave returns to neutral
    fireEvent.pointerLeave(card);
    expect(card).not.toHaveClass("is-tilting");
  });

  test("3. Touch events do not trigger 3D tilt to preserve native mobile touch scrolling", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const card = screen.getByTestId("product-card-prod-1");

    // Touch event with pointerType "touch"
    fireEvent.pointerMove(card, {
      clientX: 150,
      clientY: 150,
      pointerType: "touch",
    });

    // Should NOT have is-tilting
    expect(card).not.toHaveClass("is-tilting");
  });

  test("4. In list view mode (viewMode='list'), 3D tilt is bypassed", () => {
    render(
      <ProductCard
        product={mockProduct}
        viewMode="list"
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const card = screen.getByTestId("product-card-prod-1");
    expect(card).toHaveClass("product-card-list-mode");

    fireEvent.pointerMove(card, {
      clientX: 150,
      clientY: 150,
      pointerType: "mouse",
    });

    expect(card).not.toHaveClass("is-tilting");
  });

  test("5. Clicking Add to Cart button invokes onAddToCart handler with product and primary variant", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const addBtn = screen.getByTestId("add-to-cart-prod-1");
    fireEvent.click(addBtn);

    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct, mockProduct.variants[0]);
  });

  test("6. Clicking product title or thumbnail invokes onViewDetails handler", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const titleEl = screen.getByText("Arduino Uno R3 Microcontroller");
    fireEvent.click(titleEl);

    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(onViewDetails).toHaveBeenCalledWith(mockProduct);
  });

  test("7. Unpriced products render 'Quote on Request' and clicking primary Add to Cart adds item as quote-required", () => {
    render(
      <ProductCard
        product={mockQuoteProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    expect(screen.getByText("Quote on Request")).toBeInTheDocument();
    expect(screen.getByText(/Commercial \/ Volume Sourcing/i)).toBeInTheDocument();

    const addBtn = screen.getByTestId("add-to-cart-prod-2");
    expect(addBtn).toHaveTextContent(/Add to Cart/i);

    fireEvent.click(addBtn);
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart).toHaveBeenCalledWith(mockQuoteProduct, undefined);
  });

  test("8. Clicking Wishlist button toggles saved status", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const wishlistBtn = screen.getByLabelText(/Add Arduino Uno R3 Microcontroller to wishlist/i);
    expect(wishlistBtn).toBeInTheDocument();

    fireEvent.click(wishlistBtn);

    // After click, aria-label switches to remove
    expect(screen.getByLabelText(/Remove Arduino Uno R3 Microcontroller from wishlist/i)).toBeInTheDocument();
  });

  test("9. Product card maintains is-revealed class and visible opacity across pointer interactions (never vanishes)", () => {
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onRequestQuote={onRequestQuote}
      />
    );

    const card = screen.getByTestId("product-card-prod-1");

    // Initially revealed
    expect(card).toHaveClass("is-revealed");
    expect(card.style.opacity).not.toBe("0");

    // On pointer enter & move
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    fireEvent.pointerMove(card, { clientX: 120, clientY: 120, pointerType: "mouse" });

    // Must still have is-revealed and is-tilting
    expect(card).toHaveClass("is-revealed");
    expect(card).toHaveClass("is-tilting");
    expect(card.style.opacity).not.toBe("0");

    // On pointer leave
    fireEvent.pointerLeave(card);

    // Must still retain is-revealed
    expect(card).toHaveClass("is-revealed");
    expect(card).not.toHaveClass("is-tilting");
    expect(card.style.opacity).not.toBe("0");
  });
});
