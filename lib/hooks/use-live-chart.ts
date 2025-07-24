import { useState, useEffect, useCallback } from 'react';
import { useSimpleCryptoStore } from '../stores/simple-crypto-store';

interface ChartDataPoint {
  timestamp: number;
  price: number;
  date: string;
  formattedDate: string;
  isLive?: boolean;
}

interface UseLiveChartOptions {
  coinId: string;
  currency: string;
  timeframe: number;
  maxLivePoints?: number;
  updateInterval?: number;
}

export function useLiveChart({
  coinId,
  currency,
  timeframe,
  maxLivePoints = 100,
  updateInterval = 1000
}: UseLiveChartOptions) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Subscribe to real-time price updates
  const realtimePrice = useSimpleCryptoStore((state) => state.prices[coinId]);
  const connection = useSimpleCryptoStore((state) => state.connection);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${timeframe}`
      );
      const data = await response.json();
      
      const formattedData: ChartDataPoint[] = (data.prices || []).map(([timestamp, price]: [number, number]) => {
        const date = new Date(timestamp);
        return {
          timestamp,
          price,
          date: date.toLocaleDateString(),
          formattedDate: timeframe <= 1 
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : timeframe <= 7
            ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
            : date.toLocaleDateString([], { month: 'short', year: '2-digit' }),
          isLive: false
        };
      });
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching historical chart data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coinId, currency, timeframe]);

  // Add live data point
  const addLiveDataPoint = useCallback(() => {
    if (!realtimePrice || !isLiveMode) return;

    const now = new Date();
    const newPoint: ChartDataPoint = {
      timestamp: now.getTime(),
      price: realtimePrice.current_price,
      date: now.toLocaleDateString(),
      formattedDate: timeframe <= 1 
        ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : timeframe <= 7
        ? now.toLocaleDateString([], { month: 'short', day: 'numeric' })
        : now.toLocaleDateString([], { month: 'short', year: '2-digit' }),
      isLive: true
    };

    setChartData(prevData => {
      // Separate historical and live data
      const historicalData = prevData.filter(d => !d.isLive);
      const liveData = prevData.filter(d => d.isLive);
      
      // Add new live point and keep only recent ones
      const updatedLiveData = [...liveData, newPoint].slice(-maxLivePoints);
      
      return [...historicalData, ...updatedLiveData];
    });

    setLastUpdate(now);
  }, [realtimePrice, isLiveMode, timeframe, maxLivePoints]);

  // Effect to add live data points
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(addLiveDataPoint, updateInterval);
    return () => clearInterval(interval);
  }, [addLiveDataPoint, isLiveMode, updateInterval]);

  // Initial data fetch
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Toggle live mode
  const toggleLiveMode = useCallback(() => {
    if (!isLiveMode) {
      // Entering live mode - refresh data first
      fetchHistoricalData().then(() => {
        setIsLiveMode(true);
      });
    } else {
      // Exiting live mode - refresh to get clean historical data
      setIsLiveMode(false);
      fetchHistoricalData();
    }
  }, [isLiveMode, fetchHistoricalData]);

  // Refresh data
  const refreshData = useCallback(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  return {
    chartData,
    isLoading,
    isLiveMode,
    lastUpdate,
    isConnected: connection.isConnected,
    hasRealtimeData: !!realtimePrice,
    toggleLiveMode,
    refreshData,
    currentPrice: realtimePrice?.current_price,
    priceChange24h: realtimePrice?.price_change_percentage_24h
  };
}