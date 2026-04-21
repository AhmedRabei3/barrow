"use client";

import { Suspense, lazy, type ComponentType, useEffect, useState } from "react";

const ActualGlobalOverlays = lazy(async () => {
  const importedModule = await import("./ActualGlobalOverlays.lazy.js");

  return {
    default: importedModule.default as unknown as ComponentType,
  };
});

export default function GlobalOverlays() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window === "undefined") {
      return undefined;
    }

    const scheduleLoad = () => {
      if (!cancelled) {
        setShouldLoad(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(scheduleLoad, {
        timeout: 1500,
      });

      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleCallbackId);
      };
    }

    fallbackTimeoutId = setTimeout(scheduleLoad, 600);

    return () => {
      cancelled = true;
      if (fallbackTimeoutId !== null) {
        clearTimeout(fallbackTimeoutId);
      }
    };
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ActualGlobalOverlays />
    </Suspense>
  );
}
