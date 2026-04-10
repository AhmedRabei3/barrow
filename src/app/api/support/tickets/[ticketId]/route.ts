import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
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

    const { ticketId } = await context.params;

    const ticket = await supportTicketService.getUserTicketDetail(
      session.user.id,
      ticketId,
    );
    return NextResponse.json({ ticket });
  } catch (error) {
    return handleApiError(error, req);
  }
}
