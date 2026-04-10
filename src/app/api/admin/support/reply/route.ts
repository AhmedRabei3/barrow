import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { adminReplyToSupportTicketSchema } from "@/lib/validators/support";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAdminUser();
    const input = adminReplyToSupportTicketSchema.parse(await req.json());

    await supportTicketService.replyAsAdmin(
      admin.id,
      input.ticketId,
      input.recipientUserId,
      input.subject,
      input.message,
      isArabic,
    );

    return NextResponse.json({
      success: true,
      message: t("تم إرسال الرد بنجاح", "Reply sent successfully"),
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
