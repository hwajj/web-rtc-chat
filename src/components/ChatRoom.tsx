"use client";
import useChat from "@/hooks/useChat";

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const { messages, newMessage, setNewMessage, sendMessage, socketId } =
    useChat({
      roomId,
    });

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(); // 메시지 전송
    }
  };

  return (
    <div className="chat-room absolute bottom-[3rem] w-[calc(100%-3rem)] ">
      <div className="messages h-full overflow-y-scroll">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${
              msg.userId === socketId
                ? "text-right text-blue-500 "
                : "message-left text-gray-600"
            } overflow-y-scroll text-shadow`}
          >
            <span className="message-user">{msg.userId}: </span>
            <span> {msg.text}</span>
          </div>
        ))}
      </div>

      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
}
