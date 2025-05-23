// src/app/chat/[roomId]/chatView.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MatrixClient, MatrixEvent, Room, RoomMember } from "matrix-js-sdk";
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

interface ChatViewProps {
  matrixClient: MatrixClient;
  roomId: string;
}

const ChatView: React.FC<ChatViewProps> = ({ matrixClient, roomId }) => {
  const router = useRouter();
  const { state, startCall } = useCall();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
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
      const currentUserId = matrixClient.getUserId();

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
      PresenceService.getInstance().ws?.send(
        JSON.stringify({ type: "delivered", roomId })
      );

      setMessages((prev) => {
        // Nếu eventId đã có thì bỏ qua (tránh lặp)
        if (prev.some((m) => m.eventId === newMessage.eventId)) {
          return prev;
        }
        // Thêm tin nhắn mới
        return [...prev, newMessage];
      });
    },
    [roomId, matrixClient]
  );

  useEffect(() => {
    setLoading(true);
    fetchRoomData().finally(() => setLoading(false));
  }, [fetchRoomData]);

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
    const currentUserId = matrixClient.getUserId();
    const recipient = members.find((m) => m.userId !== currentUserId);
    if (!recipient) return;

    const presence = PresenceService.getInstance();

    const handlePresence = () => {
      const userPresence = presence.getPresence(recipient.userId);
      if (userPresence.presence === "online") {
        const lastOwnMessage = messages
          .filter((m) => m.sender === currentUserId)
          .at(-1);
        if (lastOwnMessage) {
          setDeliveredEventId(lastOwnMessage.eventId);
        }
      }
    };

    presence.onPresenceEvent(handlePresence);
    handlePresence();

    return () => presence.offPresenceEvent(handlePresence);
  }, [members, messages, matrixClient]);

  // Gửi định kỳ READ mỗi 1s nếu vẫn ở trong phòng
  useEffect(() => {
    const interval = setInterval(() => {
      PresenceService.getInstance().ws?.send(
        JSON.stringify({
          type: "read",
          roomId,
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    const currentUserId = matrixClient.getUserId();

    const handleRead = (userId: string, rId: string) => {
      if (rId !== roomId || userId === currentUserId) return;

      const lastMsg = messages.filter((m) => m.sender === currentUserId).at(-1);
      if (lastMsg) {
        setReadEventId(lastMsg.eventId);
      }
    };

    const presence = PresenceService.getInstance();
    presence.onRead(handleRead);
    return () => presence.offRead(handleRead);
  }, [roomId, messages, matrixClient]);

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

  const currentUserId = matrixClient.getUserId();
  if (!currentUserId) {
    console.warn("No user logged in, redirecting to login");
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 justify-center items-center">
      <div className="flex flex-col w-full max-w-md h-full bg-white shadow-lg">
        {/* Nội dung khung chat */}
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
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const newState = !isSearchOpen;
                setIsSearchOpen(newState);
                if (newState) {
                  setSearchTerm("");
                  setSearchResults([]);
                  setHasSearched(false);
                }
              }}
              className="text-gray-600 hover:text-gray-800"
              title="Tìm kiếm"
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
                  d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                />
              </svg>
            </button>

            <button
              onClick={handleStartVoiceCall}
              className="text-gray-600 hover:text-green-800"
              title="Cuộc gọi thoại"
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
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>
            <button
              onClick={handleStartVideoCall}
              className="text-gray-600 hover:text-green-800"
              title="Cuộc gọi video"
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-600 hover:text-gray-800"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </header>
        {isSearchOpen && (
          <div className="border-t p-2">
            <input
              type="text"
              placeholder="Tìm tin nhắn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const results = messages.filter((msg) =>
                    msg.body.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  setSearchResults(results);
                  setHasSearched(true);
                }
              }}
              className="w-full border px-3 py-2 rounded-md"
            />
            <SearchList
              results={searchResults}
              hasSearched={hasSearched}
              onSelect={(eventId) => {
                const element = document.getElementById(`msg-${eventId}`);
                if (element) {
                  element.classList.add("bg-yellow-100");
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  setIsSearchOpen(false);
                  setTimeout(() => {
                    element.classList.remove("bg-yellow-100");
                  }, 1500);
                }
              }}
            />
          </div>
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
              messages={messages}
              currentUserId={currentUserId}
              deliveredEventId={deliveredEventId}
              readEventId={readEventId}
            />
          </>
        )}

        {/* Footer - Only render when there is no active call */}
        {!state.activeCall && (
          <footer className="bg-white p-4 shadow-inner">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded-full border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white rounded-full p-3 hover:bg-blue-600 transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </footer>
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
        />
      )}

      <CallModal
        incomingCall={state.incomingCall}
        callerName={state.callerName}
      />
    </div>
  );
};

export default ChatView;
