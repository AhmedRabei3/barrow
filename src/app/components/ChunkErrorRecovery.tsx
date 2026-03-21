"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_GUARD_KEY = "barrow-chunk-reload-once";

const CHUNK_ERROR_SIGNATURES = [
  "ChunkLoadError",
  "Loading chunk",
  "Failed to fetch dynamically imported module",
];

const hasChunkSignature = (message: string) =>
  CHUNK_ERROR_SIGNATURES.some((signature) => message.includes(signature));

const isChunkLoadError = (value: unknown) => {
  if (typeof value === "string") {
    return hasChunkSignature(value);
  }

  if (value instanceof Error) {
    return hasChunkSignature(value.message || "");
  }

  if (typeof value === "object" && value !== null) {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return hasChunkSignature(maybeMessage);
    }
  }

  return false;
};

const triggerSingleReload = () => {
  if (typeof window === "undefined") return;

  const alreadyReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
  if (alreadyReloaded === "1") return;

  window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
  window.location.reload();
};

const ChunkErrorRecovery = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resetGuard = window.setTimeout(() => {
      window.sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
    }, 15000);

    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        triggerSingleReload();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        triggerSingleReload();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.clearTimeout(resetGuard);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
};

export default ChunkErrorRecovery;
