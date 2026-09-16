import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = {
  title: 'NovaBill Demo | Gestión con claridad',
  description:
    'Demo SaaS de portafolio: clientes, inventario y facturas internas simuladas. Sin validez fiscal.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
