
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
import { PlusCircle, Key, X } from "lucide-react";

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
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
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

  const handleGetAccessToken = () => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      setShowTokenModal(true);
    } else {
      toast.error(t('noAccessToken'), {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: "text-center text-lg font-semibold",
      });
    }
  };

  const handleCopyToken = async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      try {
        await navigator.clipboard.writeText(accessToken);
        toast.success(t('tokenCopied'), {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          className: "text-center text-lg font-semibold",
        });
      } catch (error) {
        console.error("Failed to copy token:", error);
        toast.error(t('tokenCopyFailed'), {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          className: "text-center text-lg font-semibold",
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto">
      <ToastContainer />

      {/* Header */}
      <header className="p-4 bg-white shadow-md flex items-center justify-between">
        <button className="text-blue-500 text-sm font-medium">{t('edit')}</button>
        <h1 className="text-lg font-semibold text-gray-800">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <button onClick={handleGetAccessToken} className="text-blue-500">
            <Key className="h-6 w-6" />
          </button>
          <button onClick={() => setShowCreateRoomModal(true)} className="text-blue-500">
            <PlusCircle className="h-6 w-6" />
          </button>
        </div>
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
              lastMessage={room.lastMessage || t('noMessages')}
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

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
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

     {/* Token Display Modal */}
{/* Token Display Modal */}
{showTokenModal && (
  <div
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
    role="dialog"
    aria-labelledby="token-modal-title"
  >
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      {/* Header */}
      <div className="flex justify-center items-center mb-6 relative">
        <h3
          id="token-modal-title"
          className="text-2xl font-bold text-gray-900 tracking-tight"
        >
          Access Token
        </h3>
        <button
          onClick={() => setShowTokenModal(false)}
          className="absolute right-0 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Token Display */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="accessTokenDisplay"
            className="text-base font-medium text-gray-700 mb-2 flex items-center"
          >
            <Key className="h-5 w-5 mr-2 text-gray-400" />
            Access Token
          </label>
          <input
            id="accessTokenDisplay"
            type="text"
            value={localStorage.getItem("accessToken") || ""}
            readOnly
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-base font-mono select-all focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <p className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Hint:</span>  To obtain your access token, log in to your account and navigate to the Key icon. In the icon "Key" in Room you can generate or view your access token. Copy it here or use the "Copy" button below.
            .
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleCopyToken}
            className="flex-1 py-3 rounded-lg font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center gap-2"
            aria-label="Copy access token to clipboard"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
            Copy
          </button>
          <button
            onClick={() => setShowTokenModal(false)}
            className="flex-1 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
            aria-label="Close token modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default RoomList;