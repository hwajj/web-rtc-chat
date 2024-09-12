import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
interface UseChatProps {
  roomId: string;
}

interface Message {
  userId: string;
  text: string;
}

export default function useChat({ roomId }: UseChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [socketId, setSocketId] = useState<string>(""); // 소켓 ID 저장

  useEffect(() => {
    // 개발/프로덕션 환경에 따라 소켓 URL 설정
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

    const socketConnection = io(socketUrl, {
      path: "/socket.io",
    });

    // 서버로부터 소켓 ID 받기
    socketConnection.on("connect", () => {
      setSocketId(socketConnection.id as string); // 소켓 ID 저장
      console.log(">>> 소켓아이디 ", socketConnection.id);
    });

    // 서버에서 메시지 수신
    socketConnection.on("receive-message", (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // 방 입장
    socketConnection.emit("join-room", roomId);

    setSocket(socketConnection);

    return () => {
      socketConnection.off("receive-message"); // 기존 리스너 제거
      socketConnection.disconnect();
    };
  }, [roomId]);

  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      const message = { userId: socketId, text: newMessage }; // 사용자 ID와 메시지를 객체로 보냄
      setNewMessage(""); // 메시지 입력란 초기화
      console.log(newMessage);
      socket.emit("chat-message", roomId, message); // 서버로 메시지 전송
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
    socketId,
  };
}
