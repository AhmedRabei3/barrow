import { NextRequest } from "next/server";
import { authHelper } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { realtimeBus } from "@/lib/realtimeBus";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

/**
 * @description Server-Sent Events for real-time notifications
 * يرسل الإشعارات الجديدة فوراً عند إضافتها
 */
export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const user = await authHelper();
    if (!user?.id) {
      return new Response(t("غير مصرح", "Unauthorized"), { status: 401 });
    }

    // إنشاء SSE stream
    const encoder = new TextEncoder();
    let isClosed = false;

    const readable = new ReadableStream({
      async start(controller) {
        // إرسال الإشعارات الحالية أولاً
        const currentNotifications = await prisma.notification.findMany({
          where: {
            userId: user.id,
            isRead: false,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            isRead: true,
            createdAt: true,
          },
        });

        currentNotifications.forEach((notif) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "initial",
                notification: notif,
              })}\n\n`,
            ),
          );
        });

        const handleNotification = (notification: {
          id: string;
          userId: string;
          title: string;
          message: string;
          type: string;
          createdAt: string;
          isRead: boolean;
        }) => {
          if (isClosed) return;
          if (notification.userId !== user.id) return;
          if (notification.isRead) return;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "new",
                notification: {
                  id: notification.id,
                  title: notification.title,
                  message: notification.message,
                  type: notification.type,
                  isRead: notification.isRead,
                  createdAt: notification.createdAt,
                },
              })}\n\n`,
            ),
          );
        };

        realtimeBus.on("notification", handleNotification);

        // إرسال heartbeat للحفاظ على الاتصال
        const heartbeatInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(heartbeatInterval);
            return;
          }
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 30000); // 30 ثانية

        req.signal.addEventListener("abort", () => {
          isClosed = true;
          realtimeBus.off("notification", handleNotification);
          clearInterval(heartbeatInterval);
          controller.close();
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("❌ SSE Error:", error);
    return new Response(t("خطأ داخلي في الخادم", "Internal Server Error"), {
      status: 500,
    });
  }
}
