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
import {
  MdSearch,
  MdSend,
  MdDoneAll,
  MdDone,
  MdSchedule,
  MdArrowForward,
  MdArrowDownward,
  MdChatBubbleOutline,
  MdChat,
  MdSettings,
  MdAdd,
  MdEdit,
  MdMoreVert,
  MdClose,
} from "react-icons/md";

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

// ── avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name[0] ?? "?").toUpperCase();
};

const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

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
  const [convSearch, setConvSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  const lastMessageCountRef = useRef(0);
  const isUserScrollingUpRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
      quotaExceeded?: boolean;
    };

    // 429 = Firestore quota exceeded — silently keep existing state
    if (response.status === 429) {
      return;
    }

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

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (
      !conversationId ||
      readingConversationsRef.current.has(conversationId)
    ) {
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
  }, []);

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
    async (event: { conversationId: string; data: ChatMessage }) => {
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
        const current = prev.find(
          (conversation) => conversation.id === event.conversationId,
        );
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
        // Conversation list already updated inline above via setConversations.
        // No Firestore fetch needed here.
      }
    },
    [
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
            if (
              !event.messageIds.includes(message.id) ||
              message.senderId !== userId
            ) {
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
            if (
              !event.messageIds.includes(message.id) ||
              message.senderId !== userId
            ) {
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

    // Poll every 30 s when WebSocket is disconnected (not every 2 s to avoid quota exhaustion)
    const intervalId = window.setInterval(() => {
      if (wsConnected) {
        return;
      }

      void fetchConversations();
      if (selectedConversationId) {
        void fetchMessages(selectedConversationId);
      }
    }, 30_000);

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
        return <MdSchedule size={13} className="shrink-0 opacity-60" />;
      }

      if (message.status === "seen") {
        return <MdDoneAll size={13} className="shrink-0 text-sky-200" />;
      }

      if (message.status === "delivered") {
        return <MdDoneAll size={13} className="shrink-0 text-white/70" />;
      }

      return <MdDone size={13} className="shrink-0 text-white/70" />;
    },
    [userId],
  );

  const filteredConversations = useMemo(
    () =>
      convSearch.trim()
        ? conversations.filter(
            (c) =>
              c.otherParticipantName
                .toLowerCase()
                .includes(convSearch.toLowerCase()) ||
              c.lastMessage.toLowerCase().includes(convSearch.toLowerCase()),
          )
        : conversations,
    [conversations, convSearch],
  );

  const displayedMessages = useMemo(
    () =>
      showMsgSearch && msgSearch.trim()
        ? messages.filter((m) =>
            m.text.toLowerCase().includes(msgSearch.toLowerCase()),
          )
        : messages,
    [messages, msgSearch, showMsgSearch],
  );

  const activeUsers = useMemo(
    () =>
      conversations
        .filter((c) => onlineUserIds.has(c.otherParticipantId))
        .map((c) => ({
          id: c.otherParticipantId,
          name: c.otherParticipantName,
        })),
    [conversations, onlineUserIds],
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
        const existing = prev.find(
          (conversation) => conversation.id === targetId,
        );

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
          otherParticipantName:
            selectedConversation?.otherParticipantName || "User",
          otherParticipantIsOnline: onlineUserIds.has(recipientUserId),
          otherParticipantLastSeenAt: peerLastSeen,
          unreadCount: 0,
        };

        return [fallbackConversation, ...prev];
      });

      setIsAtBottom(true);
      isUserScrollingUpRef.current = false;
    } catch (error) {
      setMessages((prev) =>
        prev.filter((message) => message.id !== tempMessage.id),
      );
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
      <div className="flex h-[calc(100dvh-64px)] items-center justify-center text-sm text-slate-500 dark:text-slate-400 bg-[#f6faff] dark:bg-[#051424]">
        {isArabic ? "جارٍ تحميل الدردشة..." : "Loading chat..."}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-[calc(100dvh-64px)] items-center justify-center text-sm text-slate-500 dark:text-slate-400 bg-[#f6faff] dark:bg-[#051424]">
        {isArabic
          ? "يرجى تسجيل الدخول لاستخدام الدردشة."
          : "Please sign in to use chat."}
      </div>
    );
  }

  /* ───────────────────── RENDER ───────────────────── */
  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="flex h-[calc(100dvh-64px)] overflow-hidden bg-[#f6faff] dark:bg-[#051424]"
    >
      {/* ══ DESKTOP NAV SIDEBAR ══ */}
      <nav className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white/80 dark:bg-[#0d1c2d]/80 backdrop-blur-md border-e border-slate-200/60 dark:border-slate-700/30 shadow-lg z-10">
        {/* User profile */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/30">
          <div
            className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm ${userId ? getAvatarColor(userId) : "bg-slate-400"}`}
          >
            {session?.user?.name ? getInitials(session.user.name) : "?"}
            <span className="absolute bottom-0 inset-e-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0d1c2d]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
              {session?.user?.name || (isArabic ? "أنت" : "You")}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {isArabic ? "متصل" : "Online"}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-3 py-4 space-y-1">
          <div className="bg-[#006591]/10 dark:bg-[#89ceff]/10 text-[#006591] dark:text-[#89ceff] border-e-4 border-[#006591] dark:border-[#89ceff] rounded-s-lg px-4 py-3 flex items-center gap-4">
            <MdChat size={20} />
            <span className="text-sm font-semibold">
              {isArabic ? "كافة المحادثات" : "All Chats"}
            </span>
            {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
              <span className="ms-auto h-5 min-w-5 flex items-center justify-center rounded-full bg-[#006591] dark:bg-[#89ceff] text-white dark:text-[#001e2f] text-[10px] font-bold px-1">
                {conversations.filter((c) => c.unreadCount > 0).length}
              </span>
            )}
          </div>
          <div className="text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-700/30 px-4 py-3 flex items-center gap-4 cursor-pointer rounded-lg transition-colors">
            <MdSettings size={20} />
            <span className="text-sm">
              {isArabic ? "الإعدادات" : "Settings"}
            </span>
          </div>
        </div>

        {/* New Message button */}
        <div className="px-5 pb-6 mt-auto">
          <button className="w-full py-3.5 bg-[#006591] dark:bg-[#89ceff] text-white dark:text-[#001e2f] rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all duration-200">
            <MdAdd size={22} />
            {isArabic ? "رسالة جديدة" : "New Message"}
          </button>
        </div>
      </nav>

      {/* ══ CONVERSATION LIST ══ */}
      <div
        className={`flex flex-col border-e border-slate-200/60 dark:border-slate-700/30 bg-white/50 dark:bg-[#010f1f]/60 ${
          showConversationListOnMobile
            ? "w-full lg:w-96 lg:shrink-0"
            : "hidden lg:flex lg:w-96 lg:shrink-0"
        }`}
      >
        {/* Mobile-only top bar */}
        <header className="lg:hidden sticky top-0 z-40 flex justify-between items-center w-full px-5 h-16 bg-white/80 dark:bg-[#051424]/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-700/30 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isArabic ? "الرسائل" : "Messages"}
          </h1>
          <button className="p-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 rounded-full transition-colors active:scale-95 duration-200">
            <MdMoreVert
              size={22}
              className="text-[#006591] dark:text-[#89ceff]"
            />
          </button>
        </header>

        {/* Desktop column header */}
        <div className="hidden lg:flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-700/30">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isArabic ? "المحادثات" : "Conversations"}
          </h2>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3">
          <div
            dir={isArabic ? "rtl" : "ltr"}
            className="flex items-center  gap-2 bg-slate-100 dark:bg-[#1c2b3c] overflow-hidden rounded-full p-1"
          >
            <MdSearch
              size={17}
              className="text-slate-400 shrink-0 rounded-full bg-slate-100 dark:bg-[#1c2b3c]"
            />
            <input
              type="text"
              dir={isArabic ? "rtl" : "ltr"}
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder={
                isArabic ? "البحث في المحادثات..." : "Search conversations..."
              }
              className="flex-1 rounded-full px-2.5 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
            />
            {convSearch && (
              <button
                onClick={() => setConvSearch("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
              >
                <MdClose size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile: Active Now carousel */}
        {activeUsers.length > 0 && (
          <div className="lg:hidden flex gap-4 px-4 pb-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {activeUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 border-2 border-[#0ea5e9]">
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(user.id)}`}
                    >
                      {getInitials(user.name)}
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-e-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#051424] rounded-full" />
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-300 max-w-14 truncate text-center">
                  {user.name.split(/\s+/)[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Conversation items */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {loadingConversations ? (
            <div className="space-y-0.5 py-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center px-4 py-3 gap-4 animate-pulse"
                >
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-44 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              {convSearch
                ? isArabic
                  ? "لا توجد نتائج"
                  : "No results"
                : isArabic
                  ? "لا توجد محادثات بعد."
                  : "No conversations yet."}
            </p>
          ) : (
            filteredConversations.map((conv) => {
              const selected = conv.id === selectedConversationId;
              const online = onlineUserIds.has(conv.otherParticipantId);
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`flex items-center w-full px-4 py-3 gap-4 text-start transition-all duration-200 ${
                    selected
                      ? "bg-[#006591]/8 dark:bg-[#89ceff]/8 border-e-4 border-[#006591] dark:border-[#89ceff]"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40 active:scale-[0.99]"
                  }`}
                  style={
                    selected
                      ? {
                          backgroundColor:
                            "color-mix(in srgb, #006591 8%, transparent)",
                        }
                      : {}
                  }
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${getAvatarColor(conv.otherParticipantId)}`}
                    >
                      {getInitials(conv.otherParticipantName)}
                    </div>
                    {online && (
                      <div className="absolute bottom-0.5 inset-e-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#051424] rounded-full" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span
                        className={`font-bold text-sm truncate ${
                          selected
                            ? "text-[#006591] dark:text-[#89ceff]"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {conv.otherParticipantName}
                      </span>
                      <span
                        className={`text-[11px] shrink-0 ms-2 ${
                          selected
                            ? "text-[#006591] dark:text-[#89ceff] font-bold"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {formatMessageTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p
                        className={`text-xs truncate ${
                          selected
                            ? "text-[#006591]/70 dark:text-[#89ceff]/70 font-medium"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {conv.lastMessage ||
                          (isArabic ? "ابدأ المحادثة" : "Start chatting")}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-[#006591] dark:bg-[#89ceff] text-white dark:text-[#001e2f] text-[10px] font-bold px-1 shrink-0">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Mobile FAB — compose */}
        {showConversationListOnMobile && (
          <button className="lg:hidden fixed bottom-6 inset-e-6 w-14 h-14 bg-[#006591] dark:bg-[#89ceff] shadow-xl rounded-full flex items-center justify-center text-white dark:text-[#001e2f] active:scale-90 transition-all duration-200 z-50">
            <MdEdit size={26} />
          </button>
        )}
      </div>

      {/* ══ CHAT PANEL ══ */}
      <section
        className={`flex flex-col flex-1 min-w-0 overflow-hidden ${
          showChatOnMobile ? "flex" : "hidden lg:flex"
        }`}
      >
        {/* Chat header */}
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 lg:px-6 h-16 shrink-0 bg-white/80 dark:bg-[#0d1c2d]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/30 shadow-sm">
          {/* Left/Start: back + avatar + info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile back arrow */}
            <button
              onClick={() => setMobilePanel("list")}
              aria-label={isArabic ? "رجوع" : "Back"}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/50 active:scale-95 duration-200 shrink-0"
            >
              <MdArrowForward
                size={22}
                className={`text-slate-700 dark:text-slate-300 ${isArabic ? "" : "rotate-180"}`}
              />
            </button>

            {selectedConversation ? (
              <>
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(selectedConversation.otherParticipantId)}`}
                  >
                    {getInitials(selectedConversation.otherParticipantName)}
                  </div>
                  {peerOnline && (
                    <span className="absolute bottom-0 inset-e-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0d1c2d]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {selectedConversation.otherParticipantName}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {peerOnline ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {isArabic ? "نشط الآن" : "Active now"}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 truncate">
                        {formatLastSeen(peerLastSeen, isArabic)}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                  {isArabic ? "الرسائل" : "Messages"}
                </h2>
                <p className="text-xs text-slate-400">
                  {isArabic ? "اختر محادثة للبدء" : "Select a conversation"}
                </p>
              </div>
            )}
          </div>

          {/* Right/End: search toggle + more + close */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedConversationId && (
              <button
                onClick={() => {
                  setShowMsgSearch((s) => !s);
                  setMsgSearch("");
                }}
                className={`p-2 rounded-full transition-colors active:scale-95 duration-200 ${
                  showMsgSearch
                    ? "bg-[#006591]/15 text-[#006591] dark:bg-[#89ceff]/15 dark:text-[#89ceff]"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/50"
                }`}
              >
                <MdSearch size={22} />
              </button>
            )}
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 rounded-full transition-colors active:scale-95 duration-200">
              <MdMoreVert size={22} />
            </button>
            <GoBackBtn closeBtn={true} />
          </div>
        </header>

        {/* In-conversation search bar */}
        {showMsgSearch && selectedConversationId && (
          <div className="px-4 py-2 bg-white/90 dark:bg-[#0d1c2d]/90 border-b border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1c2b3c] rounded-full px-4 py-2">
              <MdSearch size={16} className="text-slate-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={msgSearch}
                onChange={(e) => setMsgSearch(e.target.value)}
                placeholder={
                  isArabic ? "البحث في الرسائل..." : "Search messages..."
                }
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
              />
              {msgSearch && (
                <button
                  onClick={() => setMsgSearch("")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                >
                  <MdClose size={15} />
                </button>
              )}
            </div>
            {msgSearch && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-3">
                {displayedMessages.length} {isArabic ? "نتيجة" : "result(s)"}
              </p>
            )}
          </div>
        )}

        {/* ── Chat canvas (dot-pattern background) ── */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 bg-[#f6faff] dark:bg-[#051424] bg-[radial-gradient(rgba(0,101,145,0.065)_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(rgba(137,206,255,0.05)_0.5px,transparent_0.5px)] bg-size-[24px_24px] [scrollbar-width:thin]"
        >
          {!selectedConversationId ? (
            <div className="flex flex-col h-full items-center justify-center gap-4 text-slate-400 dark:text-slate-600">
              <MdChatBubbleOutline size={60} />
              <p className="text-sm text-center max-w-xs leading-relaxed">
                {isArabic
                  ? "افتح عنصراً وابدأ الدردشة، أو اختر محادثة من القائمة."
                  : "Open an item to start chatting, or pick a conversation from the list."}
              </p>
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              {msgSearch
                ? isArabic
                  ? "لا توجد رسائل مطابقة"
                  : "No matching messages"
                : isArabic
                  ? "لا توجد رسائل بعد."
                  : "No messages yet."}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {displayedMessages.map((message, i) => {
                const mine = message.senderId === userId;
                const prev = displayedMessages[i - 1];
                const showDate =
                  !prev ||
                  new Date(message.createdAt).toDateString() !==
                    new Date(prev.createdAt).toDateString();

                return (
                  <div key={message.id} className="flex flex-col">
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="bg-white/60 dark:bg-[#273647]/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/30 text-slate-600 dark:text-slate-300 text-[11px] font-semibold px-4 py-1 rounded-full shadow-sm">
                          {new Date(message.createdAt).toLocaleDateString(
                            isArabic ? "ar-SA" : "en-US",
                            {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    )}

                    {/* Bubble row */}
                    <div
                      dir={isArabic ? "rtl" : "ltr"}
                      className={`flex flex-col mb-1 ${mine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[78%] lg:max-w-[65%] px-4 py-3 shadow-md ${
                          mine
                            ? "rounded-3xl bg-[#006591] dark:bg-[#89ceff] text-white dark:text-[#001e2f]"
                            : "rounded-3xl bg-white dark:bg-[#273647] text-slate-900 dark:text-[#d4e4fa] shadow-slate-200/80 dark:shadow-black/30"
                        }`}
                        style={{
                          borderBottomRightRadius: mine ? "4px" : undefined,
                          borderBottomLeftRadius: !mine ? "4px" : undefined,
                        }}
                      >
                        <p className="text-sm leading-6 wrap-break-word whitespace-pre-wrap">
                          {message.text}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-0.5 ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <span
                            className={`text-[11px] ${
                              mine
                                ? "text-white/75 dark:text-[#001e2f]/60"
                                : "text-slate-400 dark:text-slate-400"
                            }`}
                          >
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {renderStatus(message)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isPeerTyping && (
                <div className="flex flex-col items-start mb-1">
                  <div
                    className="flex gap-1 bg-white dark:bg-[#273647] px-4 py-3 rounded-3xl shadow-md"
                    style={{ borderBottomLeftRadius: "4px" }}
                  >
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:180ms]" />
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:360ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll-to-bottom FAB */}
          {!isAtBottom && (
            <button
              onClick={() =>
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="fixed bottom-24 inset-e-6 w-10 h-10 flex items-center justify-center bg-[#006591] dark:bg-[#89ceff] text-white dark:text-[#001e2f] rounded-full shadow-lg hover:brightness-110 transition-all z-10"
            >
              <MdArrowDownward size={20} />
            </button>
          )}
        </div>

        {/* ── Input footer ── */}
        <footer className="shrink-0 w-full flex items-center justify-center gap-2 px-4 lg:px-8 py-4 bg-white/90 dark:bg-[#0d1c2d]/90 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/30">
          <div className="flex overflow-hidden items-center gap-3 bg-slate-100 dark:bg-[#1c2b3c] rounded-full p-1 shadow-inner focus-within:ring-2 focus-within:ring-[#006591]/40 dark:focus-within:ring-[#89ceff]/30 transition-all">
            <div className="w-full overflow-hidden">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onBlur={() => sendTypingStop()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={
                  selectedConversationId && recipientUserId
                    ? isArabic
                      ? "أكتب رسالتك هنا..."
                      : "Write your message..."
                    : isArabic
                      ? "اختر محادثة للبدء"
                      : "Select a conversation to start"
                }
                disabled={!selectedConversationId || !recipientUserId}
                className="flex-1 w-full rounded-full px-4 bg-transparent text-slate-900 dark:text-white py-3 text-sm placeholder:text-slate-400 outline-none disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <button
            onClick={() => void sendMessage()}
            disabled={
              sending || !input.trim() || !recipientUserId || !listingId
            }
            className="w-11 h-11 flex items-center justify-center rounded-full bg-[#006591] dark:bg-[#89ceff] text-white dark:text-[#001e2f] shadow-lg hover:brightness-110 active:scale-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <MdSend size={18} className={isArabic ? "rotate-180" : ""} />
          </button>
        </footer>
      </section>
    </div>
  );
}
