import { ReactQueryProvider } from '@/providers/react-query';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import './globals.css';

const manrope = Manrope({
  variable: '--font-Manrope',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Dr.Agenda',
  description: 'Gerenciamento de clínicas médicas simplificado',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased`}>
        <ReactQueryProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
        </ReactQueryProvider>
        <Toaster position="bottom-center" richColors theme="light" />
      </body>
    </html>
  );
}
