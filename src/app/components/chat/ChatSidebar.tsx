'use client';

import { RoomMember } from 'matrix-js-sdk';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  members: RoomMember[];
  inviteUserId: string;
  setInviteUserId: (value: string) => void;
  isRoomOwner: boolean;
  onInviteMember: () => void;
  onDeleteRoom: () => void;
  isGroup: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  members,
  inviteUserId,
  setInviteUserId,
  isRoomOwner,
  onInviteMember,
  onDeleteRoom,
  isGroup,
}) => {
  const t = useTranslations('ChatSidebar');
  if (!isOpen) return null;

  const canAddMember = isGroup || (!isGroup && members.length < 2);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black backdrop-blur-sm z-10"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '5%' }}
        animate={{ x: '0%' }}
        exit={{ x: '5%' }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0 }}
        className="absolute top-0 right-0 h-full bg-white shadow-lg w-full max-w-md z-20 p-6 flex flex-col"
        style={{ right: 'calc(85.3% - 50vw)' }}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('title')}
        </h2>
        <ul className="space-y-3 flex-1 overflow-y-auto">
          {members.map((member) => (
            <li key={member.userId} className="bg-gray-100 p-3 rounded-lg shadow-sm text-sm text-gray-700">
              {member.name || member.userId}
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-3">
          {canAddMember && (
            <>
              <input
                type="text"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder={t('userIdPlaceholder')}
                className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <button
                onClick={onInviteMember}
                className="w-full bg-blue-500 text-white rounded-lg p-3 hover:bg-blue-600 transition"
              >
                {t('addMemberButton')}
              </button>
            </>
          )}
          {isRoomOwner && (
            <button
              onClick={onDeleteRoom}
              className="w-full bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 transition"
            >
              {t('deleteRoomButton')}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          {t('closeButton')}
        </button>
      </motion.aside>
    </>
  );
};

export default ChatSidebar;