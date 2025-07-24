// Server-side service to get live prices from Binance
interface BinanceTicker {
  symbol: string;
  price: string;
  priceChangePercent: string;
}

interface LivePrice {
  coinId: string;
  price: number;
  priceChange24h: number;
  source: 'binance' | 'coingecko';
  timestamp: number;
}

class LivePriceService {
  private static instance: LivePriceService;
  
  // Mapping from CoinGecko IDs to Binance symbols
  private readonly COIN_TO_SYMBOL_MAP: Record<string, string> = {
    'bitcoin': 'BTCUSDT',
    'ethereum': 'ETHUSDT',
    'binancecoin': 'BNBUSDT',
    'cardano': 'ADAUSDT',
    'solana': 'SOLUSDT',
    'ripple': 'XRPUSDT',
    'polkadot': 'DOTUSDT',
    'dogecoin': 'DOGEUSDT',
    'avalanche-2': 'AVAXUSDT',
    'chainlink': 'LINKUSDT',
    'polygon': 'MATICUSDT',
    'uniswap': 'UNIUSDT',
    'litecoin': 'LTCUSDT',
    'bitcoin-cash': 'BCHUSDT',
    'cosmos': 'ATOMUSDT',
    'vechain': 'VETUSDT',
    'filecoin': 'FILUSDT',
    'tron': 'TRXUSDT',
    'ethereum-classic': 'ETCUSDT',
    'stellar': 'XLMUSDT',
    'algorand': 'ALGOUSDT',
    'near': 'NEARUSDT',
    'apecoin': 'APEUSDT',
    'the-sandbox': 'SANDUSDT',
    'decentraland': 'MANAUSDT',
    'curve-dao-token': 'CRVUSDT',
    'aave': 'AAVEUSDT',
    'maker': 'MKRUSDT',
    'compound': 'COMPUSDT',
    'sushi': 'SUSHIUSDT',
    'shiba-inu': 'SHIBUSDT',
    'wrapped-bitcoin': 'WBTCUSDT',
    'dai': 'DAIUSDT',
    'internet-computer': 'ICPUSDT',
    'cronos': 'CROUSDT',
    'arbitrum': 'ARBUSDT',
    'optimism': 'OPUSDT',
    'hedera-hashgraph': 'HBARUSDT',
    'quant-network': 'QNTUSDT',
    'the-graph': 'GRTUSDT',
    'fantom': 'FTMUSDT',
    'injective-protocol': 'INJUSDT',
    'render-token': 'RNDRУСDT',
    'thorchain': 'RUNEUSDT',
    'monero': 'XMRUSDT',
    'rocket-pool': 'RPLUSDT',
    'flow': 'FLOWUSDT',
    'iota': 'IOTAUSDT',
    'theta-token': 'THETAUSDT',
    'axie-infinity': 'AXSUSDT',
    'elrond-erd-2': 'EGLDUSDT',
    'tezos': 'XTZUSDT',
    'eos': 'EOSUSDT',
    'klay-token': 'KLAYUSDT',
    'neo': 'NEOUSDT',
    'chiliz': 'CHZUSDT',
    'pancakeswap-token': 'CAKEUSDT',
    'synthetix-network-token': 'SNXUSDT',
    'kucoin-shares': 'KCSUSDT',
    'mina-protocol': 'MINAUSDT',
    'enjincoin': 'ENJUSDT',
    '1inch': '1INCHUSDT',
    'loopring': 'LRCUSDT',
    'zilliqa': 'ZILUSDT',
    'basic-attention-token': 'BATUSDT',
    'decred': 'DCRUSDT',
    'waves': 'WAVESUSDT',
    'yearn-finance': 'YFIUSDT'
  };

  private constructor() {}

  static getInstance(): LivePriceService {
    if (!LivePriceService.instance) {
      LivePriceService.instance = new LivePriceService();
    }
    return LivePriceService.instance;
  }

  async getLivePrices(coinIds: string[], currency: string = 'usd'): Promise<Record<string, LivePrice>> {
    const results: Record<string, LivePrice> = {};
    
    // Get Binance symbols for the requested coins
    const binanceSymbols = coinIds
      .map(coinId => this.COIN_TO_SYMBOL_MAP[coinId])
      .filter(Boolean);

    let binancePrices: Record<string, BinanceTicker> = {};
    
    // Fetch live prices from Binance if we have symbols
    if (binanceSymbols.length > 0) {
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const allTickers: BinanceTicker[] = await response.json();
          
          // Create a map of symbol to ticker data
          binancePrices = allTickers.reduce((acc, ticker) => {
            if (binanceSymbols.includes(ticker.symbol)) {
              acc[ticker.symbol] = ticker;
            }
            return acc;
          }, {} as Record<string, BinanceTicker>);
          
          console.log(`✅ Fetched live prices for ${Object.keys(binancePrices).length} symbols from Binance`);
        }
      } catch (error) {
        console.error('❌ Failed to fetch Binance prices:', error);
      }
    }

    // Process each coin
    for (const coinId of coinIds) {
      const binanceSymbol = this.COIN_TO_SYMBOL_MAP[coinId];
      const binanceTicker = binanceSymbol ? binancePrices[binanceSymbol] : null;
      
      if (binanceTicker && currency === 'usd') {
        // Use Binance data if available and currency is USD
        results[coinId] = {
          coinId,
          price: parseFloat(binanceTicker.price),
          priceChange24h: parseFloat(binanceTicker.priceChangePercent),
          source: 'binance',
          timestamp: Date.now()
        };
      } else {
        // Fallback to CoinGecko for missing coins or non-USD currencies
        try {
          const coingeckoResponse = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true`,
            {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(5000)
            }
          );
          
          if (coingeckoResponse.ok) {
            const coingeckoData = await coingeckoResponse.json();
            const coinData = coingeckoData[coinId];
            
            if (coinData) {
              results[coinId] = {
                coinId,
                price: coinData[currency],
                priceChange24h: coinData[`${currency}_24h_change`] || 0,
                source: 'coingecko',
                timestamp: Date.now()
              };
            }
          }
        } catch (error) {
          console.error(`❌ Failed to fetch CoinGecko price for ${coinId}:`, error);
        }
      }
    }

    return results;
  }

  async getLivePrice(coinId: string, currency: string = 'usd'): Promise<LivePrice | null> {
    const prices = await this.getLivePrices([coinId], currency);
    return prices[coinId] || null;
  }

  // Check if a coin has Binance live data available
  hasBinanceData(coinId: string): boolean {
    return !!this.COIN_TO_SYMBOL_MAP[coinId];
  }

  // Get all supported coins
  getSupportedCoins(): string[] {
    return Object.keys(this.COIN_TO_SYMBOL_MAP);
  }
}

export const livePriceService = LivePriceService.getInstance();