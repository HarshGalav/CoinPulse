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

// Binance WebSocket ticker data structure
export interface BinanceTickerData {
  s: string; // Symbol (e.g., "BTCUSDT")
  c: string; // Current price
  P: string; // Price change percentage 24h
  h: string; // High price 24h
  l: string; // Low price 24h
  v: string; // Volume 24h
  q: string; // Quote volume 24h
  o: string; // Open price 24h
  x: string; // Previous close price
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

export function useBinanceProxyWebSocket(page: number = 0) {
  const [prices, setPrices] = useState<RealCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'websocket' | 'polling'>('websocket');
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const updatePrice = useCallback((tickerData: BinanceTickerData) => {
    const coinInfo = BINANCE_COIN_MAP[tickerData.s];
    if (!coinInfo) return;

    const newPrice: RealCoinPrice = {
      id: coinInfo.id,
      symbol: tickerData.s.replace("USDT", ""),
      name: coinInfo.name,
      current_price: parseFloat(tickerData.c),
      price_change_percentage_24h: parseFloat(tickerData.P),
      high_24h: parseFloat(tickerData.h),
      low_24h: parseFloat(tickerData.l),
      volume_24h: parseFloat(tickerData.v),
      last_updated: new Date(),
    };

    setPrices((currentPrices) => {
      const updatedPrices = [...currentPrices];
      const existingIndex = updatedPrices.findIndex(
        (p) => p.id === newPrice.id
      );

      if (existingIndex >= 0) {
        updatedPrices[existingIndex] = newPrice;
      } else {
        updatedPrices.push(newPrice);
      }

      return updatedPrices;
    });

    setLastUpdate(new Date());
  }, []);

  // Fallback to REST API polling when WebSocket fails
  const startPolling = useCallback(async () => {
    console.log("Starting REST API polling fallback");
    setConnectionMethod('polling');
    
    const symbols = getCoinsByPage(page);
    
    const pollPrices = async () => {
      try {
        // Use Binance REST API for 24hr ticker statistics
        const promises = symbols.map(async (symbol) => {
          const response = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
            { 
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              }
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return response.json();
        });

        const results = await Promise.allSettled(promises);
        
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const data = result.value;
            // Convert REST API response to ticker format
            const tickerData: BinanceTickerData = {
              s: data.symbol,
              c: data.lastPrice,
              P: data.priceChangePercent,
              h: data.highPrice,
              l: data.lowPrice,
              v: data.volume,
              q: data.quoteVolume,
              o: data.openPrice,
              x: data.prevClosePrice,
            };
            updatePrice(tickerData);
          }
        });

        setIsConnected(true);
        setError(null);
        
      } catch (err) {
        console.error("Polling error:", err);
        setError(`REST API polling failed: ${err}`);
        setIsConnected(false);
      }
    };

    // Initial poll
    await pollPrices();
    
    // Set up polling interval (every 5 seconds)
    pollingIntervalRef.current = setInterval(pollPrices, 5000);
  }, [page, updatePrice]);

  const connectWebSocket = useCallback(() => {
    try {
      const symbols = getCoinsByPage(page);
      const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
      
      // Try the standard Binance WebSocket endpoint
      const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join("/")}`;
      console.log("Attempting WebSocket connection:", wsUrl);

      wsRef.current = new WebSocket(wsUrl);
      setConnectionMethod('websocket');

      // Set a timeout for WebSocket connection
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          console.log("WebSocket connection timeout, falling back to REST API");
          wsRef.current.close();
          startPolling();
        }
      }, 5000); // 5 second timeout

      wsRef.current.onopen = () => {
        console.log("✅ Connected to Binance WebSocket");
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.stream && data.data) {
            updatePrice(data.data);
          } else if (data.s) {
            updatePrice(data);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        clearTimeout(connectionTimeout);
        setIsConnected(false);

        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log("Max WebSocket reconnection attempts reached, falling back to REST API polling");
          startPolling();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        console.error("WebSocket readyState:", wsRef.current?.readyState);
        
        clearTimeout(connectionTimeout);
        
        // Close the WebSocket and immediately fall back to polling
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        console.log("WebSocket failed, immediately falling back to REST API polling");
        setError("WebSocket connection failed, using REST API polling instead");
        startPolling();
      };

    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      console.log("Falling back to REST API polling");
      startPolling();
    }
  }, [page, updatePrice, startPolling]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setIsConnected(false);
    setPrices([]);
    setLastUpdate(null);
    reconnectAttempts.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setError(null);
    setTimeout(connectWebSocket, 1000);
  }, [disconnect, connectWebSocket]);

  useEffect(() => {
    setPrices([]);
    setLastUpdate(null);
    connectWebSocket();

    return () => {
      disconnect();
    };
  }, [connectWebSocket, disconnect, page]);

  return {
    prices,
    isConnected,
    lastUpdate,
    error,
    reconnect,
    disconnect,
    connectionMethod,
    connectionAttempts: reconnectAttempts.current,
    maxAttempts: maxReconnectAttempts,
    currentPage: page,
    totalPages: Math.ceil(Object.keys(BINANCE_COIN_MAP).length / 10),
  };
}