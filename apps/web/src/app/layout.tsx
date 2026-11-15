import type { Metadata } from 'next';
import './globals.css';

import { Geist, Geist_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/components/providers/query-provider';

import { Toaster } from '@/components/ui/sonner';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Creovexa',
  description: 'Plataforma de automatización de marketing',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn('h-full antialiased', geist.variable, geistMono.variable, 'font-sans')}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
