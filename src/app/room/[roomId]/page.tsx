import { useParams } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";
interface RoomPageProps {
  params: {
    roomId: string; // roomId를 받음
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;

  return (
    <div className="p-6 border-blue flex flex-col h-full relative">
      <h1 className="text-2xl font-bold mb-4">Room ID: {roomId}</h1>

      <ChatRoom roomId={roomId!} />
    </div>
  );
}
