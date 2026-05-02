"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { buildChatConversationId } from "@/lib/chatConversation";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import GoBackBtn from "@/app/components/GoBackBtn";

type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
};

type ConversationItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  itemType: string;
  lastMessage: string;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  otherParticipantId: string;
  otherParticipantName: string;
  unreadCount: number;
};

const formatMessageTime = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function MessagesPage() {
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const ownerId = params.get("ownerId") ?? "";
  const listingIdFromQuery = params.get("listingId") ?? "";
  const listingTitleFromQuery = params.get("title") ?? "";
  const directConversationId = params.get("conversationId") ?? "";
  const itemType = params.get("itemType") ?? "";
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const lastMessageCountRef = useRef(0);
  const isUserScrollingUpRef = useRef(false);

  const preferredConversationId = useMemo(() => {
    if (directConversationId) {
      return directConversationId;
    }

    if (!userId || !ownerId || !listingIdFromQuery) {
      return "";
    }

    return buildChatConversationId({
      listingId: listingIdFromQuery,
      userAId: userId,
      userBId: ownerId,
    });
  }, [directConversationId, listingIdFromQuery, ownerId, userId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 60;

      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;

      const atBottom = distanceFromBottom < threshold;

      setIsAtBottom(atBottom);
      isUserScrollingUpRef.current = !atBottom;
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const newMessagesCount = messages.length;
    const prevMessagesCount = lastMessageCountRef.current;

    const hasNewMessage = newMessagesCount > prevMessagesCount;

    // لا تعمل scroll إلا إذا:
    // 1. في رسالة جديدة
    // 2. المستخدم أصلاً في الأسفل
    if (hasNewMessage && isAtBottom && !isUserScrollingUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }

    lastMessageCountRef.current = newMessagesCount;
  }, [messages, isAtBottom]);
  useEffect(() => {
    let mounted = true;

    const fetchConversations = async () => {
      if (!userId) {
        return;
      }

      try {
        setLoadingConversations(true);
        const response = await fetch("/api/chat/conversations", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          conversations?: ConversationItem[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Failed to load conversations");
        }

        if (!mounted) {
          return;
        }

        const nextConversations = data.conversations ?? [];
        setConversations(nextConversations);

        if (preferredConversationId) {
          setSelectedConversationId(preferredConversationId);
        } else if (nextConversations.length > 0) {
          setSelectedConversationId((prev) => prev || nextConversations[0]!.id);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load conversations",
        );
      } finally {
        if (mounted) {
          setLoadingConversations(false);
        }
      }
    };

    void fetchConversations();

    return () => {
      mounted = false;
    };
  }, [preferredConversationId, userId]);

  useEffect(() => {
    if (!selectedConversationId || !userId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/messages?conversationId=${encodeURIComponent(selectedConversationId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { messages?: ChatMessage[] };
        if (!cancelled) {
          setMessages(data.messages ?? []);
        }
      } catch {
        // Silent polling fallback.
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedConversationId, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    const refreshConversations = async () => {
      try {
        const response = await fetch("/api/chat/conversations", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as {
          conversations?: ConversationItem[];
        };

        if (!cancelled && data.conversations) {
          setConversations(data.conversations);
        }
      } catch {
        // Silent polling fallback.
      }
    };

    const interval = window.setInterval(() => {
      void refreshConversations();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedConversationId || !userId) {
      return;
    }

    const activeConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );

    if (!activeConversation || activeConversation.unreadCount === 0) {
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );

    void fetch("/api/chat/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedConversationId }),
    });
  }, [conversations, selectedConversationId, userId]);

  const selectedConversation = useMemo(() => {
    return conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );
  }, [conversations, selectedConversationId]);

  const recipientUserId = selectedConversation?.otherParticipantId ?? ownerId;
  const listingId = selectedConversation?.listingId || listingIdFromQuery;
  const listingTitle =
    selectedConversation?.listingTitle || listingTitleFromQuery;
  const hasOpenChatTarget = Boolean(
    selectedConversationId || (recipientUserId && listingId),
  );

  const { isArabic } = useAppPreferences();
  const sendMessage = async () => {
    if (!input.trim() || !recipientUserId || !listingId) {
      return;
    }
    try {
      setSending(true);
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUserId,
          listingId,
          listingTitle,
          itemType: selectedConversation?.itemType || itemType,
          text: input.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      const nextConversationId = String(data.conversationId || "");
      if (nextConversationId && !selectedConversationId) {
        setSelectedConversationId(nextConversationId);
      }

      setInput("");
      setIsAtBottom(true);
      isUserScrollingUpRef.current = false;

      const refreshResponse = await fetch("/api/chat/conversations", {
        cache: "no-store",
      });
      const refreshData = (await refreshResponse.json()) as {
        conversations?: ConversationItem[];
      };
      if (refreshResponse.ok && refreshData.conversations) {
        setConversations(refreshData.conversations);
        if (nextConversationId) {
          setSelectedConversationId(nextConversationId);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return <div className="p-6 text-sm">Loading chat...</div>;
  }

  if (!userId) {
    return <div className="p-6 text-sm">Please sign in to use chat.</div>;
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-8"
    >
      <div className="flex h-[calc(100dvh-110px)] min-h-130 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950 lg:grid lg:min-h-155 lg:grid-cols-[360px_1fr]">
        <aside
          className={`border-slate-200 bg-linear-to-b from-sky-50 to-white p-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 lg:border-b-0 lg:border-r ${
            hasOpenChatTarget ? "hidden lg:block" : "block w-full"
          }`}
        >
          <div className="mb-3 px-2">
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {isArabic ? "الرسائل" : "Messages"}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isArabic ? "الدردشات" : "Conversations"}
            </p>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 lg:h-[calc(78vh-90px)]">
            {loadingConversations ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                {isArabic
                  ? "جارٍ تحميل المحادثات..."
                  : "Loading conversations..."}
              </p>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                No conversations yet.
              </p>
            ) : (
              conversations.map((conversation) => {
                const selected = conversation.id === selectedConversationId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                      selected
                        ? "bg-sky-600 text-white shadow-lg"
                        : "bg-white/90 hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-bold ${selected ? "text-white" : "text-slate-900 dark:text-slate-100"}`}
                        >
                          {conversation.otherParticipantName}
                        </p>
                        <p
                          className={`truncate text-xs ${selected ? "text-sky-100" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {conversation.listingTitle || "Listing"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[11px] ${selected ? "text-sky-100" : "text-slate-400"}`}
                        >
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p
                      className={`mt-2 truncate text-xs ${selected ? "text-sky-100" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.28),transparent_45%),radial-gradient(circle_at_bottom,rgba(147,197,253,0.18),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.25),transparent_42%),radial-gradient(circle_at_bottom,rgba(2,6,23,0.65),transparent_42%)] ${
            hasOpenChatTarget ? "flex w-full" : "hidden lg:flex"
          }`}
        >
          <header className="border-b border-slate-200/70 px-5 py-4 backdrop-blur-sm dark:border-slate-700/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedConversation?.otherParticipantName ||
                    "Start a conversation"}
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {selectedConversation?.listingTitle ||
                    listingTitle ||
                    "Pick a chat from the list"}
                </p>
              </div>
              <GoBackBtn closeBtn={true} />
            </div>
          </header>

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          >
            {!selectedConversationId ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {isArabic
                  ? "افتح عنصرًا وانقر على بدء الدردشة المباشرة، أو اختر محادثة."
                  : "Open an item and click Start direct chat, or pick a conversation."}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {isArabic ? "لا توجد رسائل بعد." : "No messages yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const mine = message.senderId === userId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm shadow-sm ${
                          mine
                            ? "rounded-br-md bg-sky-600 text-white"
                            : "rounded-bl-md bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <p
                          className={`text-[11px] font-semibold ${mine ? "text-sky-100" : "text-slate-500 dark:text-slate-300"}`}
                        >
                          {mine
                            ? isArabic
                              ? "أنت"
                              : "You"
                            : selectedConversation?.otherParticipantName ||
                              (isArabic ? "مستخدم" : "User")}
                        </p>
                        <p className="leading-6">{message.text}</p>
                        <p
                          className={`mt-1 text-[11px] ${mine ? "text-sky-100" : "text-slate-400"}`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            {!isAtBottom && (
              <button
                onClick={() =>
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                className="fixed bottom-24 right-6 rounded-full bg-sky-600 text-white px-4 py-2 shadow-lg"
              >
                ↓ {isArabic ? "الرسائل الجديدة" : "New messages"}
              </button>
            )}
          </div>

          <footer className="border-t border-slate-200/70 p-3 dark:border-slate-700/80">
            <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                placeholder="Write a message"
                className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none dark:text-slate-100"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={
                  sending || !input.trim() || !recipientUserId || !listingId
                }
                className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? isArabic
                    ? "جارٍ الإرسال"
                    : "Sending"
                  : isArabic
                    ? "إرسال"
                    : "Send"}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
