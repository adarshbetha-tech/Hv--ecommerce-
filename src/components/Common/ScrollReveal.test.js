import React from "react";
import { render, screen } from "@testing-library/react";
import ScrollReveal from "./ScrollReveal";

describe("ScrollReveal Component", () => {
  test("renders children successfully", () => {
    render(
      <ScrollReveal>
        <div data-testid="child-element">Revealed Content</div>
      </ScrollReveal>
    );

    expect(screen.getByTestId("child-element")).toBeInTheDocument();
    expect(screen.getByText("Revealed Content")).toBeInTheDocument();
  });

  test("renders disabled state without motion wrapper when disabled is true", () => {
    render(
      <ScrollReveal disabled={true} className="custom-class">
        <span>Instant Content</span>
      </ScrollReveal>
    );

    const el = screen.getByText("Instant Content").closest(".vtx-reveal-wrap");
    expect(el).toHaveClass("is-revealed");
    expect(el).toHaveClass("custom-class");
  });

  test("supports rendering as a custom element tag", () => {
    render(
      <ScrollReveal as="section" disabled={true} data-testid="custom-section">
        <p>Section Content</p>
      </ScrollReveal>
    );

    const section = screen.getByTestId("custom-section");
    expect(section.tagName.toLowerCase()).toBe("section");
  });

  test("renders motion wrapper when IntersectionObserver is available", () => {
    window.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    render(
      <ScrollReveal staggerIndex={2} data-testid="motion-reveal">
        <span>Animated Element</span>
      </ScrollReveal>
    );

    const el = screen.getByTestId("motion-reveal");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("vtx-reveal-wrap");

    delete window.IntersectionObserver;
  });
});
