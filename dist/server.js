"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const websocketServer_1 = require("./src/lib/websocketServer");
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const server = (0, http_1.createServer)(async (req, res) => {
        try {
            // لا تمرر طلبات WebSocket إلى Next.js
            if (req.headers.upgrade === "websocket") {
                console.log("⏭️ Skipping WebSocket request from Next.js handler");
                return;
            }
            const parsedUrl = (0, url_1.parse)(req.url || "", true);
            await handle(req, res, parsedUrl);
        }
        catch (err) {
            console.error("❌ Error handling request:", err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.end("internal server error");
            }
        }
    });
    /* تهيئة WebSocket server قبل الاستماع */
    try {
        (0, websocketServer_1.initializeWebSocketServer)({ server });
        console.log("✅ WebSocket server initialized successfully");
    }
    catch (err) {
        console.error("❌ Failed to initialize WebSocket server:", err);
    }
    server.listen(port, () => {
        console.log(`🚀 Server running at http://${hostname}:${port}`);
        console.log(`📡 WebSocket server listening on ws://${hostname}:${port}`);
    });
});
