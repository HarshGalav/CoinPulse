'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RealCoinPrice {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

// Use CoinGecko's free tier with proper rate limiting
export function useRealCoinGeckoPrices(enabled: boolean = true) {
  const [prices, setPrices] = useState<RealCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Top cryptocurrencies to track
  const COIN_IDS = [
    'bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 
    'polkadot', 'dogecoin', 'avalanche-2', 'chainlink', 'matic-network'
  ];

  const fetchRealPrices = useCallback(async () => {
    try {
      setError(null);
      
      // Use CoinGecko's simple/price endpoint (free tier)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_IDS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        // If we hit rate limits, just keep the existing data
        if (response.status === 429) {
          console.log('Rate limited - keeping existing data');
          setError('Rate limited - data may be delayed');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data to our format
      const newPrices: RealCoinPrice[] = Object.entries(data).map(([coinId, priceData]) => {
        const coinPriceData = priceData as unknown;
        return {
          id: coinId,
          current_price: coinPriceData.usd || 0,
          price_change_percentage_24h: coinPriceData.usd_24h_change || 0,
          last_updated: new Date(coinPriceData.last_updated_at * 1000).toISOString()
        };
      });

      setPrices(newPrices);
      setLastUpdate(new Date());
      setIsConnected(true);
      
    } catch (err) {
      console.error('Error fetching real prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    // Initial fetch
    fetchRealPrices();

    // Update every 60 seconds to respect free tier limits
    const interval = setInterval(fetchRealPrices, 60000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [enabled, fetchRealPrices]);

  return {
    prices,
    isConnected,
    lastUpdate,
    error
  };
}