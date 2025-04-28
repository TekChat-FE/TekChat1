'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/app/contexts/LocaleContext';
import authService from '@/app/services/auth/authService';
import {
  UserIcon,
  LockClosedIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export default function LoginPage() {
  const t = useTranslations('Login');
  const { locale, setLocale } = useLocale();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [homeserver, setHomeserver] = useState('https://matrix.org');
  const [useAccessToken, setUseAccessToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Load saved homeserver from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHomeserver = localStorage.getItem('matrix_homeserver');
      if (savedHomeserver) {
        setHomeserver(savedHomeserver);
      }
    }
  }, []);

  // Save homeserver to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('matrix_homeserver', homeserver);
    }
  }, [homeserver]);

  // Input validation
  const validateInputCredentials = (
    username: string,
    password: string,
    accessToken: string,
    homeserver: string,
    useAccessToken: boolean
  ): string | null => {
    if (!homeserver.match(/^https?:\/\/[\w.-]+(:\d+)?$/)) {
      return t('validation.invalidHomeserver');
    }
    if (useAccessToken) {
      if (!accessToken.trim()) return t('validation.emptyAccessToken');
      const tokenRegex = /^[A-Za-z0-9-_=]+$/;
      if (!tokenRegex.test(accessToken)) return t('validation.invalidAccessToken');
    } else {
      const usernameRegex = /^@[\w.-]+:[\w.-]+$/;
      if (!usernameRegex.test(username)) return t('validation.invalidUsername');
      if (password.length < 8) return t('validation.shortPassword');
    }
    return null;
  };

  // Check login status on mount
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        await authService.getAuthenticatedClient();
        router.push('/roomlist');
      } catch (err) {
        console.log('Not logged in or token expired, displaying login form.', err);
      }
    };
    checkLoginStatus();
  }, [router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validationError = validateInputCredentials(
      username,
      password,
      accessToken,
      homeserver,
      useAccessToken
    );
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      if (useAccessToken) {
        await authService.loginWithAccessToken(homeserver, accessToken);
      } else {
        await authService.login(homeserver, username, password);
      }
      // Save success message flag to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('loginSuccess', 'true');
      }
      router.push('/roomlist');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || t('validation.loginFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 gap-8 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">ChatSphere</span>
            </div>
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
        </header>

        {/* Form Section */}
        <div className="p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">{t('title')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('description')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Toggle Login Method */}
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setUseAccessToken(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !useAccessToken
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-pressed={!useAccessToken}
              >
                {t('usernamePassword')}
              </button>
              <button
                type="button"
                onClick={() => setUseAccessToken(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  useAccessToken
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-pressed={useAccessToken}
              >
                {t('accessToken')}
              </button>
            </div>

            {/* Inputs */}
            {useAccessToken ? (
              <div>
                <label
                  htmlFor="accessToken"
                  className="text-sm font-medium text-gray-700 mb-1 flex items-center"
                >
                  <KeyIcon className="h-5 w-5 mr-2 text-gray-400" />
                  {t('accessTokenLabel')}
                </label>
                <input
                  id="accessToken"
                  type="text"
                  placeholder={t('accessTokenPlaceholder')}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  required
                  aria-describedby={error ? 'error-message' : undefined}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('accessTokenHelp')}{' '}
                  <a
                    href="https://matrix.org/docs/guides/using-access-tokens/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:underline"
                  >
                    {t('learnMore')}
                  </a>
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700 mb-1 flex items-center"
                  >
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {t('usernameLabel')}
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder={t('usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    required
                    aria-describedby={error ? 'error-message' : undefined}
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 mb-1 flex items-center"
                  >
                    <LockClosedIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {t('passwordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      required
                      aria-describedby={error ? 'error-message' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div
                id="error-message"
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-medium text-white transition-colors duration-200 flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-700'
                }`}
                aria-label={t('loginButton')}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
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
                    {t('loggingIn')}
                  </span>
                ) : (
                  <>
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    {t('loginButton')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
                aria-label={t('back')}
              >
                <ArrowLeftIcon className="h-5 w-5" />
                {t('back')}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600">
            {t('signupPrompt')}{' '}
            <a href="/signup" className="text-gray-600 hover:text-gray-800 font-medium">
              {t('signupLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}