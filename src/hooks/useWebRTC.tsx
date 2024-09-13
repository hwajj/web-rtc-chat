import { useState, useRef, useEffect } from "react";
import { getSocket } from "@/socket/socket";

interface PeerConnection {
  peerId: string;
  peerConnection: RTCPeerConnection;
  videoElement: HTMLVideoElement; // 동적으로 생성된 비디오 요소
}

export default function useWebRTC(roomId: string) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([]);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const setupWebRTC = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia는 이 브라우저에서 지원되지 않습니다.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { max: 640 }, // 최대 너비 640px로 제한
            height: { max: 480 }, // 최대 높이 480px로 제한
            frameRate: { max: 15 }, // 프레임 레이트 제한 (예: 15fps)
          },
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socket = getSocket();
        socketRef.current = socket;

        socket.emit("join-room", roomId);

        const createPeerConnection = (peerId: string): RTCPeerConnection => {
          let existingPeer = peerConnections.find(
            (peer) => peer.peerId === peerId,
          );
          if (existingPeer) {
            console.log(
              "existingPeer found, reusing the connection for:",
              peerId,
            );
            return existingPeer.peerConnection;
          }

          const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });
          // 로컬 스트림의 트랙을 피어 연결에 추가
          stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
            console.log("Track added to peerConnection:", track);
          });
          const videoElement = document.createElement("video");
          videoElement.className = "w-full h-auto"; // 비디오 요소 스타일 적용
          videoElement.autoplay = true;
          videoElement.muted = true; // 브라우저 정책 상 muted가 설정되어야 autoplay가 동작함
          document.getElementById("video-grid")?.appendChild(videoElement); // 동적 추가

          peerConnection.ontrack = (event) => {
            console.log("Stream received for peerId:", peerId, event.streams);
            if (event.streams && event.streams[0]) {
              console.log(videoElement);
              videoElement.srcObject = event.streams[0]; // 스트림 할당
              videoElement.addEventListener("loadedmetadata", () => {
                console.log("addEventListener loadedmetadata for", peerId);
                videoElement.play().catch((e) => {
                  console.error("Error playing video for peerId:", peerId, e);
                });
              });
            } else {
              console.error("No streams available for peerId:", peerId);
            }
          };

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("ice-candidate", peerId, event.candidate);
            }
          };

          // 상태를 업데이트할 때 중복을 방지하는 로직
          setPeerConnections((prevConnections) => {
            // 중복된 peerId가 있으면 이전 연결 상태를 유지하고 추가하지 않음
            if (prevConnections.some((peer) => peer.peerId === peerId)) {
              return prevConnections;
            }

            return [
              ...prevConnections,
              { peerId, peerConnection, videoElement },
            ];
          });

          return peerConnection;
        };

        const handleNewPeer = async (peerId: string) => {
          if (socketRef.current.id === peerId) return; // 자신과 연결을 방지

          const peerConnection = createPeerConnection(peerId);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log(
            "Created offer and setLocalDescription for peerId:",
            peerId,
          );
          socketRef.current.emit("offer", peerId, offer);
        };

        socketRef.current.on("new-peer", handleNewPeer);
        socketRef.current.on(
          "offer",
          async (peerId: string, offer: RTCSessionDescriptionInit) => {
            const peerConnection = createPeerConnection(peerId);
            await peerConnection.setRemoteDescription(offer);
            console.log(
              "Received offer and setRemoteDescription for peerId:",
              peerId,
            );
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log(
              "Created answer and setLocalDescription for peerId:",
              peerId,
            );
            socketRef.current.emit("answer", peerId, answer);
          },
        );

        socketRef.current.on(
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

        socketRef.current.on(
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
        socketRef.current.on(
          "offer",
          async (peerId: string, offer: RTCSessionDescriptionInit) => {
            const peerConnection = createPeerConnection(peerId);
            await peerConnection.setRemoteDescription(offer);
            console.log(
              "Received offer and setRemoteDescription for peerId:",
              peerId,
            );
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log(
              "Created answer and setLocalDescription for peerId:",
              peerId,
            );
            socketRef.current.emit("answer", peerId, answer);
          },
        );

        socketRef.current.on(
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

        socketRef.current.on(
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
        socketRef.current.on("peer-disconnected", (peerId: string) => {
          const updatedConnections = peerConnections.filter(
            (peer) => peer.peerId !== peerId,
          );
          setPeerConnections(updatedConnections);

          const peerConnection = peerConnections.find(
            (peer) => peer.peerId === peerId,
          )?.peerConnection;
          if (peerConnection) peerConnection.close();
        });

        return () => {
          socketRef.current.off("new-peer", handleNewPeer);
          socketRef.current.emit("leave-room");
          socketRef.current.disconnect();
          peerConnections.forEach(({ peerConnection }) =>
            peerConnection.close(),
          );
          setPeerConnections([]);
        };
      } catch (error) {
        console.error("미디어 장치 접근 중 오류 발생:", error);
      }
    };
    setupWebRTC();
  }, [peerConnections, roomId]);

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit("leave-room", roomId);
      socketRef.current.disconnect();
    }
    peerConnections.forEach(({ peerConnection }) => peerConnection.close());
    setPeerConnections([]);
  };

  return {
    localVideoRef,
    peerConnections,
    leaveRoom,
  };
}
