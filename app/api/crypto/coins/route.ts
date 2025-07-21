import { NextRequest, NextResponse } from 'next/server';
import { coingeckoApi } from '@/lib/coingecko';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get('currency') || 'usd';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    console.log('API Request params:', { currency, page, perPage });

    // Validate currency parameter - CoinGecko supported currencies
    const validCurrencies = ['usd', 'eur', 'inr', 'gbp', 'jpy', 'cad', 'aud', 'chf', 'cny', 'krw'];
    if (!validCurrencies.includes(currency.toLowerCase())) {
      console.error('Invalid currency:', currency);
      return NextResponse.json(
        { error: `Invalid currency: ${currency}. Supported currencies: ${validCurrencies.join(', ')}` },
        { status: 400 }
      );
    }

    const coins = await coingeckoApi.getCoins(currency.toLowerCase(), page, perPage);
    
    console.log(`Successfully fetched ${coins.length} coins for currency: ${currency}`);
    return NextResponse.json(coins);
  } catch (error) {
    console.error('Error fetching coins:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's an axios error
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      console.error('Axios error status:', axiosError.response?.status);
      console.error('Axios error data:', axiosError.response?.data);
      
      if (axiosError.response?.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}