import ChatRoom from "@/components/ChatRoom";
import Video from "@/components/Video";
interface RoomPageProps {
  params: {
    roomId: string; // roomId를 받음
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;

  return (
    <div className="p-6 border-black border-2 bg-white rounded-3xl flex flex-col h-full relative">
      <h1 className="text-2xl font-bold mb-4">{roomId}</h1>
      <div className="flex flex-col h-full lg:flex-row lg:gap-6">
        <Video roomId={roomId} />

        <ChatRoom roomId={roomId!} />
      </div>
    </div>
  );
}
