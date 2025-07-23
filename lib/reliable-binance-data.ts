"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface RealCoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  last_updated: Date;
}

// Verified Binance to CoinGecko mapping
const BINANCE_COIN_MAP: Record<string, { id: string; name: string }> = {
  BTCUSDT: { id: "bitcoin", name: "Bitcoin" },
  ETHUSDT: { id: "ethereum", name: "Ethereum" },
  BNBUSDT: { id: "binancecoin", name: "BNB" },
  ADAUSDT: { id: "cardano", name: "Cardano" },
  SOLUSDT: { id: "solana", name: "Solana" },
  XRPUSDT: { id: "ripple", name: "XRP" },
  DOTUSDT: { id: "polkadot", name: "Polkadot" },
  DOGEUSDT: { id: "dogecoin", name: "Dogecoin" },
  AVAXUSDT: { id: "avalanche-2", name: "Avalanche" },
  LINKUSDT: { id: "chainlink", name: "Chainlink" },
  MATICUSDT: { id: "polygon", name: "Polygon" },
  UNIUSDT: { id: "uniswap", name: "Uniswap" },
  LTCUSDT: { id: "litecoin", name: "Litecoin" },
  BCHUSDT: { id: "bitcoin-cash", name: "Bitcoin Cash" },
  ATOMUSDT: { id: "cosmos", name: "Cosmos" },
  VETUSDT: { id: "vechain", name: "VeChain" },
  FILUSDT: { id: "filecoin", name: "Filecoin" },
  TRXUSDT: { id: "tron", name: "TRON" },
  ETCUSDT: { id: "ethereum-classic", name: "Ethereum Classic" },
  XLMUSDT: { id: "stellar", name: "Stellar" },
  ALGOUSDT: { id: "algorand", name: "Algorand" },
  NEARUSDT: { id: "near", name: "NEAR Protocol" },
  APEUSDT: { id: "apecoin", name: "ApeCoin" },
  SANDUSDT: { id: "the-sandbox", name: "The Sandbox" },
  MANAUSDT: { id: "decentraland", name: "Decentraland" },
  CRVUSDT: { id: "curve-dao-token", name: "Curve DAO" },
  AAVEUSDT: { id: "aave", name: "Aave" },
  MKRUSDT: { id: "maker", name: "Maker" },
  COMPUSDT: { id: "compound", name: "Compound" },
  SUSHIUSDT: { id: "sushi", name: "SushiSwap" },
};

// Get coins for a specific page (10 coins per page)
const getCoinsByPage = (page: number): string[] => {
  const allCoins = Object.keys(BINANCE_COIN_MAP);
  const startIndex = page * 10;
  const endIndex = startIndex + 10;
  return allCoins.slice(startIndex, endIndex);
};

export function useReliableBinanceData(page: number = 0) {
  const [prices, setPrices] = useState<RealCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionMethod] = useState<'polling'>('polling'); // Always use polling for reliability
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  const updatePrice = useCallback((symbol: string, data: any) => {
    const coinInfo = BINANCE_COIN_MAP[symbol];
    if (!coinInfo) return;

    // Validate data quality
    const lastPrice = parseFloat(data.lastPrice);
    const priceChange = parseFloat(data.priceChangePercent);
    const highPrice = parseFloat(data.highPrice);
    const lowPrice = parseFloat(data.lowPrice);
    const volume = parseFloat(data.volume);

    // Basic data validation
    if (isNaN(lastPrice) || lastPrice <= 0) {
      console.warn(`Invalid price data for ${symbol}:`, data.lastPrice);
      return;
    }

    if (isNaN(highPrice) || isNaN(lowPrice) || highPrice < lowPrice) {
      console.warn(`Invalid high/low data for ${symbol}:`, { high: highPrice, low: lowPrice });
      return;
    }

    const newPrice: RealCoinPrice = {
      id: coinInfo.id,
      symbol: symbol.replace("USDT", ""),
      name: coinInfo.name,
      current_price: lastPrice,
      price_change_percentage_24h: priceChange,
      high_24h: highPrice,
      low_24h: lowPrice,
      volume_24h: volume,
      last_updated: new Date(),
    };

    setPrices((currentPrices) => {
      const updatedPrices = [...currentPrices];
      const existingIndex = updatedPrices.findIndex(
        (p) => p.id === newPrice.id
      );

      if (existingIndex >= 0) {
        // Check if price actually changed to avoid unnecessary updates
        const existingPrice = updatedPrices[existingIndex];
        if (existingPrice.current_price !== newPrice.current_price) {
          console.log(`💰 ${symbol}: ${existingPrice.current_price} → ${newPrice.current_price}`);
          updatedPrices[existingIndex] = newPrice;
        } else {
          // Update timestamp even if price didn't change to show data is fresh
          updatedPrices[existingIndex] = { ...existingPrice, last_updated: new Date() };
        }
      } else {
        console.log(`➕ Added ${symbol}: $${newPrice.current_price}`);
        updatedPrices.push(newPrice);
      }

      return updatedPrices;
    });

    setLastUpdate(new Date());
  }, []);

  const fetchPrices = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      const symbols = getCoinsByPage(page);
      console.log(`Fetching prices for page ${page}:`, symbols);
      
      // Fetch all symbols in parallel with error handling for each
      const promises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
            { 
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              // Add timeout
              signal: AbortSignal.timeout(10000) // 10 second timeout
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          return { symbol, data, success: true };
        } catch (err) {
          console.warn(`Failed to fetch ${symbol}:`, err);
          return { symbol, error: err, success: false };
        }
      });

      const results = await Promise.allSettled(promises);
      let successCount = 0;
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          updatePrice(result.value.symbol, result.value.data);
          successCount++;
        }
      });

      if (successCount > 0) {
        setIsConnected(true);
        setError(null);
        const timestamp = new Date().toLocaleTimeString();
        console.log(`✅ [${timestamp}] Real-time update: ${successCount}/${symbols.length} prices from Binance`);
      } else {
        setIsConnected(false);
        setError("Failed to fetch any price data from Binance API");
        console.error("❌ Failed to fetch any prices");
      }
      
    } catch (err) {
      console.error("Polling error:", err);
      setError(`Failed to fetch price data: ${err}`);
      setIsConnected(false);
    }
  }, [page, updatePrice]);

  const startPolling = useCallback(() => {
    console.log("Starting Binance REST API polling");
    
    // Initial fetch
    fetchPrices();
    
    // Set up polling interval (every 2 seconds for real-time updates)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        fetchPrices();
      }
    }, 2000); // 2 seconds for more real-time feel
  }, [fetchPrices]);

  const disconnect = useCallback(() => {
    isActiveRef.current = false;
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsConnected(false);
    setPrices([]);
    setLastUpdate(null);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setError(null);
    isActiveRef.current = true;
    setTimeout(startPolling, 1000);
  }, [disconnect, startPolling]);

  useEffect(() => {
    isActiveRef.current = true;
    setPrices([]);
    setLastUpdate(null);
    startPolling();

    return () => {
      disconnect();
    };
  }, [startPolling, disconnect, page]);

  return {
    prices,
    isConnected,
    lastUpdate,
    error,
    reconnect,
    disconnect,
    connectionMethod,
    connectionAttempts: 0,
    maxAttempts: 0,
    currentPage: page,
    totalPages: Math.ceil(Object.keys(BINANCE_COIN_MAP).length / 10),
  };
}