import type { NextConfig } from 'next';
import path from 'node:path';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
try {
  const url = new URL(apiUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error();
  }
} catch {
  throw new Error(
    'Configuración inválida: NEXT_PUBLIC_API_URL debe ser una URL HTTP o HTTPS sin credenciales.',
  );
}

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(import.meta.dirname, '../..') },
};

export default nextConfig;
