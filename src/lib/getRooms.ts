export async function getRooms() {
  // 하드코딩된 방 목록 (데이터베이스 대신 사용)
  return [
    { id: 'room1', name: '방 1' },
    { id: 'room2', name: '방 2' },
    { id: 'room3', name: '방 3' },
  ];
}
