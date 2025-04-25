

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">ChatSphere</span>
          </div>
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 ring-2 ring-gray-300 dark:ring-gray-600 shadow-md hover:scale-105 transition-all duration-200 font-medium"
            aria-label="Go to login page"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl text-center space-y-10 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Connect Instantly with ChatSphere
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience seamless communication with friends and teams using our modern chat platform.
          </p>

          {/* Chat Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg max-w-md mx-auto transform hover:scale-105 transition-transform duration-300">
            <div className="space-y-6 text-left">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold">
                  A
                </div>
                <div className="bg-gray-100 dark:bg-gray-600 p-4 rounded-lg flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">Hey, how's it going?</p>
                </div>
              </div>
              <div className="flex items-start gap-4 justify-end">
                <div className="bg-gray-700 dark:bg-gray-200 p-4 rounded-lg flex-1">
                  <p className="text-sm text-white dark:text-gray-800">Great! How about you?</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold">
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
            aria-label="View ChatSphere features"
          >
            Features
          </a>
          <a
            href="https://chatsphere.com/support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-all duration-200"
            aria-label="Get support for ChatSphere"
          >
            Support
          </a>
          <a
            href="https://chatsphere.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-all duration-200"
            aria-label="Visit ChatSphere website"
          >
            ChatSphere
          </a>
        </div>
      </footer>
    </div>
  );
} 