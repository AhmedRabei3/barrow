import { NextRequest, NextResponse } from "next/server";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

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

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "RealEstateApp/1.0",
        "Accept-Language": locale,
        From: "realestate.contact.app@gmail.com", // ضع إيميل حقيقي هنا
      },
      cache: "no-store",
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

    return NextResponse.json({
      success: true,
      display_name: data.display_name || "",
      address: {
        city: addr.city || addr.town || addr.village || "",
        state: addr.state || "",
        country: addr.country || "",
        road: addr.road || "",
        suburb: addr.suburb || "",
      },
    });
  } catch (e) {
    console.error(e);
    const isArabic = resolveIsArabicFromRequest(req);
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage("Server Error", isArabic),
      },
      { status: 500 },
    );
  }
}
