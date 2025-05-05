// ChatItem.tsx
import React from 'react';
import Image from 'next/image';
import GroupIcon from '../common/GroupIcon';
import UserAvatar from '../common/UserAvatar';

interface ChatItemProps {
  avatar?: string;
  name: string;
  sender: string;
  lastMessage: string;
  timestamp?: string;
  isGroup?: boolean;
  groupInfo?: string;
  onClick?: () => void;
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
}) => {
  return (
    <div
      className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 cursor-pointer hover:bg-gray-300"
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        {avatar ? (
          <Image
            src={avatar}
            alt={name}
            width={50}
            height={50}
            className="rounded-full object-cover"
          />
        ) : isGroup ? (
          <GroupIcon />
        ) : (
          <UserAvatar name={name} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="text-base font-medium truncate">{name}</h3>
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