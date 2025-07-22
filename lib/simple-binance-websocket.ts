'use client';

import { useState, useEffect, useRef } from 'react';

export interface SimpleCoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  last_updated: Date;
}

// Simple mapping for major coins only
const COIN_MAP: Record<string, { id: string; name: string }> = {
  'BTCUSDT': { id: 'bitcoin', name: 'Bitcoin' },
  'ETHUSDT': { id: 'ethereum', name: 'Ethereum' },
  'BNBUSDT': { id: 'binancecoin', name: 'BNB' },
  'ADAUSDT': { id: 'cardano', name: 'Cardano' },
  'SOLUSDT': { id: 'solana', name: 'Solana' },
};

export function useSimpleBinanceWebSocket() {
  const [prices, setPrices] = useState<SimpleCoinPrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        // Try different WebSocket URLs for better compatibility
        const wsUrls = [
          'wss://stream.binance.com:9443/ws/btcusdt@ticker',
          'wss://stream.binance.com/ws/btcusdt@ticker',
          'wss://data-stream.binance.vision/ws/btcusdt@ticker'
        ];
        
        let currentUrlIndex = 0;
        
        const tryConnect = () => {
          if (currentUrlIndex >= wsUrls.length) {
            setError('All connection attempts failed');
            return;
          }
          
          const wsUrl = wsUrls[currentUrlIndex];
          console.log(`Attempting to connect to: ${wsUrl}`);
          
          wsRef.current = new WebSocket(wsUrl);

          wsRef.current.onopen = () => {
            console.log('✅ Connected to Binance WebSocket');
            setIsConnected(true);
            setError(null);
          };

          wsRef.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              const coinInfo = COIN_MAP[data.s];
              
              if (coinInfo) {
                const newPrice: SimpleCoinPrice = {
                  id: coinInfo.id,
                  symbol: data.s.replace('USDT', ''),
                  name: coinInfo.name,
                  current_price: parseFloat(data.c),
                  price_change_percentage_24h: parseFloat(data.P),
                  last_updated: new Date()
                };

                setPrices(prev => {
                  const updated = prev.filter(p => p.id !== newPrice.id);
                  return [...updated, newPrice];
                });
                
                setLastUpdate(new Date());
              }
            } catch (err) {
              console.error('Error parsing WebSocket message:', err);
            }
          };

          wsRef.current.onclose = (event) => {
            console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
            setIsConnected(false);
            
            // Try next URL if this one failed
            if (event.code !== 1000) {
              currentUrlIndex++;
              setTimeout(tryConnect, 2000);
            }
          };

          wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError(`Connection failed (attempt ${currentUrlIndex + 1}/${wsUrls.length})`);
            setIsConnected(false);
            
            // Try next URL
            currentUrlIndex++;
            setTimeout(tryConnect, 2000);
          };
        };
        
        tryConnect();

      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError('Failed to initialize WebSocket');
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setError(null);
    // Reconnect after a short delay
    setTimeout(() => {
      // Re-run the effect by changing a state
      setIsConnected(false);
    }, 1000);
  };

  return {
    prices,
    isConnected,
    lastUpdate,
    error,
    reconnect
  };
}