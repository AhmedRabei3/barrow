"use client";
import { useEffect, useState } from "react";

export default function useScrollDirection() {
  const [scrollDir, setScrollDir] = useState<"up" | "down">("up");

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    const threshold = 8;

    const updateScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastScrollY;

        if (Math.abs(delta) >= threshold) {
          setScrollDir(delta > 0 ? "down" : "up");
          lastScrollY = current;
        }

        ticking = false;
      });
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  return scrollDir;
}
