import React, { useState } from 'react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roomName: string, isGroup: boolean) => Promise<void>;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [roomName, setRoomName] = useState<string>('');
  const [isGroup, setIsGroup] = useState<boolean>(false); // State để xác định loại phòng

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert('Vui lòng nhập tên phòng.');
      return;
    }
    await onCreate(roomName, isGroup); // Gửi loại phòng (isGroup) cùng với tên phòng
    setRoomName(''); // Reset input sau khi tạo
    setIsGroup(false); // Reset loại phòng
    onClose(); // Đóng modal
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Tạo Phòng Mới</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Nhập tên phòng..."
            className="w-full p-2 mb-4 border border-gray-400 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring focus:ring-blue-500"
          />
          <div className="flex flex-col gap-2 mb-4">
            <button
              type="button"
              onClick={() => setIsGroup(false)} // Chọn "New Contact"
              className={`px-4 py-2 rounded-md ${
                !isGroup
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
              } hover:bg-blue-600`}
            >
              New Contact
            </button>
            <button
              type="button"
              onClick={() => setIsGroup(true)} // Chọn "New Group"
              className={`px-4 py-2 rounded-md ${
                isGroup
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
              } hover:bg-green-600`}
            >
              New Group
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Tạo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;