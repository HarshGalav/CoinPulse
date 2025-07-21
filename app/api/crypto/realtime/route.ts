import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const coinIds = searchParams.get('ids')?.split(',') || [];
    const currency = searchParams.get('currency') || 'usd';

    if (coinIds.length === 0) {
      return NextResponse.json({ error: 'No coin IDs provided' }, { status: 400 });
    }

    console.log(`Fetching real-time data for ${coinIds.length} coins in ${currency}`);

    // Use CoinGecko's simple price endpoint for fastest response
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=${currency}&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoTracker/1.0',
          ...(process.env.COINGECKO_API_KEY && {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
          })
        },
        // Add cache control for real-time data
        next: { revalidate: 10 } // Revalidate every 10 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to include additional metadata
    const transformedData = Object.entries(data).map(([coinId, priceData]) => {
      const coinPriceData = priceData as Record<string, unknown>;
      return {
        id: coinId,
        current_price: (coinPriceData[currency] as number) || 0,
        market_cap: (coinPriceData[`${currency}_market_cap`] as number) || 0,
        total_volume: (coinPriceData[`${currency}_24h_vol`] as number) || 0,
        price_change_24h: (coinPriceData[`${currency}_24h_change`] as number) || 0,
        price_change_percentage_24h: (((coinPriceData[`${currency}_24h_change`] as number) || 0) / ((coinPriceData[currency] as number) || 1)) * 100,
        last_updated: coinPriceData.last_updated_at ? new Date((coinPriceData.last_updated_at as number) * 1000).toISOString() : new Date().toISOString(),
        currency: currency.toUpperCase()
      };
    });

    // Add response headers for real-time data
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    headers.set('X-Data-Source', 'CoinGecko-Realtime');
    headers.set('X-Update-Frequency', '10s');

    return NextResponse.json(transformedData, { headers });
    
  } catch (error) {
    console.error('Error fetching real-time crypto data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch real-time cryptocurrency data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}