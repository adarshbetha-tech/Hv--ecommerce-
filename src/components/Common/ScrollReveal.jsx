import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Hook to safely detect prefers-reduced-motion across browsers, SSR, and Jest environments.
 */
export function useSafeReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq) {
        setPrefersReduced(Boolean(mq.matches));
        const handler = (e) => setPrefersReduced(Boolean(e.matches));
        if (typeof mq.addEventListener === "function") {
          mq.addEventListener("change", handler);
          return () => mq.removeEventListener("change", handler);
        } else if (typeof mq.addListener === "function") {
          mq.addListener(handler);
          return () => mq.removeListener(handler);
        }
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  return prefersReduced;
}

/**
 * VERTEX Consistent Scroll Reveal Component
 * 
 * Reveals elements with a refined opacity fade and subtle vertical translation
 * as they scroll into view.
 * 
 * Features:
 * - Powered by Framer Motion viewport intersection (zero window scroll listeners)
 * - Single-trigger reveal by default (once: true)
 * - Restrained duration (350–550ms) and natural stagger (50–90ms)
 * - Preserves content visibility when JS is restricted or during automated tests
 * - Strictly respects prefers-reduced-motion
 * - Isolated from inner interactive transformations (e.g., 3D tilt)
 */
export default function ScrollReveal({
  children,
  className = "",
  staggerIndex = 0,
  staggerDelay = 0.065,
  duration = 0.45,
  yOffset = 18,
  scaleFrom = 0.99,
  as = "div",
  style = {},
  disabled = false,
  once = true,
  amount = 0.08,
  margin = "0px 0px -30px 0px",
  ...props
}) {
  const prefersReducedMotion = useSafeReducedMotion();
  const hasObserver = typeof window !== "undefined" && typeof window.IntersectionObserver !== "undefined";

  // If reduced motion is requested, disabled, or IntersectionObserver is unavailable,
  // render immediately and visibly without motion wrapper
  if (prefersReducedMotion || disabled || !hasObserver) {
    const Component = as;
    return (
      <Component
        className={`vtx-reveal-wrap is-revealed ${className}`}
        style={style}
        {...props}
      >
        {children}
      </Component>
    );
  }

  const MotionComponent = motion[as] || motion.div;
  // Cap stagger delay so cards in long collections never wait excessively
  const delay = Math.min((staggerIndex % 6) * staggerDelay, 0.35);

  return (
    <MotionComponent
      className={`vtx-reveal-wrap ${className}`}
      initial={{ opacity: 0, y: yOffset, scale: scaleFrom }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount, margin }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={style}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
