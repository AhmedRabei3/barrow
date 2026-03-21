import { NextRequest } from "next/server";
import { verifyProfileEditTicket } from "@/lib/profileEditVerification";
import { Errors } from "../lib/errors/errors";

export function requireProfileEditTicket(
  req: NextRequest,
  params: { userId: string; email: string },
) {
  const ticket = req.headers.get("x-profile-edit-ticket");

  if (!ticket) {
    throw Errors.FORBIDDEN("يجب التحقق من البريد الإلكتروني قبل تعديل الحساب");
  }

  const isValid = verifyProfileEditTicket({
    ticket,
    userId: params.userId,
    email: params.email,
  });

  if (!isValid) {
    throw Errors.FORBIDDEN("رمز التحقق غير صالح أو منتهي");
  }
}
