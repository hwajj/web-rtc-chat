import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "https://dae-hwa-cheong.netlify.app"; // 실제 프로덕션 호스트나 도메인
const port = 4000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

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

    // 방에 참여했을 때
    socket.on("join-room", (roomId: string) => {
      // 소켓이 이미 방에 있는지 확인
      if (!socket.rooms.has(roomId)) {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // 자신을 제외한 다른 사용자들에게 새로운 피어 연결 알림
        socket.to(roomId).emit("new-peer", socket.id);
      }
    });

    // 채팅 메시지를 받을 때
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

    // WebRTC Offer 처리
    socket.on("offer", (peerId: string, offer) => {
      socket.to(peerId).emit("offer", socket.id, offer);
      console.log(`Offer sent from ${socket.id} to ${peerId}`);
    });

    // WebRTC Answer 처리
    socket.on("answer", (peerId: string, answer) => {
      socket.to(peerId).emit("answer", socket.id, answer);
      console.log(`Answer sent from ${socket.id} to ${peerId}`);
    });

    // ICE Candidate 처리
    socket.on("ice-candidate", (peerId: string, candidate) => {
      socket.to(peerId).emit("ice-candidate", socket.id, candidate);
      console.log(`ICE candidate sent from ${socket.id} to ${peerId}`);
    });

    // 방을 나갈 때
    socket.on("leave-room", (roomId: string) => {
      if (socket.rooms.has(roomId)) {
        socket.leave(roomId); // 방 나가기
        console.log(`User ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit("peer-disconnected", socket.id); // 다른 사용자에게 알림
      }
    });

    // 소켓 연결이 끊어질 때
    socket.on("disconnect", () => {
      socket.rooms.forEach((roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} disconnected from room ${roomId}`);
        socket.to(roomId).emit("peer-disconnected", socket.id); // 다른 사용자에게 알림
      });
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
