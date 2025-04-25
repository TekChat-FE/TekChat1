
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
          throw new Error('Unable to retrieve user ID.');
        }

        const profile = await client.getProfileInfo(userId);
        setUserInfo({
          displayName: profile.displayname || userId,
          userId: userId,
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error loading user information:', err);
        setError(err.message || 'Unable to load user information. Please try again.');
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [router]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    setError(null);
    try {
      await authService.logout();
      router.push('/auth/login');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error during logout:', err);
      setError(err.message || 'Logout failed. Please try again.');
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

  // Focus on Confirm button and handle Enter/Esc keys for modal
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <UserCircleIcon className="h-8 w-8 text-gray-600" />
              Your Profile
            </h2>
            <p className="mt-2 text-sm text-gray-600">Manage your personal information</p>
          </div>

          {/* Error Message */}
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

          {/* User Info */}
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
                Thank you for using our service!
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={logoutLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-colors duration-200 flex items-center justify-center gap-2 ${
                logoutLoading
                  ? 'bg-red-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              aria-label="Log out of ChatSphere"
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
                  Logging out...
                </span>
              ) : (
                <>
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  Log out
                </>
              )}
            </button>
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
              aria-label="Go back to previous page"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back
            </button>
          </div>

          {/* Slogan */}
          <p className="text-center text-sm text-gray-600 font-medium">
            Connecting hearts, starting with you
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Confirm Logout Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 animate-fade-in">
            <h3 id="confirm-modal-title" className="text-xl font-bold text-gray-900 text-center">
              Confirm Logout
            </h3>
            <p className="mt-2 text-base text-gray-600 text-center">
              Are you sure you want to log out?
            </p>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleCancelLogout}
                className="flex-1 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                aria-label="Cancel logout"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                onClick={handleConfirmLogout}
                className="flex-1 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
                aria-label="Confirm logout"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;