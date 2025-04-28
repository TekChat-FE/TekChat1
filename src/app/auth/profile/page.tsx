'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/app/contexts/LocaleContext';
import authService from '@/app/services/auth/authService';
import { MatrixClient } from 'matrix-js-sdk';
import Footer from '@/app/components/common/Footer';
import {
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  HeartIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const ProfilePage = () => {
  const t = useTranslations('Profile');
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    displayName: string;
    userId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const client: MatrixClient = await authService.getAuthenticatedClient();
        const userId = client.getUserId();
        if (!userId) {
          throw new Error(t('errorNoUserId'));
        }
        const profile = await client.getProfileInfo(userId);
        setUserInfo({
          displayName: profile.displayname || userId,
          userId: userId,
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error loading user information:', err);
        setError(err.message || t('errorLoadUserInfo'));
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, [router, t]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    setError(null);
    try {
      await authService.logout();
      router.push('/auth/login');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error during logout:', err);
      setError(err.message || t('errorLogout'));
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    handleLogout();
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    if (showConfirmModal && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirmModal) {
        if (e.key === 'Enter') {
          handleConfirmLogout();
        } else if (e.key === 'Escape') {
          handleCancelLogout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <svg
            className="animate-spin h-5 w-5 text-gray-500"
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
          {t('loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <UserCircleIcon className="h-8 w-8 text-gray-600" />
              {t('title')}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{t('manageInfo')}</p>
          </div>
          {error && (
            <div
              id="error-message"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center"
              role="alert"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
          {userInfo && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-gray-200"
                  aria-label={`Avatar of ${userInfo.displayName}`}
                >
                  {userInfo.displayName.charAt(0).toUpperCase()}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-800">{userInfo.displayName}</h3>
                <p className="text-sm text-gray-500">{userInfo.userId}</p>
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <HeartIcon className="h-5 w-5 text-red-500" />
                {t('thankYou')}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {/* Language Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('languageLabel')}</span>
              <div className="flex items-center gap-4">
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={logoutLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-colors duration-200 flex items-center justify-center gap-2 ${
                logoutLoading
                  ? 'bg-red-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              aria-label={t('logout')}
            >
              {logoutLoading ? (
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
                  {t('loggingOut')}
                </span>
              ) : (
                <>
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  {t('logout')}
                </>
              )}
            </button>
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
              aria-label={t('back')}
            >
              <ArrowLeftIcon className="h-5 w-5" />
              {t('back')}
            </button>
          </div>
          <p className="text-center text-sm text-gray-600 font-medium">
            {t('slogan')}
          </p>
        </div>
      </div>
      <Footer />
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 animate-fade-in">
            <h3 id="confirm-modal-title" className="text-xl font-bold text-gray-900 text-center">
              {t('confirmLogout')}
            </h3>
            <p className="mt-2 text-base text-gray-600 text-center">
              {t('confirmMessage')}
            </p>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleCancelLogout}
                className="flex-1 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                aria-label={t('cancel')}
              >
                {t('cancel')}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={handleConfirmLogout}
                className="flex-1 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
                aria-label={t('confirm')}
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;