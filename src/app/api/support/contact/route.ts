import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { createSupportTicketSchema } from "@/lib/validators/support";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function POST(req: NextRequest) {
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

    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "support:contact:post",
      userId: session.user.id,
      limit: 8,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات الإرسال، يرجى المحاولة بعد قليل",
        "Too many support requests. Please try again shortly.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const input = createSupportTicketSchema.parse(await req.json());

    await supportTicketService.createTicket(
      session.user.id,
      input.subject,
      input.message,
      isArabic,
    );

    return NextResponse.json({
      success: true,
      message: t(
        "تم استلام رسالتك وسيتم الرد عليك قريباً",
        "Your message has been received. We will reply soon.",
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
