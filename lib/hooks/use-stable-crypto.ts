import { useEffect, useCallback, useMemo } from 'react';
import { useStableCryptoStore } from '../stores/stable-crypto-store';
import { stableWebSocketManager } from '../services/stable-websocket-manager';

export interface UseCryptoRealtimeOptions {
  page?: number;
  autoStart?: boolean;
}

export function useStableCryptoRealtime(options: UseCryptoRealtimeOptions = {}) {
  const { page = 0, autoStart = true } = options;
  
  // Subscribe to store state with stable selectors to prevent infinite loops
  const prices = useStableCryptoStore(useCallback((state) => state.prices, []));
  const connection = useStableCryptoStore(useCallback((state) => state.connection, []));
  
  // Memoized computed values to prevent unnecessary re-renders
  const allPrices = useMemo(() => Object.values(prices), [prices]);
  const pagePrice = useMemo(() => {
    const store = useStableCryptoStore.getState();
    return store.getPricesByPage(page, 10);
  }, [prices, page]);
  
  // Stable action callbacks
  const startConnection = useCallback(async () => {
    await stableWebSocketManager.start(page);
  }, [page]);
  
  const stopConnection = useCallback(() => {
    stableWebSocketManager.stop();
  }, []);
  
  const reconnect = useCallback(async () => {
    await stableWebSocketManager.reconnect();
  }, []);
  
  const switchPage = useCallback(async (newPage: number) => {
    await stableWebSocketManager.switchPage(newPage);
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
  }, [autoStart, page]); // Only depend on autoStart and page to prevent loops
  
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

// Hook for getting a specific coin's price (prevents selector issues)
export function useStableCoinPrice(coinId: string) {
  const price = useStableCryptoStore(useCallback((state) => state.prices[coinId], [coinId]));
  
  return {
    price,
    isLoading: !price,
    lastUpdate: price?.last_updated,
  };
}

// Hook for connection status only (lightweight)
export function useStableConnectionStatus() {
  const connection = useStableCryptoStore(useCallback((state) => state.connection, []));
  
  return {
    isConnected: connection.isConnected,
    connectionMethod: connection.connectionMethod,
    lastUpdate: connection.lastUpdate,
    error: connection.error,
    updateCount: connection.updateCount,
    reconnect: stableWebSocketManager.reconnect.bind(stableWebSocketManager),
  };
}