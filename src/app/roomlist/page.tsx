'use client';

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import roomService from "@/app/services/matrix/roomService";
import chatService from "@/app/services/matrix/chatService";
import authService from "@/app/services/auth/authService";
import ChatItem from "@/app/components/chat/ChatItem";
import Footer from "@/app/components/common/Footer";
import CreateRoomModal from "@/app/components/room/CreateRoomModal";
import CreateContactModal from "@/app/components/room/CreateContactModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PlusCircle, Key, X } from "lucide-react";
import { MatrixEvent, Room as MatrixRoom } from "matrix-js-sdk";

// Rename interface Room to RoomData to avoid conflict
interface RoomData {
  roomId: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  ts?: number;
  isGroup?: boolean;
  sender?: string;
  otherUserId?: string; 
}

// Sort rooms by timestamp
const sortRoomsByTimestamp = (rooms: RoomData[]): RoomData[] => {
  return rooms.sort((a, b) => (b.ts || 0) - (a.ts || 0));
};

const RoomList: React.FC = () => {
  const t = useTranslations('RoomList');
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
   const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check login status and sync client
  useEffect(() => {
    const checkLoginAndSync = async () => {
      try {
        await authService.getAuthenticatedClient();
        setIsClientReady(true);
      } catch (err) {
        console.error('Error checking login or syncing client:', err);
        router.push('/auth/login');
      }
    };

    checkLoginAndSync();
  }, [router]);

  // Load room list
  const loadRooms = useCallback(async () => {
    if (!isClientReady) return;
    setLoading(true);
    try {
      const data = await roomService.fetchJoinedRooms();
      setRooms(sortRoomsByTimestamp(data));
    } catch (error) {
      console.error("Error loading rooms:", error);
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

  // Update room list with new messages
  const updateRoomList = useCallback((updatedRoom: Partial<RoomData>) => {
    console.log('Updating room with new message:', updatedRoom);
    setRooms((prevRooms) => {
      const existingRoom = prevRooms.find((r) => r.roomId === updatedRoom.roomId);
      if (existingRoom && existingRoom.ts && updatedRoom.ts && existingRoom.ts >= updatedRoom.ts) {
        return prevRooms; // Skip if message is older
      }
      const updatedRooms = prevRooms.map((r) =>
        r.roomId === updatedRoom.roomId ? { ...r, ...updatedRoom } : r
      );
      return sortRoomsByTimestamp(updatedRooms);
    });
  }, []);

  // Listen for new messages
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

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter rooms by search
  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  );

  // Handle access token modal display
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

  // Handle copying access token
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

  // Handle dropdown option selection
  const handleDropdownSelect = (option: string) => {
    if (option === 'newGroup') {
      setShowCreateRoomModal(true);
    } else if (option === 'newContact') {
      // Placeholder for New Contact functionality
      setShowCreateContactModal(true);
    }
    setShowDropdown(false);
  };

  const handleCreateGroup = async (roomName: string, isGroup: boolean, memberIds: string[]) => {
    try {
      const roomId = await roomService.createRoomWithType(roomName, isGroup);
      for (const userId of memberIds) {
        try {
          await chatService.inviteMember(roomId, userId);
        } catch (inviteErr) {
          console.error(`Không thể mời ${userId}:`, inviteErr);
        }
      }
      toast.success(
        t('createRoomSuccess', {
          type: isGroup ? t('createRoomSuccessTypeGroup') : t('createRoomSuccessTypeContact'),
        })
      );
      loadRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error(t('createRoomError'));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 max-w-md mx-auto">
      <ToastContainer />
      <header className="p-4 bg-white dark:bg-gray-800 shadow-md flex items-center justify-between">
        <button className="text-blue-500 text-sm font-medium">{t('edit')}</button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('title')}</h1>
        <div className="flex items-center gap-4 relative">
          <button onClick={handleGetAccessToken} className="text-blue-500">
            <Key className="h-6 w-6" />
          </button>
          <div ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-blue-500"
            >
              <PlusCircle className="h-6 w-6" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleDropdownSelect('newGroup')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('newGroup')}
                </button>
                <button
                  onClick={() => handleDropdownSelect('newContact')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('newContact')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="p-3 bg-white dark:bg-gray-800 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full px-5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <ChatItem
              key={room.roomId}
              avatar={undefined}
              name={room.name}
              sender={room.sender || 'Unknown'}
              lastMessage={room.lastMessage || t('noMessages')}
              timestamp={room.timestamp}
              isGroup={room.isGroup}
              userId={!room.isGroup ? room.otherUserId : undefined}
              onClick={() => router.push(`/chat/${room.roomId}?isGroup=${room.isGroup}`)}
            />
          ))
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">{t('noRooms')}</p>
          </div>
        )}
      </div>

      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onCreate={handleCreateGroup}
      />

      <CreateContactModal
        isOpen={showCreateContactModal}
        onClose={() => setShowCreateContactModal(false)}
        onCreate={async (userId) => {
          try {
            const roomId = await roomService.createDirectMessage(userId);
            toast.success(t('createContactSuccess'));
            await loadRooms();
            router.push(`/chat/${roomId}?isGroup=false`);
          } catch (error) {
            console.error('Error creating contact:', error);
            throw new Error(`Failed to create contact: ${(error as Error).message}`);
          }
        }}
      />

      {showTokenModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="token-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex justify-center items-center mb-6 relative">
              <h3
                id="token-modal-title"
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"
              >
                {t('accessTokenTitle')}
              </h3>
              <button
                onClick={() => setShowTokenModal(false)}
                className="absolute right-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label={t('closeModal')}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="accessTokenDisplay"
                  className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center"
                >
                  <Key className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
                  {t('accessTokenLabel')}
                </label>
                <input
                  id="accessTokenDisplay"
                  type="text"
                  value={typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') || '' : ''}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-base font-mono select-all focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{t('hint')}:</span> {t('accessTokenHint')}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCopyToken}
                  className="flex-1 py-3 rounded-lg font-medium text-white bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center gap-2"
                  aria-label={t('copyToken')}
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
                  {t('copy')}
                </button>
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="flex-1 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
                  aria-label={t('close')}
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default RoomList;