import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TAG Finans Operasyon',
  description: 'TAG sürücüleri için gerçek net kâr takip paneli.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
