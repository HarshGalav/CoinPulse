"use client";

import { useState, useEffect, useRef } from "react";

export interface RealCoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
  last_updated: Date;
}

// Interface for CoinGecko's price response structure
export interface CoinGeckoPriceData {
  usd: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  last_updated_at?: number;
}

// Major cryptocurrencies to track
const MAJOR_COINS = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "cardano",
  "solana",
  "ripple",
  "polkadot",
  "dogecoin",
  "avalanche-2",
  "chainlink",
];

export function useRealCoinGeckoData() {
  const [prices, setPrices] = useState<RealCoinGeckoPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchRealPrices = async () => {
    try {
      setError(null);

      // Use CoinGecko's simple price endpoint for real-time data
      const coinIds = MAJOR_COINS.join(",");
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`,
        {
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform CoinGecko data to our format
      const transformedPrices: RealCoinGeckoPrice[] = Object.entries(data).map(
        ([coinId, priceData]) => {
          const coinPriceData = priceData as CoinGeckoPriceData;
          return {
            id: coinId,
            symbol: coinId.toUpperCase(),
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            current_price: coinPriceData.usd || 0,
            price_change_percentage_24h: coinPriceData.usd_24h_change || 0,
            market_cap: coinPriceData.usd_market_cap || 0,
            volume_24h: coinPriceData.usd_24h_vol || 0,
            last_updated: coinPriceData.last_updated_at
              ? new Date(coinPriceData.last_updated_at * 1000)
              : new Date(),
          };
        }
      );

      setPrices(transformedPrices);
      setLastUpdate(new Date());
      setIsConnected(true);
      retryCount.current = 0;
    } catch (err) {
      console.error("Error fetching real CoinGecko prices:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
      setIsConnected(false);

      // Retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(
          `Retrying in 5 seconds (attempt ${retryCount.current}/${maxRetries})`
        );
        setTimeout(fetchRealPrices, 5000);
      }
    }
  };

  const startPolling = () => {
    // Initial fetch
    fetchRealPrices();

    // Poll every 30 seconds (respecting CoinGecko's rate limits)
    intervalRef.current = setInterval(fetchRealPrices, 30000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reconnect = () => {
    stopPolling();
    setError(null);
    retryCount.current = 0;
    setTimeout(startPolling, 1000);
  };

  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling]);

  return {
    prices,
    isConnected,
    lastUpdate,
    error,
    reconnect,
    retryCount: retryCount.current,
    maxRetries,
  };
}
