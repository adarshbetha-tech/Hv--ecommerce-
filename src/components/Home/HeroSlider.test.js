import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import HeroSlider from "./HeroSlider";

describe("HeroSlider Component", () => {
  const onExplore = jest.fn();
  const onNavigateCat = jest.fn();
  const onNavigateCatalog = jest.fn();
  const onRequestQuote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders initial slide with title, subtitle, perks, and CTA buttons", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    expect(screen.getByText(/Precision Electronics & Hardware Fasteners/i)).toBeInTheDocument();
    expect(screen.getByText(/Built for Engineering & B2B Supply/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explore Products ↓/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shop Electronics →/i })).toBeInTheDocument();
    expect(screen.getByText(/✓ Factory Verified Sourcing/i)).toBeInTheDocument();
  });

  test("clicking next arrow advances to the next slide", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const nextBtn = screen.getByRole("button", { name: /Next slide/i });
    fireEvent.click(nextBtn);

    // Slide 2: Fasteners
    expect(screen.getByText(/SS304 & Metric Hardware Screws/i)).toBeInTheDocument();
    expect(screen.getByText(/Flat, Phillips, Hex & Socket Heads/i)).toBeInTheDocument();
  });

  test("clicking previous arrow cycles backwards", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const prevBtn = screen.getByRole("button", { name: /Previous slide/i });
    fireEvent.click(prevBtn);

    // Cycles to last slide: Commercial Bulk
    expect(screen.getByText(/Volume Procurement & Custom Specifications/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request Commercial RFQ →/i })).toBeInTheDocument();
  });

  test("clicking dot indicator switches to that specific slide", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const dot3 = screen.getByRole("tab", { name: /Go to slide 3/i });
    fireEvent.click(dot3);

    // Slide 3: Robotics
    expect(screen.getByText(/Microcontroller Boards & DC Motor Drivers/i)).toBeInTheDocument();
  });

  test("clicking CTA buttons triggers appropriate callbacks", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const exploreBtn = screen.getByRole("button", { name: /Explore Products ↓/i });
    fireEvent.click(exploreBtn);
    expect(onExplore).toHaveBeenCalled();

    const shopElectronicsBtn = screen.getByRole("button", { name: /Shop Electronics →/i });
    fireEvent.click(shopElectronicsBtn);
    expect(onNavigateCat).toHaveBeenCalledWith("electronics");
  });

  test("keyboard ArrowRight and ArrowLeft changes slides", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const slider = screen.getByRole("region", { name: /Featured Engineering Products and Supply/i });
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    // Should advance to slide 2
    expect(screen.getByText(/SS304 & Metric Hardware Screws/i)).toBeInTheDocument();

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    // Should return to slide 1
    expect(screen.getByText(/Precision Electronics & Hardware Fasteners/i)).toBeInTheDocument();
  });

  test("touch swipe left advances slide and swipe right goes back", () => {
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const slider = screen.getByRole("region", { name: /Featured Engineering Products and Supply/i });

    // Swipe left (delta > 50)
    fireEvent.touchStart(slider, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(slider, { changedTouches: [{ clientX: 100 }] });

    expect(screen.getByText(/SS304 & Metric Hardware Screws/i)).toBeInTheDocument();

    // Swipe right (delta < -50)
    fireEvent.touchStart(slider, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(slider, { changedTouches: [{ clientX: 200 }] });

    expect(screen.getByText(/Precision Electronics & Hardware Fasteners/i)).toBeInTheDocument();
  });

  test("pauses rotation on mouseEnter and resumes on mouseLeave", () => {
    jest.useFakeTimers();
    render(
      <HeroSlider
        onExploreProducts={onExplore}
        onNavigateCategory={onNavigateCat}
        onNavigateCatalog={onNavigateCatalog}
        onRequestQuote={onRequestQuote}
      />
    );

    const slider = screen.getByRole("region", { name: /Featured Engineering Products and Supply/i });
    fireEvent.mouseEnter(slider);

    act(() => {
      jest.advanceTimersByTime(7000);
    });

    // Should still be on slide 1
    expect(screen.getByText(/Precision Electronics & Hardware Fasteners/i)).toBeInTheDocument();

    fireEvent.mouseLeave(slider);
    act(() => {
      jest.advanceTimersByTime(6500);
    });

    // Should advance
    expect(screen.getByText(/SS304 & Metric Hardware Screws/i)).toBeInTheDocument();
    jest.useRealTimers();
  });
});
