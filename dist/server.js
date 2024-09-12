"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = (0, next_1.default)({ dev, hostname, port });
const handler = app.getRequestHandler();
app.prepare().then(() => {
    const httpServer = (0, http_1.createServer)(handler);
    const io = new socket_io_1.Server(httpServer, {
        path: "/socket.io",
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);
        socket.on("join-room", (roomId) => {
            socket.join(roomId);
            console.log(`>>>joined room :  ${socket.id}가 ${roomId} 으로 입장 `);
        });
        socket.on("chat-message", (roomId, message) => {
            console.log(`User ${socket.id}, ${roomId} chat message: ${message.text}`);
            io.to(roomId).emit("receive-message", {
                userId: message.userId,
                text: message.text,
            });
        });
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
