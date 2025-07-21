'use client';

import { useState, useEffect } from 'react';

export interface FreeRealtimePrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
  last_updated: Date;
}

// CoinCap to CoinGecko ID mapping for consistency
const COINCAP_TO_COINGECKO: Record<string, { id: string; name: string; symbol: string }> = {
  'bitcoin': { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  'ethereum': { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  'binance-coin': { id: 'binancecoin', name: 'BNB', symbol: 'BNB' },
  'cardano': { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
  'solana': { id: 'solana', name: 'Solana', symbol: 'SOL' },
  'polkadot': { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
  'dogecoin': { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE' },
  'avalanche': { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' },
  'chainlink': { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
  'polygon': { id: 'matic-network', name: 'Polygon', symbol: 'MATIC' }
};

export function useFreeRealtimePrices() {
  const [prices, setPrices] = useState<FreeRealtimePrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let initialDataFetched = false;

    // Get initial market data from CoinCap REST API
    const fetchInitialData = async () => {
      try {
        const assetIds = Object.keys(COINCAP_TO_COINGECKO).join(',');
        const response = await fetch(`https://api.coincap.io/v2/assets?ids=${assetIds}`);
        
        if (!response.ok) throw new Error('Failed to fetch initial data');
        
        const { data } = await response.json();
        
        const initialPrices: FreeRealtimePrice[] = data.map((asset: any) => ({
          id: COINCAP_TO_COINGECKO[asset.id]?.id || asset.id,
          symbol: COINCAP_TO_COINGECKO[asset.id]?.symbol || asset.symbol,
          name: COINCAP_TO_COINGECKO[asset.id]?.name || asset.name,
          current_price: parseFloat(asset.priceUsd),
          price_change_percentage_24h: parseFloat(asset.changePercent24Hr) || 0,
          market_cap: parseFloat(asset.marketCapUsd) || 0,
          volume_24h: parseFloat(asset.volumeUsd24Hr) || 0,
          last_updated: new Date()
        }));

        setPrices(initialPrices);
        setLastUpdate(new Date());
        initialDataFetched = true;
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to fetch initial data');
      }
    };

    const connectWebSocket = () => {
      try {
        const assetIds = Object.keys(COINCAP_TO_COINGECKO).join(',');
        ws = new WebSocket(`wss://ws.coincap.io/prices?assets=${assetIds}`);

        ws.onopen = () => {
          console.log('Connected to CoinCap WebSocket');
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const priceUpdates = JSON.parse(event.data);
            
            setPrices(currentPrices => {
              const updatedPrices = [...currentPrices];
              
              Object.entries(priceUpdates).forEach(([assetId, priceStr]) => {
                const price = parseFloat(priceStr as string);
                const coinInfo = COINCAP_TO_COINGECKO[assetId];
                
                if (coinInfo) {
                  const existingIndex = updatedPrices.findIndex(p => p.id === coinInfo.id);
                  
                  if (existingIndex >= 0) {
                    // Update existing price
                    updatedPrices[existingIndex] = {
                      ...updatedPrices[existingIndex],
                      current_price: price,
                      last_updated: new Date()
                    };
                  } else if (initialDataFetched) {
                    // Add new price if we have initial data
                    updatedPrices.push({
                      id: coinInfo.id,
                      symbol: coinInfo.symbol,
                      name: coinInfo.name,
                      current_price: price,
                      price_change_percentage_24h: 0,
                      market_cap: 0,
                      volume_24h: 0,
                      last_updated: new Date()
                    });
                  }
                }
              });
              
              return updatedPrices;
            });

            setLastUpdate(new Date());
          } catch (err) {
            console.error('Error parsing WebSocket data:', err);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          setIsConnected(false);
          
          // Reconnect after 3 seconds unless it was a clean close
          if (event.code !== 1000) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          setError('WebSocket connection error');
        };

      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
        setIsConnected(false);
        setError('Failed to connect to real-time data');
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    // Fetch initial data first, then connect WebSocket
    fetchInitialData().then(() => {
      connectWebSocket();
    });

    // Cleanup function
    return () => {
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return { 
    prices, 
    isConnected, 
    lastUpdate, 
    error,
    // Helper to check if we have real-time data
    hasRealtimeData: prices.length > 0 && isConnected
  };
}

// Alternative hook using Binance WebSocket (also free)
export function useBinanceRealtimePrices() {
  const [prices, setPrices] = useState<FreeRealtimePrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Binance symbol mapping
  const BINANCE_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 
    'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 
    'LINKUSDT', 'MATICUSDT'
  ];

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        // Binance WebSocket for ticker data
        const streams = BINANCE_SYMBOLS.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

        ws.onopen = () => {
          console.log('Connected to Binance WebSocket');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.stream && data.data) {
              const ticker = data.data;
              const symbol = ticker.s;
              
              // Convert Binance data to our format
              const coinId = symbol.replace('USDT', '').toLowerCase();
              const mappedCoin = Object.values(COINCAP_TO_COINGECKO).find(
                coin => coin.symbol.toLowerCase() === coinId || coin.id.includes(coinId)
              );

              if (mappedCoin) {
                setPrices(currentPrices => {
                  const updatedPrices = [...currentPrices];
                  const existingIndex = updatedPrices.findIndex(p => p.id === mappedCoin.id);
                  
                  const newPrice: FreeRealtimePrice = {
                    id: mappedCoin.id,
                    symbol: mappedCoin.symbol,
                    name: mappedCoin.name,
                    current_price: parseFloat(ticker.c),
                    price_change_percentage_24h: parseFloat(ticker.P),
                    market_cap: 0, // Not available from Binance ticker
                    volume_24h: parseFloat(ticker.v) * parseFloat(ticker.c),
                    last_updated: new Date()
                  };

                  if (existingIndex >= 0) {
                    updatedPrices[existingIndex] = newPrice;
                  } else {
                    updatedPrices.push(newPrice);
                  }
                  
                  return updatedPrices;
                });

                setLastUpdate(new Date());
              }
            }
          } catch (err) {
            console.error('Error parsing Binance WebSocket data:', err);
          }
        };

        ws.onclose = () => {
          console.log('Binance WebSocket connection closed');
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('Binance WebSocket error:', error);
          setIsConnected(false);
        };

      } catch (err) {
        console.error('Failed to connect to Binance WebSocket:', err);
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return { prices, isConnected, lastUpdate };
}