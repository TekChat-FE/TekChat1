import React from 'react';

interface UserAvatarProps {
  name: string;
  color?: string;
  isActive?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, color = 'bg-blue-500', isActive = false }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-white font-bold text-xl ${color}`}>
        {initials}
      </div>
      {isActive && (
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
      )}
    </div>
  );
};

export default UserAvatar;
