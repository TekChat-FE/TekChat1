import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import GroupIcon from '../common/GroupIcon';
import UserAvatar from '../common/UserAvatar';
import { usePresence } from '../../hooks/usePresence';

interface ChatItemProps {
  avatar?: string;
  name: string;
  sender: string;
  lastMessage: string;
  timestamp?: string;
  isGroup?: boolean;
  groupInfo?: string;
  onClick?: () => void;
  userId?: string;
  isActive?: boolean;
}

const formatLastSeen = (msAgo?: number) => {
  if (msAgo === undefined) return '';
  const minutes = Math.floor(msAgo / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
};

const ChatItem: React.FC<ChatItemProps> = ({
  avatar,
  name,
  sender,
  lastMessage,
  timestamp,
  isGroup,
  groupInfo,
  onClick,
  userId,
  isActive: propIsActive = false,
}) => {
  const presenceInfo = !isGroup && userId ? usePresence(userId) : { isActive: propIsActive, lastActiveAgo: undefined };

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isGroup && userId) {
      const interval = setInterval(() => setTick(t => t + 1), 60000);
      return () => clearInterval(interval);
    }
  }, [isGroup, userId]);

  const formattedLastSeen = useMemo(() => {
    if (presenceInfo.isActive) return 'Đang hoạt động';
    if (presenceInfo.lastActiveAgo !== undefined && presenceInfo.receivedAt !== undefined) {
      const msAgo = presenceInfo.lastActiveAgo + (Date.now() - presenceInfo.receivedAt);
      return `Hoạt động ${formatLastSeen(msAgo)}`;
    }
    return '';
  }, [presenceInfo, tick]);

  return (
    <div
      className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 cursor-pointer hover:bg-gray-300"
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        {avatar ? (
          <div className="relative">
            <Image
              src={avatar}
              alt={name}
              width={50}
              height={50}
              className="rounded-full object-cover"
            />
            {!isGroup && presenceInfo.isActive && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
        ) : isGroup ? (
          <GroupIcon />
        ) : (
          <UserAvatar name={name} isActive={presenceInfo.isActive} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium truncate">{name}</h3>
            {!isGroup && (
              <span className="text-xs text-gray-500 ml-1">{formattedLastSeen}</span>
            )}
          </div>
          {timestamp && <span className="text-sm text-gray-500 whitespace-nowrap">{timestamp}</span>}
        </div>

        {isGroup && groupInfo && (
          <p className="text-sm text-gray-600 truncate">{groupInfo}</p>
        )}

        <p className="text-sm text-gray-500 truncate">
          {sender !== "N/A" && sender !== "Unknown" ? `${sender}: ` : ""}
          {lastMessage}
        </p>
      </div>
    </div>
  );
};

export default ChatItem;
