/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/chat/[roomId]/chatView.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MatrixClient, MatrixEvent, Room, RoomMember, RoomMemberEvent } from "matrix-js-sdk";
import chatService, { ChatMessage } from "@/app/services/matrix/chatService";
import roomService from "@/app/services/matrix/roomService";
import { withErrorHandling } from "@/app/services/utils/withErrorHandling";
import useCall from "@/app/hooks/useCall";
import MessageList from "@/app/components/chat/MessageList";
import ChatSidebar from "@/app/components/chat/ChatSidebar";
import CallModal from "@/app/components/call/CallModal";
import VoiceCallUI from "@/app/components/call/VoiceCallUI";
import VideoCallUI from "@/app/components/call/VideoCallUI";
import SearchList from "@/app/components/chat/SearchList";
import { PresenceService } from "@/app/services/matrix/presenceService";
import authService from "@/app/services/auth/authService";
import { SetPresence } from "matrix-js-sdk";
import { FiMoreVertical, FiImage, FiSearch } from "react-icons/fi";
import { IoSend } from "react-icons/io5";

interface ChatViewProps {
  matrixClient: MatrixClient;
  roomId: string;
}

const ChatView: React.FC<ChatViewProps> = ({ matrixClient, roomId }) => {
  // All hooks and variables must be declared here, before any return
  const router = useRouter();
  const { state, startCall } = useCall();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [roomName, setRoomName] = useState<string>("");
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [inviteUserId, setInviteUserId] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [readEventId, setReadEventId] = useState<string | null>(null);
  const [deliveredEventId, setDeliveredEventId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const currentUserId = matrixClient.getUserId();
  const [scrollToEventId, setScrollToEventId] = useState<string | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const [showEmptySearchError, setShowEmptySearchError] = useState(false);
  const mediaMessages = messages
    .filter(msg => msg.isImage && typeof msg.imageUrl === 'string')
    .map(msg => ({
      eventId: msg.eventId,
      imageUrl: msg.imageUrl as string,
      timestamp: String(msg.timestamp),
    }));

  const fetchRoomData = useCallback(async () => {
    try {
      const [roomName, members, fetchedMessages] = await Promise.all([
        chatService.getRoomName(roomId),
        chatService.getRoomMembers(roomId),
        chatService.getRoomMessages(roomId),
      ]);

      setRoomName(roomName);
      setMembers(members);
      setMessages(fetchedMessages);
      const storedDelivered = localStorage.getItem(`delivered-${roomId}`);
      const storedRead = localStorage.getItem(`read-${roomId}`);

      // Tìm lại tin nhắn của chính mình trùng với ID đã lưu
      if (storedDelivered) {
        const matchedDelivered = fetchedMessages.find(
          (m) => m.sender === currentUserId && m.eventId === storedDelivered
        );
        if (matchedDelivered) {
          setDeliveredEventId(matchedDelivered.eventId);
        }
      }

      if (storedRead) {
        const matchedRead = fetchedMessages.find(
          (m) => m.sender === currentUserId && m.eventId === storedRead
        );
        if (matchedRead) {
          setReadEventId(matchedRead.eventId);
        }
      }

      // Lấy isGroup từ roomService
      const joinedRooms = await roomService.fetchJoinedRooms();
      const currentRoom = joinedRooms.find((r) => r.roomId === roomId);
      setIsGroup(currentRoom?.isGroup ?? false);

      setError(null);
    } catch (err) {
      console.error("Lỗi trong fetchRoomData:", err);
      setError("Không thể tải dữ liệu phòng chat.");
    }
  }, [roomId, matrixClient]);

  const handleNewMessage = useCallback(
    async (event: MatrixEvent, room?: Room) => {
      if (!room || room.roomId !== roomId) return;

      const newMessage = await chatService.processChatMessage(
        event,
        matrixClient
      );
      if (!newMessage) return;

      const currentUserId = matrixClient.getUserId();
      const isOwnMessage = newMessage.sender === currentUserId;

      // Bỏ qua tin nhắn của chính người gửi
      if (isOwnMessage) return;

      // Gửi "delivered" nếu là tin của người khác
      PresenceService.getInstance().updatePresence(
        SetPresence.Online,
        `delivered:${roomId}`
      );

      setMessages((prev) => {
        if (prev.some((m) => m.eventId === newMessage.eventId)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    },
    [roomId, matrixClient]
  );

  
  useEffect(() => {
    const checkClientReady = async () => {
      try {
        const client = await authService.getAuthenticatedClient();
        if (!client.getSyncState || client.getSyncState() === null || client.getSyncState() === "STOPPED") {
          await client.startClient();
        }
        setIsClientReady(true);
      } catch (err) {
        console.error("Client not ready:", err);
        router.push('/auth/login');
      }
    };
    checkClientReady();
  }, [router]);

  useEffect(() => {
    if (!isClientReady) return;
    setLoading(true);
    fetchRoomData().finally(() => setLoading(false));
  }, [isClientReady, fetchRoomData]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    chatService.onNewMessage(handleNewMessage).then((removeListener) => {
      cleanup = removeListener;
    });

    return () => {
      cleanup?.(); // Cleanup để không nhân đôi listener
    };
  }, [handleNewMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      PresenceService.getInstance().updatePresence(
        SetPresence.Online,
        `read:${roomId}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    const storedDelivered = localStorage.getItem(`delivered-${roomId}`);
    if (storedDelivered) setDeliveredEventId(storedDelivered);

    const storedRead = localStorage.getItem(`read-${roomId}`);
    if (storedRead) setReadEventId(storedRead);
  }, [roomId]);

  useEffect(() => {
    if (deliveredEventId) {
      localStorage.setItem(`delivered-${roomId}`, deliveredEventId);
    }
  }, [deliveredEventId, roomId]);

  useEffect(() => {
    if (readEventId) {
      localStorage.setItem(`read-${roomId}`, readEventId);
    }
  }, [readEventId, roomId]);

  // Listen for presence events to update delivered/read statuses in real time
  useEffect(() => {
    if (members.length !== 2) return;
    const otherUserId = members.find(m => m.userId !== currentUserId)?.userId;
    if (!otherUserId) return;

    const handlePresenceEvent = (event: import("matrix-js-sdk").MatrixEvent) => {
      if (event.getType() !== "m.presence") return;
      if (event.getSender() !== otherUserId) return;
      const content = event.getContent();
      const lastOwnMsg = messages.filter(m => m.sender === currentUserId).at(-1);
      if (!lastOwnMsg) return;

      // Read: if statusMsg is exactly 'read:roomId'
      if (content.statusMsg === `read:${roomId}`) {
        if (readEventId !== lastOwnMsg.eventId) {
          setReadEventId(lastOwnMsg.eventId);
          localStorage.setItem(`read-${roomId}`, lastOwnMsg.eventId);
        }
        // Also clear delivered if read is set
        if (deliveredEventId !== null) {
          setDeliveredEventId(null);
          localStorage.removeItem(`delivered-${roomId}`);
        }
      } else if (content.presence === "online") {
        // Delivered: if online but not in the room and not read
        if (readEventId !== lastOwnMsg.eventId && deliveredEventId !== lastOwnMsg.eventId) {
          setDeliveredEventId(lastOwnMsg.eventId);
          localStorage.setItem(`delivered-${roomId}`, lastOwnMsg.eventId);
        }
      }
    };
    const presenceService = PresenceService.getInstance();
    presenceService.onPresenceEvent(handlePresenceEvent);
    return () => {
      presenceService.offPresenceEvent(handlePresenceEvent);
    };
  }, [
    members.length,
    members.map(m => m.userId).join(','),
    messages.length,
    messages.at(-1)?.eventId,
    currentUserId,
    deliveredEventId,
    readEventId,
    roomId
  ]);

  // Real-time read status: listen for receipt events
  useEffect(() => {
    if (!matrixClient || !roomId) return;
    const room = matrixClient.getRoom(roomId);
    if (!room) return;

    const handleReceipt = () => {
      const lastOwnMsg = messages.filter(m => m.sender === currentUserId).at(-1);
      if (!lastOwnMsg) return;

      const event = room.findEventById
        ? room.findEventById(lastOwnMsg.eventId)
        : room.getLiveTimeline().getEvents().find(e => e.getId() === lastOwnMsg.eventId);
      if (!event) return;

      const receipts = room.getReceiptsForEvent(event);
      const otherUser = members.find(m => m.userId !== currentUserId);
      const isRead = receipts && otherUser && receipts.some(r => r.userId === otherUser.userId);

      if (isRead) {
        if (readEventId !== lastOwnMsg.eventId) {
          setReadEventId(lastOwnMsg.eventId);
          localStorage.setItem(`read-${roomId}`, lastOwnMsg.eventId);
        }
      } else if (readEventId === lastOwnMsg.eventId) {
        setReadEventId(null);
        localStorage.removeItem(`read-${roomId}`);
      }
    };

    // @ts-expect-error: Matrix SDK event name is a string
    room.on('Room.receipt', handleReceipt);
    // Call once on mount to set initial state
    handleReceipt();
    return () => {
      // @ts-expect-error: Matrix SDK event name is a string
      room.off('Room.receipt', handleReceipt);
    };
  }, [
    matrixClient,
    roomId,
    messages.length,
    messages.at(-1)?.eventId,
    currentUserId,
    readEventId,
    members.map(m => m.userId).join(',')
  ]);

  // Set presence statusMsg to 'read:roomId' when entering the room, clear on leave
  useEffect(() => {
    PresenceService.getInstance().updatePresence(SetPresence.Online, `read:${roomId}`);
    return () => {
      PresenceService.getInstance().updatePresence(SetPresence.Online, "");
    };
  }, [roomId]);

  // On B's client: send a read receipt for the last message when viewing the room
  useEffect(() => {
    if (!matrixClient || !roomId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      const room = matrixClient.getRoom(roomId);
      if (room) {
        const event = room.findEventById
          ? room.findEventById(lastMsg.eventId)
          : room.getLiveTimeline().getEvents().find(e => e.getId() === lastMsg.eventId);
        if (event) {
          matrixClient.sendReadReceipt(event);
        }
      }
    }
  }, [matrixClient, roomId, messages.length, messages.at(-1)?.eventId]);

  // Listen for typing events from the other user
  useEffect(() => {
    if (!matrixClient || !roomId || members.length !== 2) return;
    const otherUser = members.find(m => m.userId !== currentUserId);
    if (!otherUser) return;

    const handleTyping = (_event: MatrixEvent, member: RoomMember) => {
      if (member.userId === otherUser.userId) {
        setOtherUserTyping(!!member.typing);
      }
    };
    matrixClient.on(RoomMemberEvent.Typing, handleTyping);
    return () => {
      matrixClient.off(RoomMemberEvent.Typing, handleTyping);
    };
  }, [matrixClient, roomId, members, currentUserId]);

  // Helper to send typing event
  const sendTyping = (isTyping: boolean) => {
    if (!matrixClient || !roomId) return;
    const now = Date.now();
    // Only send if state changes or every 3 seconds
    if (
      isTyping ||
      now - lastTypingSentRef.current > 3000
    ) {
      matrixClient.sendTyping(roomId, isTyping, 5000); // 5s timeout
      lastTypingSentRef.current = now;
    }
  };

  // Clean up typing on unmount
  useEffect(() => {
    if (!matrixClient || !roomId) return;
    return () => {
      matrixClient.sendTyping(roomId, false, 1000);
    };
  }, [matrixClient, roomId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const currentUserId = matrixClient.getUserId();
    const tempEventId = `temp-${Date.now()}`;
    const newMessage: ChatMessage = {
      sender: currentUserId || "Bạn",
      body: messageText,
      eventId: tempEventId,
      tempId: tempEventId,
      avatarUrl: undefined,
      timestamp: Date.now(),
      status: "sending",
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");

    await withErrorHandling(
      () => chatService.sendMessage(roomId, messageText, tempEventId),
      "Không thể gửi tin nhắn.",
      setError
    )
      .then((eventId) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.eventId === tempEventId
              ? { ...msg, eventId, status: "sent" }
              : msg
          )
        );
      })
      .catch(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.eventId === tempEventId
              ? { ...msg, body: `Lỗi gửi: ${messageText}`, status: "error" }
              : msg
          )
        );
      });
  };

  const handleInviteMember = async () => {
    if (!inviteUserId.trim()) return;
    await withErrorHandling(
      () => chatService.inviteMember(roomId, inviteUserId),
      "Không thể mời thành viên.",
      setError
    ).then(() => {
      setInviteUserId("");
    });
  };

  const handleDeleteRoom = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    await withErrorHandling(
      () => roomService.deleteRoom(roomId),
      "Không thể xóa phòng.",
      setError
    ).then(() => {
      router.push("/roomlist");
    });
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchRoomData().finally(() => setLoading(false));
  };

  const handleStartVoiceCall = () => {
    startCall(roomId, "voice");
  };

  const handleStartVideoCall = () => {
    startCall(roomId, "video");
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    const currentUserId = matrixClient.getUserId();
    const tempEventId = `temp-${Date.now()}`;

    try {
      // Tạo tin nhắn tạm thời
      const tempMessage: ChatMessage = {
        sender: currentUserId || "Bạn",
        body: "Đang tải ảnh...",
        eventId: tempEventId,
        tempId: tempEventId,
        avatarUrl: undefined,
        timestamp: Date.now(),
        status: "sending",
        isImage: true,
        imageUrl: URL.createObjectURL(selectedImage)
      };
      setMessages(prev => [...prev, tempMessage]);

      // Gửi ảnh lên server
      const eventId = await chatService.sendImage(roomId, selectedImage, tempEventId);
      
      // Cập nhật tin nhắn với eventId thật
      setMessages(prev => 
        prev.map(msg => 
          msg.eventId === tempEventId 
            ? { ...msg, eventId, status: "sent" }
            : msg
        )
      );
    } catch (error) {
      console.error("Lỗi khi gửi ảnh:", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.eventId === tempEventId 
            ? { ...msg, body: "Lỗi khi gửi ảnh", status: "error" }
            : msg
        )
      );
    } finally {
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    }
  };

  // In the message input, trigger typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 4000); // Stop typing after 4s of inactivity
  };

  // Only after all hooks and currentUserId, do conditional returns
  if (!isClientReady) {
    return (
      <div className="flex h-screen bg-gray-50 text-gray-800 justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUserId) {
    console.warn("No user logged in, redirecting to login");
    router.push("/auth/login");
    return null;
  }

  // Deduplicate messages by eventId (robust)
  const dedupeMessages = (msgs: ChatMessage[]) => {
    const seen = new Set();
    return msgs.filter((msg) => {
      if (seen.has(msg.eventId)) return false;
      seen.add(msg.eventId);
      return true;
    });
  };

  // Apply deduplication before rendering
  const dedupedMessages = dedupeMessages(messages);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 justify-center items-center">
      <div className="flex flex-col w-full max-w-md h-full bg-white shadow-lg relative p-0 m-0 overflow-hidden">
        {/* Nội dung khung chat */}
        {!state.activeCall && (
          <header className="bg-white shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 mr-3"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[180px] overflow-hidden whitespace-nowrap">
                {roomName}
              </h1>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                title="Tìm kiếm"
              >
                <FiSearch size={22} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg hover:bg-blue-600 transition-colors"
                title={roomName}
              >
                {roomName ? roomName.charAt(0).toUpperCase() : '?'}
              </button>
            </div>
          </header>
        )}
        {isSearchOpen && (
          <>
            {/* Backdrop to close search when clicking outside */}
            <div
              className="absolute inset-0 z-20 bg-transparent"
              onClick={() => setIsSearchOpen(false)}
            />
            <div className="absolute left-0 right-0 top-0 z-30 bg-white shadow-lg border-b border-gray-200 p-4 rounded-b-lg">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (!searchTerm.trim()) {
                      setHasSearched(false);
                      setSearchResults([]);
                      setShowEmptySearchError(true);
                      return;
                    }
                    setShowEmptySearchError(false);
                    const results = messages.filter((msg) =>
                      msg.body.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    setSearchResults(results);
                    setHasSearched(true);
                  }
                }}
                className="w-full border px-3 py-2 rounded-md mb-2"
                autoFocus
              />
              {showEmptySearchError && (
                <div className="text-gray-500 text-center mb-2">Please enter a search term.</div>
              )}
              <SearchList
                results={searchResults}
                hasSearched={hasSearched}
                onSelect={(eventId: string) => {
                  setScrollToEventId(eventId);
                  setIsSearchOpen(false);
                }}
              />
            </div>
          </>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : state.activeCall ? (
          state.callType === "voice" ? (
            <VoiceCallUI />
          ) : (
            <VideoCallUI />
          )
        ) : (
          <>
            {error && (
              <div className="text-red-500 text-center">
                <p>{error}</p>
                <button
                  onClick={handleRetry}
                  className="mt-2 bg-blue-500 text-white rounded-lg p-2 hover:bg-blue-600 transition"
                >
                  Thử lại
                </button>
              </div>
            )}
            <MessageList
              messages={dedupedMessages}
              currentUserId={currentUserId}
              deliveredEventId={deliveredEventId}
              readEventId={readEventId}
              setPreviewImage={setPreviewImage}
              scrollToEventId={scrollToEventId}
              setScrollToEventId={setScrollToEventId}
            />
          </>
        )}

        {/* Footer - Only render when there is no active call */}
        {!state.activeCall && (
          <>
            {otherUserTyping && (
              <div className="px-5 pb-2 text-sm text-gray-500 animate-pulse">Typing ...</div>
            )}
            <footer className="bg-white p-4 shadow-inner">
              {selectedImage && (
                <div className="mb-2 relative">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Selected"
                    className="max-h-32 rounded-lg"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 mr-2">
                  <label className="cursor-pointer flex items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <FiImage className="w-7 h-7 text-gray-500 hover:text-blue-500 transition" />
                  </label>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Nhập tin nhắn..."
                    className="w-full bg-white rounded-full shadow border border-gray-200 px-5 py-2 text-gray-800 placeholder-gray-400 focus:ring-0 focus:outline-none border-none text-base"
                    style={{ minHeight: 38 }}
                  />
                </div>
                <div className="flex items-center ml-2">
                  {selectedImage ? (
                    <button
                      onClick={handleSendImage}
                      disabled={isUploading}
                      className="bg-blue-500 text-white rounded-full p-3 hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center shadow-md"
                      style={{ width: 42, height: 42 }}
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <IoSend className="w-6 h-6" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      className="bg-blue-500 text-white rounded-full p-3 hover:bg-blue-600 transition flex items-center justify-center shadow-md"
                      style={{ width: 42, height: 42 }}
                    >
                      <IoSend className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </>
        )}
      </div>

      {isSidebarOpen && (
        <ChatSidebar
          onClose={() => setIsSidebarOpen(false)}
          isOpen={isSidebarOpen}
          members={members}
          inviteUserId={inviteUserId}
          setInviteUserId={setInviteUserId}
          onInviteMember={handleInviteMember}
          onDeleteRoom={handleDeleteRoom}
          isGroup={isGroup}
          onStartVoiceCall={handleStartVoiceCall}
          onStartVideoCall={handleStartVideoCall}
          onSearchOpen={() => {
            setIsSearchOpen(true);
          }}
          mediaMessages={mediaMessages}
          onPreviewImage={setPreviewImage}
        />
      )}

      <CallModal
        incomingCall={state.incomingCall}
        callerName={state.callerName}
      />

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ChatView;
