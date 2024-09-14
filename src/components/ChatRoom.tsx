"use client";
import useChat from "@/hooks/useChat";
import { useEffect, useRef, useState } from "react";

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const { messages, newMessage, setNewMessage, sendMessage, socketId } =
    useChat({
      roomId,
    });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault(); // 기본 Enter 동작을 막음
      sendMessage(); // 메시지 전송
    }
  };

  return (
    <div className="chat-room mt-auto w-full gap-4 flex flex-col h-52 ">
      <div className="messages h-full my-1 overflow-y-auto p-1 bg-yellow-50 rounded-3xl px-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message pt-2 ${
              msg.userId === socketId
                ? "text-right text-blue-500 "
                : "message-left text-gray-600"
            }  `}
          >
            {msg.userId !== socketId && (
              <span className="message-user font-bold">
                {msg.userId.substring(0, 6)}:{" "}
              </span>
            )}
            <span className={"text-wrap mr-1"}> {msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input gap-2 w-full flex justify-center items-center">
        <input
          className="pl-2 w-[calc(100%-6rem)]"
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          onCompositionStart={() => setIsComposing(true)} // 한글 조합 시작
          onCompositionEnd={() => setIsComposing(false)} // 한글 조합 끝
          onKeyDown={handleKeyDown} // 엔터 키 입력 처리
        />
        <button
          className="h-full ml-auto bg-blue-50 text-[12px] flex-1 rounded-xl"
          onClick={(e) => {
            e.preventDefault(); // 기본 동작 방지
            sendMessage();
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
