"use client";
import ChatRoom from "@/components/ChatRoom";
import Video from "@/components/Video";
import useWebRTC from "@/hooks/useWebRTC";
import { useRouter } from "next/navigation";
interface RoomPageProps {
  params: {
    roomId: string; // roomId를 받음
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const { leaveRoom } = useWebRTC(roomId); // useWebRTC 훅에서 leaveRoom 함수를 받아옴
  const router = useRouter(); // useRouter 훅을 사용하여 페이지 이동 제어
  const handleLeaveRoom = () => {
    leaveRoom(); // 방을 나갈 때 호출
    router.push("/"); // 방을 나간 후 루트 경로로 리다이렉트
  };
  return (
    <div className="p-6 border-black border-2 bg-white rounded-3xl flex flex-col h-full relative">
      <div className="flex w-full h-20 px-2 items-center justify-between">
        <h1 className="text-2xl font-bold ">{roomId}</h1>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
          onClick={handleLeaveRoom} // 버튼 클릭 시 leaveRoom 호출
        >
          방 나가기
        </button>
      </div>
      <div className="flex flex-col h-full lg:flex-row lg:gap-6">
        <Video roomId={roomId} />

        <ChatRoom roomId={roomId!} />
      </div>
    </div>
  );
}
