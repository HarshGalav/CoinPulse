import axios from 'axios';

const BASE_URL = 'https://api.coingecko.com/api/v3';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'CryptoTracker/1.0'
  },
  timeout: 15000
});

// Add request interceptor to handle rate limiting
api.interceptors.request.use((config) => {
  // Add API key if available
  if (process.env.COINGECKO_API_KEY) {
    config.headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('CoinGecko API requires authentication. Consider getting a free API key.');
    }
    return Promise.reject(error);
  }
);

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CoinPriceHistory {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export const coingeckoApi = {
  // Get list of coins with market data
  getCoins: async (currency: string = 'usd', page: number = 1, perPage: number = 100): Promise<CoinData[]> => {
    try {
      console.log(`Fetching coins: currency=${currency}, page=${page}, perPage=${perPage}`);
      
      const response = await api.get('/coins/markets', {
        params: {
          vs_currency: currency.toLowerCase(),
          order: 'market_cap_desc',
          per_page: Math.min(perPage, 250), // CoinGecko max is 250
          page: Math.max(1, page),
          sparkline: false,
          price_change_percentage: '24h'
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from CoinGecko API');
      }
      
      console.log(`Successfully fetched ${response.data.length} coins from CoinGecko`);
      return response.data;
    } catch (error) {
      console.error('CoinGecko API error:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        
        if (axiosError.response?.status === 401) {
          console.error('CoinGecko API requires authentication. Please check your API key.');
          throw new Error('CoinGecko API authentication failed. Please check your API key.');
        }
        
        if (axiosError.response?.status === 429) {
          console.error('Rate limit exceeded. Please try again later.');
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        }
        
        if (axiosError.response?.status === 404) {
          throw new Error(`Currency '${currency}' not supported by CoinGecko API`);
        }
      }
      
      // For any other error, throw the error instead of using mock data
      console.error('CoinGecko API unavailable:', error);
      throw new Error('Unable to fetch cryptocurrency data. Please check your internet connection and try again.');
    }
  },

  // Search for coins
  searchCoins: async (query: string) => {
    try {
      const response = await api.get('/search', {
        params: { query }
      });
      return response.data;
    } catch (error) {
      console.error('CoinGecko search API error:', error);
      throw new Error('Unable to search cryptocurrencies. Please check your internet connection and try again.');
    }
  },

  // Get specific coin data
  getCoin: async (id: string, currency: string = 'usd'): Promise<CoinData> => {
    const response = await api.get(`/coins/${id}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });
    
    const coin = response.data;
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image.large,
      current_price: coin.market_data.current_price[currency],
      market_cap: coin.market_data.market_cap[currency],
      market_cap_rank: coin.market_cap_rank,
      fully_diluted_valuation: coin.market_data.fully_diluted_valuation[currency],
      total_volume: coin.market_data.total_volume[currency],
      high_24h: coin.market_data.high_24h[currency],
      low_24h: coin.market_data.low_24h[currency],
      price_change_24h: coin.market_data.price_change_24h_in_currency[currency],
      price_change_percentage_24h: coin.market_data.price_change_percentage_24h,
      market_cap_change_24h: coin.market_data.market_cap_change_24h_in_currency[currency],
      market_cap_change_percentage_24h: coin.market_data.market_cap_change_percentage_24h,
      circulating_supply: coin.market_data.circulating_supply,
      total_supply: coin.market_data.total_supply,
      max_supply: coin.market_data.max_supply,
      ath: coin.market_data.ath[currency],
      ath_change_percentage: coin.market_data.ath_change_percentage[currency],
      ath_date: coin.market_data.ath_date[currency],
      atl: coin.market_data.atl[currency],
      atl_change_percentage: coin.market_data.atl_change_percentage[currency],
      atl_date: coin.market_data.atl_date[currency],
      last_updated: coin.last_updated
    };
  },

  // Get price history for charts
  getCoinHistory: async (id: string, currency: string = 'usd', days: number = 7): Promise<CoinPriceHistory> => {
    const response = await api.get(`/coins/${id}/market_chart`, {
      params: {
        vs_currency: currency,
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      }
    });
    return response.data;
  },

  // Get simple price for multiple coins
  getSimplePrices: async (ids: string[], currency: string = 'usd') => {
    const response = await api.get('/simple/price', {
      params: {
        ids: ids.join(','),
        vs_currencies: currency,
        include_24hr_change: true
      }
    });
    return response.data;
  }
};