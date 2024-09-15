import { useState, useRef, useEffect } from "react";
import { getSocket } from "@/socket/socket";

interface PeerConnection {
  peerId: string;
  peerConnection: RTCPeerConnection;
  videoElement: HTMLVideoElement; // 동적으로 생성된 비디오 요소
  stream?: MediaStream; // 스트림 추가
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
          console.log("createPeerConnection", peerId);
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
            const senderExists = peerConnection.getSenders().some((sender) => {
              return sender.track?.id === track.id; // 트랙 ID가 이미 존재하는지 확인
            });

            if (!senderExists) {
              peerConnection.addTrack(track, stream); // 중복되지 않는 경우에만 추가
              console.log("Track added to peerConnection:", track);
            } else {
              console.log("Track already exists, skipping:", track.id);
            }
          });
          let videoElement: any = document.createElement("video");
          videoElement.style = "width:100%; height:100%; max-width:640px";
          videoElement.autoplay = true;
          videoElement.muted = true; // 브라우저 정책 상 muted가 설정되어야 autoplay가 동작함
          // **중복된 peerId가 없을 경우에만 비디오 요소 추가**
          // 비디오 중복 체크 (이미 추가된 비디오 요소가 없으면 추가)
          if (!document.getElementById(peerId)) {
            videoElement.id = peerId; // peerId를 video ID로 설정해 중복 체크 가능하게 함
            document.getElementById("video-grid")?.appendChild(videoElement); // 동적 추가
          } else {
            videoElement = null;
            console.log(
              "*****Video element for peerId already exists:",
              peerId,
            );
          }

          // ontrack 이벤트: 피어로부터 스트림 수신 시 처리
          peerConnection.ontrack = (event) => {
            console.log("Stream received for peerId:", peerId, event.streams);
            if (event.streams && event.streams[0] && videoElement) {
              console.log(videoElement);
              videoElement.srcObject = event.streams[0]; // 스트림 할당
              videoElement?.addEventListener("loadedmetadata", () => {
                console.log("addEventListener loadedmetadata for", peerId);
                videoElement.play().catch((e) => {
                  console.error("Error playing video for peerId:", peerId, e);
                });
                // peerConnections에 스트림을 추가
                setPeerConnections((prevConnections) =>
                  prevConnections.map((peer) =>
                    peer.peerId === peerId
                      ? { ...peer, stream } // 스트림 추가
                      : peer,
                  ),
                );
              });
            } else {
              // If there's no stream, remove the video element
              if (videoElement) {
                videoElement.remove();
                console.log(
                  "No streams available for peerId, video removed:",
                  peerId,
                );
              }
              console.error("No streams available for peerId:", peerId);
            }
          };
          // ICE 후보 발생 시 소켓으로 전송
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
        // 새로운 피어가 방에 들어왔을 때 처리
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

        // 피어로부터 오퍼 수신 시 처리
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

        // 피어로부터 응답(answer) 수신 시 처리
        socketRef.current.on(
          "answer",
          async (peerId: string, answer: RTCSessionDescriptionInit) => {
            const peerConnection = peerConnections.find(
              (peer) => peer.peerId === peerId,
            )?.peerConnection;

            if (peerConnection) {
              // 현재 signalingState가 stable인지 확인
              if (peerConnection.signalingState !== "stable") {
                try {
                  await peerConnection.setRemoteDescription(answer);
                } catch (error) {
                  console.error(
                    "Failed to setRemoteDescription for peerId:",
                    peerId,
                    error,
                  );
                }
              } else {
                console.warn(
                  "Skipping setRemoteDescription because the signalingState is stable for peerId:",
                  peerId,
                );
              }
            }
          },
        );

        // ICE 후보 수신 시 처리
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
          // **1단계: peerConnections 상태 업데이트**
          setPeerConnections((prevConnections) =>
            prevConnections.filter((peer) => peer.peerId !== peerId),
          );

          // **2단계: 연결된 피어의 videoElement 삭제**
          const videoElement = document.getElementById(peerId);
          if (videoElement) {
            videoElement.remove();
            console.log(
              "Video element removed for disconnected peerId:",
              peerId,
            );
          }

          // **3단계: 유효하지 않은 연결을 정리**
          filterValidConnections();
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
  // 유효한 피어 연결만 유지하고 나머지는 제거하는 함수
  const filterValidConnections = () => {
    setPeerConnections((prevConnections) => {
      return prevConnections.filter((peer) => {
        // 스트림이 존재하고, 연결이 유효한 피어만 남김
        if (!peer.stream || !peer.peerConnection) {
          const videoElement = document.getElementById(peer.peerId);
          if (videoElement) {
            videoElement.remove(); // 유효하지 않은 연결의 비디오 요소 삭제
            console.log("Invalid peer removed:", peer.peerId);
          }
          return false; // 유효하지 않은 피어는 필터링
        }
        return true; // 유효한 피어는 유지
      });
    });
  };

  return {
    localVideoRef,
    peerConnections,
    leaveRoom,
  };
}
