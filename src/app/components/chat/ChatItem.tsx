import React from 'react';
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
  const isActive = !isGroup && userId ? usePresence(userId) : propIsActive;

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
            {!isGroup && isActive && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
        ) : isGroup ? (
          <GroupIcon />
        ) : (
          <UserAvatar name={name} isActive={isActive} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium truncate">{name}</h3>
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
