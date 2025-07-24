import { 
  useSimpleCryptoStore, 
  convertBinanceTickerToPrice, 
  getCoinsByPage, 
  BinanceTickerData,
  RealCoinPrice 
} from '../stores/simple-crypto-store';

interface CoinGeckoRealtimeData {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  last_updated: string;
}

class EnhancedRealtimeManager {
  private static instance: EnhancedRealtimeManager;
  private binanceWs: WebSocket | null = null;
  private coingeckoInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private currentCoins: string[] = [];
  private currency = 'usd';

  private constructor() {}

  static getInstance(): EnhancedRealtimeManager {
    if (!EnhancedRealtimeManager.instance) {
      EnhancedRealtimeManager.instance = new EnhancedRealtimeManager();
    }
    return EnhancedRealtimeManager.instance;
  }

  async start(coinIds: string[], currency: string = 'usd') {
    console.log(`🚀 Starting enhanced real-time updates for ${coinIds.length} coins`);
    
    this.currentCoins = coinIds;
    this.currency = currency;
    this.isActive = true;
    this.reconnectAttempts = 0;
    
    // Clean up existing connections
    this.cleanup();
    
    // Start both Binance WebSocket (for supported coins) and CoinGecko polling (for all coins)
    await Promise.all([
      this.startBinanceWebSocket(),
      this.startCoinGeckoPolling()
    ]);
  }

  private async startBinanceWebSocket() {
    // Get Binance-supported coins from the current coin list
    const binanceCoins = getCoinsByPage(0); // Get all available Binance coins
    const streams = binanceCoins.map(symbol => `${symbol.toLowerCase()}@ticker`);
    const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join("/")}`;
    
    console.log(`🔌 Connecting Binance WebSocket for ${binanceCoins.length} coins`);

    try {
      this.binanceWs = new WebSocket(wsUrl);
      
      useSimpleCryptoStore.getState().updateConnection({ 
        connectionMethod: 'websocket',
        isConnected: false 
      });

      const connectionTimeout = setTimeout(() => {
        if (this.binanceWs && this.binanceWs.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Binance WebSocket connection timeout');
          this.binanceWs.close();
        }
      }, 10000);

      this.binanceWs.onopen = () => {
        console.log('✅ Binance WebSocket connected');
        clearTimeout(connectionTimeout);
        
        useSimpleCryptoStore.getState().updateConnection({
          isConnected: true,
          error: null,
          connectionAttempts: this.reconnectAttempts,
        });
        
        this.reconnectAttempts = 0;
      };

      this.binanceWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.stream && data.data) {
            const priceData = convertBinanceTickerToPrice(data.data);
            if (priceData) {
              useSimpleCryptoStore.getState().updatePrice(priceData);
            }
          }
        } catch (err) {
          console.error('Error parsing Binance WebSocket message:', err);
        }
      };

      this.binanceWs.onclose = (event) => {
        console.log(`🔌 Binance WebSocket closed: ${event.code} - ${event.reason}`);
        clearTimeout(connectionTimeout);
        
        if (this.isActive && event.code !== 1000) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`🔄 Reconnecting Binance WebSocket in ${delay}ms`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.startBinanceWebSocket();
            }, delay);
          }
        }
      };

      this.binanceWs.onerror = (error) => {
        console.error('❌ Binance WebSocket error:', error);
        clearTimeout(connectionTimeout);
      };

    } catch (err) {
      console.error('❌ Failed to create Binance WebSocket:', err);
    }
  }

  private async startCoinGeckoPolling() {
    if (!this.isActive || this.currentCoins.length === 0) return;

    console.log(`🔄 Starting CoinGecko polling for ${this.currentCoins.length} coins`);
    
    const pollCoinGecko = async () => {
      if (!this.isActive) return;
      
      try {
        // Split coins into batches of 250 (CoinGecko limit)
        const batchSize = 250;
        const batches = [];
        
        for (let i = 0; i < this.currentCoins.length; i += batchSize) {
          batches.push(this.currentCoins.slice(i, i + batchSize));
        }

        const promises = batches.map(async (batch) => {
          try {
            const response = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${batch.join(',')}&vs_currencies=${this.currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`,
              { 
                method: 'GET',
                headers: { 
                  'Accept': 'application/json',
                  ...(process.env.NEXT_PUBLIC_COINGECKO_API_KEY && {
                    'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_API_KEY
                  })
                },
                signal: AbortSignal.timeout(8000)
              }
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return { success: true, data };
          } catch (err) {
            console.warn(`Failed to fetch CoinGecko batch:`, err);
            return { success: false, error: err };
          }
        });

        const results = await Promise.allSettled(promises);
        let successCount = 0;
        let totalUpdates = 0;
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            const { data } = result.value;
            
            Object.entries(data).forEach(([coinId, priceInfo]: [string, any]) => {
              const priceData: RealCoinPrice = {
                id: coinId,
                symbol: coinId.toUpperCase(),
                name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
                current_price: priceInfo[this.currency] || 0,
                price_change_percentage_24h: priceInfo[`${this.currency}_24h_change`] || 0,
                high_24h: priceInfo[this.currency] * 1.02, // Approximate
                low_24h: priceInfo[this.currency] * 0.98, // Approximate
                volume_24h: priceInfo[`${this.currency}_24h_vol`] || 0,
                last_updated: new Date(priceInfo.last_updated_at * 1000 || Date.now()),
              };
              
              useSimpleCryptoStore.getState().updatePrice(priceData);
              totalUpdates++;
            });
            
            successCount++;
          }
        });

        if (successCount > 0) {
          console.log(`📊 Updated ${totalUpdates} coins from CoinGecko`);
          useSimpleCryptoStore.getState().updateConnection({
            isConnected: true,
            error: null,
          });
        } else {
          useSimpleCryptoStore.getState().updateConnection({
            error: "Failed to fetch CoinGecko data",
          });
        }
        
      } catch (err) {
        console.error('CoinGecko polling error:', err);
        useSimpleCryptoStore.getState().updateConnection({
          error: `CoinGecko error: ${err}`,
        });
      }
    };

    // Initial poll
    await pollCoinGecko();
    
    // Set up polling interval (every 30 seconds to respect rate limits)
    this.coingeckoInterval = setInterval(pollCoinGecko, 30000);
  }

  updateCoins(coinIds: string[], currency: string = 'usd') {
    if (JSON.stringify(coinIds) !== JSON.stringify(this.currentCoins) || currency !== this.currency) {
      console.log(`🔄 Updating coin list: ${coinIds.length} coins`);
      this.start(coinIds, currency);
    }
  }

  stop() {
    console.log('🛑 Stopping enhanced real-time manager');
    this.isActive = false;
    this.cleanup();
    
    useSimpleCryptoStore.getState().updateConnection({
      isConnected: false,
      error: null,
    });
  }

  async reconnect() {
    console.log('🔄 Manual reconnection');
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start(this.currentCoins, this.currency);
  }

  private cleanup() {
    if (this.binanceWs) {
      this.binanceWs.close(1000, "Cleanup");
      this.binanceWs = null;
    }
    
    if (this.coingeckoInterval) {
      clearInterval(this.coingeckoInterval);
      this.coingeckoInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  getStatus() {
    const store = useSimpleCryptoStore.getState();
    return {
      isActive: this.isActive,
      currentCoins: this.currentCoins.length,
      currency: this.currency,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      connection: store.connection,
    };
  }
}

export const enhancedRealtimeManager = EnhancedRealtimeManager.getInstance();