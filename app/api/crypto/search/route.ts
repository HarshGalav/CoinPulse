import { NextRequest, NextResponse } from 'next/server';
import { coingeckoApi } from '@/lib/coingecko';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const results = await coingeckoApi.searchCoins(query);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching coins:', error);
    return NextResponse.json(
      { error: 'Failed to search cryptocurrency data' },
      { status: 500 }
    );
  }
}