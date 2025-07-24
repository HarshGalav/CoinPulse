import { useEffect, useCallback, useMemo } from 'react';
import { 
  useSimpleCryptoStore, 
  getPricesArray 
} from '../stores/simple-crypto-store';
import { binanceComprehensiveManager } from '../services/binance-comprehensive-manager';
import { CoinData } from '../coingecko';

export interface UseBinanceComprehensiveOptions {
  coins?: CoinData[];
  autoStart?: boolean;
}

export function useBinanceComprehensive(options: UseBinanceComprehensiveOptions = {}) {
  const { 
    coins = [], 
    autoStart = true
  } = options;
  
  // Subscribe to store state
  const prices = useSimpleCryptoStore((state) => state.prices);
  const connection = useSimpleCryptoStore((state) => state.connection);
  
  // Get all prices as array
  const allPrices = useMemo(() => getPricesArray(prices), [prices]);
  
  // Extract coin IDs from the coins array
  const coinIds = useMemo(() => {
    const ids = coins.map(coin => coin.id).filter(Boolean);
    console.log('🔍 Binance Hook - coins.length:', coins.length, 'coinIds.length:', ids.length);
    return ids;
  }, [coins]);
  
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
  
  // Get manager status for detailed information
  const managerStatus = useMemo(() => 
    binanceComprehensiveManager.getStatus(), 
    [connection.updateCount, coinIds.length] // Re-calculate when data updates
  );
  
  // Stable action callbacks
  const startConnection = useCallback(async () => {
    if (coinIds.length > 0) {
      await binanceComprehensiveManager.start(coinIds);
    }
  }, [coinIds]);
  
  const stopConnection = useCallback(() => {
    binanceComprehensiveManager.stop();
  }, []);
  
  const reconnect = useCallback(async () => {
    await binanceComprehensiveManager.reconnect();
  }, []);
  
  const updateCoins = useCallback((newCoins: CoinData[]) => {
    const newCoinIds = newCoins.map(coin => coin.id).filter(Boolean);
    binanceComprehensiveManager.updateCoins(newCoinIds);
  }, []);
  
  // Auto-start connection when component mounts or coins change
  useEffect(() => {
    console.log('🔍 Binance Hook - autoStart:', autoStart, 'coinIds.length:', coinIds.length, 'coinIds:', coinIds.slice(0, 5));
    if (autoStart && coinIds.length > 0) {
      console.log('🚀 Starting Binance connection for', coinIds.length, 'coins');
      startConnection();
    }
    
    // Cleanup on unmount
    return () => {
      if (autoStart) {
        stopConnection();
      }
    };
  }, [autoStart, coinIds, startConnection, stopConnection]);
  
  // Update coins when they change
  useEffect(() => {
    if (coinIds.length > 0) {
      binanceComprehensiveManager.updateCoins(coinIds);
    }
  }, [coinIds]);
  
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
    
    // Comprehensive Binance-specific metadata
    totalCoins: coinIds.length,
    mappedCoins: managerStatus.mappedCoins,
    availableSymbols: managerStatus.availableSymbols,
    coverage: managerStatus.coverage,
    unmappedCoins: managerStatus.unmappedCoins || [],
    
    // Debug information
    getMappingInfo: binanceComprehensiveManager.getMappingInfo.bind(binanceComprehensiveManager),
  };
}

// Hook for getting a specific coin's real-time price
export function useBinanceCoinPrice(coinId: string) {
  const price = useSimpleCryptoStore((state) => state.prices[coinId]);
  
  return {
    price,
    isLoading: !price,
    lastUpdate: price?.last_updated,
    hasRealtimeData: !!price,
  };
}

// Hook for connection status with Binance-specific information
export function useBinanceConnectionStatus() {
  const connection = useSimpleCryptoStore((state) => state.connection);
  const managerStatus = binanceComprehensiveManager.getStatus();
  
  return {
    isConnected: connection.isConnected,
    connectionMethod: connection.connectionMethod,
    lastUpdate: connection.lastUpdate,
    error: connection.error,
    updateCount: connection.updateCount,
    requestedCoins: managerStatus.requestedCoins,
    mappedCoins: managerStatus.mappedCoins,
    availableSymbols: managerStatus.availableSymbols,
    coverage: managerStatus.coverage,
    reconnect: binanceComprehensiveManager.reconnect.bind(binanceComprehensiveManager),
    getUnmappedCoins: () => managerStatus.unmappedCoins || [],
    getMappingInfo: binanceComprehensiveManager.getMappingInfo.bind(binanceComprehensiveManager),
  };
}