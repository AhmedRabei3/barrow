import { useEffect, useState } from "react";

type NotificationMessage = Record<string, unknown>;

export default function useWebSocketNotifications(userId: string) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(`ws://localhost:3000/ws?userId=${userId}`);

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
