"use client";
import React, { useEffect, useRef } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface MessageListProps {
  messages: Array<{
    sender: string;
    body: string;
    eventId: string;
    avatarUrl?: string | null | undefined;
    timestamp: number;
  status?: "sending" | "sent" | "delivered" | "read" | "error";
  }>;
  currentUserId: string;
  deliveredEventId?: string | null;
  readEventId?: string | null;
  getDisplayName?: (userId: string) => string;
}

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
  readEventId,
  getDisplayName,
}) => {
  const t = useTranslations("MessageList");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
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
  if (lastOwnMessageIndex >= 0 && lastOwnMessageIndex < messages.length - 1) {
    const nextMessage = messages[lastOwnMessageIndex + 1];
    repliedByB = nextMessage.sender !== currentUserId;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://i.pinimg.com/736x/e7/d3/0a/e7d30a649104448116bdb716e83cbb9d.jpg ')",
      }}
    >
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
                <div className="relative max-w-xs">
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

                  {isCurrentUser &&
                    message.eventId === lastOwnMessage?.eventId &&
                    !repliedByB && (
                      <div className="absolute -bottom-4 right-1 text-xs flex items-center gap-1 text-gray-800">
                        {message.status === "sending" ? (
                          <span className="animate-pulse text-gray-400">
                            ⏳
                          </span>
                        ) : message.eventId === readEventId ? (
                          <span className="text-blue-600">✓✓</span>
                        ) : message.eventId === deliveredEventId ? (
                          <span className="text-gray-500">✓✓</span>
                        ) : (
                          <span className="text-gray-400">✓</span>
                        )}
                        <span className="italic font-medium text-[11px]">
                          {message.status === "sending"
                            ? t("sending")
                            : message.eventId === readEventId
                            ? t("read")
                            : message.eventId === deliveredEventId
                            ? t("delivered")
                            : t("sent")}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
