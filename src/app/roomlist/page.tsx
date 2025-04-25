

'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/app/services/auth/authService';
import roomService from '@/app/services/matrix/roomService';
import chatService from '@/app/services/matrix/chatService';
import { withErrorHandling } from '@/app/services/utils/withErrorHandling';
import { ERROR_MESSAGES } from '@/app/services/utils/matrix';
import { sortRoomsByTimestamp } from '@/app/services/utils/roomUtils';
import Header from '@/app/components/common/Header';
import Footer from '@/app/components/common/Footer';
import ChatItem from '@/app/components/chat/ChatItem';
import CreateRoomModal from '@/app/components/room/CreateRoomModal';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { RoomData } from '@/app/services/matrix/roomService';

/**
 * RoomList component displays a list of chat rooms and handles room creation and new message updates.
 */
const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const router = useRouter();
  const okButtonRef = useRef<HTMLButtonElement>(null);

  // Check login status and client sync state
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

  // Check for login success message
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loginSuccess = localStorage.getItem('loginSuccess');
      if (loginSuccess === 'true') {
        setShowSuccessModal(true);
        localStorage.removeItem('loginSuccess'); // Clear flag
      }
    }
  }, []);

  // Focus on OK button and handle Enter/Esc keys
  useEffect(() => {
    if (showSuccessModal && okButtonRef.current) {
      okButtonRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSuccessModal && (e.key === 'Enter' || e.key === 'Escape')) {
        setShowSuccessModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuccessModal]);

  // Load rooms and messages
  const loadRooms = useCallback(async () => {
    if (!isClientReady) return;
    setLoading(true);
    await withErrorHandling(
      async () => {
        console.log('Starting to fetch room list...');
        const joinedRooms = await roomService.fetchJoinedRooms();
        console.log('Room list:', joinedRooms);
        setRooms(joinedRooms);
      },
      ERROR_MESSAGES.FETCH_ROOMS_FAILED,
      setError
    ).finally(() => setLoading(false));
  }, [isClientReady]);

  // Update room list with new message data
  const updateRoomList = useCallback((updatedRoom: Partial<RoomData>) => {
    setRooms((prevRooms) => {
      const updatedRooms = prevRooms.map((r) =>
        r.roomId === updatedRoom.roomId ? { ...r, ...updatedRoom } : r
      );
      return sortRoomsByTimestamp(updatedRooms);
    });
  }, []);

  // Handle room creation
  const handleCreateRoom = useCallback(
    async (roomName: string) => {
      await withErrorHandling(
        async () => {
          await roomService.createRoom(roomName);
          alert('Room created successfully!');
          await loadRooms();
        },
        ERROR_MESSAGES.CREATE_ROOM_FAILED,
        setError
      );
    },
    [loadRooms]
  );

  // Handle closing success modal
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  // Setup listeners for new messages
  useEffect(() => {
    if (!isClientReady) return;
    loadRooms();

    const setupListeners = async () => {
      const client = await authService.getAuthenticatedClient();

      const handleNewMessage = async (event: MatrixEvent, room?: Room) => {
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

  return (
    <div className="flex h-screen bg-white text-black">
      <div className="w-1/4 flex flex-col h-full">
        {/* Header */}
        <Header onCreateRoomClick={() => setIsModalOpen(true)} />

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 animate-pulse px-4">Loading room list...</p>}
          {error && <p className="text-red-500 px-4">❌ {error}</p>}
          {!loading && rooms.length === 0 && (
            <p className="text-gray-500 px-4">No rooms available.</p>
          )}

          {!loading && isClientReady &&
            rooms.map((room) => (
              <ChatItem
                key={room.roomId}
                name={room.isGroup ? `Group: ${room.name}` : room.name}
                lastMessage={room.lastMessage || 'No messages yet'}
                timestamp={room.timestamp || 'N/A'}
                sender={room.sender || 'N/A'}
                isGroup={room.isGroup || false}
                onClick={() => router.push(`/chat/${room.roomId}`)}
              />
            ))}
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Main Section */}
      <main className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Select a room to start chatting</p>
      </main>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateRoom}
      />

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 id="success-modal-title" className="text-xl font-bold text-gray-900 text-center">
              Login Successful
            </h3>
            <p className="mt-2 text-base text-gray-600 text-center">
              You have logged in successfully.
            </p>
            <button
              ref={okButtonRef}
              onClick={handleCloseSuccessModal}
              className="mt-6 w-full py-3 rounded-lg font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors duration-200"
              aria-label="Close success dialog"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;