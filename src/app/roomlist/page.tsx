'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import roomService from "@/app/services/matrix/roomService";
import ChatItem from "@/app/components/chat/ChatItem";
import Footer from "@/app/components/common/Footer";
import CreateRoomModal from "@/app/components/room/CreateRoomModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PlusCircle } from "lucide-react";

interface Room {
  roomId: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  isGroup?: boolean;
  sender?: string;
}

const RoomList: React.FC = () => {
  const t = useTranslations('RoomList');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roomService.fetchJoinedRooms();
      setRooms(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto">
      <ToastContainer />

      {/* Header */}
      <header className="p-4 bg-white shadow-md flex items-center justify-between">
        <button className="text-blue-500 text-sm font-medium">{t('edit')}</button>
        <h1 className="text-lg font-semibold text-gray-800">{t('title')}</h1>
        <button onClick={() => setShowPopup(true)} className="text-blue-500">
          <PlusCircle className="h-6 w-6" />
        </button>
      </header>

      {/* Search */}
      <div className="p-3 bg-white shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full px-5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">{t('loading')}</p>
          </div>
        ) : filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <ChatItem
              key={room.roomId}
              avatar={undefined}
              name={room.name}
              sender={room.sender || "Unknown"}
              lastMessage={room.lastMessage || "Không có tin nhắn"}
              timestamp={room.timestamp}
              isGroup={room.isGroup}
              onClick={() => router.push(`/chat/${room.roomId}?isGroup=${room.isGroup}`)}
            />
          ))
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">{t('noRooms')}</p>
          </div>
        )}
      </div>

      <CreateRoomModal
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        onCreate={async (roomName, isGroup) => {
          try {
            await roomService.createRoomWithType(roomName, isGroup);
            toast.success(
              t('createRoomSuccess', {
                type: isGroup ? t('createRoomSuccessTypeGroup') : t('createRoomSuccessTypeContact')
              }),
              {
                position: 'top-center',
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                className: 'text-center text-lg font-semibold',
              }
            );
            loadRooms();
          } catch (error) {
            console.error('Lỗi khi tạo phòng:', error);
            toast.error(t('createRoomError'), {
              position: 'top-center',
              autoClose: 3000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              className: 'text-center text-lg font-semibold',
            });
          }
        }}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default RoomList;