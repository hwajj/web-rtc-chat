import { createRef, useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";

interface PeerConnection {
  peerId: string;
  peerConnection: RTCPeerConnection;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

export default function useWebRTC(roomId: string) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([]);
  const remoteVideoRefs = useRef<
    Map<string, React.RefObject<HTMLVideoElement>>
  >(new Map());

  useEffect(() => {
    const setupWebRTC = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia is not supported in this browser");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 개발/배포 환경에 따른 Socket.IO 경로 설정
        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

        const socket = io(socketUrl, {
          path: "/socket.io", // 서버와 일치하는 경로
        });

        socket.emit("join-room", roomId);

        socket.on("new-peer", async (peerId: string) => {
          const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
          });

          // if (!remoteVideoRefs.current.has(peerId)) {
          //   remoteVideoRefs.current.set(
          //     peerId,
          //     useRef<HTMLVideoElement | null>(null),
          //   );
          // }

          // remoteVideoRefs를 최상위에서 관리하고 참조만 업데이트
          if (!remoteVideoRefs.current.has(peerId)) {
            const remoteRef = createRef<HTMLVideoElement>();
            remoteVideoRefs.current.set(peerId, remoteRef);
          }

          peerConnection.ontrack = (event) => {
            const ref = remoteVideoRefs.current.get(peerId);
            if (ref && ref.current) {
              ref.current.srcObject = event.streams[0];
            }
          };

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("ice-candidate", peerId, event.candidate);
            }
          };

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit("offer", peerId, offer);

          setPeerConnections((prev) => [
            ...prev,
            {
              peerId,
              peerConnection,
              remoteVideoRef: remoteVideoRefs.current.get(peerId)!,
            },
          ]);
        });

        socket.on(
          "offer",
          async (peerId: string, offer: RTCSessionDescriptionInit) => {
            const peerConnection = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            if (!remoteVideoRefs.current.has(peerId)) {
              const remoteRef = createRef<HTMLVideoElement>();
              remoteVideoRefs.current.set(peerId, remoteRef);
            }

            peerConnection.ontrack = (event) => {
              const ref = remoteVideoRefs.current.get(peerId);
              if (ref && ref.current) {
                ref.current.srcObject = event.streams[0];
              }
            };

            peerConnection.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("ice-candidate", peerId, event.candidate);
              }
            };

            await peerConnection.setRemoteDescription(offer);

            // 응답 생성 및 송신
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("answer", peerId, answer);

            setPeerConnections((prev) => [
              ...prev,
              {
                peerId,
                peerConnection,
                remoteVideoRef: remoteVideoRefs.current.get(peerId)!,
              },
            ]);
          },
        );

        socket.on(
          "answer",
          async (peerId: string, answer: RTCSessionDescriptionInit) => {
            const peerConnection = peerConnections.find(
              (p) => p.peerId === peerId,
            )?.peerConnection;
            if (peerConnection) {
              await peerConnection.setRemoteDescription(answer);
            }
          },
        );

        socket.on(
          "ice-candidate",
          (peerId: string, candidate: RTCIceCandidate) => {
            const peerConnection = peerConnections.find(
              (p) => p.peerId === peerId,
            )?.peerConnection;
            if (peerConnection) {
              peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
          },
        );

        // 컴포넌트 언마운트 시 소켓 연결 해제
        return () => {
          socket.disconnect();
          peerConnections.forEach(({ peerConnection }) =>
            peerConnection.close(),
          );
        };
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    setupWebRTC();
  }, [roomId, peerConnections]);

  return { localVideoRef, peerConnections };
}
