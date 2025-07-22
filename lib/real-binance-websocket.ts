'use client';

import page from '@/app/page';
import page from '@/app/page';
import { useState, useEffect, useRef, useCallback } from 'react';

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
  s: string;  // Symbol (e.g., "BTCUSDT")
  c: string;  // Current price
  P: string;  // Price change percentage 24h
  h: string;  // High price 24h
  l: string;  // Low price 24h
  v: string;  // Volume 24h
  q: string;  // Quote volume 24h
  o: string;  // Open price 24h
  x: string;  // Previous close price
}

// Verified Binance to CoinGecko mapping (all symbols confirmed on Binance)
const BINANCE_COIN_MAP: Record<string, { id: string; name: string }> = {
  // Page 1 (0-9) - Major cryptocurrencies
  'BTCUSDT': { id: 'bitcoin', name: 'Bitcoin' },
  'ETHUSDT': { id: 'ethereum', name: 'Ethereum' },
  'BNBUSDT': { id: 'binancecoin', name: 'BNB' },
  'ADAUSDT': { id: 'cardano', name: 'Cardano' },
  'SOLUSDT': { id: 'solana', name: 'Solana' },
  'XRPUSDT': { id: 'ripple', name: 'XRP' },
  'DOTUSDT': { id: 'polkadot', name: 'Polkadot' },
  'DOGEUSDT': { id: 'dogecoin', name: 'Dogecoin' },
  'AVAXUSDT': { id: 'avalanche-2', name: 'Avalanche' },
  'LINKUSDT': { id: 'chainlink', name: 'Chainlink' },
  
  // Page 2 (10-19) - Popular altcoins
  'MATICUSDT': { id: 'polygon', name: 'Polygon' },
  'UNIUSDT': { id: 'uniswap', name: 'Uniswap' },
  'LTCUSDT': { id: 'litecoin', name: 'Litecoin' },
  'BCHUSDT': { id: 'bitcoin-cash', name: 'Bitcoin Cash' },
  'ATOMUSDT': { id: 'cosmos', name: 'Cosmos' },
  'VETUSDT': { id: 'vechain', name: 'VeChain' },
  'FILUSDT': { id: 'filecoin', name: 'Filecoin' },
  'TRXUSDT': { id: 'tron', name: 'TRON' },
  'ETCUSDT': { id: 'ethereum-classic', name: 'Ethereum Classic' },
  'XLMUSDT': { id: 'stellar', name: 'Stellar' },
  
  // Page 3 (20-29) - DeFi and other tokens
  'ALGOUSDT': { id: 'algorand', name: 'Algorand' },
  'NEARUSDT': { id: 'near', name: 'NEAR Protocol' },
  'APEUSDT': { id: 'apecoin', name: 'ApeCoin' },
  'SANDUSDT': { id: 'the-sandbox', name: 'The Sandbox' },
  'MANAUSDT': { id: 'decentraland', name: 'Decentraland' },
  'CRVUSDT': { id: 'curve-dao-token', name: 'Curve DAO' },
  'AAVEUSDT': { id: 'aave', name: 'Aave' },
  'MKRUSDT': { id: 'maker', name: 'Maker' },
  'COMPUSDT': { id: 'compound', name: 'Compound' },
  'SUSHIUSDT': { id: 'sushi', name: 'SushiSwap' },
};

// Get coins for a specific page (10 coins per page)
const getCoinsByPage = (page: number): string[] => {
  const allCoins = Object.keys(BINANCE_COIN_MAP);
  const startIndex = page * 10;
  const endIndex = startIndex + 10;
  return allCoins.slice(startIndex, endIndex);
};

