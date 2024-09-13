import { useState, createRef, useEffect, useRef } from "react";
import { getSocket } from "@/socket/socket";

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
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const setupWebRTC = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia는 이 브라우저에서 지원되지 않습니다.");
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

        const socket = getSocket();
        socketRef.current = socket;

        socket.emit("join-room", roomId);

        // 싱글턴 패턴을 사용하여 피어 연결 관리
        const createPeerConnection = (peerId: string): RTCPeerConnection => {
          // 이미 해당 피어에 대한 연결이 있으면 해당 연결 반환
          let existingPeer = peerConnections.find(
            (peer) => peer.peerId === peerId,
          );
          if (existingPeer) {
            return existingPeer.peerConnection; // 기존 연결 반환
          }

          // 새로운 연결 생성
          const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          // ontrack 이벤트에서 리모트 비디오 연결 확인
          peerConnection.ontrack = (event) => {
            const ref = remoteVideoRefs.current.get(peerId);
            if (ref && ref.current) {
              ref.current.srcObject = event.streams[0]; // 비디오 스트림 할당
              console.log(`Video ref successfully set for peer: ${peerId}`);
            } else {
              console.error(`Remote video ref not set for peer: ${peerId}`);
            }
          };

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("ice-candidate", peerId, event.candidate);
            }
          };

          // 피어 연결 상태 저장
          setPeerConnections((prevConnections) => [
            ...prevConnections,
            {
              peerId,
              peerConnection,
              remoteVideoRef:
                remoteVideoRefs.current.get(peerId) ?? createRef(),
            },
          ]);

          return peerConnection;
        };

        // 새 피어가 연결될 때
        const handleNewPeer = async (peerId: string) => {
          if (socket.id === peerId) {
            console.log(`Ignored own peer ID: ${peerId}`);
            return; // 자신의 소켓 ID인 경우 무시
          }

          if (peerConnections.some((peer) => peer.peerId === peerId)) {
            console.log(`Peer already connected: ${peerId}`);
            return; // 중복된 피어 연결 방지
          }

          // 새로운 피어가 offer를 만들고 보냄
          const peerConnection = createPeerConnection(peerId);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit("offer", peerId, offer);
        };

        // 새 피어가 연결될 때만 offer 생성
        socket.on("new-peer", handleNewPeer);

        // Offer 수신
        socket.on(
          "offer",
          async (peerId: string, offer: RTCSessionDescriptionInit) => {
            const peerConnection = createPeerConnection(peerId); // 중복 피어 연결 방지
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("answer", peerId, answer);
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
          socket.off("new-peer", handleNewPeer);
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

  const leaveRoom = () => {
    if (socketRef.current) {
      console.log(socketRef.current, "leaveRoom");
      socketRef.current.emit("leave-room", roomId); // 서버에 leave-room 이벤트 전송
      socketRef.current.disconnect(); // 소켓 연결 해제
    }
    peerConnections.forEach(({ peerConnection }) => peerConnection.close()); // WebRTC 연결 종료
    setPeerConnections([]); // 연결 목록 초기화
  };

  return {
    localVideoRef,
    peerConnections,
    leaveRoom,
  };
}
