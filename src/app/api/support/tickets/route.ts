import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: t("غير مصرح", "Unauthorized") },
        { status: 401 },
      );
    }

    const response = await supportTicketService.listUserTickets(
      session.user.id,
    );
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, req);
  }
}
