import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pizza Builder',
  description: 'Build and save your custom pizza creations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-stone-100 text-stone-900 dark:bg-zinc-900 dark:text-zinc-100 transition-colors`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
