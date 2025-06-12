'use client';

import { RoomMember } from 'matrix-js-sdk';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { PresenceService } from '@/app/services/matrix/presenceService';
import roomService from '@/app/services/matrix/roomService';
import { FiSearch, FiPhone, FiVideo, FiImage } from 'react-icons/fi';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  members: RoomMember[];
  inviteUserId: string;
  setInviteUserId: (value: string) => void;
  onInviteMember: () => void;
  onDeleteRoom: () => void;
  isGroup: boolean;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onSearchOpen: () => void;
  mediaMessages: { eventId: string; imageUrl: string; timestamp: string }[];
  onPreviewImage: (imageUrl: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  members,
  inviteUserId,
  setInviteUserId,
  onInviteMember,
  onDeleteRoom,
  isGroup,
  onStartVoiceCall,
  onStartVideoCall,
  onSearchOpen,
  mediaMessages,
  onPreviewImage,
}) => {
  const t = useTranslations('ChatSidebar');
  const [presenceData, setPresenceData] = useState<Record<string, { presence: string; statusMsg?: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const presenceService = PresenceService.getInstance();

  // Cập nhật trạng thái Presence của thành viên
  useEffect(() => {
    const updatePresence = (changedUserId?: string) => {
      const newPresenceData: Record<string, { presence: string; statusMsg?: string }> = { ...presenceData };
      if (changedUserId) {
        const presence = presenceService.getPresence(changedUserId);
        newPresenceData[changedUserId] = {
          presence: presence.presence,
          statusMsg: presence.statusMsg,
        };
        console.log(`[DEBUG] Updated presence for ${changedUserId}:`, presence);
      } else {
        members.forEach((member) => {
          const presence = presenceService.getPresence(member.userId);
          newPresenceData[member.userId] = {
            presence: presence.presence,
            statusMsg: presence.statusMsg,
          };
          console.log(`[DEBUG] Initial presence for ${member.userId}:`, presence);
        });
      }
      setPresenceData(newPresenceData);
    };
  
    updatePresence();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePresenceUpdate = (event: any) => {
      updatePresence(event.getSender());
    };
    presenceService.onPresenceEvent(handlePresenceUpdate);
  
    return () => {
      presenceService.offPresenceEvent(handlePresenceUpdate);
    };
  }, [members, presenceService]);

  const handleInviteMember = async () => {
    const userId = inviteUserId.trim();
    if (!userId) {
      setError(t('errorEmptyUserId'));
      return;
    }
    if (!/^@[\w.-]+:[\w.-]+$/.test(userId)) {
      setError(t('errorInvalidUserId'));
      return;
    }
    if (members.some(member => member.userId === userId)) {
      setError(t('errorUserAlreadyInRoom'));
      return;
    }

    try {
      const exists = await roomService.checkUserExists(userId);
      if (!exists) {
        setError(t('errorUserNotFound'));
        return;
      }
      setError(null);
      onInviteMember();
    } catch {
      setError(t('errorCheckingUser'));
    }
  };

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
        {/* Top action row */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => { onStartVoiceCall(); onClose(); }}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
            title="Gọi thoại"
          >
            <FiPhone size={22} />
          </button>
          <button
            onClick={() => { onStartVideoCall(); onClose(); }}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
            title="Gọi video"
          >
            <FiVideo size={22} />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('title')}</h2>

        {/* Members list */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('members')}</h3>
          <ul className="space-y-3">
            {members.map((member) => {
              const presence = presenceData[member.userId] || { presence: 'offline', statusMsg: '' };
              return (
                <li
                  key={member.userId}
                  className="bg-gray-100 p-3 rounded-lg shadow-sm text-sm text-gray-700 flex items-center"
                >
                  <span
                    className={`w-3 h-3 rounded-full mr-2 ${
                      presence.presence === 'online'
                        ? 'bg-green-500'
                        : presence.presence === 'unavailable'
                        ? 'bg-orange-500'
                        : 'bg-gray-500'
                    }`}
                  ></span>
                  <span>
                    {member.name || member.userId}
                    <span className="text-xs text-gray-500 ml-2">({t(presence.presence)})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Media section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiImage className="text-blue-500" size={20} />
              <h3 className="text-base font-medium text-gray-900">{t('media')}</h3>
            </div>
            <span className="text-sm text-gray-500">{mediaMessages.length} {t('images')}</span>
          </div>
          {mediaMessages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {mediaMessages.map((msg) => {
                // Parse timestamp as number for correct date
                const date = new Date(Number(msg.timestamp));
                const dateString = isNaN(date.getTime()) ? '' : date.toLocaleDateString();
                return (
                  <div
                    key={msg.eventId}
                    className="aspect-square relative group cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-100"
                    onClick={() => msg.imageUrl && onPreviewImage(msg.imageUrl)}
                  >
                    <img
                      src={msg.imageUrl}
                      alt="Media"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{ background: '#f3f4f6' }}
                    />
                    <div className="break-all text-xs text-gray-400">{msg.imageUrl}</div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-white text-xs truncate">
                        {dateString}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FiImage className="mx-auto text-gray-400" size={32} />
              <p className="mt-2 text-gray-500 text-sm">{t('noMedia')}</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {canAddMember && (
            <>
              <input
                type="text"
                value={inviteUserId}
                onChange={(e) => {
                  setInviteUserId(e.target.value);
                  setError(null);
                }}
                placeholder={t('userIdPlaceholder')}
                className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button
                onClick={handleInviteMember}
                className="w-full bg-blue-500 text-white rounded-lg p-3 hover:bg-blue-600 transition"
              >
                {t('addMemberButton')}
              </button>
            </>
          )}
          <button
            onClick={onDeleteRoom}
            className="w-full bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 transition"
          >
            {t('deleteRoomButton')}
          </button>
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