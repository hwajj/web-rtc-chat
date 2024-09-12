import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseChatProps {
  roomId: string;
}

export default function useChat({ roomId }: UseChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  useEffect(() => {
    const socketConnection = io("http://localhost:3000", {
      path: "/api/socket",
    });

    socketConnection.on("connect", () => {
      console.log("=========서버 연결 확인 :", socketConnection.id);
    });

    // 서버에서 메시지 수신
    socketConnection.on("receive-message", (message: string) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // 방 입장
    socketConnection.emit("join-room", roomId);

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [roomId]);

  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit("chat-message", roomId, newMessage);
      setNewMessage("");
    }
  };

  return { messages, newMessage, setNewMessage, sendMessage };
}
