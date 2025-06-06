'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MessageCircle, Twitter, Mail } from 'lucide-react';

const ContactPage: React.FC = () => {
  const t = useTranslations('');
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans">
      {/* Header - giống Telegram */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center px-4 py-3 gap-3">
          <MessageCircle className="h-6 w-6 text-gray-900 dark:text-white" />
          <h1 className="text-lg font-semibold">{t('Contact')}</h1>
        </div>
      </header>

      {/* Body - căn giữa giống Telegram */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md p-6 text-center space-y-6">
          <div className="flex justify-center">
            <MessageCircle className="h-16 w-16 text-gray-400 dark:text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold">{t('COMING SOON')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(
              'We are constantly working to improve your experience. In the near future, our chat platform will include exciting new features such as video calls, file sharing, customizable themes, and advanced group management tools. Stay tuned — we appreciate your support and feedback!'
            )}
          </p>
          <h3 className="text-lg font-semibold">{t('About My Web')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(
              'Experience seamless and secure conversations with our modern web-based chat application. Inspired by the clean and intuitive design of Telegram, our platform offers fast, reliable messaging, private and group chats, and a sleek white-and-black UI for maximum readability and comfort. Whether you are connecting with friends, collaborating with teams, or managing communities, our chat app ensures your communication is smooth, responsive, and future-ready.'
            )}
          </p>
          <button
            onClick={() => router.push('/roomlist')}
            className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:opacity-90 transition"
          >
            {('CHAT NOW')}
          </button>
        </div>
      </main>

      {/* Footer - giống Telegram */}
      <footer className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-md mx-auto px-4 py-4 text-center">
          <div className="flex justify-center gap-5 mb-2">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="mailto:support@youchatapp.com"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              aria-label="Email Support"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2025 @ChatSphere. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
