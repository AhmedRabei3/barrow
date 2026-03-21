import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { ensurePaymentSettings } from "@/lib/paymentSettings";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

type ShamCashWebhookPayload = {
  id?: string;
  transactionId?: string;
  reference?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  email?: string;
  note?: string;
  memo?: string;
  description?: string;
};

const getSignatureFromRequest = (req: NextRequest): string => {
  return (
    req.headers.get("x-shamcash-signature") ||
    req.headers.get("x-signature") ||
    ""
  ).trim();
};

const getTokenFromRequest = (req: NextRequest): string => {
  const directToken = req.headers.get("x-shamcash-token")?.trim();
  if (directToken) {
    return directToken;
  }

  const authHeader = req.headers.get("authorization")?.trim() || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
};

const verifyWebhookAuth = (req: NextRequest, rawBody: string): boolean => {
  const secret = process.env.SHAMCASH_WEBHOOK_SECRET?.trim();
  if (secret) {
    const signature = getSignatureFromRequest(req);
    if (!signature) {
      return false;
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  }

  const token = process.env.SHAMCASH_WEBHOOK_TOKEN?.trim();
  if (token) {
    return getTokenFromRequest(req) === token;
  }

  return false;
};

const extractEmail = (payload: ShamCashWebhookPayload): string => {
  const explicitEmail = `${payload.email || ""}`.trim().toLowerCase();
  if (explicitEmail.includes("@")) {
    return explicitEmail;
  }

  const noteText = `${payload.note || payload.memo || payload.description || ""}`;
  const match = noteText
    .toLowerCase()
    .match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);

  return match?.[0]?.trim().toLowerCase() || "";
};

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    const rawBody = await req.text();

    if (!verifyWebhookAuth(req, rawBody)) {
      return NextResponse.json(
        { message: localizeErrorMessage("Invalid webhook auth", isArabic) },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody) as ShamCashWebhookPayload;
    const externalId = `${
      payload.transactionId || payload.reference || payload.id || ""
    }`.trim();

    if (!externalId) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Missing transaction reference",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const normalizedStatus = `${payload.status || ""}`.trim().toUpperCase();
    if (!["SUCCESS", "PAID", "COMPLETED"].includes(normalizedStatus)) {
      return NextResponse.json(
        { received: true, ignored: true },
        { status: 200 },
      );
    }

    const rawAmount = Number(payload.amount);
    const receivedAmount =
      Number.isFinite(rawAmount) && rawAmount > 0
        ? Number(rawAmount.toFixed(2))
        : 0;

    if (!receivedAmount) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid transaction amount", isArabic),
        },
        { status: 400 },
      );
    }

    const currency =
      `${payload.currency || "USD"}`.trim().toUpperCase() || "USD";
    const payerEmail = extractEmail(payload);

    try {
      await prisma.shamCashWebhookEvent.create({
        data: {
          externalId,
          amount: receivedAmount,
          currency,
          status: normalizedStatus,
          payerEmail: payerEmail || null,
          rawPayload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { success: true, duplicated: true },
          { status: 200 },
        );
      }

      throw error;
    }

    if (!payerEmail) {
      await prisma.shamCashWebhookEvent.update({
        where: { externalId },
        data: { status: "REJECTED_MISSING_EMAIL" },
      });

      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Transfer note must include the account email",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: payerEmail,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!user) {
      await prisma.shamCashWebhookEvent.update({
        where: { externalId },
        data: { status: "REJECTED_USER_NOT_FOUND" },
      });

      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "User not found for transfer email",
            isArabic,
          ),
        },
        { status: 404 },
      );
    }

    const settings = await ensurePaymentSettings();
    const requiredAmount = settings.subscriptionMonthlyPrice;

    if (receivedAmount < requiredAmount) {
      await prisma.shamCashWebhookEvent.update({
        where: { externalId },
        data: {
          userId: user.id,
          status: "REJECTED_UNDERPAID",
        },
      });

      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Transferred amount is below subscription price",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    let paymentId = "";

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const createdPayment = await tx.payment.create({
          data: {
            payerId: user.id,
            amount: requiredAmount,
            currency: "USD",
            method: "SHAMCASH",
            status: "COMPLETED",
          },
          select: {
            id: true,
          },
        });

        await applySubscriptionActivation({
          tx,
          userId: user.id,
          subscriptionAmount: requiredAmount,
          sourceLabel: "ShamCash QR",
        });

        return createdPayment;
      });

      paymentId = payment.id;
    } catch (error) {
      const failureMessage =
        error instanceof Error
          ? error.message
          : "Failed to activate subscription";
      const isRenewalWindowError =
        failureMessage === "Renewal is only allowed during the grace period";

      await prisma.shamCashWebhookEvent.update({
        where: { externalId },
        data: {
          userId: user.id,
          status: isRenewalWindowError
            ? "REJECTED_RENEWAL_WINDOW"
            : "PROCESSING_FAILED",
        },
      });

      return NextResponse.json(
        { message: localizeErrorMessage(failureMessage, isArabic) },
        { status: isRenewalWindowError ? 409 : 500 },
      );
    }

    await prisma.shamCashWebhookEvent.update({
      where: { externalId },
      data: {
        userId: user.id,
        paymentId,
        status: "PROCESSED",
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process ShamCash webhook";

    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
