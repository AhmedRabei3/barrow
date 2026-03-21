import { NextRequest } from "next/server";
import { authHelper } from "@/app/api/utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    /* التحقق من الـ WebSocket upgrade header */
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response(
        t("مطلوب Upgrade: websocket", "Expected Upgrade: websocket"),
        { status: 426 },
      );
    }

    const user = await authHelper();
    if (!user?.id) {
      return new Response(t("غير مصرح", "Unauthorized"), { status: 401 });
    }

    /* للحصول على Next.js للعمل مع WebSocket، سنستخدم raw request */
    const upgradeHeader = req.headers.get("upgrade");

    if (upgradeHeader?.toLowerCase() !== "websocket") {
      return new Response(t("الطلب ليس WebSocket", "Not a WebSocket request"), {
        status: 400,
      });
    }

    /* WebSocket upgrade سيتم معالجته من خلال middleware أو edge runtime */
    /* الآن سنعيد إشارة فقط أننا نقبل الاتصال */

    return new Response(
      t("تم بدء ترقية اتصال WebSocket", "WebSocket upgrade initiated"),
      {
        status: 101,
        headers: {
          Upgrade: "websocket",
        },
      },
    );
  } catch (error) {
    console.error("❌ WebSocket error:", error);
    return new Response(t("خطأ داخلي في الخادم", "Internal Server Error"), {
      status: 500,
    });
  }
}
