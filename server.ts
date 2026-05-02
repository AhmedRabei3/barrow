// server.ts
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeWebSocketServer } from "./src/lib/websocketServer";
import { logger } from "./src/lib/logger";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // لا تمرر طلبات WebSocket إلى Next.js
      if (req.headers.upgrade === "websocket") {
        logger.debug("Skipping WebSocket request from Next.js handler");
        return;
      }

      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error("Error handling request:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("internal server error");
      }
    }
  });

  /* تهيئة WebSocket server قبل الاستماع */
  try {
    initializeWebSocketServer({ server });
    logger.info("WebSocket server initialized successfully");
  } catch (err) {
    logger.error("Failed to initialize WebSocket server:", err);
  }

  server.listen(port, () => {
    logger.info(`Server running at http://${hostname}:${port}`);
    logger.info(`WebSocket server listening on ws://${hostname}:${port}`);
  });
});
