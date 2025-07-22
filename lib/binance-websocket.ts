'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface BinanceTickerData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface CoinPriceData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  last_updated: Date;
}

// Mapping from Binance symbols to CoinGecko IDs for consistency
const BINANCE_TO_COINGECKO_MAP: Record<string, { id: string; name: string }> = {
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
  'MATICUSDT': { id: 'matic-network', name: 'Polygon' },
  'LTCUSDT': { id: 'litecoin', name: 'Litecoin' },
  'UNIUSDT': { id: 'uniswap', name: 'Uniswap' },
  'ATOMUSDT': { id: 'cosmos', name: 'Cosmos' },
  'VETUSDT': { id: 'vechain', name: 'VeChain' },
  'FILUSDT': { id: 'filecoin', name: 'Filecoin' },
  'TRXUSDT': { id: 'tron', name: 'TRON' },
  'ETCUSDT': { id: 'ethereum-classic', name: 'Ethereum Classic' },
  'XLMUSDT': { id: 'stellar', name: 'Stellar' },
  'BCHUSDT': { id: 'bitcoin-cash', name: 'Bitcoin Cash' },
};

export function useBinanceWebSocket() {
  const [prices, setPrices] = useState<CoinPriceData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const symbols = Object.keys(BINANCE_TO_COINGECKO_MAP);

  // Move transformBinanceData outside of useCallback to prevent dependency issues
  const transformBinanceData = (tickerData: BinanceTickerData): CoinPriceData | null => {
    const coinInfo = BINANCE_TO_COINGECKO_MAP[tickerData.symbol];
    if (!coinInfo) return null;

    return {
      id: coinInfo.id,
      symbol: tickerData.symbol.replace('USDT', ''),
      name: coinInfo.name,
      current_price: parseFloat(tickerData.lastPrice),
      price_change_24h: parseFloat(tickerData.priceChange),
      price_change_percentage_24h: parseFloat(tickerData.priceChangePercent),
      high_24h: parseFloat(tickerData.highPrice),
      low_24h: parseFloat(tickerData.lowPrice),
      volume_24h: parseFloat(tickerData.volume),
      last_updated: new Date()
    };
  };

  const connectWebSocket = useCallback(() => {
    try {
      // Use a simpler approach with fewer symbols to avoid URL length issues
      const primarySymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
      const streams = primarySymbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
      const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
      
      console.log('Connecting to Binance WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Connected to Binance WebSocket');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.stream && data.data) {
            const tickerData: BinanceTickerData = data.data;
            const transformedData = transformBinanceData(tickerData);
            
            if (transformedData) {
              setPrices(currentPrices => {
                const updatedPrices = [...currentPrices];
                const existingIndex = updatedPrices.findIndex(p => p.id === transformedData.id);
                
                if (existingIndex >= 0) {
                  updatedPrices[existingIndex] = transformedData;
                } else {
                  updatedPrices.push(transformedData);
                }
                
                return updatedPrices;
              });
              
              setLastUpdate(new Date());
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 Binance WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Binance WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setIsConnected(false);
    }
  }, []); // Remove dependencies to prevent infinite loop

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setPrices([]);
    setLastUpdate(null);
    reconnectAttempts.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connectWebSocket(), 1000);
  }, [disconnect]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnect();
    };
  }, []); // Remove all dependencies to prevent infinite loop

  return {
    prices,
    isConnected,
    lastUpdate,
    error,
    reconnect,
    disconnect,
    connectionAttempts: reconnectAttempts.current,
    maxAttempts: maxReconnectAttempts
  };
}

// Hook for individual coin price tracking
export function useBinanceCoinPrice(symbol: string) {
  const [price, setPrice] = useState<CoinPriceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connectSingleCoin = useCallback(() => {
    const binanceSymbol = `${symbol.toUpperCase()}USDT`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@ticker`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const tickerData: BinanceTickerData = JSON.parse(event.data);
        const coinInfo = BINANCE_TO_COINGECKO_MAP[tickerData.symbol];
        
        if (coinInfo) {
          setPrice({
            id: coinInfo.id,
            symbol: tickerData.symbol.replace('USDT', ''),
            name: coinInfo.name,
            current_price: parseFloat(tickerData.lastPrice),
            price_change_24h: parseFloat(tickerData.priceChange),
            price_change_percentage_24h: parseFloat(tickerData.priceChangePercent),
            high_24h: parseFloat(tickerData.highPrice),
            low_24h: parseFloat(tickerData.lowPrice),
            volume_24h: parseFloat(tickerData.volume),
            last_updated: new Date()
          });
        }
      } catch (err) {
        console.error('Error parsing single coin data:', err);
        setError('Failed to parse price data');
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current.onerror = (error) => {
      console.error('Single coin WebSocket error:', error);
      setError('Connection error');
      setIsConnected(false);
    };
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      connectSingleCoin();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, connectSingleCoin]);

  return { price, isConnected, error };
}