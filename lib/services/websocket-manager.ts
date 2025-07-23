import { useCryptoStore, convertBinanceTickerToPrice, getCoinsByPage, BinanceTickerData } from '../stores/crypto-store';

class WebSocketManager {
  private static instance: WebSocketManager;
  private isActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private currentPage = 0;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Start WebSocket connection for a specific page
  async startConnection(page: number = 0) {
    this.currentPage = page;
    this.isActive = true;
    this.reconnectAttempts = 0;

    const store = useCryptoStore.getState();
    
    // Clean up existing connections
    this.cleanup();

    console.log(`🔌 Starting WebSocket connection for page ${page}`);
    
    try {
      await this.connectWebSocket();
    } catch (error) {
      console.error('Failed to start WebSocket connection:', error);
      this.startPolling();
    }
  }

  // Connect to Binance WebSocket following best practices
  private async connectWebSocket() {
    const symbols = getCoinsByPage(this.currentPage);
    
    // Binance allows up to 1024 streams per connection, but we'll use smaller batches for reliability
    // Following Binance recommendation: use combined streams for multiple symbols
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
    
    // Use the combined stream endpoint (more efficient than multiple connections)
    const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join('/')}`;
    
    console.log(`🔌 Connecting to Binance WebSocket with ${streams.length} streams`);
    console.log(`📡 URL: ${wsUrl}`);
    
    await this.createWebSocketConnection(wsUrl, 'Main Connection');
  }

  private async createWebSocketConnection(wsUrl: string, connectionName: string) {
    if (!this.isActive) return;

    const store = useCryptoStore.getState();
    
    try {
      const ws = new WebSocket(wsUrl);
      store.setWebSocket(ws);
      store.updateConnection({ connectionMethod: 'websocket' });

      // Connection timeout (Binance recommends 10 seconds)
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log(`⏰ ${connectionName} connection timeout`);
          ws.close();
          console.log("🔄 Connection timeout, switching to REST API");
          this.startPolling();
        }
      }, 10000);

      ws.onopen = () => {
        console.log(`✅ ${connectionName} WebSocket connected successfully`);
        clearTimeout(connectionTimeout);
        store.updateConnection({
          isConnected: true,
          error: null,
          connectionAttempts: 0,
        });
        this.reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        if (!this.isActive) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // Handle Binance combined stream format
          if (data.stream && data.data) {
            const tickerData = data.data as BinanceTickerData;
            const priceData = convertBinanceTickerToPrice(tickerData);
            if (priceData) {
              store.updatePrice(priceData);
            }
          }
          // Handle single stream format (fallback)
          else if (data.s) {
            const tickerData = data as BinanceTickerData;
            const priceData = convertBinanceTickerToPrice(tickerData);
            if (priceData) {
              store.updatePrice(priceData);
            }
          }
        } catch (err) {
          console.error(`Error parsing ${connectionName} message:`, err);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 ${connectionName} closed: ${event.code} - ${event.reason}`);
        clearTimeout(connectionTimeout);
        
        store.updateConnection({
          isConnected: false,
        });
        
        if (this.isActive && event.code !== 1000) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
            console.log(`🔄 Reconnecting ${connectionName} in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            
            const reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              store.updateConnection({
                connectionAttempts: this.reconnectAttempts,
              });
              this.connectWebSocket();
            }, delay);
            
            store.setReconnectTimeout(reconnectTimeout);
          } else {
            console.log("🔄 Max reconnection attempts reached, switching to REST API");
            store.updateConnection({
              error: "WebSocket connection failed after multiple attempts",
            });
            this.startPolling();
          }
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ ${connectionName} WebSocket error:`, error);
        clearTimeout(connectionTimeout);
        
        store.updateConnection({
          error: `WebSocket connection failed: ${error}`,
        });
        
        // Close the connection and try REST API fallback
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        
        console.log("🔄 WebSocket error detected, switching to REST API");
        this.startPolling();
      };

      // Binance recommends sending ping frames to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping?.(); // Some WebSocket implementations support ping
        }
      }, 180000); // 3 minutes as recommended by Binance

      // Store ping interval for cleanup
      ws.addEventListener('close', () => {
        clearInterval(pingInterval);
      });

    } catch (err) {
      console.error(`❌ Failed to create ${connectionName} WebSocket:`, err);
      store.updateConnection({
        error: `Failed to create WebSocket: ${err}`,
      });
      this.startPolling();
    }
  }

  // Fallback to REST API polling
  private async startPolling() {
    if (!this.isActive) return;

    console.log("🔄 Starting REST API polling");
    const store = useCryptoStore.getState();
    
    store.updateConnection({ connectionMethod: 'polling' });
    
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
            return { symbol, data, success: true };
          } catch (err) {
            console.warn(`Failed to fetch ${symbol}:`, err);
            return { symbol, error: err, success: false };
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
              store.updatePrice(priceData);
              successCount++;
            }
          }
        });

        if (successCount > 0) {
          store.updateConnection({
            isConnected: true,
            error: null,
          });
          const timestamp = new Date().toLocaleTimeString();
          console.log(`✅ [${timestamp}] REST API: ${successCount}/${symbols.length} prices updated`);
        } else {
          store.updateConnection({
            isConnected: false,
            error: "Failed to fetch price data from Binance API",
          });
        }
        
      } catch (err) {
        console.error("Polling error:", err);
        store.updateConnection({
          error: `REST API error: ${err}`,
          isConnected: false,
        });
      }
    };

    // Initial poll
    await pollPrices();
    
    // Set up polling interval
    const pollingInterval = setInterval(pollPrices, 2000); // 2 seconds
    store.setPollingInterval(pollingInterval);
  }

  // Stop all connections
  stop() {
    console.log("🛑 Stopping WebSocket manager");
    this.isActive = false;
    this.cleanup();
    
    const store = useCryptoStore.getState();
    store.updateConnection({
      isConnected: false,
      error: null,
    });
  }

  // Reconnect
  async reconnect() {
    console.log("🔄 Manual reconnection initiated");
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startConnection(this.currentPage);
  }

  // Switch to different page
  async switchPage(page: number) {
    if (page !== this.currentPage) {
      console.log(`📄 Switching from page ${this.currentPage} to page ${page}`);
      await this.startConnection(page);
    }
  }

  // Cleanup resources
  private cleanup() {
    const store = useCryptoStore.getState();
    store.cleanup();
  }

  // Get current status
  getStatus() {
    const store = useCryptoStore.getState();
    return {
      isActive: this.isActive,
      currentPage: this.currentPage,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      connection: store.getConnectionStatus(),
    };
  }
}

export const webSocketManager = WebSocketManager.getInstance();