'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string>('en');
  const [messages, setMessages] = useState<object | null>(null);

  // Tải messages dựa trên locale
  useEffect(() => {
    async function loadMessages() {
      try {
        const messagesModule = await import(`@/app/i18n/${locale}.json`);
        setMessages(messagesModule.default);
      } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        // Fallback to English if locale fails
        const fallbackMessages = await import('@/app/i18n/en.json');
        setMessages(fallbackMessages.default);
      }
    }

    // Kiểm tra localStorage
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && ['en', 'vi'].includes(savedLocale)) {
      setLocale(savedLocale);
    } else {
      // Kiểm tra ngôn ngữ trình duyệt
      const browserLocales = navigator.languages || [navigator.language];
      const supportedLocales = ['en', 'vi'];
      const matchedLocale = browserLocales.find((lang) =>
        supportedLocales.includes(lang.split('-')[0])
      )?.split('-')[0] || 'en';
      setLocale(matchedLocale);
      localStorage.setItem('locale', matchedLocale);
    }

    loadMessages();
  }, [locale]);

  const handleSetLocale = (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  // Chờ messages được tải
  if (!messages) {
    return null; // Hoặc hiển thị loading spinner
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale: handleSetLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}