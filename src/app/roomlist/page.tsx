'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import roomService from "@/app/services/matrix/roomService";
import chatService from "@/app/services/matrix/chatService";
import authService from "@/app/services/auth/authService";
import ChatItem from "@/app/components/chat/ChatItem";
import Footer from "@/app/components/common/Footer";
import CreateRoomModal from "@/app/components/room/CreateRoomModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PlusCircle } from "lucide-react";
import { MatrixEvent, Room as MatrixRoom } from "matrix-js-sdk";

// Đổi tên interface Room thành RoomData để tránh xung đột
interface RoomData {
  roomId: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  ts?: number;
  isGroup?: boolean;
  sender?: string;
}

// Hàm sắp xếp phòng theo timestamp
const sortRoomsByTimestamp = (rooms: RoomData[]): RoomData[] => {
  return rooms.sort((a, b) => (b.ts || 0) - (a.ts || 0));
};

const RoomList: React.FC = () => {
  const t = useTranslations('RoomList');
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const router = useRouter();

  // Kiểm tra trạng thái đăng nhập và đồng bộ client
  useEffect(() => {
    const checkLoginAndSync = async () => {
      try {
        await authService.getAuthenticatedClient();
        setIsClientReady(true);
      } catch (err) {
        console.error('Lỗi khi kiểm tra đăng nhập hoặc đồng bộ client:', err);
        router.push('/auth/login');
      }
    };

    checkLoginAndSync();
  }, [router]);

  // Tải danh sách phòng
  const loadRooms = useCallback(async () => {
    if (!isClientReady) return;
    setLoading(true);
    try {
      const data = await roomService.fetchJoinedRooms();
      setRooms(sortRoomsByTimestamp(data));
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng:", error);
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
    } finally {
      setLoading(false);
    }
  }, [isClientReady, t]);

  // Cập nhật danh sách phòng với tin nhắn mới
  const updateRoomList = useCallback((updatedRoom: Partial<RoomData>) => {
    console.log('Cập nhật phòng với tin nhắn mới:', updatedRoom);
    setRooms((prevRooms) => {
      const existingRoom = prevRooms.find((r) => r.roomId === updatedRoom.roomId);
      if (existingRoom && existingRoom.ts && updatedRoom.ts && existingRoom.ts >= updatedRoom.ts) {
        return prevRooms; // Bỏ qua nếu tin nhắn cũ hơn
      }
      const updatedRooms = prevRooms.map((r) =>
        r.roomId === updatedRoom.roomId ? { ...r, ...updatedRoom } : r
      );
      return sortRoomsByTimestamp(updatedRooms);
    });
  }, []);

  // Lắng nghe tin nhắn mới
  useEffect(() => {
    if (!isClientReady) return;
    loadRooms();

    const setupListeners = async () => {
      const client = await authService.getAuthenticatedClient();

      const handleNewMessage = async (event: MatrixEvent, room?: MatrixRoom) => {
        if (!room) return;
        const updatedRoom = await chatService.processNewMessage(event, room, client);
        if (updatedRoom) {
          updateRoomList(updatedRoom);
        }
      };

      const removeMessageListener = await chatService.onNewMessage(handleNewMessage);
      return removeMessageListener;
    };

    let cleanup: (() => void) | undefined;
    setupListeners().then((removeListener) => {
      cleanup = removeListener;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isClientReady, loadRooms, updateRoomList]);

  // Lọc phòng theo tìm kiếm
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