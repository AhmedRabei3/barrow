"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DynamicIcon } from "../addCategory/IconSetter";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import { createPortal } from "react-dom";

type TabKey = "new" | "tickets";

type TicketListItem = {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastSenderRole: "USER" | "ADMIN";
};

type TicketMessage = {
  id: string;
  senderRole: "USER" | "ADMIN";
  body: string;
  createdAt: string;
};

type TicketDetails = {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
};

interface SupportContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCountChange?: (count: number) => void;
}

const SupportContactModal = ({
  isOpen,
  onClose,
  onOpenCountChange,
}: SupportContactModalProps) => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const localize = useCallback(
    (value: string) => localizeErrorMessage(value, isArabic),
    [isArabic],
  );

  const [activeTab, setActiveTab] = useState<TabKey>("new");

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedTicket = useMemo(
    () => tickets.find((item) => item.id === selectedTicketId) || null,
    [tickets, selectedTicketId],
  );

  const handleClose = () => {
    if (isSending || replySending) return;
    onClose();
  };

  const loadTickets = useCallback(async () => {
    try {
      setTicketsLoading(true);
      const response = await fetch("/api/support/tickets", {
        headers: {
          "x-lang": isArabic ? "ar" : "en",
        },
      });

      const data = (await response.json()) as {
        tickets?: TicketListItem[];
        openCount?: number;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          localize(
            data?.message ||
              t("تعذر تحميل المحادثات السابقة", "Failed to load tickets"),
          ),
        );
      }

      const nextTickets = data.tickets || [];
      setTickets(nextTickets);
      onOpenCountChange?.(
        Number(
          data.openCount ??
            nextTickets.filter((ticket) => ticket.status === "OPEN").length,
        ),
      );
      if (data.tickets?.length) {
        setSelectedTicketId(
          (previous) => previous || data.tickets?.[0]?.id || null,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? localize(error.message)
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setTicketsLoading(false);
    }
  }, [isArabic, localize, onOpenCountChange, t]);

  const loadTicketDetails = useCallback(
    async (ticketId: string) => {
      try {
        setDetailsLoading(true);
        const response = await fetch(`/api/support/tickets/${ticketId}`, {
          headers: {
            "x-lang": isArabic ? "ar" : "en",
          },
        });

        const data = (await response.json()) as {
          ticket?: TicketDetails;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            localize(
              data?.message ||
                t(
                  "تعذر تحميل تفاصيل المحادثة السابقة",
                  "Failed to load ticket details",
                ),
            ),
          );
        }

        setTicketDetails(data.ticket || null);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? localize(error.message)
            : t("حدث خطأ غير متوقع", "Unexpected error"),
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [isArabic, localize, t],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab("new");
    setTicketDetails(null);
    setReplyMessage("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "tickets") return;
    loadTickets();
  }, [isOpen, activeTab, loadTickets]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!selectedTicketId || activeTab !== "tickets") return;
    loadTicketDetails(selectedTicketId);
  }, [selectedTicketId, activeTab, loadTicketDetails]);

  const handleCreateTicket = async () => {
    const normalizedSubject = subject.trim();
    const normalizedMessage = message.trim();

    if (!normalizedSubject) {
      toast.error(t("يرجى إدخال عنوان الرسالة", "Please enter a subject"));
      return;
    }

    if (!normalizedMessage) {
      toast.error(t("يرجى كتابة الرسالة", "Please write your message"));
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          subject: normalizedSubject,
          message: normalizedMessage,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          localize(
            data?.message ||
              t("تعذر إرسال الرسالة", "Failed to send support message"),
          ),
        );
      }

      toast.success(
        data?.message
          ? localize(data.message)
          : t(
              "تم استلام رسالتك وسيتم الرد عليك قريباً",
              "Your message has been received. We will reply soon.",
            ),
      );

      setSubject("");
      setMessage("");
      setActiveTab("tickets");
      await loadTickets();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? localize(error.message)
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicketId) return;

    const normalizedReply = replyMessage.trim();
    if (!normalizedReply) {
      toast.error(t("يرجى كتابة الرد", "Please write your reply"));
      return;
    }

    try {
      setReplySending(true);
      const response = await fetch(
        `/api/support/tickets/${selectedTicketId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lang": isArabic ? "ar" : "en",
          },
          body: JSON.stringify({
            message: normalizedReply,
          }),
        },
      );

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          localize(
            data?.message ||
              t("تعذر إرسال الرد", "Failed to send ticket reply"),
          ),
        );
      }

      toast.success(
        data?.message
          ? localize(data.message)
          : t("تم إرسال رسالتك", "Message sent"),
      );
      setReplyMessage("");
      await Promise.all([loadTickets(), loadTicketDetails(selectedTicketId)]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? localize(error.message)
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setReplySending(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalNode = (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 z-120 flex items-end justify-center overflow-hidden bg-slate-950/55 px-0 backdrop-blur-[1px] sm:items-center sm:overflow-y-auto sm:px-4"
      style={{
        zIndex: 1300,
        paddingTop: "max(env(safe-area-inset-top), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label={t("إغلاق نافذة الدعم", "Close support dialog")}
        className="absolute inset-0 cursor-default"
      />

      <div
        className={`relative flex w-full self-end max-h-[calc(100dvh-0.75rem)] flex-col overflow-hidden rounded-t-2xl rounded-b-none border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:self-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${
          activeTab === "tickets" ? "max-w-5xl" : "max-w-2xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center py-2 sm:hidden">
          <span className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
          <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t("مركز دعم العملاء", "Customer Support Center")}
          </h3>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={t("إغلاق", "Close")}
          >
            <DynamicIcon iconName="MdClose" size={18} />
          </button>
        </div>

        <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:mx-6">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "new"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {t("رسالة جديدة", "New Message")}
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "tickets"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {t("المحادثات السابقة", "My Tickets")}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {activeTab === "new" ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">
                  {t("عنوان الرسالة", "Message subject")}
                </label>
                <input
                  name="supportSubject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder={t("اكتب عنوان الرسالة", "Write the subject")}
                  maxLength={120}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">
                  {t("الرسالة", "Message")}
                </label>
                <textarea
                  name="supportMessage"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("اكتب رسالتك هنا", "Write your message here")}
                  maxLength={2000}
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={handleClose}
                  disabled={isSending}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  <DynamicIcon iconName="IoIosSend" size={18} />
                  {isSending
                    ? t("جارِ الإرسال...", "Sending...")
                    : t("إرسال", "Send")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-[36dvh] overflow-y-auto dark:border-slate-700 dark:bg-slate-800 md:max-h-112">
                {ticketsLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t("جارِ تحميل المحادثات السابقة...", "Loading tickets...")}
                  </p>
                ) : tickets.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t("لا توجد محادثات سابقة بعد", "No tickets yet")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`w-full rounded-lg border p-3 text-start transition ${
                          selectedTicketId === ticket.id
                            ? "border-sky-300 bg-sky-50 dark:border-sky-600 dark:bg-slate-700"
                            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {ticket.subject}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              ticket.status === "OPEN"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {ticket.status === "OPEN"
                              ? t("مفتوحة", "Open")
                              : t("مغلقة", "Closed")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300 truncate">
                          {ticket.lastMessage}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 max-h-[40dvh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900 md:max-h-112">
                {!selectedTicket ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t(
                      "اختر محادثة سابقة لعرض التفاصيل",
                      "Select a ticket to view details",
                    )}
                  </p>
                ) : detailsLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t("جارِ تحميل المحادثة...", "Loading conversation...")}
                  </p>
                ) : !ticketDetails ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t(
                      "تعذر تحميل تفاصيل المحادثة السابقة",
                      "Unable to load ticket details",
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="border-b border-slate-200 pb-2 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {ticketDetails.subject}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {new Date(ticketDetails.createdAt).toLocaleString(
                          isArabic ? "ar" : "en",
                        )}
                      </p>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {ticketDetails.messages.map((row) => (
                        <div
                          key={row.id}
                          className={`rounded-lg px-3 py-2 text-sm ${
                            row.senderRole === "USER"
                              ? "bg-sky-50 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                              : "bg-emerald-50 text-slate-800 dark:bg-emerald-900/30 dark:text-slate-100"
                          }`}
                        >
                          <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">
                            {row.senderRole === "USER"
                              ? t("أنت", "You")
                              : t("الدعم", "Support")}
                          </p>
                          <p className="whitespace-pre-line">{row.body}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                      <textarea
                        name="supportReplyMessage"
                        value={replyMessage}
                        onChange={(event) =>
                          setReplyMessage(event.target.value)
                        }
                        placeholder={t("اكتب ردك هنا", "Write your follow-up")}
                        rows={3}
                        maxLength={2000}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleReply}
                          disabled={replySending}
                          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                          <DynamicIcon iconName="IoIosSend" size={16} />
                          {replySending
                            ? t("جارِ الإرسال...", "Sending...")
                            : t("إرسال رد", "Send Reply")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default SupportContactModal;
