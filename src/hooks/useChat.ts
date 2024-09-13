import { useEffect, useState } from "react";
import { getSocket } from "@/socket/socket"; // 소켓 인스턴스 가져오기

interface UseChatProps {
  roomId: string;
}

interface Message {
  userId: string;
  text: string;
}

export default function useChat({ roomId }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [socketId, setSocketId] = useState<string>(""); // 소켓 ID 저장

  useEffect(() => {
    const socket = getSocket();

    // 서버로부터 소켓 ID 받기
    socket.on("connect", () => {
      setSocketId(socket.id); // 소켓 ID 저장
      console.log(">>> 소켓아이디 ", socket.id);
    });

    // 서버에서 메시지 수신
    socket.on("receive-message", (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // 방 입장
    socket.emit("join-room", roomId);

    return () => {
      socket.off("receive-message"); // 기존 리스너 제거
    };
  }, [roomId]);

  const sendMessage = () => {
    const socket = getSocket();
    if (newMessage.trim()) {
      const message = { userId: socketId, text: newMessage };
      setNewMessage(""); // 메시지 입력란 초기화
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
