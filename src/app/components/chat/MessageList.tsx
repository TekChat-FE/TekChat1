'use client';
import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns'; // Thêm thư viện này để format ngày đẹp hơn

interface MessageListProps {
    messages: Array<{
        sender: string;
        body: string;
        eventId: string;
        avatarUrl?: string | null | undefined;
        timestamp: number;
    }>;
    currentUserId: string;
    getDisplayName?: (userId: string) => string; // Optional: hàm lấy tên hiển thị
}

// Hàm so sánh cùng ngày
const isSameDay = (timestamp1: number, timestamp2: number) => {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, getDisplayName }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Tự động cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    let lastMessageDate: number | null = null;

    return (
        <div
            className="flex-1 overflow-y-auto p-4 space-y-4 relative"
            style={{
                backgroundImage: 'url("https://i.pinimg.com/736x/3d/8c/2f/3d8c2f2c82c1c9ef1e27be645cd1aa17.jpg")',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
            }}
        >
            <div className="relative z-10">
                {messages.map((message) => {
                    const isCurrentUser = message.sender === currentUserId;
                    const formattedTime =
                        typeof message.timestamp === 'number' && !isNaN(message.timestamp)
                            ? new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            : 'N/A';

                    const rawName = getDisplayName ? getDisplayName(message.sender) : message.sender;
                    const displayName = rawName.startsWith('@') ? rawName.slice(1).split(':')[0] : rawName;

                    const shouldShowDate =
                        !lastMessageDate || !isSameDay(lastMessageDate, message.timestamp);
                    lastMessageDate = message.timestamp;

                    return (
                        <div key={message.eventId}>
                            {shouldShowDate && (
                                <div className="flex justify-center mb-4">
                                    <div className="bg-gray-300 text-gray-700 text-sm px-3 py-1 rounded-full">
                                        {format(new Date(message.timestamp), 'EEE dd/MM/yyyy')}
                                    </div>
                                </div>
                            )}

                            <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                    <div
                                        className={`max-w-xs p-3 rounded-lg break-words mb-4 ${isCurrentUser ? 'bg-green-200 text-black' : 'bg-gray-200 text-gray-800'
                                            }`}
                                    >
                                        <p className="text-xs font-semibold text-gray-600 mb-1">{displayName}</p>
                                        <p>{message.body}</p>
                                        <p
                                            className={`text-xs mt-1 ${isCurrentUser ? 'text-black/50' : 'text-gray-500'
                                                }`}
                                        >
                                            {formattedTime}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef}></div>
            </div>
        </div>
    );
};

export default MessageList;
