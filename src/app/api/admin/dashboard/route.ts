import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { requireAdminUser } from "../../utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { parseAdminDashboardQuery } from "@/lib/validators/admin-dashboard";
import { getAdminDashboard } from "@/server/services/admin-dashboard.service";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAdminUser();

    const query = parseAdminDashboardQuery(req.nextUrl.searchParams);
    const response = await getAdminDashboard(query);

    return NextResponse.json(response, { status: 200 });
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
