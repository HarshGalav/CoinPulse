import { useEffect, useCallback, useMemo } from 'react';
import { useCryptoStore } from '../stores/crypto-store';
import { webSocketManager } from '../services/websocket-manager';

export interface UseCryptoRealtimeOptions {
  page?: number;
  autoStart?: boolean;
}

export function useCryptoRealtime(options: UseCryptoRealtimeOptions = {}) {
  const { page = 0, autoStart = true } = options;
  
  // Subscribe to store state with stable selectors
  const prices = useCryptoStore((state) => Array.from(state.prices.values()));
  const connection = useCryptoStore((state) => state.connection);
  
  // Get prices for current page - use useMemo to prevent recalculation
  const pagePrice = useMemo(() => {
    const store = useCryptoStore.getState();
    return store.getPricesByPage(page, 10);
  }, [page, prices.length]); // Only recalculate when page changes or prices length changes
  
  const getPriceById = useCallback((coinId: string) => {
    const store = useCryptoStore.getState();
    return store.getPriceById(coinId);
  }, []);
  
  // Connection management
  const startConnection = useCallback(async () => {
    await webSocketManager.startConnection(page);
  }, [page]);
  
  const stopConnection = useCallback(() => {
    webSocketManager.stop();
  }, []);
  
  const reconnect = useCallback(async () => {
    await webSocketManager.reconnect();
  }, []);
  
  const switchPage = useCallback(async (newPage: number) => {
    await webSocketManager.switchPage(newPage);
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
  }, [autoStart, startConnection, stopConnection]);
  
  // Switch page when page prop changes
  useEffect(() => {
    if (autoStart) {
      switchPage(page);
    }
  }, [page, autoStart, switchPage]);
  
  return {
    // Data
    prices: pagePrice,
    allPrices: prices,
    getPriceById,
    
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
    totalPages: Math.ceil(30 / 10), // Based on BINANCE_COIN_MAP length
    
    // Status
    status: webSocketManager.getStatus(),
  };
}

// Hook for getting a specific coin's price
export function useCoinPrice(coinId: string) {
  const getPriceById = useCryptoStore((state) => state.getPriceById);
  const price = getPriceById(coinId);
  
  return {
    price,
    isLoading: !price,
    lastUpdate: price?.last_updated,
  };
}

// Hook for connection status only (lightweight)
export function useConnectionStatus() {
  const connection = useCryptoStore((state) => state.connection);
  
  return {
    isConnected: connection.isConnected,
    connectionMethod: connection.connectionMethod,
    lastUpdate: connection.lastUpdate,
    error: connection.error,
    updateCount: connection.updateCount,
    reconnect: webSocketManager.reconnect.bind(webSocketManager),
  };
}