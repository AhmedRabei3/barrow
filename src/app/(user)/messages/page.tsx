"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { buildChatConversationId } from "@/lib/chatConversation";
import {
  getWebSocket,
  initializeWebSocket,
  sendWebSocketEvent,
  subscribeWebSocketConnection,
  subscribeWebSocketEvents,
} from "@/lib/socketClient";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import GoBackBtn from "@/app/components/GoBackBtn";

type MessageStatus = "sending" | "sent" | "delivered" | "seen";

type ChatMessage = {
  id: string;
  clientMessageId?: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
  status: MessageStatus;
  deliveredAt?: string | null;
  seenAt?: string | null;
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
  otherParticipantIsOnline?: boolean;
  otherParticipantLastSeenAt?: string | null;
  unreadCount: number;
};

type MobileChatPanel = "list" | "chat";

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

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

const formatLastSeen = (value: string | null, isArabic: boolean) => {
  if (!value) {
    return isArabic ? "آخر ظهور غير معروف" : "Last seen unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return isArabic ? "آخر ظهور غير معروف" : "Last seen unavailable";
  }

  return isArabic
    ? `آخر ظهور ${date.toLocaleString()}`
    : `Last seen ${date.toLocaleString()}`;
};

const resolveMessageStatus = (message: Partial<ChatMessage>): MessageStatus => {
  if (message.status) {
    return message.status;
  }

  if (message.seenAt || message.isRead) {
    return "seen";
  }

  if (message.deliveredAt) {
    return "delivered";
  }

  return "sent";
};

