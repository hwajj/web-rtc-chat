import { useEffect, useRef } from 'react';
import { Peer } from 'simple-peer';

interface VideoProps {
  peer: Peer.Instance; // SimplePeer 타입 지정
}

export default function Video({ peer }: VideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null); // HTMLVideoElement 타입 지정

  useEffect(() => {
    peer.on('stream', (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [peer]);

  return <video ref={ref} autoPlay className="w-1/2 h-auto" />;
}
