"use client";

import { useState, useEffect } from "react";
import { useUltimateBinanceRealtime } from "./ultimate-binance-realtime";
import { useRealCoinGeckoData } from "./real-coingecko-realtime";

export interface HybridCoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  last_updated: Date;
}

export function useHybridRealtime(page: number = 0) {
  const [dataSource, setDataSource] = useState<"binance" | "coingecko">(
    "binance"
  );
  const [switchTimeout, setSwitchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Use ultimate Binance real-time solution (WebSocket + intelligent fallback)
  const binanceData = useUltimateBinanceRealtime(page);

  // CoinGecko as backup (also real data)
  const coingeckoData = useRealCoinGeckoData();

  useEffect(() => {
    // If Binance WebSocket fails to connect within 15 seconds, switch to CoinGecko
    if (!binanceData.isConnected && binanceData.error && !switchTimeout) {
      console.log(
        "Binance WebSocket having issues, will switch to CoinGecko in 15 seconds..."
      );
      const timeout = setTimeout(() => {
        if (!binanceData.isConnected) {
          console.log("🔄 Switching to CoinGecko real-time API");
          setDataSource("coingecko");
        }
      }, 15000);
      setSwitchTimeout(timeout);
    }

    // If Binance connects successfully, use it and clear timeout
    if (binanceData.isConnected && binanceData.prices.length > 0) {
      if (switchTimeout) {
        clearTimeout(switchTimeout);
        setSwitchTimeout(null);
      }
      setDataSource("binance");
    }

    return () => {
      if (switchTimeout) {
        clearTimeout(switchTimeout);
      }
    };
  }, [
    binanceData.isConnected,
    binanceData.error,
    binanceData.prices.length,
    switchTimeout,
  ]);

  const reconnect = () => {
    if (dataSource === "binance") {
      binanceData.reconnect();
    } else {
      coingeckoData.reconnect();
    }

    // Also try to switch back to Binance
    setDataSource("binance");
    if (switchTimeout) {
      clearTimeout(switchTimeout);
      setSwitchTimeout(null);
    }
  };

  // Return the appropriate data source
  if (dataSource === "coingecko") {
    return {
      prices: coingeckoData.prices.map((price) => ({
        id: price.id,
        symbol: price.symbol,
        name: price.name,
        current_price: price.current_price,
        price_change_percentage_24h: price.price_change_percentage_24h,
        last_updated: price.last_updated,
      })),
      isConnected: coingeckoData.isConnected,
      lastUpdate: coingeckoData.lastUpdate,
      error: coingeckoData.error,
      reconnect,
      dataSource: "CoinGecko API" as const,
      updateFrequency: "30 seconds",
      currentPage: 0, // CoinGecko doesn't support pagination in this context
      totalPages: 1,
    };
  }

  return {
    prices: binanceData.prices.map((price) => ({
      id: price.id,
      symbol: price.symbol,
      name: price.name,
      current_price: price.current_price,
      price_change_percentage_24h: price.price_change_percentage_24h,
      last_updated: price.last_updated,
    })),
    isConnected: binanceData.isConnected,
    lastUpdate: binanceData.lastUpdate,
    error: binanceData.error,
    reconnect,
    dataSource: "Binance WebSocket" as const,
    updateFrequency: "Real-time",
    currentPage: binanceData.currentPage,
    totalPages: binanceData.totalPages,
  };
}
