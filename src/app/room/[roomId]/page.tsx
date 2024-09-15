"use client";
import ChatRoom from "@/components/ChatRoom";
import useWebRTC from "@/hooks/useWebRTC";
import { useRouter } from "next/navigation";
import { getSocket } from "@/socket/socket";
import { useEffect } from "react";
interface RoomPageProps {
  params: {
    roomId: string; // roomId를 받음
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const { localVideoRef, leaveRoom } = useWebRTC(roomId);

  const router = useRouter();
  const socket = getSocket();

  const handleLeaveRoom = () => {
    leaveRoom(); // 방을 나갈 때 호출
    router.push("/"); // 방을 나간 후 루트 경로로 리다이렉트
  };

  // 새로고침 코드 추가
  useEffect(() => {
    // 새로고침을 조건부로 처리하여 무한 새로고침 방지
    const reloadPage = () => {
      if (!localStorage.getItem("reloaded")) {
        localStorage.setItem("reloaded", "true");
        window.location.reload(); // 새로고침
      } else {
        localStorage.removeItem("reloaded"); // 새로고침 이후에는 값 제거
      }
    };

    reloadPage();
  }, []);

  // 로딩 중일 때 로딩 화면을 표시

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
      {/* 비디오를 담을 그리드 */}
      <div
        id="video-grid"
        className={`grid grid-cols-2 w-full h-full overflow-hidden mb-4`}
      >
        {/* 로컬 비디오 */}
        <video
          id={socket.id}
          ref={localVideoRef}
          autoPlay
          muted
          className="w-auto h-full object-cover max-w-full max-h-full"
        />
      </div>
      <ChatRoom roomId={roomId!} />
    </div>
  );
}
