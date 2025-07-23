import { useStableCryptoStore, convertBinanceTickerToPrice, getCoinsByPage, BinanceTickerData } from '../stores/stable-crypto-store';

class StableWebSocketManager {
  private static instance: StableWebSocketManager;
  private ws: WebSocket | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private currentPage = 0;
  private connectionStartTime: number = 0;

  private constructor() {}

  static getInstance(): StableWebSocketManager {
    if (!StableWebSocketManager.instance) {
      StableWebSocketManager.instance = new StableWebSocketManager();
    }
    return StableWebSocketManager.instance;
  }

  // Start connection for a specific page
  async start(page: number = 0) {
    console.log(`🚀 Starting connection for page ${page}`);
    
    this.currentPage = page;
    this.isActive = true;
    this.reconnectAttempts = 0;
    
    // Update store
    const store = useStableCryptoStore.getState();
    store.setCurrentPage(page);
    
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

  // Connect to Binance WebSocket following their best practices
  private async connectWebSocket() {
    if (!this.isActive) return;

    const symbols = getCoinsByPage(this.currentPage);
    console.log(`🔌 Connecting WebSocket for symbols:`, symbols);

    // Binance WebSocket best practices:
    // 1. Use wss://stream.binance.com/ws/ for single stream
    // 2. Use wss://stream.binance.com/stream for combined streams
    // 3. Maximum 5 connections per IP
    // 4. Maximum 1024 streams per connection
    
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
    const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join("/")}`;
    
    console.log(`🔗 WebSocket URL: ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.connectionStartTime = Date.now();
      
      const store = useStableCryptoStore.getState();
      store.updateConnection({ connectionMethod: 'websocket' });

      // Connection timeout (Binance recommends 10 seconds)
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ WebSocket connection timeout');
          this.ws.close();
          this.startPolling();
        }
      }, 10000);

      this.ws.onopen = () => {
        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`✅ WebSocket connected in ${connectionTime}ms`);
        
        clearTimeout(connectionTimeout);
        
        const store = useStableCryptoStore.getState();
        store.updateConnection({
          isConnected: true,
          error: null,
          connectionAttempts: this.reconnectAttempts,
        });
        
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Binance stream format: { "stream": "btcusdt@ticker", "data": {...} }
          if (data.stream && data.data) {
            const priceData = convertBinanceTickerToPrice(data.data);
            if (priceData) {
              const store = useStableCryptoStore.getState();
              store.updatePrice(priceData);
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        clearTimeout(connectionTimeout);
        
        const store = useStableCryptoStore.getState();
        store.updateConnection({ isConnected: false });

        // Handle reconnection based on close code
        if (this.isActive && event.code !== 1000) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            
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
        
        const store = useStableCryptoStore.getState();
        store.updateConnection({
          error: 'WebSocket connection failed',
          isConnected: false,
        });

        // Close and try polling
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

  // REST API polling fallback
  private async startPolling() {
    if (!this.isActive) return;

    console.log('🔄 Starting REST API polling');
    
    const store = useStableCryptoStore.getState();
    store.updateConnection({ connectionMethod: 'polling' });
    
    const symbols = getCoinsByPage(this.currentPage);
    
    const pollPrices = async () => {
      if (!this.isActive) return;
      
      try {
        // Binance REST API rate limits: 1200 requests per minute
        // We'll batch requests to stay within limits
        const batchSize = 5;
        const batches = [];
        
        for (let i = 0; i < symbols.length; i += batchSize) {
          batches.push(symbols.slice(i, i + batchSize));
        }
        
        let successCount = 0;
        
        for (const batch of batches) {
          const promises = batch.map(async (symbol) => {
            try {
              const response = await fetch(
                `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
                { 
                  method: 'GET',
                  headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'CryptoTracker/1.0'
                  },
                  signal: AbortSignal.timeout(5000)
                }
              );
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const data = await response.json();
              return { symbol, data, success: true };
            } catch (err) {
              console.warn(`Failed to fetch ${symbol}:`, err);
              return { symbol, error: err, success: false };
            }
          });

          const results = await Promise.allSettled(promises);
          
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
                const store = useStableCryptoStore.getState();
                store.updatePrice(priceData);
                successCount++;
              }
            }
          });
          
          // Small delay between batches to respect rate limits
          if (batches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const store = useStableCryptoStore.getState();
        if (successCount > 0) {
          store.updateConnection({
            isConnected: true,
            error: null,
          });
          console.log(`✅ REST API: ${successCount}/${symbols.length} prices updated`);
        } else {
          store.updateConnection({
            isConnected: false,
            error: "Failed to fetch price data from Binance API",
          });
        }
        
      } catch (err) {
        console.error('Polling error:', err);
        const store = useStableCryptoStore.getState();
        store.updateConnection({
          error: `REST API error: ${err}`,
          isConnected: false,
        });
      }
    };

    // Initial poll
    await pollPrices();
    
    // Set up polling interval (3 seconds to respect rate limits)
    this.pollingInterval = setInterval(pollPrices, 3000);
  }

  // Stop all connections
  stop() {
    console.log('🛑 Stopping WebSocket manager');
    this.isActive = false;
    this.cleanup();
    
    const store = useStableCryptoStore.getState();
    store.updateConnection({
      isConnected: false,
      error: null,
    });
  }

  // Reconnect manually
  async reconnect() {
    console.log('🔄 Manual reconnection initiated');
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start(this.currentPage);
  }

  // Switch to different page
  async switchPage(page: number) {
    if (page !== this.currentPage) {
      console.log(`📄 Switching from page ${this.currentPage} to page ${page}`);
      await this.start(page);
    }
  }

  // Cleanup resources
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

  // Get current status
  getStatus() {
    const store = useStableCryptoStore.getState();
    return {
      isActive: this.isActive,
      currentPage: this.currentPage,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      connection: store.connection,
      wsReadyState: this.ws?.readyState,
    };
  }
}

export const stableWebSocketManager = StableWebSocketManager.getInstance();