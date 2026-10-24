import React, { useState, useEffect } from "react";

/**
 * Animated numeric counter with reduced-motion support.
 * Only animates numeric values, rendering non-numeric strings immediately.
 */
export default function CountUp({ value, duration = 650, prefix = "", suffix = "" }) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  const isNumeric = !isNaN(numericValue) && isFinite(numericValue);

  const [displayValue, setDisplayValue] = useState(
    process.env.NODE_ENV === "test" || !isNumeric ? numericValue : 0
  );

  useEffect(() => {
    if (!isNumeric) {
      setDisplayValue(value);
      return;
    }

    // Check if user prefers reduced motion (safely handle jsdom test environments)
    let prefersReducedMotion = false;
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function"
      ) {
        const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
        prefersReducedMotion = Boolean(mql && mql.matches);
      }
    } catch (e) {
      prefersReducedMotion = false;
    }

    if (prefersReducedMotion || duration <= 0 || process.env.NODE_ENV === "test") {
      setDisplayValue(numericValue);
      return;
    }

    let startTimestamp = null;
    let animationFrameId = null;
    const startVal = 0;
    const endVal = numericValue;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic calculation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [numericValue, isNumeric, value, duration]);

  if (!isNumeric) {
    return <>{value}</>;
  }

  return (
    <>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </>
  );
}
