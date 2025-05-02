"use client";
import React, { useEffect, useRef } from "react";
import { format } from "date-fns";

interface MessageListProps {
  messages: Array<{
    sender: string;
    body: string;
    eventId: string;
    avatarUrl?: string | null | undefined;
    timestamp: number;
  }>;
  currentUserId: string;
  deliveredEventId?: string | null;
  getDisplayName?: (userId: string) => string;
}

// Hàm so sánh ngày
const isSameDay = (timestamp1: number, timestamp2: number) => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  deliveredEventId,
  getDisplayName,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  let lastMessageDate: number | null = null;

  const lastOwnMessage = messages
    .filter((m) => m.sender === currentUserId)
    .at(-1);

  const lastOwnMessageIndex = messages.findIndex(
    (m) => m.eventId === lastOwnMessage?.eventId
  );

  let repliedByB = false;
  if (
    lastOwnMessageIndex >= 0 &&
    lastOwnMessageIndex < messages.length - 1
  ) {
    const nextMessage = messages[lastOwnMessageIndex + 1];
    repliedByB = nextMessage.sender !== currentUserId;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender === currentUserId;
        const formattedTime =
          typeof message.timestamp === "number" && !isNaN(message.timestamp)
            ? new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A";

        const rawName = getDisplayName
          ? getDisplayName(message.sender)
          : message.sender;
        const displayName = rawName.startsWith("@")
          ? rawName.slice(1).split(":")[0]
          : rawName;

        const shouldShowDate =
          !lastMessageDate || !isSameDay(lastMessageDate, message.timestamp);
        lastMessageDate = message.timestamp;

        return (
          <div key={message.eventId} id={`msg-${message.eventId}`}>
            {shouldShowDate && (
              <div className="flex justify-center mb-4">
                <div className="bg-gray-300 text-gray-700 text-sm px-3 py-1 rounded-full">
                  {format(new Date(message.timestamp), "EEE dd/MM/yyyy")}
                </div>
              </div>
            )}

            <div
              className={`flex ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-end gap-2 ${
                  isCurrentUser ? "flex-row-reverse" : ""
                }`}
              >
                {/* ✅ Bubble + trạng thái tách biệt */}
                <div className="relative max-w-xs">
                  {/* Bubble chính */}
                  <div
                    className={`p-3 rounded-lg break-words ${
                      isCurrentUser
                        ? "bg-green-200 text-black"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      {displayName}
                    </p>
                    <p>{message.body}</p>
                    <div className="mt-1 text-xs text-gray-500 text-right">
                      {formattedTime}
                    </div>
                  </div>

                  {/* ✅ Trạng thái nằm bên ngoài khối */}
                  {isCurrentUser &&
                    message.eventId === lastOwnMessage?.eventId &&
                    !repliedByB && (
                      <div className="absolute -bottom-4 right-1 text-xs flex items-center gap-1 text-gray-400">
                        <span className="text-gray-300 text-[13px]">✓</span>
                        <span className="italic">
                          {message.eventId.startsWith("temp-")
                            ? "sending..."
                            : message.eventId === deliveredEventId
                            ? "delivered"
                            : "sent"}
                        </span>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef}></div>
    </div>
  );
};

export default MessageList;
