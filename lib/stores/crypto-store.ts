import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

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

export interface ConnectionState {
  isConnected: boolean;
  connectionMethod: 'websocket' | 'polling';
  lastUpdate: Date | null;
  error: string | null;
  connectionAttempts: number;
  maxAttempts: number;
  updateCount: number;
}

export interface CryptoStore {
  // Real-time price data
  prices: Map<string, RealCoinPrice>;
  
  // Connection state
  connection: ConnectionState;
  
  // Subscribed coins (to avoid duplicate subscriptions)
  subscribedCoins: Set<string>;
  
  // WebSocket reference
  wsRef: WebSocket | null;
  pollingIntervalRef: NodeJS.Timeout | null;
  reconnectTimeoutRef: NodeJS.Timeout | null;
  
  // Actions
  updatePrice: (coinData: RealCoinPrice) => void;
  updateConnection: (state: Partial<ConnectionState>) => void;
  addSubscription: (coinId: string) => void;
  removeSubscription: (coinId: string) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  setPollingInterval: (interval: NodeJS.Timeout | null) => void;
  setReconnectTimeout: (timeout: NodeJS.Timeout | null) => void;
  
  // Getters
  getPriceById: (coinId: string) => RealCoinPrice | undefined;
  getPricesByPage: (page: number, pageSize?: number) => RealCoinPrice[];
  getConnectionStatus: () => ConnectionState;
  
  // Cleanup
  cleanup: () => void;
  reset: () => void;
}

// Binance to CoinGecko mapping
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

const initialConnectionState: ConnectionState = {
  isConnected: false,
  connectionMethod: 'websocket',
  lastUpdate: null,
  error: null,
  connectionAttempts: 0,
  maxAttempts: 3,
  updateCount: 0,
};

export const useCryptoStore = create<CryptoStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    prices: new Map(),
    connection: initialConnectionState,
    subscribedCoins: new Set(),
    wsRef: null,
    pollingIntervalRef: null,
    reconnectTimeoutRef: null,

    // Actions
    updatePrice: (coinData: RealCoinPrice) => {
      set((state) => {
        const newPrices = new Map(state.prices);
        const existingPrice = newPrices.get(coinData.id);
        
        // Log price changes
        if (existingPrice && existingPrice.current_price !== coinData.current_price) {
          const changeIcon = coinData.current_price > existingPrice.current_price ? '📈' : '📉';
          console.log(`${changeIcon} ${coinData.symbol}: $${existingPrice.current_price} → $${coinData.current_price}`);
        }
        
        newPrices.set(coinData.id, coinData);
        
        return {
          prices: newPrices,
          connection: {
            ...state.connection,
            lastUpdate: new Date(),
            updateCount: state.connection.updateCount + 1,
          },
        };
      });
    },

    updateConnection: (connectionUpdate: Partial<ConnectionState>) => {
      set((state) => ({
        connection: { ...state.connection, ...connectionUpdate },
      }));
    },

    addSubscription: (coinId: string) => {
      set((state) => ({
        subscribedCoins: new Set([...state.subscribedCoins, coinId]),
      }));
    },

    removeSubscription: (coinId: string) => {
      set((state) => {
        const newSubscriptions = new Set(state.subscribedCoins);
        newSubscriptions.delete(coinId);
        return { subscribedCoins: newSubscriptions };
      });
    },

    setWebSocket: (ws: WebSocket | null) => {
      set({ wsRef: ws });
    },

    setPollingInterval: (interval: NodeJS.Timeout | null) => {
      set({ pollingIntervalRef: interval });
    },

    setReconnectTimeout: (timeout: NodeJS.Timeout | null) => {
      set({ reconnectTimeoutRef: timeout });
    },

    // Getters
    getPriceById: (coinId: string) => {
      return get().prices.get(coinId);
    },

    getPricesByPage: (page: number, pageSize: number = 10) => {
      const state = get();
      const allCoins = Object.keys(BINANCE_COIN_MAP);
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const pageCoins = allCoins.slice(startIndex, endIndex);
      
      return pageCoins
        .map(symbol => {
          const coinInfo = BINANCE_COIN_MAP[symbol];
          return state.prices.get(coinInfo.id);
        })
        .filter((price): price is RealCoinPrice => price !== undefined);
    },

    getConnectionStatus: () => {
      return get().connection;
    },

    // Cleanup
    cleanup: () => {
      const state = get();
      
      if (state.wsRef) {
        state.wsRef.close(1000, "Cleanup");
      }
      
      if (state.pollingIntervalRef) {
        clearInterval(state.pollingIntervalRef);
      }
      
      if (state.reconnectTimeoutRef) {
        clearTimeout(state.reconnectTimeoutRef);
      }
      
      set({
        wsRef: null,
        pollingIntervalRef: null,
        reconnectTimeoutRef: null,
      });
    },

    reset: () => {
      get().cleanup();
      set({
        prices: new Map(),
        connection: initialConnectionState,
        subscribedCoins: new Set(),
        wsRef: null,
        pollingIntervalRef: null,
        reconnectTimeoutRef: null,
      });
    },
  }))
);

// Helper function to convert Binance ticker to RealCoinPrice
export const convertBinanceTickerToPrice = (tickerData: BinanceTickerData): RealCoinPrice | null => {
  const coinInfo = BINANCE_COIN_MAP[tickerData.s];
  if (!coinInfo) return null;

  // Validate data quality
  const lastPrice = parseFloat(tickerData.c);
  const priceChange = parseFloat(tickerData.P);
  const highPrice = parseFloat(tickerData.h);
  const lowPrice = parseFloat(tickerData.l);
  const volume = parseFloat(tickerData.v);

  // Basic data validation
  if (isNaN(lastPrice) || lastPrice <= 0) {
    console.warn(`Invalid price data for ${tickerData.s}:`, tickerData.c);
    return null;
  }

  return {
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
};

// Get coins for a specific page
export const getCoinsByPage = (page: number): string[] => {
  const allCoins = Object.keys(BINANCE_COIN_MAP);
  const startIndex = page * 10;
  const endIndex = startIndex + 10;
  return allCoins.slice(startIndex, endIndex);
};