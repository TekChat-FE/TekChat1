'use client';

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Head from "next/head";
import AuthService from "@/app/services/auth/authService";
import LanguageSwitcher from '@/app/components/common/LanguageSwitcher';

export default function Home() {
  const t = useTranslations('Home');
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleLoginClick = useCallback(async () => {
    setIsChecking(true);
    try {
      const isAuthenticated = await AuthService.isTokenValid();
      if (isAuthenticated) {
        const userId = localStorage.getItem("userId");
        if (userId) {
          toast.info(t('existingSession', { userId }), {
            position: "top-center",
            autoClose: 5000,
          });
        }
        router.push("/auth/login");
      } else {
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      toast.error(t('sessionVerificationFailed'), {
        position: "top-center",
        autoClose: 5000,
      });
      router.push("/auth/login");
    } finally {
      setIsChecking(false);
    }
  }, [router, t]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Head>
        <title>{t('pageTitle')}</title>
        <meta name="description" content={t('metaDescription')} />
        <meta name="keywords" content="chat, messaging, ChatSphere, communication" />
      </Head>
      <ToastContainer />
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">ChatSphere</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={handleLoginClick}
              disabled={isChecking}
              className={`px-8 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 ring-2 ring-gray-300 dark:ring-gray-600 shadow-md hover:scale-105 transition-all duration-200 font-medium ${isChecking ? "opacity-50 cursor-not-allowed" : ""}`}
              aria-label={t('login')}
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Checking...
                </span>
              ) : (
                t('login')
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl text-center space-y-10 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('description')}
          </p>

          {/* Chat Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg max-w-md mx-auto transform hover:scale-105 transition-transform duration-300">
            <div className="space-y-6 text-left">
              <div className="flex items-start gap-4" role="listitem" aria-label={t('chatDemo.message1Aria')}>
                <div
                  className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold"
                  aria-label={t('userAAvatar')}
                >
                  A
                </div>
                <div className="bg-gray-100 dark:bg-gray-600 p-4 rounded-lg flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('chatDemo.message1')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 justify-end" role="listitem" aria-label={t('chatDemo.message2Aria')}>
                <div className="bg-gray-700 dark:bg-gray-200 p-4 rounded-lg flex-1">
                  <p className="text-sm text-white dark:text-gray-800">{t('chatDemo.message2')}</p>
                </div>
                <div
                  className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold"
                  aria-label={t('userBAvatar')}
                >
                  B
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <a
            href="https://chatsphere.com/features"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-all duration-200"
            aria-label={t('features')}
          >
            {t('features')}
          </a>
          <a
            href="https://chatsphere.com/support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-all duration-200"
            aria-label={t('support')}
          >
            {t('support')}
          </a>
          <a
            href="https://chatsphere.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-all duration-200"
            aria-label={t('chatsphere')}
          >
            ChatSphere
          </a>
        </div>
      </footer>
    </div>
  );
}