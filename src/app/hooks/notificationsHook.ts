import { useEffect, useState } from "react";

type NotificationMessage = Record<string, unknown>;

export default function useWebSocketNotifications(userId: string) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const ws = new WebSocket(
      `${protocol}://${host}/ws?userId=${encodeURIComponent(userId)}`,
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as NotificationMessage;
      setNotifications((prev) => [data, ...prev]);
    };

    ws.onopen = () => console.log("🔌 WebSocket connected");
    ws.onclose = () => console.log("❌ WebSocket disconnected");

    return () => ws.close();
  }, [userId]);

  return notifications;
}
