'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  onCreateRoomClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCreateRoomClick }) => {
  const t = useTranslations('Header');

  return (
    <div className="sticky top-0 bg-white dark:bg-black p-4 flex justify-between items-center border-b border-gray-200">
      <button className="text-blue-500 text-lg font-normal">
        {t('edit')}
      </button>

      <h1 className="text-xl font-semibold text-center">{t('title')}</h1>

      <div className="flex gap-4">
        <button className="text-blue-500" onClick={onCreateRoomClick}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
          </svg>
        </button>
        <button className="text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Header;