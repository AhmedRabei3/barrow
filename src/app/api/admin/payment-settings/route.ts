import {
  passwordSchema,
  UpdatePaymentSettings,
  updatePaymentSettingsSchema,
} from "./validation";
import * as bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { requireOwnerUser } from "@/app/api/utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { prisma } from "@/lib/prisma";
import { imageOptional, normString, toNumber } from "../../utils/utils";
import { translateZodError } from "../../lib/errors/zodTranslator";
// دمج منطق تغيير كلمة المرور

/**--------------------------------------------------------------
 * @description Set admin password for payment settings
 * @access private
 * @route ~/api/admin/payment-settings
 *-------------------------------------------------------------*/
export async function POST(req: NextRequest) {
  // تحديد اللغة للرسائل
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  try {
    await requireOwnerUser();
    const json = await req.json();
    const parse = passwordSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          ok: false,
          message: t("كلمة المرور قصيرة جدًا", "Password too short"),
          errors: parse.error.flatten(),
        },
        { status: 400 },
      );
    }

    // التحقق إذا كانت كلمة المرور قد عُينت مسبقًا
    const existing = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
    });
    if (existing?.adminSettingsPassword) {
      return NextResponse.json(
        {
          ok: false,
          message: t("كلمة المرور تم تعيينها سابقًا", "Password already set"),
        },
        { status: 400 },
      );
    }

    // تهشير كلمة المرور وتخزينها
    const hash = await bcrypt.hash(parse.data.password, 10);
    if (existing) {
      await prisma.appPaymentSettings.update({
        where: { id: 1 },
        data: { adminSettingsPassword: hash },
      });
    } else {
      await prisma.appPaymentSettings.create({
        data: { adminSettingsPassword: hash },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error setting admin password:", error);
    return NextResponse.json(
      {
        ok: false,
        message: t("فشل في تعيين كلمة المرور", "Failed to set password"),
      },
      { status: 500 },
    );
  }
}

/**
 * @description Get payment settings
 * @access private
 * @route ~/api/admin/payment-settings
 */
export async function GET(req: NextRequest) {
  // تحديد اللغة للرسائل
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  try {
    await requireOwnerUser();
    // جلب إعدادات الدفع
    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
    });

    return NextResponse.json(
      {
        ok: true,
        hasPassword: Boolean(settings?.adminSettingsPassword),
        data: settings
          ? {
              id: settings.id,
              subscriptionMonthlyPrice: settings.subscriptionMonthlyPrice,
              featuredAdMonthlyPrice: settings.featuredAdMonthlyPrice,
              url: settings.url,
              publicId: settings.publicId,
              paymentResetEmail: settings.paymentResetEmail,
              ownerProfitWalletCode: settings.ownerProfitWalletCode,
              createdAt: settings.createdAt,
              updatedAt: settings.updatedAt,
            }
          : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error fetching payment settings:", error);
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "فشل في تحميل إعدادات الدفع",
          "Failed to load payment settings",
        ),
      },
      { status: 401 },
    );
  }
}
/**--------------------------------------------
 * @description Update payment settings
 * @access private
 * @route ~/api/admin/payment-settings
 ---------------------------------------------*/
export async function PUT(req: NextRequest) {
  // التحقق من الصلاحيات
  await requireOwnerUser();
  // تحديد اللغة للرسائل
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  try {
    // استقبال البيانات من formData
    const formData = await req.formData();
    const rowData = {
      subscriptionMonthlyPrice: toNumber(
        formData.get("subscriptionMonthlyPrice"),
      ),
      featuredAdMonthlyPrice: toNumber(formData.get("featuredAdMonthlyPrice")),
      adminSettingsPassword: normString(formData.get("adminSettingsPassword")),
      paymentResetEmail: normString(formData.get("paymentResetEmail")),
      ownerProfitWalletCode: normString(formData.get("ownerProfitWalletCode")),
    };
    // التحقق من صحة البيانات
    const parsed = updatePaymentSettingsSchema.safeParse(rowData);
    if (!parsed.success) {
      const { message } = translateZodError(parsed.error);
      return NextResponse.json(
        { ok: false, message, errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    // رفع الصورة إن وجدت
    const uploadedImages = await imageOptional({
      formData,
      folder: "paymentSettings",
    });
    // تجهيز بيانات التحديث
    const updateData: UpdatePaymentSettings = {
      subscriptionMonthlyPrice: parsed.data.subscriptionMonthlyPrice,
      featuredAdMonthlyPrice: parsed.data.featuredAdMonthlyPrice,
    };
    // إضافة الصورة إذا تم رفعها
    if (uploadedImages[0]) {
      updateData.url = uploadedImages[0].secure_url;
      updateData.publicId = uploadedImages[0].public_id;
    }
    if (parsed.data.paymentResetEmail !== undefined) {
      updateData.paymentResetEmail = parsed.data.paymentResetEmail;
    }
    if (parsed.data.ownerProfitWalletCode !== undefined) {
      updateData.ownerProfitWalletCode = parsed.data.ownerProfitWalletCode;
    }
    // تهشير كلمة المرور الجديدة إذا أُرسلت وكانت غير فارغة
    if (parsed.data.adminSettingsPassword) {
      updateData.adminSettingsPassword = await bcrypt.hash(
        parsed.data.adminSettingsPassword,
        10,
      );
    }
    // تحديث الإعدادات
    const updatedData = await prisma.appPaymentSettings.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        subscriptionMonthlyPrice:
          parsed.data.subscriptionMonthlyPrice ?? undefined,
        featuredAdMonthlyPrice: parsed.data.featuredAdMonthlyPrice ?? undefined,
        url: updateData.url,
        publicId: updateData.publicId,
        adminSettingsPassword: updateData.adminSettingsPassword,
        paymentResetEmail: updateData.paymentResetEmail,
        ownerProfitWalletCode: updateData.ownerProfitWalletCode,
      },
    });
    return NextResponse.json({ ok: true, data: updatedData });
  } catch (er) {
    console.error("❌ Error updating payment settings:", er);
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "فشل في تحديث إعدادات الدفع",
          "Failed to update payment settings",
        ),
      },
      { status: 500 },
    );
  }
}