export default function MessagesPage() {
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const { isArabic } = useAppPreferences();
  const userId = session?.user?.id ?? "";

  const ownerId = params.get("ownerId") ?? "";
  const listingIdFromQuery = params.get("listingId") ?? "";
  const listingTitleFromQuery = params.get("title") ?? "";
  const directConversationId = params.get("conversationId") ?? "";
  const itemType = params.get("itemType") ?? "";
  const hasQueryChatTarget = Boolean(
    directConversationId || (ownerId && listingIdFromQuery),
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [wsConnected, setWsConnected] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobileChatPanel>(
    hasQueryChatTarget ? "chat" : "list",
  );
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  const lastMessageCountRef = useRef(0);
  const isUserScrollingUpRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const subscribedPresenceUserIdsRef = useRef(new Set<string>());
  const readingConversationsRef = useRef(new Set<string>());

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

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ),
    [conversations, selectedConversationId],
  );

  const recipientUserId = selectedConversation?.otherParticipantId ?? ownerId;
  const listingId = selectedConversation?.listingId || listingIdFromQuery;
  const listingTitle =
    selectedConversation?.listingTitle || listingTitleFromQuery;
  const hasOpenChatTarget = Boolean(
    selectedConversationId || (recipientUserId && listingId),
  );
  const showConversationListOnMobile = mobilePanel === "list";
  const showChatOnMobile = mobilePanel === "chat" && hasOpenChatTarget;
  const selectedConversationIsVisible = Boolean(
    selectedConversationId && (isDesktopViewport || mobilePanel === "chat"),
  );
  const presenceUserIds = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...conversations.map(
            (conversation) => conversation.otherParticipantId,
          ),
          recipientUserId,
        ].filter(Boolean),
      ),
    );
  }, [conversations, recipientUserId]);

  const openConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setMobilePanel("chat");
    setIsAtBottom(true);
    isUserScrollingUpRef.current = false;
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      return;
    }

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

    const nextConversations = data.conversations ?? [];
    setConversations(nextConversations);
    setOnlineUserIds(
      new Set(
        nextConversations
          .filter((conversation) => conversation.otherParticipantIsOnline)
          .map((conversation) => conversation.otherParticipantId),
      ),
    );

    setSelectedConversationId((prev) => {
      if (preferredConversationId) {
        return preferredConversationId;
      }

      if (prev) {
        const stillExists = nextConversations.some((item) => item.id === prev);
        if (stillExists) {
          return prev;
        }
      }

      return nextConversations[0]?.id ?? "";
    });

    if (preferredConversationId) {
      setMobilePanel("chat");
      return;
    }

    setMobilePanel((currentPanel) => {
      if (currentPanel === "chat") {
        return currentPanel;
      }

      const unreadConversations = nextConversations.filter(
        (conversation) => conversation.unreadCount > 0,
      );

      if (unreadConversations.length === 1 && nextConversations.length === 1) {
        return "chat";
      }

      return "list";
    });
  }, [preferredConversationId, userId]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    setPeerOnline(Boolean(selectedConversation.otherParticipantIsOnline));
    setPeerLastSeen(selectedConversation.otherParticipantLastSeenAt ?? null);
  }, [selectedConversation]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}&limit=100`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      messages?: ChatMessage[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message || "Failed to load messages");
    }

    setMessages(
      sortMessages(
        (data.messages ?? []).map((message) => ({
          ...message,
          status: resolveMessageStatus(message),
        })),
      ),
    );
  }, []);

  const mergeIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex(
        (message) =>
          message.id === incoming.id ||
          (incoming.clientMessageId &&
            message.clientMessageId === incoming.clientMessageId),
      );

      if (existingIndex === -1) {
        return sortMessages([...prev, incoming]);
      }

      const next = [...prev];
      next[existingIndex] = {
        ...next[existingIndex],
        ...incoming,
        status: resolveMessageStatus(incoming),
      };
      return sortMessages(next);
    });
  }, []);

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!conversationId || readingConversationsRef.current.has(conversationId)) {
        return;
      }

      readingConversationsRef.current.add(conversationId);

      try {
        const response = await fetch("/api/chat/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        });

        if (response.ok) {
          window.dispatchEvent(new Event("chat_unread_refresh"));
        }
      } finally {
        readingConversationsRef.current.delete(conversationId);
      }
    },
    [],
  );

  const sendTypingStart = useCallback(() => {
    if (!selectedConversationId || !recipientUserId || typingSentRef.current) {
      return;
    }

    const sent = sendWebSocketEvent({
      type: "typing_start",
      conversationId: selectedConversationId,
      recipientId: recipientUserId,
    });

    if (sent) {
      typingSentRef.current = true;
    }
  }, [recipientUserId, selectedConversationId]);

  const sendTypingStop = useCallback(() => {
    if (!selectedConversationId || !recipientUserId || !typingSentRef.current) {
      return;
    }

    sendWebSocketEvent({
      type: "typing_stop",
      conversationId: selectedConversationId,
      recipientId: recipientUserId,
    });
    typingSentRef.current = false;
  }, [recipientUserId, selectedConversationId]);

  const handleIncomingChatMessage = useCallback(
    async (event: {
      conversationId: string;
      data: ChatMessage;
    }) => {
      const incoming = {
        ...event.data,
        status: resolveMessageStatus(event.data),
      };

      if (incoming.senderId !== userId) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.add(incoming.senderId);
          return next;
        });

        if (incoming.senderId === recipientUserId) {
          setPeerOnline(true);
          setPeerLastSeen(null);
        }
      }

      setConversations((prev) => {
        const current = prev.find((conversation) => conversation.id === event.conversationId);
        if (!current) {
          return prev;
        }

        const conversationIsVisible =
          selectedConversationId === event.conversationId &&
          (isDesktopViewport || mobilePanel === "chat");

        const nextUnread =
          incoming.recipientId === userId && !conversationIsVisible
            ? current.unreadCount + 1
            : conversationIsVisible
              ? 0
              : current.unreadCount;

        const updated = {
          ...current,
          lastMessage: incoming.text,
          lastMessageAt: incoming.createdAt,
          lastMessageSenderId: incoming.senderId,
          unreadCount: nextUnread,
        };

        return [updated, ...prev.filter((item) => item.id !== current.id)];
      });

      if (
        selectedConversationId === event.conversationId &&
        (isDesktopViewport || mobilePanel === "chat")
      ) {
        mergeIncomingMessage(incoming);

        if (incoming.recipientId === userId) {
          sendWebSocketEvent({
            type: "message_delivered",
            conversationId: event.conversationId,
            senderId: incoming.senderId,
            messageIds: [incoming.id],
          });
          await markConversationAsRead(event.conversationId);
        }
      } else if (incoming.senderId !== userId) {
        void fetchConversations();
      }
    },
    [
      fetchConversations,
      isDesktopViewport,
      markConversationAsRead,
      mergeIncomingMessage,
      mobilePanel,
      recipientUserId,
      selectedConversationId,
      userId,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const threshold = 60;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;

      const atBottom = distanceFromBottom < threshold;
      setIsAtBottom(atBottom);
      isUserScrollingUpRef.current = !atBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const newMessagesCount = messages.length;
    const previousCount = lastMessageCountRef.current;
    const hasNewMessage = newMessagesCount > previousCount;

    if (hasNewMessage && isAtBottom && !isUserScrollingUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }

    lastMessageCountRef.current = newMessagesCount;
  }, [isAtBottom, messages]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoadingConversations(true);
        await fetchConversations();
      } catch (error) {
        if (!mounted) {
          return;
        }

        toast.error(
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تحميل المحادثات"
              : "Failed to load conversations",
        );
      } finally {
        if (mounted) {
          setLoadingConversations(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [fetchConversations, isArabic, userId]);

  useEffect(() => {
    if (!selectedConversationId || !userId) {
      setMessages([]);
      return;
    }

    if (!selectedConversationIsVisible) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        await fetchMessages(selectedConversationId);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : isArabic
                ? "تعذر تحميل الرسائل"
                : "Failed to load messages",
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    fetchMessages,
    isArabic,
    selectedConversationId,
    selectedConversationIsVisible,
    userId,
  ]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    initializeWebSocket(userId);
    setWsConnected(getWebSocket()?.readyState === WebSocket.OPEN);

    const unsubscribeConnection = subscribeWebSocketConnection((connected) => {
      setWsConnected(connected);
      if (connected) {
        void fetchConversations();
        if (selectedConversationId) {
          void fetchMessages(selectedConversationId);
        }
      }
    });

    const unsubscribe = subscribeWebSocketEvents((event) => {
      if (event.type === "chat_message") {
        void handleIncomingChatMessage({
          conversationId: event.conversationId,
          data: event.data as ChatMessage,
        });
        return;
      }

      if (event.type === "message_delivered") {
        setMessages((prev) =>
          prev.map((message) => {
            if (!event.messageIds.includes(message.id) || message.senderId !== userId) {
              return message;
            }

            if (message.status === "seen") {
              return message;
            }

            return {
              ...message,
              status: "delivered",
              deliveredAt: event.deliveredAt,
            };
          }),
        );
        return;
      }

      if (event.type === "message_seen") {
        setMessages((prev) =>
          prev.map((message) => {
            if (!event.messageIds.includes(message.id) || message.senderId !== userId) {
              return message;
            }

            return {
              ...message,
              status: "seen",
              seenAt: event.seenAt,
              isRead: true,
            };
          }),
        );
        return;
      }

      if (
        (event.type === "typing_start" || event.type === "typing_stop") &&
        event.conversationId === selectedConversationId &&
        event.userId === recipientUserId
      ) {
        const typingNow = event.type === "typing_start";
        setIsPeerTyping(typingNow);

        if (peerTypingTimeoutRef.current) {
          clearTimeout(peerTypingTimeoutRef.current);
          peerTypingTimeoutRef.current = null;
        }

        if (typingNow) {
          peerTypingTimeoutRef.current = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3500);
        }

        return;
      }

      if (event.type === "user_online" && event.userId === recipientUserId) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.add(event.userId);
          return next;
        });
        setPeerOnline(true);
        setPeerLastSeen(null);
        return;
      }

      if (event.type === "user_offline" && event.userId === recipientUserId) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(event.userId);
          return next;
        });
        setPeerOnline(false);
        setPeerLastSeen(event.lastSeen ?? null);
        return;
      }

      if (event.type === "user_online") {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.add(event.userId);
          return next;
        });
        return;
      }

      if (event.type === "user_offline") {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(event.userId);
          return next;
        });
      }
    });

    return () => {
      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
      unsubscribeConnection();
      unsubscribe();
    };
  }, [
    fetchConversations,
    fetchMessages,
    handleIncomingChatMessage,
    recipientUserId,
    selectedConversationId,
    userId,
  ]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (wsConnected) {
        return;
      }

      void fetchConversations();
      if (selectedConversationId) {
        void fetchMessages(selectedConversationId);
      }
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    fetchConversations,
    fetchMessages,
    selectedConversationId,
    userId,
    wsConnected,
  ]);

  useEffect(() => {
    if (!wsConnected || presenceUserIds.length === 0) {
      return;
    }

    const currentIds = subscribedPresenceUserIdsRef.current;
    const nextIds = new Set(presenceUserIds);
    const idsToSubscribe = presenceUserIds.filter((id) => !currentIds.has(id));
    const idsToUnsubscribe = Array.from(currentIds).filter(
      (id) => !nextIds.has(id),
    );

    if (idsToUnsubscribe.length > 0) {
      sendWebSocketEvent({
        type: "presence_unsubscribe",
        userIds: idsToUnsubscribe,
      });
    }

    if (idsToSubscribe.length > 0) {
      sendWebSocketEvent({
        type: "presence_subscribe",
        userIds: idsToSubscribe,
      });
    }

    subscribedPresenceUserIdsRef.current = nextIds;

    return () => {
      const subscribedIds = Array.from(subscribedPresenceUserIdsRef.current);
      if (subscribedIds.length === 0) {
        return;
      }

      sendWebSocketEvent({
        type: "presence_unsubscribe",
        userIds: subscribedIds,
      });
      subscribedPresenceUserIdsRef.current = new Set();
    };
  }, [presenceUserIds, wsConnected]);

  useEffect(() => {
    if (!selectedConversationId || !userId || !selectedConversationIsVisible) {
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );

    const unreadIncomingIds = messages
      .filter(
        (message) =>
          message.recipientId === userId &&
          message.senderId !== userId &&
          message.status !== "seen",
      )
      .map((message) => message.id);

    const activeConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );
    const shouldMarkRead =
      unreadIncomingIds.length > 0 || Boolean(activeConversation?.unreadCount);

    if (unreadIncomingIds.length > 0) {
      setMessages((prev) =>
        prev.map((message) =>
          unreadIncomingIds.includes(message.id)
            ? {
                ...message,
                status: "seen",
                isRead: true,
                seenAt: new Date().toISOString(),
              }
            : message,
        ),
      );
    }

    if (shouldMarkRead) {
      void markConversationAsRead(selectedConversationId);
    }
  }, [
    conversations,
    markConversationAsRead,
    messages,
    selectedConversationId,
    selectedConversationIsVisible,
    userId,
  ]);

  const renderStatus = useCallback(
    (message: ChatMessage) => {
      if (message.senderId !== userId) {
        return null;
      }

      if (message.status === "sending") {
        return <span className="text-[11px] opacity-80">...</span>;
      }

      if (message.status === "seen") {
        return <span className="text-[11px] text-sky-200">✓✓</span>;
      }

      if (message.status === "delivered") {
        return <span className="text-[11px] text-sky-100">✓✓</span>;
      }

      return <span className="text-[11px] text-sky-100">✓</span>;
    },
    [userId],
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !recipientUserId || !listingId || !userId) {
      return;
    }

    const clientMessageId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const tempMessage: ChatMessage = {
      id: `temp:${clientMessageId}`,
      clientMessageId,
      senderId: userId,
      recipientId: recipientUserId,
      text: input.trim(),
      createdAt: nowIso,
      status: "sending",
      isRead: false,
      deliveredAt: null,
      seenAt: null,
    };

    mergeIncomingMessage(tempMessage);
    setInput("");
    setSending(true);
    sendTypingStop();

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUserId,
          listingId,
          listingTitle,
          itemType: selectedConversation?.itemType || itemType,
          text: tempMessage.text,
          clientMessageId,
        }),
      });

      const data = (await response.json()) as {
        conversationId?: string;
        message?: ChatMessage | string;
        success?: boolean;
      };

      if (!response.ok || !data.message || typeof data.message === "string") {
        throw new Error(
          (typeof data.message === "string" ? data.message : undefined) ||
            (isArabic ? "تعذر إرسال الرسالة" : "Failed to send message"),
        );
      }

      const serverMessage = {
        ...data.message,
        status: resolveMessageStatus(data.message),
      };

      mergeIncomingMessage(serverMessage);

      if (data.conversationId && !selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }

      setConversations((prev) => {
        const targetId = data.conversationId || selectedConversationId;
        const existing = prev.find((conversation) => conversation.id === targetId);

        if (existing) {
          const updated = {
            ...existing,
            lastMessage: serverMessage.text,
            lastMessageAt: serverMessage.createdAt,
            lastMessageSenderId: serverMessage.senderId,
          };
          return [updated, ...prev.filter((item) => item.id !== existing.id)];
        }

        if (!targetId) {
          return prev;
        }

        const fallbackConversation: ConversationItem = {
          id: targetId,
          listingId,
          listingTitle: listingTitle || (isArabic ? "إعلان" : "Listing"),
          itemType,
          lastMessage: serverMessage.text,
          lastMessageAt: serverMessage.createdAt,
          lastMessageSenderId: userId,
          otherParticipantId: recipientUserId,
          otherParticipantName: selectedConversation?.otherParticipantName || "User",
          otherParticipantIsOnline: onlineUserIds.has(recipientUserId),
          otherParticipantLastSeenAt: peerLastSeen,
          unreadCount: 0,
        };

        return [fallbackConversation, ...prev];
      });

      setIsAtBottom(true);
      isUserScrollingUpRef.current = false;
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== tempMessage.id));
      toast.error(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر إرسال الرسالة"
            : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  }, [
    input,
    isArabic,
    itemType,
    listingId,
    listingTitle,
    mergeIncomingMessage,
    onlineUserIds,
    peerLastSeen,
    recipientUserId,
    selectedConversation,
    selectedConversationId,
    sendTypingStop,
    userId,
  ]);

  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (!input.trim()) {
      sendTypingStop();
      return;
    }

    sendTypingStart();

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 1500);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [input, sendTypingStart, sendTypingStop]);

  if (status === "loading") {
    return (
      <div className="p-6 text-sm">
        {isArabic ? "جارٍ تحميل الدردشة..." : "Loading chat..."}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 text-sm">
        {isArabic
          ? "يرجى تسجيل الدخول لاستخدام الدردشة."
          : "Please sign in to use chat."}
      </div>
    );
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-8"
    >
      <div className="flex h-[calc(100dvh-110px)] min-h-130 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950 lg:grid lg:min-h-155 lg:grid-cols-[360px_1fr]">
        <aside
          className={`border-slate-200 bg-linear-to-b from-sky-50 to-white p-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 lg:border-b-0 lg:border-r ${
            showConversationListOnMobile ? "block w-full lg:block" : "hidden lg:block"
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
                {isArabic ? "جارٍ تحميل المحادثات..." : "Loading conversations..."}
              </p>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                {isArabic ? "لا توجد محادثات بعد." : "No conversations yet."}
              </p>
            ) : (
              conversations.map((conversation) => {
                const selected = conversation.id === selectedConversationId;
                const participantOnline = onlineUserIds.has(
                  conversation.otherParticipantId,
                );

                return (
                  <button
                    key={conversation.id}
                    onClick={() => openConversation(conversation.id)}
                    className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                      selected
                        ? "bg-sky-600 text-white shadow-lg"
                        : "bg-white/90 hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          {participantOnline ? (
                            <span
                              aria-label={isArabic ? "متصل" : "Online"}
                              className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                            />
                          ) : null}
                          <p
                            className={`truncate text-sm font-bold ${
                            selected ? "text-white" : "text-slate-900 dark:text-slate-100"
                          }`}
                          >
                            {conversation.otherParticipantName}
                          </p>
                        </div>
                        <p
                          className={`truncate text-xs ${
                            selected ? "text-sky-100" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {conversation.listingTitle || "Listing"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[11px] ${
                            selected ? "text-sky-100" : "text-slate-400"
                          }`}
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
                      className={`mt-2 truncate text-xs ${
                        selected ? "text-sky-100" : "text-slate-500 dark:text-slate-400"
                      }`}
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
            showChatOnMobile ? "flex w-full" : "hidden lg:flex"
          }`}
        >
          <header className="border-b border-slate-200/70 px-5 py-4 backdrop-blur-sm dark:border-slate-700/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setMobilePanel("list")}
                  aria-label={
                    isArabic ? "العودة لقائمة الدردشات" : "Back to chat list"
                  }
                  className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
                    {isArabic ? ">" : "<"}
                  </span>
                  {isArabic ? "العودة للمحادثات" : "Back to chats"}
                </button>
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedConversation?.otherParticipantName ||
                    (isArabic ? "ابدأ محادثة" : "Start a conversation")}
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {selectedConversation?.listingTitle ||
                    listingTitle ||
                    (isArabic ? "اختر محادثة" : "Pick a chat from the list")}
                </p>
                {selectedConversationId && recipientUserId ? (
                  <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {peerOnline
                      ? isArabic
                        ? "متصل الآن"
                        : "Online now"
                      : formatLastSeen(peerLastSeen, isArabic)}
                  </p>
                ) : null}
              </div>
              <GoBackBtn closeBtn={true} />
            </div>
          </header>

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {!selectedConversationId ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {isArabic
                  ? "افتح عنصرًا وابدأ الدردشة المباشرة، أو اختر محادثة من القائمة."
                  : "Open an item and start direct chat, or pick a conversation."}
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
                          className={`text-[11px] font-semibold ${
                            mine ? "text-sky-100" : "text-slate-500 dark:text-slate-300"
                          }`}
                        >
                          {mine
                            ? isArabic
                              ? "أنت"
                              : "You"
                            : selectedConversation?.otherParticipantName ||
                              (isArabic ? "مستخدم" : "User")}
                        </p>
                        <p className="leading-6 whitespace-pre-wrap break-words">{message.text}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                            mine ? "text-sky-100" : "text-slate-400"
                          }`}
                        >
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {renderStatus(message)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isPeerTyping ? (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                      {isArabic ? "يكتب الآن..." : "Typing..."}
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            )}

            {!isAtBottom ? (
              <button
                onClick={() =>
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                className="fixed bottom-24 right-6 rounded-full bg-sky-600 px-4 py-2 text-white shadow-lg"
              >
                ↓ {isArabic ? "رسائل جديدة" : "New messages"}
              </button>
            ) : null}
          </div>

          <footer className="border-t border-slate-200/70 p-3 dark:border-slate-700/80">
            <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onBlur={() => sendTypingStop()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                placeholder={isArabic ? "اكتب رسالة" : "Write a message"}
                className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none dark:text-slate-100"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={sending || !input.trim() || !recipientUserId || !listingId}
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
