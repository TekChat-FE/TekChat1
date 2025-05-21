'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import roomService from '@/app/services/matrix/roomService';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roomName: string, isGroup: boolean, memberIds: string[]) => Promise<void>;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreate }) => {
  const t = useTranslations('CreateRoomModal');
  const [roomName, setRoomName] = useState<string>('');
  const [memberInput, setMemberInput] = useState<string>('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert(t('errorEmptyRoomName'));
      return;
    }
    if (memberIds.length < 2) {
      setError('Cần ít nhất 2 thành viên được mời!');
      return;
    }
    await onCreate(roomName, true, memberIds);
    setRoomName('');
    setMemberIds([]);
    onClose();
  };

  const handleAddMember = async () => {
    const userId = memberInput.trim();
    if (!userId) return;
    if (!/^@[\w.-]+:[\w.-]+$/.test(userId)) {
      setError(t('errorInvalidUserId'));
      return;
    }
    if (memberIds.includes(userId)) {
      setError(t('errorDuplicateUserId'));
      return;
    }

    try {
      const exists = await roomService.checkUserExists(userId);
      if (!exists) {
        setError(t('errorUserNotFound'));
        return;
      }
      setMemberIds([...memberIds, userId]);
      setMemberInput('');
      setError(null);
    } catch (error) {
      setError(t('errorCheckingUser'));
    }
  };

  const handleRemoveMember = (userId: string) => {
    setMemberIds(memberIds.filter(id => id !== userId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t('title')}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder={t('roomNamePlaceholder')}
            className="w-full p-2 mb-4 border border-gray-400 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring focus:ring-blue-500"
          />
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                placeholder="@user:server"
                className="flex-1 p-2 border border-gray-400 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button type="button" onClick={handleAddMember} className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">{t('addMemberButton')}</button>
            </div>
            <ul className="mb-2">
              {memberIds.map(id => (
                <li key={id} className="flex items-center justify-between bg-gray-200 dark:bg-gray-700 rounded px-2 py-1 mb-1">
                  <span>{id}</span>
                  <button type="button" onClick={() => handleRemoveMember(id)} className="text-red-500 hover:text-red-700 ml-2">X</button>
                </li>
              ))}
            </ul>
            <div className="text-xs text-gray-500">{t('errorNotEnoughMembers')}</div>
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={memberIds.length < 2}
            >
              {t('createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;