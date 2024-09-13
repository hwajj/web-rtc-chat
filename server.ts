import { createServer } from "http"; // HTTP 서버로 변경
import { Server } from "socket.io";

const isProduction = process.env.NODE_ENV === "production";

const httpServer = createServer();
const users = {}; // 사용자 ID와 소켓 ID를 매핑

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
  console.log(
    `>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>User connected: ${socket.id}`,
  );

  socket.on("join-room", ({ userId, roomId }) => {
    // 기존 소켓이 있으면 해당 연결을 끊음
    if (users[userId]) {
      const oldSocketId = users[userId];
      io.to(oldSocketId).disconnectSockets(true); // 기존 소켓 연결을 강제로 끊음
      console.log(`Old socket ${oldSocketId} disconnected`);
    }

    // 새로운 소켓을 저장
    users[userId] = socket.id;
    socket.join(roomId);

    // 자신을 제외한 다른 사용자들에게 새로운 피어 연결 알림
    socket.to(roomId).emit("new-peer", socket.id);
  });

  socket.on("leave-room", (roomId: string) => {
    socket.leave(roomId); // 사용자를 방에서 제거
    socket.to(roomId).emit("peer-disconnected", socket.id); // 다른 사용자에게 알림
    console.log(`User ${socket.id} left room ${roomId}`);
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
    // 소켓이 끊어졌을 때 users에서 해당 사용자 ID 제거
    const userId = Object.keys(users).find((key) => users[key] === socket.id);
    if (userId) {
      delete users[userId]; // 사용자 ID와 소켓 연결 제거
    }
    socket.broadcast.emit("peer-disconnected", socket.id);
  });
});

httpServer.listen(4000, () => {
  console.log(`HTTP WebSocket server running on port 4000`);
});
