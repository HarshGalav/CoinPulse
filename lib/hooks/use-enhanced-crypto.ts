import { useEffect, useCallback, useMemo } from 'react';
import { 
  useSimpleCryptoStore, 
  getPricesArray 
} from '../stores/simple-crypto-store';
import { enhancedRealtimeManager } from '../services/enhanced-realtime-manager';
import { CoinData } from '../coingecko';

export interface UseEnhancedCryptoOptions {
  coins?: CoinData[];
  currency?: string;
  autoStart?: boolean;
  updateInterval?: number;
}

export function useEnhancedCrypto(options: UseEnhancedCryptoOptions = {}) {
  const { 
    coins = [], 
    currency = 'usd', 
    autoStart = true,
    updateInterval = 30000 
  } = options;
  
  // Subscribe to store state
  const prices = useSimpleCryptoStore((state) => state.prices);
  const connection = useSimpleCryptoStore((state) => state.connection);
  
  // Get all prices as array
  const allPrices = useMemo(() => getPricesArray(prices), [prices]);
  
  // Extract coin IDs from the coins array
  const coinIds = useMemo(() => 
    coins.map(coin => coin.id).filter(Boolean), 
    [coins]
  );
  
  // Merge real-time prices with static coin data
  const mergedCoins = useMemo(() => {
    return coins.map((coin) => {
      const realtimePrice = prices[coin.id];
      if (realtimePrice) {
        return {
          ...coin,
          current_price: realtimePrice.current_price,
          price_change_percentage_24h: realtimePrice.price_change_percentage_24h,
          high_24h: realtimePrice.high_24h,
          low_24h: realtimePrice.low_24h,
          total_volume: realtimePrice.volume_24h,
          last_updated: realtimePrice.last_updated.toISOString(),
        };
      }
      return coin;
    });
  }, [coins, prices]);
  
  // Stable action callbacks
  const startConnection = useCallback(async () => {
    if (coinIds.length > 0) {
      await enhancedRealtimeManager.start(coinIds, currency);
    }
  }, [coinIds, currency]);
  
  const stopConnection = useCallback(() => {
    enhancedRealtimeManager.stop();
  }, []);
  
  const reconnect = useCallback(async () => {
    await enhancedRealtimeManager.reconnect();
  }, []);
  
  const updateCoins = useCallback(async (newCoins: CoinData[], newCurrency?: string) => {
    const newCoinIds = newCoins.map(coin => coin.id).filter(Boolean);
    enhancedRealtimeManager.updateCoins(newCoinIds, newCurrency || currency);
  }, [currency]);
  
  // Auto-start connection when component mounts or coins change
  useEffect(() => {
    if (autoStart && coinIds.length > 0) {
      startConnection();
    }
    
    // Cleanup on unmount
    return () => {
      if (autoStart) {
        stopConnection();
      }
    };
  }, [autoStart, coinIds, currency, startConnection, stopConnection]);
  
  // Update coins when they change
  useEffect(() => {
    if (coinIds.length > 0) {
      enhancedRealtimeManager.updateCoins(coinIds, currency);
    }
  }, [coinIds, currency]);
  
  return {
    // Data
    prices: allPrices,
    allPrices,
    mergedCoins,
    
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
    updateCoins,
    
    // Metadata
    totalCoins: coinIds.length,
    realtimeCoins: allPrices.length,
    coverage: coinIds.length > 0 ? (allPrices.length / coinIds.length) * 100 : 0,
  };
}

// Hook for getting a specific coin's real-time price
export function useEnhancedCoinPrice(coinId: string) {
  const price = useSimpleCryptoStore((state) => state.prices[coinId]);
  
  return {
    price,
    isLoading: !price,
    lastUpdate: price?.last_updated,
    hasRealtimeData: !!price,
  };
}

// Hook for connection status with enhanced features
export function useEnhancedConnectionStatus() {
  const connection = useSimpleCryptoStore((state) => state.connection);
  const managerStatus = enhancedRealtimeManager.getStatus();
  
  return {
    isConnected: connection.isConnected,
    connectionMethod: connection.connectionMethod,
    lastUpdate: connection.lastUpdate,
    error: connection.error,
    updateCount: connection.updateCount,
    currentCoins: managerStatus.currentCoins,
    currency: managerStatus.currency,
    reconnect: enhancedRealtimeManager.reconnect.bind(enhancedRealtimeManager),
  };
}