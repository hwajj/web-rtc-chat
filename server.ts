//aws서버
import { createServer } from "http";
import { Server } from "socket.io";

const port = 4000;

// HTTP 서버 생성
const httpServer = createServer();

// Socket.IO 서버 생성
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: ["http://localhost:4000", "https://dae-hwa-cheong.netlify.app"],
    methods: ["GET", "POST"],
  },
});

// 소켓 연결 시 처리
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`>>>joined room :  ${socket.id}가 ${roomId} 으로 입장 `);
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
  });
});

// 서버 시작
httpServer.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
