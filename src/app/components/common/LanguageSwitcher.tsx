'use client';

import { useLocale } from '@/app/contexts/LocaleContext';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className="px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
    >
      <option value="en">English</option>
      <option value="vi">Tiếng Việt</option>
    </select>
  );
}