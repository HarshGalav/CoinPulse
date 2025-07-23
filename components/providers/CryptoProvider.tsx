'use client';

import { useEffect } from 'react';
import { simpleWebSocketManager } from '@/lib/services/simple-websocket-manager';

interface CryptoProviderProps {
  children: React.ReactNode;
}

export function CryptoProvider({ children }: CryptoProviderProps) {
  useEffect(() => {
    // Initialize store on mount
    console.log('🚀 CryptoProvider initialized');
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 CryptoProvider cleanup');
      simpleWebSocketManager.stop();
    };
  }, []);

  return <>{children}</>;
}