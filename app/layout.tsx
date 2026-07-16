import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal DeCA',
  description: 'Portal de creación y consulta de Documentos electrónicos de Control Administrativo (DeCA)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
