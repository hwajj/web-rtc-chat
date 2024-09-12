import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      // console.log(`>>>joined room :  ${socket.id}가 ${roomId} 으로 입장 `);
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

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
