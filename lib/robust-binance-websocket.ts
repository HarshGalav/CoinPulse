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

export function useRobustBinanceWebSocket(page: number = 0) {
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
  const isActiveRef = useRef(true);

  const updatePrice = useCallback((tickerData: BinanceTickerData) => {
    const coinInfo = BINANCE_COIN_MAP[tickerData.s];
    if (!coinInfo) return;

    // Validate data quality
    const lastPrice = parseFloat(tickerData.c);
    const priceChange = parseFloat(tickerData.P);
    const highPrice = parseFloat(tickerData.h);
    const lowPrice = parseFloat(tickerData.l);
    const volume = parseFloat(tickerData.v);

    // Basic data validation
    if (isNaN(lastPrice) || lastPrice <= 0) {
      console.warn(`Invalid price data for ${tickerData.s}:`, tickerData.c);
      return;
    }

    const newPrice: RealCoinPrice = {
      id: coinInfo.id,
      symbol: tickerData.s.replace("USDT", ""),
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
        const existingPrice = updatedPrices[existingIndex];
        if (existingPrice.current_price !== newPrice.current_price) {
          console.log(`🚀 ${tickerData.s}: ${existingPrice.current_price} → ${newPrice.current_price}`);
        }
        updatedPrices[existingIndex] = newPrice;
      } else {
        console.log(`➕ Added ${tickerData.s}: $${newPrice.current_price}`);
        updatedPrices.push(newPrice);
      }

      return updatedPrices;
    });

    setLastUpdate(new Date());
  }, []);

  // REST API fallback for when WebSocket fails
  const startPolling = useCallback(async () => {
    console.log("🔄 Starting REST API polling fallback");
    setConnectionMethod('polling');
    
    const symbols = getCoinsByPage(page);
    
    const pollPrices = async () => {
      if (!isActiveRef.current) return;
      
      try {
        const promises = symbols.map(async (symbol) => {
          const response = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
            { 
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(8000)
            }
          );
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        });

        const results = await Promise.allSettled(promises);
        let successCount = 0;
        
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const data = result.value;
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
            successCount++;
          }
        });

        if (successCount > 0) {
          setIsConnected(true);
          setError(null);
        }
        
      } catch (err) {
        console.error("Polling error:", err);
        setError(`REST API polling failed: ${err}`);
        setIsConnected(false);
      }
    };

    // Initial poll
    await pollPrices();
    
    // Set up polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(pollPrices, 3000);
  }, [page, updatePrice]);

  // Enhanced WebSocket connection with multiple endpoints and better error handling
  const connectWebSocket = useCallback(() => {
    if (!isActiveRef.current) return;

    try {
      const symbols = getCoinsByPage(page);
      const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
      
      // Try multiple WebSocket endpoints for better reliability
      const endpoints = [
        `wss://stream.binance.com/stream?streams=${streams.join("/")}`,
        `wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`,
        `wss://stream.binance.us/stream?streams=${streams.join("/")}` // US endpoint as fallback
      ];
      
      const tryEndpoint = (endpointIndex: number) => {
        if (endpointIndex >= endpoints.length) {
          console.log("🔄 All WebSocket endpoints failed, falling back to REST API");
          startPolling();
          return;
        }

        const wsUrl = endpoints[endpointIndex];
        console.log(`🔌 Attempting WebSocket connection ${endpointIndex + 1}/${endpoints.length}:`, wsUrl);

        try {
          wsRef.current = new WebSocket(wsUrl);
          setConnectionMethod('websocket');

          // Connection timeout
          const connectionTimeout = setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
              console.log(`⏰ WebSocket connection ${endpointIndex + 1} timeout`);
              wsRef.current.close();
              tryEndpoint(endpointIndex + 1);
            }
          }, 8000);

          wsRef.current.onopen = () => {
            console.log(`✅ WebSocket connected via endpoint ${endpointIndex + 1}`);
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
            console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
            clearTimeout(connectionTimeout);
            setIsConnected(false);

            if (isActiveRef.current && event.code !== 1000) {
              if (reconnectAttempts.current < maxReconnectAttempts) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
                console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                
                reconnectTimeoutRef.current = setTimeout(() => {
                  reconnectAttempts.current++;
                  connectWebSocket();
                }, delay);
              } else {
                console.log("🔄 Max WebSocket reconnection attempts reached, falling back to REST API");
                startPolling();
              }
            }
          };

          wsRef.current.onerror = (error) => {
            console.error(`❌ WebSocket error on endpoint ${endpointIndex + 1}:`, error);
            clearTimeout(connectionTimeout);
            
            if (wsRef.current) {
              wsRef.current.close();
            }
            
            // Try next endpoint
            setTimeout(() => tryEndpoint(endpointIndex + 1), 1000);
          };

        } catch (err) {
          console.error(`❌ Failed to create WebSocket ${endpointIndex + 1}:`, err);
          tryEndpoint(endpointIndex + 1);
        }
      };

      // Start with the first endpoint
      tryEndpoint(0);

    } catch (err) {
      console.error("❌ WebSocket initialization failed:", err);
      startPolling();
    }
  }, [page, updatePrice, startPolling]);

  const disconnect = useCallback(() => {
    isActiveRef.current = false;
    
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
    isActiveRef.current = true;
    setTimeout(connectWebSocket, 1000);
  }, [disconnect, connectWebSocket]);

  useEffect(() => {
    isActiveRef.current = true;
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