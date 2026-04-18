"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useStaleResource } from "@/app/hooks/useStaleResource";

type SupportMessage = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

const SupportMessagesPanel = () => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<"ALL" | "ACTIVE">(
    "ACTIVE",
  );
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(
    null,
  );
  const cacheKey = `admin:support-messages:${isArabic ? "ar" : "en"}`;

  const fetchMessages = useCallback(async () => {
    const response = await fetch("/api/admin/support/messages", {
      headers: {
        "x-lang": isArabic ? "ar" : "en",
      },
      cache: "no-store",
    });

    const data = (await response.json()) as {
      messages?: SupportMessage[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(
        data?.message ||
          t("تعذر تحميل رسائل الدعم", "Failed to load support messages"),
      );
    }

    return data.messages || [];
  }, [isArabic, t]);

  const {
    data: messages,
    loading,
    isRefreshing,
    error,
    refetch,
    mutate,
  } = useStaleResource<SupportMessage[]>({
    cacheKey,
    fetcher: async () => fetchMessages(),
  });

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(
      error instanceof Error
        ? error.message
        : t("حدث خطأ غير متوقع", "Unexpected error"),
    );
  }, [error, t]);

  const allMessages = useMemo(() => messages ?? [], [messages]);

  const sortedMessages = useMemo(
    () =>
      [...allMessages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [allMessages],
  );

  const openReplyModal = (message: SupportMessage) => {
    setSelected(message);
    setReplySubject(`Re: ${message.subject}`);
    setReplyMessage("");
  };

  const closeReplyModal = () => {
    if (sendingReply) return;
    setSelected(null);
    setReplySubject("");
    setReplyMessage("");
  };

  const handleSendReply = async () => {
    if (!selected) return;

    const normalizedSubject = replySubject.trim();
    const normalizedMessage = replyMessage.trim();

    if (!normalizedSubject) {
      toast.error(t("يرجى إدخال عنوان الرد", "Please enter reply subject"));
      return;
    }

    if (!normalizedMessage) {
      toast.error(t("يرجى كتابة الرد", "Please write your reply"));
      return;
    }

    try {
      setSendingReply(true);
      const response = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          ticketId: selected.id,
          recipientUserId: selected.senderUserId,
          subject: normalizedSubject,
          message: normalizedMessage,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          data?.message || t("تعذر إرسال الرد", "Failed to send reply"),
        );
      }

      toast.success(
        data?.message || t("تم إرسال الرد بنجاح", "Reply sent successfully"),
      );

      mutate((prev = []) =>
        prev.map((item) =>
          item.id === selected.id ? { ...item, status: "CLOSED" } : item,
        ),
      );

      closeReplyModal();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setSendingReply(false);
    }
  };

  const isActivationCodeRequest = (subject: string) => {
    const normalized = subject.toLowerCase();
    return (
      normalized.includes("activation_code_request") ||
      normalized.includes("activation code") ||
      normalized.includes("كود تفعيل")
    );
  };

  const handleSendActivationCode = async (ticket: SupportMessage) => {
    const balanceRaw = window.prompt(
      t("قيمة كود التفعيل (افتراضي 30)", "Activation code value (default 30)"),
      "30",
    );

    if (balanceRaw === null) return;
    const balance = Number(balanceRaw);
    if (!Number.isFinite(balance) || balance <= 0) {
      toast.error(t("قيمة غير صحيحة", "Invalid amount"));
      return;
    }

    try {
      setProcessingTicketId(ticket.id);
      const response = await fetch("/api/admin/active_code/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          recipientUserId: ticket.senderUserId,
          ticketId: ticket.id,
          balance,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          data?.message ||
            t(
              "تعذر إرسال كود التفعيل بالبريد",
              "Failed to send activation code by email",
            ),
        );
      }

      toast.success(
        data?.message ||
          t(
            "تم إرسال كود التفعيل إلى بريد المستخدم",
            "Activation code sent to user email",
          ),
      );

      mutate((prev = []) =>
        prev.map((item) =>
          item.id === ticket.id ? { ...item, status: "CLOSED" } : item,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setProcessingTicketId(null);
    }
  };

  const handleBroadcast = async () => {
    const normalizedSubject = broadcastSubject.trim();
    const normalizedMessage = broadcastMessage.trim();

    if (!normalizedSubject) {
      toast.error(t("يرجى إدخال عنوان الإشعار", "Please enter a subject"));
      return;
    }

    if (!normalizedMessage) {
      toast.error(t("يرجى كتابة نص الإشعار", "Please write a message"));
      return;
    }

    try {
      setSendingBroadcast(true);
      const response = await fetch("/api/admin/support/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          subject: normalizedSubject,
          message: normalizedMessage,
          audience: broadcastAudience,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          data.message ||
            t(
              "تعذر إرسال الإشعار الجماعي",
              "Failed to send broadcast notification",
            ),
        );
      }

      toast.success(
        data.message ||
          t("تم إرسال الإشعار الجماعي", "Broadcast notification sent"),
      );
      setBroadcastSubject("");
      setBroadcastMessage("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-semibold dark:text-zinc-100 text-slate-700">
          {t("رسائل الدعم", "Support Messages")}
        </h2>
        <button
          type="button"
          onClick={() => void refetch()}
          className="admin-btn-secondary rounded-xl px-3 py-2 text-sm"
        >
          {t("تحديث", "Refresh")}
        </button>
      </div>

      <div className="rounded-[28px] bg-linear-to-br from-orange-600 to-orange-800 p-5 text-white shadow-[0_20px_40px_rgba(249,115,22,0.22)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              {t("إشعار جماعي", "Broadcast notification")}
            </h3>
            <p className="mt-1 text-sm text-orange-100/80">
              {t(
                "لإرسال تحديث أو تنبيه موحد إلى جميع المستخدمين أو إلى المشتركين النشطين فقط.",
                "Use this to send one update to all users or only active subscribers.",
              )}
            </p>
          </div>

          <select
            value={broadcastAudience}
            onChange={(event) =>
              setBroadcastAudience(event.target.value as "ALL" | "ACTIVE")
            }
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="ACTIVE">
              {t("المشتركون النشطون فقط", "Active subscribers only")}
            </option>
            <option value="ALL">{t("كل المستخدمين", "All users")}</option>
          </select>
        </div>

        <div className="grid gap-3">
          <input
            value={broadcastSubject}
            onChange={(event) => setBroadcastSubject(event.target.value)}
            maxLength={120}
            placeholder={t("عنوان الإشعار", "Notification subject")}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-orange-100/60 outline-none"
          />
          <textarea
            value={broadcastMessage}
            onChange={(event) => setBroadcastMessage(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t("نص الإشعار الجماعي", "Broadcast notification body")}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-orange-100/60 outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={sendingBroadcast}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-60"
            >
              <DynamicIcon iconName="IoIosSend" size={18} />
              {sendingBroadcast
                ? t("جارِ الإرسال...", "Sending...")
                : t("إرسال جماعي", "Send broadcast")}
            </button>
          </div>
        </div>
      </div>

      {isRefreshing && sortedMessages.length > 0 ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/85 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span>{t("يتم تحديث الرسائل...", "Refreshing messages...")}</span>
        </div>
      ) : null}

      {loading && !allMessages.length ? (
        <div className="admin-card rounded-3xl p-5 text-sm dark:text-zinc-400 text-slate-700">
          {t("جارِ تحميل الرسائل...", "Loading messages...")}
        </div>
      ) : sortedMessages.length === 0 ? (
        <div className="admin-card rounded-3xl p-5 text-sm text-zinc-400">
          {t("لا توجد رسائل دعم حالياً", "No support messages yet")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortedMessages.map((item) => (
            <article key={item.id} className="admin-card rounded-3xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold dark:text-zinc-100 text-slate-700 md:text-base">
                  {item.subject}
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.status === "CLOSED"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.status === "CLOSED"
                    ? t("تمت المعالجة", "Handled")
                    : t("جديدة", "New")}
                </span>
              </div>

              <p className="mt-2 text-sm dark:text-zinc-300 text-slate-700">
                <span className="font-medium">{t("المرسل", "Sender")}: </span>
                {item.senderName} ({item.senderEmail})
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 dark:text-zinc-200 text-slate-500">
                {item.message}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs dark:text-zinc-500 text-slate-700">
                  {new Date(item.createdAt).toLocaleString(
                    isArabic ? "ar" : "en",
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => openReplyModal(item)}
                  className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <DynamicIcon iconName="IoIosSend" size={16} />
                  {t("رد", "Reply")}
                </button>
                {isActivationCodeRequest(item.subject) &&
                  item.status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => handleSendActivationCode(item)}
                      disabled={processingTicketId === item.id}
                      className="admin-btn-success inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60"
                    >
                      <DynamicIcon iconName="BiBarcodeReader" size={16} />
                      {processingTicketId === item.id
                        ? t("جارِ الإرسال...", "Sending...")
                        : t(
                            "إرسال كود التفعيل للبريد",
                            "Send activation code by email",
                          )}
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div
          dir={isArabic ? "rtl" : "ltr"}
          className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="admin-card w-full max-w-xl rounded-[28px] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold dark:text-zinc-100 text-slate-500 md:text-lg">
                {t("الرد على الرسالة", "Reply to message")}
              </h3>
              <button
                onClick={closeReplyModal}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800"
                aria-label={t("إغلاق", "Close")}
              >
                <DynamicIcon iconName="MdClose" size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm dark:text-zinc-300 text-slate-500">
                  {t("عنوان الرد", "Reply subject")}
                </label>
                <input
                  value={replySubject}
                  onChange={(event) => setReplySubject(event.target.value)}
                  maxLength={120}
                  className="admin-input w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm dark:text-zinc-300 text-slate-700">
                  {t("نص الرد", "Reply message")}
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="admin-textarea w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeReplyModal}
                disabled={sendingReply}
                className="admin-btn-secondary rounded-xl px-3 py-2 text-sm disabled:opacity-60"
              >
                {t("إلغاء", "Cancel")}
              </button>
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="admin-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                <DynamicIcon iconName="IoIosSend" size={18} />
                {sendingReply
                  ? t("جارِ الإرسال...", "Sending...")
                  : t("إرسال الرد", "Send Reply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SupportMessagesPanel;