export function useRealBinanceWebSocket(page: number = 0) {
  const [prices, setPrices] = useState<RealCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsRef2 = useRef<WebSocket | null>(null); // Second connection for remaining coins
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [connectionsActive, setConnectionsActive] = useState(0);

  const updatePrice = useCallback((tickerData: BinanceTickerData) => {
    const coinInfo = BINANCE_COIN_MAP[tickerData.s];
    if (!coinInfo) return;

    const newPrice: RealCoinPrice = {
      id: coinInfo.id,
      symbol: tickerData.s.replace('USDT', ''),
      name: coinInfo.name,
      current_price: parseFloat(tickerData.c),
      price_change_percentage_24h: parseFloat(tickerData.P),
      high_24h: parseFloat(tickerData.h),
      low_24h: parseFloat(tickerData.l),
      volume_24h: parseFloat(tickerData.v),
      last_updated: new Date()
    };

    setPrices(currentPrices => {
      const updatedPrices = [...currentPrices];
      const existingIndex = updatedPrices.findIndex(p => p.id === newPrice.id);
      
      if (existingIndex >= 0) {
        updatedPrices[existingIndex] = newPrice;
      } else {
        updatedPrices.push(newPrice);
      }
      
      return updatedPrices;
    });
    
    setLastUpdate(new Date());
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      // Get coins for current page (10 coins per page)
      const symbols = getCoinsByPage(page);
      
      // Split into two batches to handle Binance stream limits (max 5-10 streams per connection)
      const batch1 = symbols.slice(0, 5);
      const batch2 = symbols.slice(5, 10);
      
      console.log('Connecting to Binance WebSocket for page', page);
      console.log('Batch 1 symbols:', batch1);
      console.log('Batch 2 symbols:', batch2);
      
      setConnectionsActive(0);
      
      // Connect first batch
      if (batch1.length > 0) {
        const streams1 = batch1.map(symbol => `${symbol.toLowerCase()}@ticker`);
        const wsUrl1 = `wss://stream.binance.com:9443/stream?streams=${streams1.join('/')}`;
        console.log('WebSocket URL 1:', wsUrl1);
        
        wsRef.current = new WebSocket(wsUrl1);
        setupWebSocketHandlers(wsRef.current, 'Connection 1');
      }
      
      // Connect second batch
      if (batch2.length > 0) {
        const streams2 = batch2.map(symbol => `${symbol.toLowerCase()}@ticker`);
        const wsUrl2 = `wss://stream.binance.com:9443/stream?streams=${streams2.join('/')}`;
        console.log('WebSocket URL 2:', wsUrl2);
        
        // Small delay to avoid overwhelming the server
        setTimeout(() => {
          wsRef2.current = new WebSocket(wsUrl2);
          setupWebSocketHandlers(wsRef2.current, 'Connection 2');
        }, 100);
      }
    } catch (err) {
      console.error('Failed to create WebSocket connections:', err);
      setError('Failed to initialize WebSocket connections');
      setIsConnected(false);
    }
  }, [updatePrice, page]);

  const setupWebSocketHandlers = (ws: WebSocket, connectionName: string) => {
    ws.onopen = () => {
      console.log(`✅ Connected to Binance WebSocket (${connectionName})`);
      setConnectionsActive(prev => {
        const newCount = prev + 1;
        if (newCount >= 1) { // At least one connection is active
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;
        }
        return newCount;
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle the stream response format
        if (data.stream && data.data) {
          // Multi-stream format: data.stream contains the stream name, data.data contains ticker data
          const tickerData = data.data;
          console.log(`${connectionName} - Received update for ${tickerData.s}: $${tickerData.c}`);
          updatePrice(tickerData);
        } else if (data.s) {
          // Single stream format (fallback)
          console.log(`${connectionName} - Received direct update for ${data.s}: $${data.c}`);
          updatePrice(data);
        } else {
          console.log(`${connectionName} - Unknown message format:`, data);
        }
      } catch (err) {
        console.error(`${connectionName} - Error parsing WebSocket message:`, err, event.data);
      }
    };

    ws.onclose = (event) => {
      console.log(`${connectionName} - WebSocket closed: ${event.code} - ${event.reason}`);
      setConnectionsActive(prev => {
        const newCount = Math.max(0, prev - 1);
        if (newCount === 0) {
          setIsConnected(false);
        }
        return newCount;
      });
      
      // Attempt to reconnect if not a clean close
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`${connectionName} - Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connectWebSocket();
        }, delay);
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('Failed to connect after multiple attempts. Please check your internet connection.');
      }
    };

    ws.onerror = (error) => {
      console.error(`${connectionName} - WebSocket error:`, error);
      setError(`WebSocket connection error (${connectionName})`);
    };
  };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to initialize WebSocket connection');
      setIsConnected(false);
    }
  }, [updatePrice, page]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    if (wsRef2.current) {
      wsRef2.current.close(1000, 'User disconnected');
      wsRef2.current = null;
    }
    
    setIsConnected(false);
    setPrices([]);
    setLastUpdate(null);
    setConnectionsActive(0);
    reconnectAttempts.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setError(null);
    setTimeout(connectWebSocket, 1000);
  }, [disconnect, connectWebSocket]);

  useEffect(() => {
    // Clear previous prices when page changes
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
    connectionAttempts: reconnectAttempts.current,
    maxAttempts: maxReconnectAttempts,
    currentPage: page,
    totalPages: Math.ceil(Object.keys(BINANCE_COIN_MAP).length / 10)
  };
}