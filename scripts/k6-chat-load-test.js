import http from "k6/http";
import ws from "k6/ws";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const WS_URL = __ENV.WS_URL || "ws://localhost:3000/ws";
const TEST_DURATION = __ENV.DURATION || "5m";
const VUS = __ENV.VUS || 100;

// Custom metrics
const chatMessageLatency = new Trend("chat_message_latency");
const wsConnectionErrors = new Counter("ws_connection_errors");
const messagesSent = new Counter("messages_sent");
const messagesDelivered = new Counter("messages_delivered");
const messagesSeen = new Counter("messages_seen");

export const options = {
  vus: parseInt(VUS),
  duration: TEST_DURATION,
  thresholds: {
    "chat_message_latency": ["p(95)<500", "p(99)<1000"],
    "ws_connection_errors": ["count<10"],
    "http_req_duration": ["p(95)<1000"],
  },
};

// Simulate user sending chat messages and WebSocket communication
export default function () {
  const userId = `user-${__VU}`;
  const recipientId = `user-${(__VU % 10) + 1}`;
  const listingId = "listing-001";

  group("Chat Message Flow", () => {
    // 1. Send HTTP POST message
    const sendStartTime = Date.now();
    const sendRes = http.post(`${BASE_URL}/api/chat/messages`, JSON.stringify({
      recipientUserId: recipientId,
      listingId,
      listingTitle: "Test Listing",
      text: `Test message from ${userId} at ${new Date().toISOString()}`,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const sendLatency = Date.now() - sendStartTime;
    chatMessageLatency.add(sendLatency);

    check(sendRes, {
      "message sent": (r) => r.status === 200,
      "has message payload": (r) => r.json("message.id") !== undefined,
    });

    if (sendRes.status === 200) {
      messagesSent.add(1);
    }
  });

  group("WebSocket Real-time", () => {
    // 2. Connect WebSocket
    const wsStartTime = Date.now();
    const res = ws.connect(`${WS_URL}?userId=${userId}`, (socket) => {
      socket.on("open", () => {
        // Subscribe to presence updates
        socket.send(JSON.stringify({
          type: "presence_subscribe",
          userIds: [recipientId],
        }));
      });

      socket.on("message", (msg) => {
        const event = JSON.parse(msg);

        if (event.type === "chat_message") {
          messagesDelivered.add(1);
        }
        if (event.type === "message_delivered") {
          messagesDelivered.add(1);
        }
        if (event.type === "message_seen") {
          messagesSeen.add(1);
        }
        if (event.type === "user_online") {
          check(event, {
            "presence update received": (e) => e.userId !== undefined,
          });
        }
      });

      socket.on("close", () => {
        // Expected close
      });

      socket.on("error", () => {
        wsConnectionErrors.add(1);
      });

      // Send typing indicator
      sleep(0.5);
      socket.send(JSON.stringify({
        type: "typing_start",
        conversationId: `listing-001_${userId}_${recipientId}`,
        recipientId,
      }));

      sleep(1);
      socket.send(JSON.stringify({
        type: "typing_stop",
        conversationId: `listing-001_${userId}_${recipientId}`,
        recipientId,
      }));

      // Keep connection open
      socket.setTimeout(() => {
        socket.close();
      }, 10000);
    });

    check(res, {
      "WebSocket connected": (r) => r.status === 101,
    });
  });

  // 3. Fetch conversations list
  group("Fetch Conversations", () => {
    const convRes = http.get(`${BASE_URL}/api/chat/conversations`);
    check(convRes, {
      "conversations loaded": (r) => r.status === 200,
      "has conversations": (r) => r.json("conversations") !== null,
    });
  });

  sleep(Math.random() * 2); // Random delay between requests
}

export function handleSummary(data) {
  return {
    "stdout": textSummary(data, { indent: " ", enableColors: true }),
    "summary.json": JSON.stringify(data),
  };
}

// Simple text summary generator
function textSummary(data, options = {}) {
  let summary = "\n=== Load Test Summary ===\n";

  summary += `Total HTTP Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `WebSocket Connections: ${data.metrics.ws_connects?.values?.count || 0}\n`;
  summary += `Messages Sent: ${data.metrics.messages_sent?.values?.value || 0}\n`;
  summary += `Messages Delivered: ${data.metrics.messages_delivered?.values?.value || 0}\n`;
  summary += `Messages Seen: ${data.metrics.messages_seen?.values?.value || 0}\n`;
  summary += `WS Connection Errors: ${data.metrics.ws_connection_errors?.values?.value || 0}\n`;

  if (data.metrics.chat_message_latency?.values) {
    const latency = data.metrics.chat_message_latency.values;
    summary += `\nMessage Latency:\n`;
    summary += `  Avg: ${latency.avg || 0}ms\n`;
    summary += `  Min: ${latency.min || 0}ms\n`;
    summary += `  Max: ${latency.max || 0}ms\n`;
    summary += `  P95: ${latency["p(95)"] || 0}ms\n`;
  }

  return summary;
}
