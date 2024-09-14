"use client";
import ChatRoom from "@/components/ChatRoom";
import Video from "@/components/Video";
import useWebRTC from "@/hooks/useWebRTC";
import { useRouter } from "next/navigation";
import { getSocket } from "@/socket/socket";
interface RoomPageProps {
  params: {
    roomId: string; // roomId를 받음
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const { localVideoRef, peerConnections, leaveRoom } = useWebRTC(roomId);

  const router = useRouter();
  const socket = getSocket();
  console.log(socket.id);
  const handleLeaveRoom = () => {
    leaveRoom(); // 방을 나갈 때 호출
    router.push("/"); // 방을 나간 후 루트 경로로 리다이렉트
  };
  console.log(peerConnections.length);

  const gridClass =
    peerConnections.length < 2
      ? "grid-cols-2 grid-rows-1"
      : peerConnections.length < 4
        ? "grid-cols-2 grid-rows-2"
        : "grid-cols-3 grid-rows-3";

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
      <div id="video-grid" className={`grid ${gridClass}`}>
        {/* 로컬 비디오 */}
        <video
          id={socket.id}
          ref={localVideoRef}
          autoPlay
          muted
          className="w-full h-full max-w-[640px]"
        />

        {/* 피어 연결된 비디오들 */}
        {/*{peerConnections.map(*/}
        {/*  (peer, index) =>*/}
        {/*    peer.stream ? ( // 스트림이 있는 경우에만 렌더링*/}
        {/*      <video*/}
        {/*        key={`${peer.peerId}-${index}`}*/}
        {/*        ref={(el) => {*/}
        {/*          if (el) peer.videoElement = el;*/}
        {/*        }}*/}
        {/*        autoPlay*/}
        {/*        className="w-full h-auto border-blue"*/}
        {/*      />*/}
        {/*    ) : null, // 스트림이 없으면 렌더링하지 않음*/}
        {/*)}*/}
      </div>
      <ChatRoom roomId={roomId!} />
    </div>
  );
}
