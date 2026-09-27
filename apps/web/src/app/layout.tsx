import type { Metadata } from 'next';
import './globals.css';

import { JetBrains_Mono, Inter } from 'next/font/google';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/components/providers/query-provider';

import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
      className={cn('h-full antialiased', inter.variable, jetbrainsMono.variable, 'font-sans')}
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
