"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";

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

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(
    null,
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/support/messages", {
        headers: {
          "x-lang": isArabic ? "ar" : "en",
        },
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

      setMessages(data.messages || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setLoading(false);
    }
  }, [isArabic, t]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [messages],
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

      setMessages((prev) =>
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

      setMessages((prev) =>
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {t("رسائل الدعم", "Support Messages")}
        </h2>
        <button
          type="button"
          onClick={loadMessages}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500 dark:text-slate-300">
          {t("جارِ تحميل الرسائل...", "Loading messages...")}
        </div>
      ) : sortedMessages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500 dark:text-slate-300">
          {t("لا توجد رسائل دعم حالياً", "No support messages yet")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortedMessages.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">
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

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{t("المرسل", "Sender")}: </span>
                {item.senderName} ({item.senderEmail})
              </p>

              <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200 leading-6">
                {item.message}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.createdAt).toLocaleString(
                    isArabic ? "ar" : "en",
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => openReplyModal(item)}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
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
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">
                {t("الرد على الرسالة", "Reply to message")}
              </h3>
              <button
                onClick={closeReplyModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t("إغلاق", "Close")}
              >
                <DynamicIcon iconName="MdClose" size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">
                  {t("عنوان الرد", "Reply subject")}
                </label>
                <input
                  value={replySubject}
                  onChange={(event) => setReplySubject(event.target.value)}
                  maxLength={120}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">
                  {t("نص الرد", "Reply message")}
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeReplyModal}
                disabled={sendingReply}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("إلغاء", "Cancel")}
              </button>
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
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
