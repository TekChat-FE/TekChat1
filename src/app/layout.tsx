import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ClientLayout from './ClientLayout';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { LocaleProvider } from '@/app/contexts/LocaleContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ChatSphere',
  description: 'A modern chat platform for seamless communication',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <LocaleProvider>
            <ClientLayout>{children}</ClientLayout>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}