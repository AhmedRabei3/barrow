"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IoChatbubblesOutline } from "react-icons/io5";
import {
  initializeWebSocket,
  sendWebSocketEvent,
  subscribeWebSocketEvents,
} from "@/lib/socketClient";

export default function ChatBadge() {
  const { data: session } = useSession();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!session?.user?.id) {
      setUnread(0);
      return;
    }

    try {
      const response = await fetch("/api/chat/unread-count", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { unreadCount?: number };
      setUnread(Math.max(0, Number(data.unreadCount ?? 0)));
    } catch {
      // noop
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setUnread(0);
      return;
    }

    initializeWebSocket(session.user.id);
    void loadUnreadCount();

    const unsubscribeSocket = subscribeWebSocketEvents((event) => {
      if (event.type === "chat_message" && event.data.recipientId === session.user.id) {
        setUnread((prev) => prev + 1);
        sendWebSocketEvent({
          type: "message_delivered",
          conversationId: event.conversationId,
          senderId: event.data.senderId,
          messageIds: [event.data.id],
        });
      }
    });

    const refreshHandler = () => {
      void loadUnreadCount();
    };

    window.addEventListener("chat_unread_refresh", refreshHandler);

    return () => {
      unsubscribeSocket();
      window.removeEventListener("chat_unread_refresh", refreshHandler);
    };
  }, [loadUnreadCount, session?.user?.id]);

  return (
    <button
      onClick={() => router.push("/messages")}
      aria-label="Chat messages"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <IoChatbubblesOutline size={20} />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}
