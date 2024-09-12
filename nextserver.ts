import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "https://dae-hwa-cheong.netlify.app"; // 실제 프로덕션 호스트나 도메인

const port = 4000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
console.log(app);
app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: ["http://localhost:4000", "https://dae-hwa-cheong.netlify.app"],
      methods: ["GET", "POST"],
      credentials: true, // 자격 증명 허용
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
        console.log(
          `User ${socket.id}, ${roomId} chat message: ${message.text}`,
        );
        io.to(roomId).emit("receive-message", {
          userId: message.userId,
          text: message.text,
        });
      },
    );

    // Offer, answer, ice-candidate 등을 처리하는 부분
    socket.on("offer", (peerId: string, offer) => {
      socket.to(peerId).emit("offer", socket.id, offer);
    });

    socket.on("answer", (peerId: string, answer) => {
      socket.to(peerId).emit("answer", socket.id, answer);
    });

    socket.on("ice-candidate", (peerId: string, candidate) => {
      socket.to(peerId).emit("ice-candidate", socket.id, candidate);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // 방에 있는 다른 피어들에게 알림
      socket.broadcast.emit("peer-disconnected", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
