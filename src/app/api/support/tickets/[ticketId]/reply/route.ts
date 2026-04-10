import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { replyToSupportTicketSchema } from "@/lib/validators/support";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function POST(
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
    const input = replyToSupportTicketSchema.parse(await req.json());

    await supportTicketService.replyToUserTicket(
      session.user.id,
      ticketId,
      input.message,
    );

    return NextResponse.json({
      success: true,
      message: t("تم إرسال رسالتك", "Your message has been sent"),
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
