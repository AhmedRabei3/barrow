"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IoChatbubblesOutline } from "react-icons/io5";

export default function ChatBadge() {
  const { data: session } = useSession();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/chat/unread-count", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) setUnread(Number(data.unreadCount ?? 0));
      } catch {
        // noop
      }
    };

    void load();

    // Poll every 30 s as a lightweight fallback
    const interval = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session?.user?.id]);

  return (
    <button
      onClick={() => router.push("/messages")}
      aria-label="Chat messages"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <IoChatbubblesOutline size={20} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
