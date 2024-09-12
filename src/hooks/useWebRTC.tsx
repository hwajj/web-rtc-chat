import { useState, createRef, useEffect, useRef } from "react";
import { io } from "socket.io-client";

interface PeerConnection {
  peerId: string;
  peerConnection: RTCPeerConnection;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

export default function useWebRTC(roomId: string) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([]); // 피어 연결을 상태로 관리
  const remoteVideoRefs = useRef<
    Map<string, React.RefObject<HTMLVideoElement>>
  >(new Map());

  useEffect(() => {
    const setupWebRTC = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia는 이 브라우저에서 지원되지 않습니다.");
        return;
      }

      try {
        // getUserMedia를 통해 로컬 스트림을 가져옴
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
        const socket = io(socketUrl, { path: "/socket.io" });

        socket.emit("join-room", roomId);

        // 중복되는 peerConnection 설정 로직을 함수로 분리
        const createPeerConnection = (peerId: string): RTCPeerConnection => {
          const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          stream
            .getTracks()
            .forEach((track) => peerConnection.addTrack(track, stream));

          if (!remoteVideoRefs.current.has(peerId)) {
            remoteVideoRefs.current.set(peerId, createRef<HTMLVideoElement>());
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

          return peerConnection;
        };

        // 새 피어가 연결될 때
        socket.on("new-peer", async (peerId: string) => {
          if (peerConnections.some((peer) => peer.peerId === peerId)) {
            return; // 중복된 피어 연결 방지
          }

          console.log(`New peer: ${peerId}`);

          // 새로운 피어가 offer를 만들고 보냄
          const peerConnection = createPeerConnection(peerId);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit("offer", peerId, offer);

          setPeerConnections((prevConnections) => [
            ...prevConnections,
            {
              peerId,
              peerConnection,
              remoteVideoRef: remoteVideoRefs.current.get(peerId)!,
            },
          ]);
        });

        // Offer 수신
        socket.on(
          "offer",
          async (peerId: string, offer: RTCSessionDescriptionInit) => {
            const existingPeer = peerConnections.find(
              (peer) => peer.peerId === peerId,
            );
            if (existingPeer) {
              return; // 이미 연결된 피어에 대해서는 처리하지 않음
            }

            const peerConnection = createPeerConnection(peerId);
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("answer", peerId, answer);

            setPeerConnections((prevConnections) => [
              ...prevConnections,
              {
                peerId,
                peerConnection,
                remoteVideoRef: remoteVideoRefs.current.get(peerId)!,
              },
            ]);
          },
        );

        // Answer 수신
        socket.on(
          "answer",
          async (peerId: string, answer: RTCSessionDescriptionInit) => {
            const peerConnection = peerConnections.find(
              (peer) => peer.peerId === peerId,
            )?.peerConnection;
            if (peerConnection) {
              await peerConnection.setRemoteDescription(answer);
            }
          },
        );

        // ICE Candidate 수신
        socket.on(
          "ice-candidate",
          (peerId: string, candidate: RTCIceCandidate) => {
            const peerConnection = peerConnections.find(
              (peer) => peer.peerId === peerId,
            )?.peerConnection;
            if (peerConnection) {
              peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
          },
        );

        // 피어가 연결 해제될 때
        socket.on("peer-disconnected", (peerId: string) => {
          const updatedConnections = peerConnections.filter(
            (peer) => peer.peerId !== peerId,
          );
          setPeerConnections(updatedConnections);

          const peerConnection = peerConnections.find(
            (peer) => peer.peerId === peerId,
          )?.peerConnection;
          if (peerConnection) peerConnection.close();

          remoteVideoRefs.current.delete(peerId);
        });

        return () => {
          socket.emit("leave-room");
          socket.disconnect();
          peerConnections.forEach(({ peerConnection }) =>
            peerConnection.close(),
          );
          setPeerConnections([]); // 연결 해제 시 상태 초기화
        };
      } catch (error) {
        console.error("미디어 장치 접근 중 오류 발생:", error);
      }
    };

    setupWebRTC();
  }, [roomId]);

  return {
    localVideoRef,
    peerConnections,
  };
}
