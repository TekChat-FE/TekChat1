// TekChat1/src/app/components/room/CreateContactModal.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import roomService from '../../services/matrix/roomService';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (userId: string) => Promise<void>;
}

const CreateContactModal: React.FC<CreateContactModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const t = useTranslations('CreateContactModal');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValidUserId = (id: string) => /^@[\w.-]+:[\w.-]+$/.test(id);

  const handleCreate = async () => {
    if (!userId.trim()) {
      setError(t('userIdEmpty'));
      return;
    }
    if (!isValidUserId(userId)) {
      setError(t('userIdInvalid'));
      return;
    }

    try {
      // Kiểm tra không thể tạo liên hệ với chính mình
      const currentUserId = localStorage.getItem('userId');
      if (userId === currentUserId) {
        setError(t('cannotCreateContactWithSelf'));
        return;
      }

      // Kiểm tra người dùng có tồn tại không
      const exists = await roomService.checkUserExists(userId);
      if (!exists) {
        setError(t('errorUserNotFound'));
        return;
      }

      // Kiểm tra xem đã có liên hệ với người này chưa
      const hasExistingContact = await roomService.checkExistingContact(userId);
      if (hasExistingContact) {
        setError(t('contactAlreadyExists'));
        return;
      }

      await onCreate(userId);
      toast.success(t('createSuccess'));
      setUserId('');
      onClose();
    } catch (err) {
      setError(t('createError'));
      toast.error(t('createError'));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="contact-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center items-center mb-6 relative">
          <h3
            id="contact-modal-title"
            className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"
          >
            {t('title')}
          </h3>
          <button
            onClick={onClose}
            className="absolute right-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label={t('close')}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="userIdInput"
              className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center"
            >
              {t('userIdLabel')}
            </label>
            <input
              id="userIdInput"
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError(null);
              }}
              placeholder="@user:matrix.org"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
              aria-invalid={!!error}
              aria-describedby={error ? 'userIdError' : undefined}
            />
            {error && (
              <p id="userIdError" className="mt-2 text-sm text-red-500">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleCreate}
              className="flex-1 py-3 rounded-lg font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors duration-200"
              aria-label={t('create')}
            >
              {t('create')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
              aria-label={t('close')}
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContactModal;
