import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { broadcastSupportSchema } from "@/lib/validators/support";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireAdminUser();
    const input = broadcastSupportSchema.parse(await req.json());
    const recipients = await supportTicketService.broadcast(
      input.audience,
      input.subject,
      input.message,
    );

    return NextResponse.json({
      success: true,
      recipients,
      message: t(
        `تم إرسال الإشعار الجماعي إلى ${recipients} مستخدم.`,
        `Broadcast notification sent to ${recipients} users.`,
      ),
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
