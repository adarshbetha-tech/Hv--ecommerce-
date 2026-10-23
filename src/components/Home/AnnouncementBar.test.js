import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AnnouncementBar from "./AnnouncementBar";

describe("AnnouncementBar Component", () => {
  const customPromotions = [
    {
      id: "p1",
      code: "TEST5",
      highlight: "5% Off Test Promo",
      subtext: "Free shipping over 500",
      tag: "DEAL",
    },
    {
      id: "p2",
      code: "TEST10",
      highlight: "10% Off Test Promo",
      subtext: "Free shipping over 1000",
      tag: "SUPER DEAL",
    },
  ];

  test("renders the active promotion with badge and text", () => {
    render(<AnnouncementBar promotions={customPromotions} />);
    expect(screen.getByText("DEAL")).toBeInTheDocument();
    expect(screen.getByText("5% Off Test Promo")).toBeInTheDocument();
    expect(screen.getByText(/Free shipping over 500/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy discount code TEST5/i })).toBeInTheDocument();
  });

  test("clicking next arrow cycles to the next promotion", () => {
    render(<AnnouncementBar promotions={customPromotions} />);
    const nextBtn = screen.getByRole("button", { name: /Next promotional message/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText("SUPER DEAL")).toBeInTheDocument();
    expect(screen.getByText("10% Off Test Promo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy discount code TEST10/i })).toBeInTheDocument();
  });

  test("clicking prev arrow cycles backward", () => {
    render(<AnnouncementBar promotions={customPromotions} />);
    const prevBtn = screen.getByRole("button", { name: /Previous promotional message/i });
    fireEvent.click(prevBtn);

    // Cycles to last item
    expect(screen.getByText("SUPER DEAL")).toBeInTheDocument();
    expect(screen.getByText("10% Off Test Promo")).toBeInTheDocument();
  });

  test("clicking copy code button provides copy confirmation", async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<AnnouncementBar promotions={customPromotions} />);
    const copyBtn = screen.getByRole("button", { name: /Copy discount code TEST5/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("TEST5");
  });

  test("pauses rotation on mouseEnter and resumes on mouseLeave", () => {
    jest.useFakeTimers();
    render(<AnnouncementBar promotions={customPromotions} />);

    const bar = screen.getByRole("region", { name: /Promotions and Special Offers/i });
    fireEvent.mouseEnter(bar);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // Should still be on first promotion because it's paused
    expect(screen.getByText("5% Off Test Promo")).toBeInTheDocument();

    fireEvent.mouseLeave(bar);
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should have advanced
    expect(screen.getByText("10% Off Test Promo")).toBeInTheDocument();
    jest.useRealTimers();
  });
});
