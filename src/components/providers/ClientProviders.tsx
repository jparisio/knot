'use client';

import { SocketProvider } from '@/lib/SocketContext';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
