import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel — Pendidikan Timur Tengah',
  description: 'Dashboard admin pendaftaran pendidikan Timur Tengah',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Lora', Georgia, serif" }}>
        {children}
      </body>
    </html>
  );
}
