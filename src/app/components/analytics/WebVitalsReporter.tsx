"use client";

import { useReportWebVitals } from "next/web-vitals";

const METRIC_NAMES = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

const ENDPOINT = "/api/analytics/web-vitals";

const WebVitalsReporter = () => {
  useReportWebVitals((metric) => {
    if (!METRIC_NAMES.has(metric.name)) return;

    const payload = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      url: window.location.href,
      timestamp: Date.now(),
    };

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Ignore telemetry transport failures.
    });
  });

  return null;
};

export default WebVitalsReporter;
