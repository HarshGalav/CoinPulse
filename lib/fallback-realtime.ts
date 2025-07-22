'use client';

import { useState, useEffect } from 'react';

export interface FallbackCoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  last_updated: Date;
}

// Fallback with realistic base prices (as of late 2024)
const FALLBACK_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', basePrice: 43000 },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', basePrice: 2600 },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', basePrice: 310 },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', basePrice: 0.48 },
  { id: 'solana', name: 'Solana', symbol: 'SOL', basePrice: 98 },
];

export function useFallbackRealtime() {
  const [prices, setPrices] = useState<FallbackCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(true); // Always "connected" for fallback
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Generate initial prices
    const generatePrices = () => {
      return FALLBACK_COINS.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        current_price: coin.basePrice * (0.95 + Math.random() * 0.1), // ±5% variation
        price_change_percentage_24h: (Math.random() - 0.5) * 10, // ±5% change
        last_updated: new Date()
      }));
    };

    // Set initial prices
    setPrices(generatePrices());
    setLastUpdate(new Date());

    // Update prices every 5 seconds with small random changes
    const interval = setInterval(() => {
      setPrices(currentPrices => 
        currentPrices.map(price => ({
          ...price,
          current_price: price.current_price * (0.999 + Math.random() * 0.002), // ±0.1% change
          price_change_percentage_24h: price.price_change_percentage_24h + (Math.random() - 0.5) * 0.2,
          last_updated: new Date()
        }))
      );
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const reconnect = () => {
    // For fallback, just refresh the data
    setLastUpdate(new Date());
  };

  return {
    prices,
    isConnected,
    lastUpdate,
    error,
    reconnect
  };
}