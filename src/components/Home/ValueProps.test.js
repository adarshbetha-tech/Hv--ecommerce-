import React from "react";
import { render, screen } from "@testing-library/react";
import ValueProps from "./ValueProps";

describe("ValueProps Component", () => {
  test("renders all 4 engineering value proposition cards", () => {
    render(<ValueProps />);

    expect(screen.getByRole("region", { name: "Why choose VERTEX" })).toBeInTheDocument();
    expect(screen.getByText("ENGINEERED FOR BUILDERS")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why Engineering Teams Choose VERTEX" })).toBeInTheDocument();

    expect(screen.getByText("Documented Technical Tolerances")).toBeInTheDocument();
    expect(screen.getByText("No Rigid Minimum Orders")).toBeInTheDocument();
    expect(screen.getByText("Pan-India Express Logistics")).toBeInTheDocument();
    expect(screen.getByText("GST Invoicing & Volume Tiers")).toBeInTheDocument();

    expect(screen.getByText("PRECISION SPECS")).toBeInTheDocument();
    expect(screen.getByText("ZERO MOQ")).toBeInTheDocument();
    expect(screen.getByText("SPEED & VISIBILITY")).toBeInTheDocument();
    expect(screen.getByText("ENTERPRISE B2B")).toBeInTheDocument();
  });
});
