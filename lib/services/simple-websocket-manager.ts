import { 
  useSimpleCryptoStore, 
  convertBinanceTickerToPrice, 
  getCoinsByPage, 
  BinanceTickerData 
} from '../stores/simple-crypto-store';

class SimpleWebSocketManager {
  private static instance: SimpleWebSocketManager;
  private ws: WebSocket | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private currentPage = 0;

  private constructor() {}

  static getInstance(): SimpleWebSocketManager {
    if (!SimpleWebSocketManager.instance) {
      SimpleWebSocketManager.instance = new SimpleWebSocketManager();
    }
    return SimpleWebSocketManager.instance;
  }

  async start(page: number = 0) {
    console.log(`🚀 Starting connection for page ${page}`);
    
    this.currentPage = page;
    this.isActive = true;
    this.reconnectAttempts = 0;
    
    // Update store
    useSimpleCryptoStore.getState().setCurrentPage(page);
    
    // Clean up existing connections
    this.cleanup();
    
    // Try WebSocket first, fallback to polling
    try {
      await this.connectWebSocket();
    } catch (error) {
      console.warn('WebSocket failed, falling back to polling:', error);
      this.startPolling();
    }
  }

  private async connectWebSocket() {
    if (!this.isActive) return;

    const symbols = getCoinsByPage(this.currentPage);
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
    const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join("/")}`;
    
    console.log(`🔌 Connecting WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);
      
      useSimpleCryptoStore.getState().updateConnection({ connectionMethod: 'websocket' });

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ WebSocket connection timeout');
          this.ws.close();
          this.startPolling();
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        clearTimeout(connectionTimeout);
        
        useSimpleCryptoStore.getState().updateConnection({
          isConnected: true,
          error: null,
          connectionAttempts: this.reconnectAttempts,
        });
        
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.stream && data.data) {
            const priceData = convertBinanceTickerToPrice(data.data);
            if (priceData) {
              useSimpleCryptoStore.getState().updatePrice(priceData);
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        clearTimeout(connectionTimeout);
        
        useSimpleCryptoStore.getState().updateConnection({ isConnected: false });

        if (this.isActive && event.code !== 1000) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`🔄 Reconnecting in ${delay}ms`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.connectWebSocket();
            }, delay);
          } else {
            console.log('🔄 Max reconnection attempts reached, switching to polling');
            this.startPolling();
          }
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        clearTimeout(connectionTimeout);
        
        useSimpleCryptoStore.getState().updateConnection({
          error: 'WebSocket connection failed',
          isConnected: false,
        });

        if (this.ws) {
          this.ws.close();
        }
        
        console.log('🔄 WebSocket error, switching to polling');
        this.startPolling();
      };

    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err);
      this.startPolling();
    }
  }

  private async startPolling() {
    if (!this.isActive) return;

    console.log('🔄 Starting REST API polling');
    
    useSimpleCryptoStore.getState().updateConnection({ connectionMethod: 'polling' });
    
    const symbols = getCoinsByPage(this.currentPage);
    
    const pollPrices = async () => {
      if (!this.isActive) return;
      
      try {
        const promises = symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
              { 
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
              }
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return { success: true, data };
          } catch (err) {
            console.warn(`Failed to fetch ${symbol}:`, err);
            return { success: false, error: err };
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
            
            const priceData = convertBinanceTickerToPrice(tickerData);
            if (priceData) {
              useSimpleCryptoStore.getState().updatePrice(priceData);
              successCount++;
            }
          }
        });

        if (successCount > 0) {
          useSimpleCryptoStore.getState().updateConnection({
            isConnected: true,
            error: null,
          });
        } else {
          useSimpleCryptoStore.getState().updateConnection({
            isConnected: false,
            error: "Failed to fetch price data",
          });
        }
        
      } catch (err) {
        console.error('Polling error:', err);
        useSimpleCryptoStore.getState().updateConnection({
          error: `REST API error: ${err}`,
          isConnected: false,
        });
      }
    };

    // Initial poll
    await pollPrices();
    
    // Set up polling interval
    this.pollingInterval = setInterval(pollPrices, 3000);
  }

  stop() {
    console.log('🛑 Stopping WebSocket manager');
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
    await this.start(this.currentPage);
  }

  async switchPage(page: number) {
    if (page !== this.currentPage) {
      console.log(`📄 Switching to page ${page}`);
      await this.start(page);
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.close(1000, "Cleanup");
      this.ws = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
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
      currentPage: this.currentPage,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      connection: store.connection,
    };
  }
}

export const simpleWebSocketManager = SimpleWebSocketManager.getInstance();