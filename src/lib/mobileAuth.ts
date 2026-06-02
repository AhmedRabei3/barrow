// src/lib/mobileAuth.ts
// التحقق من Supabase JWT القادم من تطبيق الجوال، ومزامنة المستخدم مع Prisma
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

let supabaseAdmin: ReturnType<typeof createClient> | null | undefined =
  undefined;

function resolveSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return { supabaseUrl, supabaseKey };
}

function getSupabaseAdminClient() {
  if (supabaseAdmin !== undefined) {
    return supabaseAdmin;
  }

  const config = resolveSupabaseConfig();
  if (!config) {
    supabaseAdmin = null;
    return supabaseAdmin;
  }

  supabaseAdmin = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return supabaseAdmin;
}

export type MobileAuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403 | 500; message: string };

/**
 * يستخرج Bearer token من الهيدر ويتحقق منه عبر Supabase،
 * ثم يبحث عن المستخدم في قاعدة Prisma (أو ينشئه للمرة الأولى).
 */
export async function verifyMobileToken(
  headers: Headers | { get: (key: string) => string | null },
): Promise<MobileAuthResult> {
  const supabaseClient = getSupabaseAdminClient();
  if (!supabaseClient) {
    return {
      ok: false,
      status: 500,
      message: "Supabase auth bridge is not configured",
    };
  }

  // 1. استخراج التوكن
  const authHeader =
    headers.get("authorization") ?? headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Authorization header missing" };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, message: "Token is empty" };
  }

  // 2. التحقق عبر Supabase (network call — يضمن أن التوكن غير منتهٍ أو ملغى)
  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }

  const supaUser = data.user;
  const email = supaUser.email;
  if (!email) {
    return { ok: false, status: 403, message: "Token has no associated email" };
  }

  // 3. البحث عن المستخدم في Prisma أو إنشاؤه (upsert للمستخدمين الجدد من الجوال)
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name:
          (supaUser.user_metadata?.full_name as string | undefined) ??
          (supaUser.user_metadata?.name as string | undefined) ??
          email.split("@")[0],
        image:
          (supaUser.user_metadata?.avatar_url as string | undefined) ?? null,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    return { ok: true, user };
  } catch {
    return { ok: false, status: 500, message: "Database error" };
  }
}
