import { useEffect, useCallback } from 'react';
import { 
  useSimpleCryptoStore, 
  getPricesArray, 
  getPricesByPage 
} from '../stores/simple-crypto-store';
import { simpleWebSocketManager } from '../services/simple-websocket-manager';

export interface UseSimpleCryptoOptions {
  page?: number;
  autoStart?: boolean;
}

export function useSimpleCrypto(options: UseSimpleCryptoOptions = {}) {
  const { page = 0, autoStart = true } = options;
  
  // Subscribe to store state - these are stable and won't cause infinite loops
  const prices = useSimpleCryptoStore((state) => state.prices);
  const connection = useSimpleCryptoStore((state) => state.connection);
  
  // Get derived data using utility functions (not in selectors to avoid loops)
  const allPrices = getPricesArray(prices);
  const pagePrice = getPricesByPage(prices, page);
  
  // Stable action callbacks
  const startConnection = useCallback(async () => {
    await simpleWebSocketManager.start(page);
  }, [page]);
  
  const stopConnection = useCallback(() => {
    simpleWebSocketManager.stop();
  }, []);
  
  const reconnect = useCallback(async () => {
    await simpleWebSocketManager.reconnect();
  }, []);
  
  const switchPage = useCallback(async (newPage: number) => {
    await simpleWebSocketManager.switchPage(newPage);
  }, []);
  
  // Auto-start connection when component mounts
  useEffect(() => {
    if (autoStart) {
      startConnection();
    }
    
    // Cleanup on unmount
    return () => {
      if (autoStart) {
        stopConnection();
      }
    };
  }, [autoStart, page]); // Only depend on autoStart and page
  
  return {
    // Data
    prices: pagePrice,
    allPrices,
    
    // Connection state
    isConnected: connection.isConnected,
    connectionMethod: connection.connectionMethod,
    lastUpdate: connection.lastUpdate,
    error: connection.error,
    connectionAttempts: connection.connectionAttempts,
    maxAttempts: connection.maxAttempts,
    updateCount: connection.updateCount,
    
    // Actions
    startConnection,
    stopConnection,
    reconnect,
    switchPage,
    
    // Metadata
    currentPage: page,
    totalPages: Math.ceil(30 / 10),
  };
}

// Hook for getting a specific coin's price
export function useSimpleCoinPrice(coinId: string) {
  const price = useSimpleCryptoStore((state) => state.prices[coinId]);
  
  return {
    price,
    isLoading: !price,
    lastUpdate: price?.last_updated,
  };
}

// Hook for connection status only
export function useSimpleConnectionStatus() {
  const connection = useSimpleCryptoStore((state) => state.connection);
  
  return {
    isConnected: connection.isConnected,
    connectionMethod: connection.connectionMethod,
    lastUpdate: connection.lastUpdate,
    error: connection.error,
    updateCount: connection.updateCount,
    reconnect: simpleWebSocketManager.reconnect.bind(simpleWebSocketManager),
  };
}