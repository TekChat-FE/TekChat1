'use client';

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import roomService from "@/app/services/matrix/roomService";
import chatService from "@/app/services/matrix/chatService";
import authService from "@/app/services/auth/authService";
import Footer from "@/app/components/common/Footer";
import CreateRoomModal from "@/app/components/room/CreateRoomModal";
import CreateContactModal from "@/app/components/room/CreateContactModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { PlusCircle, Key, X, Mail } from "lucide-react";
import { MatrixEvent, Room as MatrixRoom, ClientEvent } from "matrix-js-sdk";

// Room data interface
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

// Invite data interface
interface InviteData {
  id: string;
  roomName: string;
  inviter: string;
}

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
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inviteDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Check login status and sync client
  useEffect(() => {
    const checkLoginAndSync = async () => {
      try {
        const client = await authService.getAuthenticatedClient();
        console.log("Sync state:", client.getSyncState && client.getSyncState());
        if (!client.getSyncState || client.getSyncState() === null || client.getSyncState() === "STOPPED") {
          client.startClient?.();
        }
        setIsClientReady(true);
      } catch {
        router.push('/auth/login');
      }
    };
    checkLoginAndSync();
  }, [router]);

  // Lấy danh sách lời mời từ client Matrix (giống Element)
  const fetchInvites = useCallback(async () => {
    try {
      const client = await authService.getAuthenticatedClient();
      const allRooms = client.getRooms();
      const inviteRooms = allRooms.filter((room: MatrixRoom) => room.getMyMembership && room.getMyMembership() === "invite");
      // Log chi tiết từng phòng invite
      console.log("Invite rooms detail:", inviteRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        myMembership: room.getMyMembership && room.getMyMembership(),
        inviter: room.getDMInviter && room.getDMInviter(),
      })));
      const invitesData: InviteData[] = inviteRooms.map((room: MatrixRoom) => {
        let inviter = "";
        try {
          // Thử lấy người mời từ sự kiện mời
          const inviteEvent = room.currentState.getStateEvents('m.room.member', room.myUserId ?? "");
          if (inviteEvent && inviteEvent.getSender()) {
            inviter = inviteEvent.getSender() ?? "";
          } else {
            // Nếu không có sự kiện mời, thử lấy từ DM inviter
            inviter = room.getDMInviter ? (room.getDMInviter() ?? "") : "";
          }
        } catch {
          inviter = "";
        }
        let roomName = "";
        try {
          roomName = room.name ? room.name : (room.roomId ?? "");
        } catch {
          roomName = room.roomId;
        }
        return {
          id: room.roomId,
          roomName,
          inviter,
        };
      });
      console.log("Invites to set:", invitesData);
      setInvites(invitesData);
    } catch {
      setInvites([]);
    }
  }, []);

  // Luôn cập nhật lời mời khi client sync hoặc có event Room mới
  useEffect(() => {
    if (!isClientReady) return;
    fetchInvites();

    let client: import("matrix-js-sdk").MatrixClient | null = null;
    let onRoom: (() => void) | null = null;
    let onSync: ((state: string) => void) | null = null;

    (async () => {
      client = await authService.getAuthenticatedClient();

      // Khi có phòng mới (bao gồm lời mời)
      onRoom = () => {
        fetchInvites();
      };
      client.on(ClientEvent.Room, onRoom);  

      // Khi client sync xong (đảm bảo nhận lời mời mới nhất)
      onSync = (state: string) => {
        if (state === "PREPARED" || state === "SYNCING") {
          fetchInvites();
        }
      };
      client.on(ClientEvent.Sync, onSync);
    })();

    return () => {
      if (client) {
        if (onRoom && typeof client.removeListener === 'function') {
          client.removeListener(ClientEvent.Room, onRoom);
        }
        if (onSync && typeof client.removeListener === 'function') {
          client.removeListener(ClientEvent.Sync, onSync);
        }
      }
    };
  }, [isClientReady, fetchInvites]);

  // Load room list
  const loadRooms = useCallback(async () => {
    if (!isClientReady) return;
    setLoading(true);
    try {
      const data = await roomService.fetchJoinedRooms();
      setRooms(sortRoomsByTimestamp(data));
    } catch {
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

  // Xác nhận lời mời
  const handleConfirmInvite = async (inviteId: string) => {
    try {
      const client = await authService.getAuthenticatedClient();
      await client.joinRoom(inviteId);
      toast.success(t('inviteAccepted'));
      await fetchInvites();
      await loadRooms();
    } catch {
      toast.error(t('inviteAcceptError'));
    }
  };

  // Từ chối lời mời
  const handleRejectInvite = async (inviteId: string) => {
    try {
      const client = await authService.getAuthenticatedClient();
      await client.leave(inviteId);
      toast.success(t('inviteRejected'));
      await fetchInvites();
    } catch {
      toast.error(t('inviteRejectError'));
    }
  };

  // Update room list with new messages
  const updateRoomList = useCallback((updatedRoom: Partial<RoomData>) => {
    setRooms((prevRooms) => {
      const existingRoom = prevRooms.find((r) => r.roomId === updatedRoom.roomId);
      if (existingRoom && existingRoom.ts && updatedRoom.ts && existingRoom.ts >= updatedRoom.ts) {
        return prevRooms;
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

  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        inviteDropdownRef.current && !inviteDropdownRef.current.contains(event.target as Node)
      ) {
        setShowInviteDropdown(false);
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
      } catch {
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
        } catch {
          // ignore
        }
      }
      toast.success(
        t('createRoomSuccess', {
          type: isGroup ? t('createRoomSuccessTypeGroup') : t('createRoomSuccessTypeContact'),
        })
      );
      loadRooms();
    } catch {
      toast.error(t('createRoomError'));
    }
  };

  // Log để debug UI
  console.log("invites in render:", invites);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="w-full max-w-md flex flex-col h-screen bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg relative font-sans overflow-hidden">
        <ToastContainer />
        {/* Header */}
        <header className="relative flex items-center h-16 bg-gray-100">
          <div className="flex items-center justify-start w-16 h-full pl-2" ref={inviteDropdownRef}>
            <button
              className="text-blue-500 hover:bg-blue-50 transition rounded-full p-1"
              onClick={() => setShowInviteDropdown((v) => !v)}
              aria-label="Invites"
            >
              <Mail className="h-7 w-7 stroke-2" />
              {invites.length > 0 && (
                <span className="absolute -top-1 left-5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 shadow font-bold">
                  {invites.length}
                </span>
              )}
            </button>
            {showInviteDropdown && (
              <div className="absolute left-0 mt-14 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20">
                <div className="p-3">
                  <h4 className="font-semibold mb-2">{t('invitesTitle')}</h4>
                  {invites.length === 0 ? (
                    <p className="text-gray-500 text-sm">{t('noInvites')}</p>
                  ) : (
                    invites.map((invite) => (
                      <div key={invite.id} className="flex flex-col mb-3 border-b pb-2 last:border-b-0">
                        <span className="font-medium">{invite.roomName}</span>
                        <span className="text-xs text-gray-500">{t('invitedBy')}: {invite.inviter}</span>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleConfirmInvite(invite.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-semibold"
                          >
                            {t('confirm')}
                          </button>
                          <button
                            onClick={() => handleRejectInvite(invite.id)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs font-semibold"
                          >
                            {t('reject')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center h-full">
            <h1 className="text-[22px] font-bold text-black tracking-tight" style={{ fontFamily: 'system-ui, sans-serif' }}>{t('title')}</h1>
          </div>
          <div className="flex items-center justify-end w-16 h-full pr-2 gap-2">
            <button onClick={handleGetAccessToken} className="text-blue-500 hover:bg-blue-50 transition rounded-full p-1" aria-label="Access Token">
              <Key className="h-7 w-7 stroke-2" />
            </button>
            <div ref={dropdownRef} className="relative h-full flex items-center">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="text-blue-500 hover:bg-blue-50 transition rounded-full p-1"
                aria-label="New Chat or Room"
              >
                <PlusCircle className="h-7 w-7 stroke-2" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-10 w-48 bg-white rounded-xl shadow-lg z-10">
                  <button
                    onClick={() => handleDropdownSelect('newGroup')}
                    className="w-full text-left px-5 py-3 text-base text-gray-900 hover:bg-gray-100 rounded-t-xl transition"
                  >
                    New Group
                  </button>
                  <button
                    onClick={() => handleDropdownSelect('newContact')}
                    className="w-full text-left px-5 py-3 text-base text-gray-900 hover:bg-gray-100 rounded-b-xl transition"
                  >
                    New Contact
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Search bar below header */}
        <div className="flex justify-center mt-0 mb-2">
          <div
            className="relative flex items-center w-[90%] max-w-md bg-[#e5e5ea] rounded-2xl h-10 px-4"
            onClick={() => searchInputRef.current?.focus()}
            style={{ cursor: 'text' }}
          >
            {/* Centered icon + placeholder */}
            {!(search.length > 0) && !isSearchFocused && (
              <div className="absolute left-1/2 top-1/2 flex items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                <svg
                  className="h-5 w-5 text-[#8e8e93] mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="text-[#8e8e93] text-[14px] font-normal" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {t('searchPlaceholder')}
                </span>
              </div>
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="bg-transparent border-none outline-none text-[#8e8e93] text-[14px] font-normal w-full placeholder:font-normal placeholder:text-[#8e8e93] text-left z-10"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : filteredRooms.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRooms.map((room) => (
                <li
                  key={room.roomId}
                  className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  onClick={() => router.push(`/chat/${room.roomId}?isGroup=${room.isGroup}`)}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg mr-4 overflow-hidden">
                    {room.name ? room.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  {/* Chat info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">{room.name}</span>
                      {room.timestamp && (
                        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{room.timestamp}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-gray-500 dark:text-gray-300 truncate">
                        {room.lastMessage || t('noMessages')}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500 dark:text-gray-400">{t('noRooms')}</p>
            </div>
          )}
        </div>

        {/* Modals and Footer (unchanged) */}
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
    </div>
  );
};

export default RoomList;