import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { requireAdminUser } from "../../utils/authHelper";
import { assertAdminCapability } from "../../utils/adminCapabilities";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { parseAdminDashboardQuery } from "@/lib/validators/admin-dashboard";
import { getAdminDashboard } from "@/server/services/admin-dashboard.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAdminUser();
    assertAdminCapability(
      admin,
      "USER_MANAGEMENT",
      t(
        "لا تملك صلاحية عرض لوحة الإدارة",
        "You do not have permission to view the admin dashboard",
      ),
    );

    const query = parseAdminDashboardQuery(req.nextUrl.searchParams);
    const response = await getAdminDashboard(query);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            error.issues[0]?.message ?? "Invalid request",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    return handleApiError(error, req);
  }
}
