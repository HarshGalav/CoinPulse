// Simple test function to check Binance API connectivity
export async function testBinanceConnection() {
  try {
    console.log("Testing Binance REST API connection...");
    
    // Test basic connectivity with a simple API call
    const response = await fetch('https://api.binance.com/api/v3/ping', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      console.log("✅ Binance REST API is accessible");
      
      // Test getting ticker data for Bitcoin
      const tickerResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (tickerResponse.ok) {
        const data = await tickerResponse.json();
        console.log("✅ Binance ticker data accessible:", {
          symbol: data.symbol,
          price: data.lastPrice,
          change: data.priceChangePercent
        });
        return { success: true, method: 'rest' };
      } else {
        console.log("❌ Binance ticker API not accessible");
        return { success: false, error: 'Ticker API not accessible' };
      }
    } else {
      console.log("❌ Binance API not accessible");
      return { success: false, error: 'API not accessible' };
    }
  } catch (error) {
    console.error("❌ Binance connection test failed:", error);
    return { success: false, error: error };
  }
}

// Test WebSocket connectivity
export function testBinanceWebSocket(): Promise<{ success: boolean; error?: any }> {
  return new Promise((resolve) => {
    try {
      console.log("Testing Binance WebSocket connection...");
      
      const ws = new WebSocket('wss://stream.binance.com/stream?streams=btcusdt@ticker');
      
      const timeout = setTimeout(() => {
        ws.close();
        console.log("❌ WebSocket connection timeout");
        resolve({ success: false, error: 'Connection timeout' });
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        console.log("✅ Binance WebSocket connection successful");
        clearTimeout(timeout);
        ws.close();
        resolve({ success: true });
      };

      ws.onerror = (error) => {
        console.log("❌ Binance WebSocket connection failed:", error);
        clearTimeout(timeout);
        resolve({ success: false, error });
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          console.log("❌ WebSocket closed unexpectedly:", event.code, event.reason);
          clearTimeout(timeout);
          resolve({ success: false, error: `Closed with code ${event.code}: ${event.reason}` });
        }
      };

    } catch (error) {
      console.error("❌ WebSocket test failed:", error);
      resolve({ success: false, error });
    }
  });
}