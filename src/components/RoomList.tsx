"use client"; // 클라이언트 컴포넌트 명시

import { useState } from "react";
import { useRouter } from "next/navigation";
interface RoomListProps {
  initialRooms: { id: string; name: string }[];
}

export default function RoomList({ initialRooms }: RoomListProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const router = useRouter();
  const enterRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };
  return (
    <ul className="py-10 text-2xl flex-col gap-4 flex w-full ">
      {rooms.map((room) => (
        <li
          key={room.id}
          onClick={() => enterRoom(room.id)}
          className="cursor-pointer w-full border-red rounded-2xl h-20 flex items-center justify-start p-2"
        >
          {room.name}
        </li>
      ))}
    </ul>
  );
}
