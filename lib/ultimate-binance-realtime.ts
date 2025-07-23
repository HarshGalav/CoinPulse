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

export function useUltimateBinanceRealtime(page: number = 0) {
  const [prices, setPrices] = useState<RealCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'websocket' | 'polling'>('websocket');
  const [updateCount, setUpdateCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 2; // Reduced for faster fallback
  const isActiveRef = useRef(true);
  const connectionStartTime = useRef<Date | null>(null);

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
          const changeIcon = newPrice.current_price > existingPrice.current_price ? '📈' : '📉';
          console.log(`${changeIcon} ${tickerData.s}: $${existingPrice.current_price} → $${newPrice.current_price}`);
        }
        updatedPrices[existingIndex] = newPrice;
      } else {
        console.log(`➕ Added ${tickerData.s}: $${newPrice.current_price}`);
        updatedPrices.push(newPrice);
      }

      return updatedPrices;
    });

    setLastUpdate(new Date());
    setUpdateCount(prev => prev + 1);
  }, []);

  // Enhanced REST API fallback with better performance
  const startPolling = useCallback(async () => {
    console.log("🔄 Starting enhanced REST API polling");
    setConnectionMethod('polling');
    
    const symbols = getCoinsByPage(page);
    
    const pollPrices = async () => {
      if (!isActiveRef.current) return;
      
      try {
        // Use Promise.allSettled for better error handling
        const promises = symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
              { 
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // Reduced timeout for faster response
              }
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
            const { data } = result.value;
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
          const timestamp = new Date().toLocaleTimeString();
          console.log(`✅ [${timestamp}] REST API: ${successCount}/${symbols.length} prices updated`);
        } else {
          setIsConnected(false);
          setError("Failed to fetch price data from Binance API");
        }
        
      } catch (err) {
        console.error("Polling error:", err);
        setError(`REST API error: ${err}`);
        setIsConnected(false);
      }
    };

    // Initial poll
    await pollPrices();
    
    // Set up polling interval (1.5 seconds for near real-time)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(pollPrices, 1500);
  }, [page, updatePrice]);

  // Ultra-robust WebSocket connection with smart fallback
  const connectWebSocket = useCallback(() => {
    if (!isActiveRef.current) return;

    connectionStartTime.current = new Date();
    
    try {
      const symbols = getCoinsByPage(page);
      
      // Use individual streams for better reliability (max 5 per connection)
      const batch1 = symbols.slice(0, 5);
      const batch2 = symbols.slice(5, 10);
      
      const connectBatch = (batchSymbols: string[], batchName: string) => {
        if (batchSymbols.length === 0) return;
        
        const streams = batchSymbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
        const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join("/")}`;
        
        console.log(`🔌 Connecting ${batchName}:`, batchSymbols);
        
        try {
          const ws = new WebSocket(wsUrl);
          setConnectionMethod('websocket');

          // Aggressive connection timeout for faster fallback
          const connectionTimeout = setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
              console.log(`⏰ ${batchName} connection timeout (5s)`);
              ws.close();
              
              // If this is the first batch and it fails, immediately try REST API
              if (batchName === 'Batch 1') {
                console.log("🔄 First batch failed, switching to REST API immediately");
                startPolling();
              }
            }
          }, 5000);

          ws.onopen = () => {
            console.log(`✅ ${batchName} WebSocket connected`);
            clearTimeout(connectionTimeout);
            setIsConnected(true);
            setError(null);
            reconnectAttempts.current = 0;
            
            const connectionTime = connectionStartTime.current ? 
              new Date().getTime() - connectionStartTime.current.getTime() : 0;
            console.log(`⚡ Connection established in ${connectionTime}ms`);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.stream && data.data) {
                updatePrice(data.data);
              } else if (data.s) {
                updatePrice(data);
              }
            } catch (err) {
              console.error(`Error parsing ${batchName} message:`, err);
            }
          };

          ws.onclose = (event) => {
            console.log(`🔌 ${batchName} closed: ${event.code} - ${event.reason}`);
            clearTimeout(connectionTimeout);
            
            if (isActiveRef.current && event.code !== 1000) {
              if (reconnectAttempts.current < maxReconnectAttempts) {
                const delay = 2000; // Fixed 2-second delay for faster recovery
                console.log(`🔄 Reconnecting ${batchName} in ${delay}ms`);
                
                reconnectTimeoutRef.current = setTimeout(() => {
                  reconnectAttempts.current++;
                  connectWebSocket();
                }, delay);
              } else {
                console.log("🔄 Max reconnection attempts reached, switching to REST API");
                startPolling();
              }
            }
          };

          ws.onerror = (error) => {
            console.error(`❌ ${batchName} WebSocket error:`, error);
            clearTimeout(connectionTimeout);
            
            if (ws) {
              ws.close();
            }
            
            // Immediate fallback on error
            if (batchName === 'Batch 1') {
              console.log("🔄 WebSocket error detected, switching to REST API");
              startPolling();
            }
          };

          // Store reference for cleanup
          if (batchName === 'Batch 1') {
            wsRef.current = ws;
          }

        } catch (err) {
          console.error(`❌ Failed to create ${batchName} WebSocket:`, err);
          if (batchName === 'Batch 1') {
            startPolling();
          }
        }
      };

      // Connect both batches
      connectBatch(batch1, 'Batch 1');
      if (batch2.length > 0) {
        setTimeout(() => connectBatch(batch2, 'Batch 2'), 100);
      }

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
    setUpdateCount(0);
    reconnectAttempts.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    console.log("🔄 Manual reconnection initiated");
    disconnect();
    setError(null);
    isActiveRef.current = true;
    setTimeout(connectWebSocket, 500);
  }, [disconnect, connectWebSocket]);

  useEffect(() => {
    isActiveRef.current = true;
    setPrices([]);
    setLastUpdate(null);
    setUpdateCount(0);
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
    updateCount, // New: track number of updates received
    isRealTime: connectionMethod === 'websocket', // New: indicate if truly real-time
  };
}