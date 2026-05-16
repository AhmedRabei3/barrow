import { NextRequest, NextResponse } from "next/server";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { CACHE_HEADERS } from "@/app/api/lib/cacheHeaders";

// Simple in-memory cache: key = "lat,lon" → { data, expiresAt }
const geocodeCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getFromCache(key: string) {
  const entry = geocodeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geocodeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  // Limit cache size to 500 entries
  if (geocodeCache.size >= 500) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey !== undefined) geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(req: NextRequest) {
  try {
    const isArabic = resolveIsArabicFromRequest(req);
    const locale = isArabic ? "ar" : "en";
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        {
          success: false,
          message: localizeErrorMessage("lat & lon required", isArabic),
        },
        { status: 400 },
      );
    }

    const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": CACHE_HEADERS.publicLong,
          "x-cache": "memory-hit",
        },
      });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "RealEstateApp/1.0",
        "Accept-Language": locale,
        From: "realestate.contact.app@gmail.com", // ضع إيميل حقيقي هنا
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: localizeErrorMessage("Failed to fetch nominatim", isArabic),
          status: res.status,
        },
        { status: 500 },
      );
    }

    const data = await res.json();

    const addr = data.address || {};

    const responsePayload = {
      success: true,
      display_name: data.display_name || "",
      address: {
        city: addr.city || addr.town || addr.village || "",
        state: addr.state || "",
        country: addr.country || "",
        road: addr.road || "",
        suburb: addr.suburb || "",
      },
    };

    setCache(cacheKey, responsePayload);
    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": CACHE_HEADERS.publicLong,
      },
    });
  } catch (e) {
    const isArabic = resolveIsArabicFromRequest(req);
    const isTimeout =
      e instanceof Error &&
      (e.name === "TimeoutError" || e.name === "AbortError");
    if (!isTimeout) {
      console.error(e);
    }
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage(
          isTimeout ? "Geocode service timed out" : "Server Error",
          isArabic,
        ),
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
