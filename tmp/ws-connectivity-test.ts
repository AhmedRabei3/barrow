import WebSocket from "ws";

const userId = "cmjjj0ybn0000usog57jkv5r9";
const ws = new WebSocket(
  `ws://localhost:3000/ws?userId=${encodeURIComponent(userId)}`,
);

let connected = false;
let pongReceived = false;

const timeout = setTimeout(() => {
  console.log("WS_TEST_TIMEOUT", { connected, pongReceived });
  try {
    ws.close();
  } catch {}
  process.exit(1);
}, 12000);

ws.on("open", () => {
  console.log("WS_OPEN");
});

ws.on("message", (raw) => {
  try {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "connected") {
      connected = true;
      console.log("WS_CONNECTED_ACK");
      ws.send(JSON.stringify({ type: "ping" }));
      return;
    }

    if (msg.type === "pong") {
      pongReceived = true;
      console.log("WS_PONG_RECEIVED");
      clearTimeout(timeout);
      ws.close();
      process.exit(0);
    }
  } catch {
    // ignore non-json frames
  }
});

ws.on("error", (error) => {
  clearTimeout(timeout);
  console.log("WS_ERROR", error.message);
  process.exit(1);
});
