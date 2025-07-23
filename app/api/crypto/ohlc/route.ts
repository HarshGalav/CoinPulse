import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coinId = searchParams.get('coinId');
  const currency = searchParams.get('currency') || 'usd';
  const days = searchParams.get('days') || '7';

  if (!coinId) {
    return NextResponse.json({ error: 'coinId is required' }, { status: 400 });
  }

  try {
    // First try CoinGecko OHLC endpoint
    const ohlcUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=${currency}&days=${days}`;
    
    console.log(`Fetching OHLC data from: ${ohlcUrl}`);
    
    const response = await fetch(ohlcUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoTracker/1.0'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (response.ok) {
      const ohlcData = await response.json();
      
      // Format the data
      const formattedData = ohlcData.map(([timestamp, open, high, low, close]: [number, number, number, number, number]) => ({
        timestamp,
        open,
        high,
        low,
        close,
        date: new Date(timestamp).toISOString(),
      }));

      console.log(`Successfully fetched ${formattedData.length} OHLC data points`);
      
      return NextResponse.json({
        success: true,
        data: formattedData,
        source: 'coingecko-ohlc'
      });
    } else {
      console.warn('OHLC endpoint not available, falling back to price data simulation');
      
      // Fallback: Get regular price data and simulate OHLC
      const priceUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`;
      
      const priceResponse = await fetch(priceUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoTracker/1.0'
        }
      });

      if (!priceResponse.ok) {
        throw new Error(`HTTP error! status: ${priceResponse.status}`);
      }

      const priceData = await priceResponse.json();
      
      // Simulate OHLC from price data
      const simulatedOHLC = (priceData.prices || []).map(([timestamp, price]: [number, number], index: number) => {
        const prevPrice = index > 0 ? priceData.prices[index - 1][1] : price;
        const variation = price * 0.01; // 1% variation for simulation
        
        return {
          timestamp,
          open: prevPrice,
          high: price + Math.random() * variation,
          low: price - Math.random() * variation,
          close: price,
          date: new Date(timestamp).toISOString(),
        };
      });

      console.log(`Generated ${simulatedOHLC.length} simulated OHLC data points`);
      
      return NextResponse.json({
        success: true,
        data: simulatedOHLC,
        source: 'simulated-from-price'
      });
    }
  } catch (error) {
    console.error('Error fetching OHLC data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch OHLC data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}