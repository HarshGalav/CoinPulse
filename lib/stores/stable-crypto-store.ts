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

export interface CryptoStoreState {
  // Real-time price data - using Record instead of Map for better serialization
  prices: Record<string, RealCoinPrice>;
  
  // Connection state
  connection: ConnectionState;
  
  // Current page being tracked
  currentPage: number;
}

export interface CryptoStoreActions {
  // Actions
  updatePrice: (coinData: RealCoinPrice) => void;
  updateConnection: (state: Partial<ConnectionState>) => void;
  setCurrentPage: (page: number) => void;
  
  // Getters (computed values)
  getPriceById: (coinId: string) => RealCoinPrice | undefined;
  getPricesArray: () => RealCoinPrice[];
  getPricesByPage: (page: number, pageSize?: number) => RealCoinPrice[];
  
  // Cleanup
  reset: () => void;
}

export type CryptoStore = CryptoStoreState & CryptoStoreActions;

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

export const useStableCryptoStore = create<CryptoStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    prices: {},
    connection: initialConnectionState,
    currentPage: 0,

    // Actions
    updatePrice: (coinData: RealCoinPrice) => {
      set((state) => {
        const existingPrice = state.prices[coinData.id];
        
        // Only update if price actually changed to prevent unnecessary re-renders
        if (existingPrice && existingPrice.current_price === coinData.current_price) {
          return state; // No change, return same state
        }
        
        // Log price changes
        if (existingPrice) {
          const changeIcon = coinData.current_price > existingPrice.current_price ? '📈' : '📉';
          console.log(`${changeIcon} ${coinData.symbol}: $${existingPrice.current_price} → $${coinData.current_price}`);
        }
        
        return {
          prices: {
            ...state.prices,
            [coinData.id]: coinData,
          },
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

    setCurrentPage: (page: number) => {
      set({ currentPage: page });
    },

    // Getters (these are stable and won't cause re-renders)
    getPriceById: (coinId: string) => {
      return get().prices[coinId];
    },

    getPricesArray: () => {
      return Object.values(get().prices);
    },

    getPricesByPage: (page: number, pageSize: number = 10) => {
      const allCoins = Object.keys(BINANCE_COIN_MAP);
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const pageCoins = allCoins.slice(startIndex, endIndex);
      
      const prices = get().prices;
      return pageCoins
        .map(symbol => {
          const coinInfo = BINANCE_COIN_MAP[symbol];
          return prices[coinInfo.id];
        })
        .filter((price): price is RealCoinPrice => price !== undefined);
    },

    // Cleanup
    reset: () => {
      set({
        prices: {},
        connection: initialConnectionState,
        currentPage: 0,
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