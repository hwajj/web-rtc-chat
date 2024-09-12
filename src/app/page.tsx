import Image from "next/image";
import { getRooms } from "@/lib/getRooms";
import RoomList from "@/components/RoomList";

export default async function LoungePage() {
  // 서버에서 방 목록을 가져오는 로직
  const rooms = await getRooms();

  return (
    <main className="flex flex-col">
      <div className="flex  gap-4 items-center flex-col sm:flex-row">
        <RoomList initialRooms={rooms} />
      </div>
    </main>
  );
}
