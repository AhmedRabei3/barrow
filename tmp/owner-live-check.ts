import WebSocket from "ws";
import { NotificationType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const ownerUserId = "cmjjj0ybn0000usog57jkv5r9";
const marker = `OWNER_RT_${Date.now()}`;

const ws = new WebSocket(
  `ws://localhost:3000/ws?userId=${encodeURIComponent(ownerUserId)}`,
);

const timeout = setTimeout(async () => {
  console.log("TIMEOUT");
  await prisma.$disconnect();
  process.exit(1);
}, 12000);

ws.on("open", () => {
  console.log("WS_OPEN");
});

ws.on("message", async (raw) => {
  try {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "connected") {
      console.log("WS_CONNECTED_ACK");
      await prisma.notification.create({
        data: {
          userId: ownerUserId,
          title: marker,
          message: "owner realtime check",
          type: NotificationType.INFO,
        },
      });
      return;
    }

    if (msg.type === "notification" && msg.data?.title === marker) {
      clearTimeout(timeout);
      console.log("OWNER_NOTIFICATION_RECEIVED");
      ws.close();
      await prisma.$disconnect();
      process.exit(0);
    }
  } catch {
    // ignore frames
  }
});

ws.on("error", async (error) => {
  clearTimeout(timeout);
  console.log("WS_ERROR", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
