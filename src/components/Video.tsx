"use client";

import useWebRTC from "@/hooks/useWebRTC";

export default function Video({ roomId }: { roomId: string }) {
  const { localVideoRef, peerConnections } = useWebRTC(roomId); // 여러 피어 연결

  const gridClass =
    peerConnections.length === 0
      ? "grid-cols-1 "
      : peerConnections.length < 2
        ? "grid-cols-2 grid-rows-1"
        : peerConnections.length < 4
          ? "grid-cols-2 grid-rows-2"
          : "grid-cols-3 grid-rows-3";

  return (
    <div className={"overflow-hidden w-full"}>
      <div className={`grid ${gridClass} gap-4`}>
        {/* 원격 비디오 */}
        {peerConnections.map((peer, index) => {
          console.log(peer);
          return (
            <div key={index} className="relative order-1">
              <h2 className="text-lg px-1 text-white text-shadow absolute">
                Remote Video {index + 1}
              </h2>
              <video
                ref={peer.remoteVideoRef}
                autoPlay
                playsInline
                className=" w-full h-auto object-contain aspect-video"
              />
            </div>
          );
        })}
        {/* 로컬 비디오 */}
        <div className="relative order-last">
          <h2 className="text-lg px-1 text-white text-shadow absolute">
            Local Video
          </h2>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            className=" object-contain aspect-video w-auto h-full lg:w-full lg:h-auto"
          />
        </div>
      </div>
    </div>
  );
}
