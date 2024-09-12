import { createServer } from "http"; // HTTP 서버로 변경
import { Server } from "socket.io";

const isProduction = process.env.NODE_ENV === "production";

const httpServer = createServer();

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: isProduction
      ? ["https://dae-hwa-jeong.netlify.app"]
      : ["http://localhost:4000"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);

    // 방에 있는 다른 사용자들에게 new-peer 이벤트 전송
    socket.to(roomId).emit("new-peer", socket.id);
  });

  socket.on(
    "chat-message",
    (roomId: string, message: { userId: string; text: string }) => {
      console.log(`User ${socket.id}, ${roomId} chat message: ${message.text}`);
      io.to(roomId).emit("receive-message", {
        userId: message.userId,
        text: message.text,
      });
    },
  );

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    // 방에 있는 다른 피어들에게 알림
    socket.broadcast.emit("peer-disconnected", socket.id);
  });
});

httpServer.listen(4000, () => {
  console.log(`HTTP WebSocket server running on port 4000`);
});
