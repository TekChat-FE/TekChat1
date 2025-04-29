'use client';
import { RoomMember } from 'matrix-js-sdk';
import { motion } from 'framer-motion';
import UserAvatar from "@/app/components/common/UserAvatar";

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
    if (!isOpen) return null;

    const canAddMember = isGroup || (!isGroup && members.length < 2);

    return (
        <>
            {/* Nền mờ */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black backdrop-blur-sm z-10"
                onClick={onClose}
            />

            {/* Sidebar với thiết kế mượt mà */}
            <motion.aside
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                className="absolute top-0 right-0 h-full bg-gradient-to-t from-gray-100 via-white to-gray-200 w-full max-w-md z-20 p-6 flex flex-col rounded-tl-3xl rounded-bl-3xl"
                style={{ right: 'calc(85.5% - 50vw)' }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Thành viên</h2>
                    <motion.button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-800"
                        whileHover={{ scale: 1.1 }}
                    >
                        <span className="material-icons">close</span>
                    </motion.button>
                </div>

                {/* Danh sách thành viên */}
                <ul className="space-y-4 flex-1 overflow-y-auto mb-6">
                    {members.map((member) => {
                        const displayName = member.name || member.userId;
                        return (
                            <motion.li
                                key={member.userId}
                                className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm hover:bg-gray-100 transition-all duration-300 ease-out"
                                whileHover={{ scale: 1.05 }}
                            >
                                <UserAvatar name={displayName} />
                                <span className="text-md text-gray-700">{displayName}</span>
                            </motion.li>
                        );
                    })}
                </ul>

                {/* Form thêm thành viên */}
                <div className="space-y-4">
                    {canAddMember && (
                        <>
                            <input
                                type="text"
                                value={inviteUserId}
                                onChange={(e) => setInviteUserId(e.target.value)}
                                placeholder="Nhập User ID"
                                className="w-full rounded-lg border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
                            />
                            <motion.button
                                onClick={onInviteMember}
                                className="w-full bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition-all duration-200 ease-in-out"
                                whileHover={{ scale: 1.05 }}
                            >
                                Thêm thành viên
                            </motion.button>
                        </>
                    )}

                    {/* Hiển thị nút xóa phòng nếu là chủ phòng */}
                    {isRoomOwner && (
                        <motion.button
                            onClick={onDeleteRoom}
                            className="w-full bg-red-600 text-white rounded-lg p-4 hover:bg-red-700 transition-all duration-200 ease-in-out"
                            whileHover={{ scale: 1.05 }}
                        >
                            Xóa phòng
                        </motion.button>
                    )}
                </div>
            </motion.aside>
        </>
    );
};

export default ChatSidebar;
