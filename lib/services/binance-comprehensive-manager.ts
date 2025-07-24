import { 
  useSimpleCryptoStore, 
  RealCoinPrice 
} from '../stores/simple-crypto-store';

interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface BinanceTickerData {
  s: string; // Symbol (e.g., "BTCUSDT")
  c: string; // Current price
  P: string; // Price change percentage 24h
  h: string; // High price 24h
  l: string; // Low price 24h
  v: string; // Volume 24h
  q: string; // Quote volume 24h
  o: string; // Open price 24h
  x: string; // Previous close price
}

class BinanceComprehensiveManager {
  private static instance: BinanceComprehensiveManager;
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private symbolRefreshInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private availableSymbols: Map<string, BinanceSymbolInfo> = new Map();
  private coinIdToSymbolMap: Map<string, string> = new Map();
  private symbolToCoinIdMap: Map<string, string> = new Map();
  private requestedCoins: string[] = [];

  // Common coin ID to symbol mappings (expandable)
  private readonly COIN_SYMBOL_MAP: Record<string, string[]> = {
    'bitcoin': ['BTCUSDT', 'BTCBUSD', 'BTCEUR'],
    'ethereum': ['ETHUSDT', 'ETHBUSD', 'ETHEUR', 'ETHBTC'],
    'binancecoin': ['BNBUSDT', 'BNBBUSD', 'BNBEUR', 'BNBBTC'],
    'cardano': ['ADAUSDT', 'ADABUSD', 'ADAEUR', 'ADABTC'],
    'solana': ['SOLUSDT', 'SOLBUSD', 'SOLEUR', 'SOLBTC'],
    'ripple': ['XRPUSDT', 'XRPBUSD', 'XRPEUR', 'XRPBTC'],
    'polkadot': ['DOTUSDT', 'DOTBUSD', 'DOTEUR', 'DOTBTC'],
    'dogecoin': ['DOGEUSDT', 'DOGEBUSD', 'DOGEEUR', 'DOGEBTC'],
    'avalanche-2': ['AVAXUSDT', 'AVAXBUSD', 'AVAXEUR', 'AVAXBTC'],
    'chainlink': ['LINKUSDT', 'LINKBUSD', 'LINKEUR', 'LINKBTC'],
    'polygon': ['MATICUSDT', 'MATICBUSD', 'MATICEUR', 'MATICBTC'],
    'uniswap': ['UNIUSDT', 'UNIBUSD', 'UNIEUR', 'UNIBTC'],
    'litecoin': ['LTCUSDT', 'LTCBUSD', 'LTCEUR', 'LTCBTC'],
    'bitcoin-cash': ['BCHUSDT', 'BCHBUSD', 'BCHEUR', 'BCHBTC'],
    'cosmos': ['ATOMUSDT', 'ATOMBUSD', 'ATOMEUR', 'ATOMBTC'],
    'vechain': ['VETUSDT', 'VETBUSD', 'VETEUR', 'VETBTC'],
    'filecoin': ['FILUSDT', 'FILBUSD', 'FILEUR', 'FILBTC'],
    'tron': ['TRXUSDT', 'TRXBUSD', 'TRXEUR', 'TRXBTC'],
    'ethereum-classic': ['ETCUSDT', 'ETCBUSD', 'ETCEUR', 'ETCBTC'],
    'stellar': ['XLMUSDT', 'XLMBUSD', 'XLMEUR', 'XLMBTC'],
    'algorand': ['ALGOUSDT', 'ALGOBUSD', 'ALGOEUR', 'ALGOBTC'],
    'near': ['NEARUSDT', 'NEARBUSD', 'NEAREUR', 'NEARBTC'],
    'apecoin': ['APEUSDT', 'APEBUSD', 'APEEUR', 'APEBTC'],
    'the-sandbox': ['SANDUSDT', 'SANDBUSD', 'SANDEUR', 'SANDBTC'],
    'decentraland': ['MANAUSDT', 'MANABUSD', 'MANAEUR', 'MANABTC'],
    'curve-dao-token': ['CRVUSDT', 'CRVBUSD', 'CRVEUR', 'CRVBTC'],
    'aave': ['AAVEUSDT', 'AAVEBUSD', 'AAVEEUR', 'AAVEBTC'],
    'maker': ['MKRUSDT', 'MKRBUSD', 'MKREUR', 'MKRBTC'],
    'compound': ['COMPUSDT', 'COMPBUSD', 'COMPEUR', 'COMPBTC'],
    'sushi': ['SUSHIUSDT', 'SUSHIBUSD', 'SUSHIEUR', 'SUSHIBTC'],
    
    // Additional top cryptocurrencies
    'shiba-inu': ['SHIBUSDT', 'SHIBBUSD', 'SHIBEUR'],
    'matic-network': ['MATICUSDT', 'MATICBUSD', 'MATICEUR', 'MATICBTC'],
    'wrapped-bitcoin': ['WBTCUSDT', 'WBTCBUSD', 'WBTCEUR', 'WBTCBTC'],
    'dai': ['DAIUSDT', 'DAIBUSD', 'DAIEUR'],
    'leo-token': ['LEOUSDT'],
    'internet-computer': ['ICPUSDT', 'ICPBUSD', 'ICPEUR', 'ICPBTC'],
    'cronos': ['CROUSDT', 'CROBUSD', 'CROEUR', 'CROBTC'],
    'okb': ['OKBUSDT'],
    'lido-staked-ether': ['STETHUSDT', 'STETHBTC'],
    'monero': ['XMRUSDT', 'XMRBUSD', 'XMREUR', 'XMRBTC'],
    'arbitrum': ['ARBUSDT', 'ARBBUSD', 'ARBEUR', 'ARBBTC'],
    'optimism': ['OPUSDT', 'OPBUSD', 'OPEUR', 'OPBTC'],
    'hedera-hashgraph': ['HBARUSDT', 'HBARBUSD', 'HBAREUR', 'HBARBTC'],
    'quant-network': ['QNTUSDT', 'QNTBUSD', 'QNTEUR', 'QNTBTC'],
    'immutable-x': ['IMXUSDT', 'IMXBUSD', 'IMXEUR', 'IMXBTC'],
    'aptos': ['APTUSDT', 'APTBUSD', 'APTEUR', 'APTBTC'],
    'fantom': ['FTMUSDT', 'FTMBUSD', 'FTMEUR', 'FTMBTC'],
    'mantle': ['MNTUSDT', 'MNTBUSD'],
    'render-token': ['RENDERUSDT', 'RENDERBUSD'],
    'graph': ['GRTUSDT', 'GRTBUSD', 'GRTEUR', 'GRTBTC'],
    'injective-protocol': ['INJUSDT', 'INJBUSD', 'INJEUR', 'INJBTC'],
    'rocket-pool': ['RPLUSDT', 'RPLBUSD'],
    'thorchain': ['RUNEUSDT', 'RUNEBUSD', 'RUNEEUR', 'RUNEBTC'],
    'flow': ['FLOWUSDT', 'FLOWBUSD', 'FLOWEUR', 'FLOWBTC'],
    'elrond-erd-2': ['EGLDUSDT', 'EGLDBUSD', 'EGLDEUR', 'EGLDBTC'],
    'tezos': ['XTZUSDT', 'XTZBUSD', 'XTZEUR', 'XTZBTC'],
    'theta-token': ['THETAUSDT', 'THETABUSD', 'THETAEUR', 'THETABTC'],
    'axie-infinity': ['AXSUSDT', 'AXSBUSD', 'AXSEUR', 'AXSBTC'],
    'chiliz': ['CHZUSDT', 'CHZBUSD', 'CHZEUR', 'CHZBTC'],
    'eos': ['EOSUSDT', 'EOSBUSD', 'EOSEUR', 'EOSBTC'],
    'astar': ['ASTRUSDT', 'ASTRBUSD'],
    'klay-token': ['KLAYUSDT', 'KLAYBUSD', 'KLAYEUR', 'KLAYBTC'],
    'sandbox': ['SANDUSDT', 'SANDBUSD', 'SANDEUR', 'SANDBTC'],
    'mina-protocol': ['MINAUSDT', 'MINABUSD', 'MINAEUR', 'MINABTC'],
    'bitcoin-sv': ['BSVUSDT', 'BSVBUSD', 'BSVEUR', 'BSVBTC'],
    'iota': ['IOTAUSDT', 'IOTABUSD', 'IOTAEUR', 'IOTABTC'],
    'neo': ['NEOUSDT', 'NEOBUSD', 'NEOEUR', 'NEOBTC'],
    'kucoin-shares': ['KCSUSDT', 'KCSBUSD'],
    'frax-share': ['FXSUSDT', 'FXSBUSD'],
    'gala': ['GALAUSDT', 'GALABUSD', 'GALAEUR', 'GALABTC'],
    'mask-network': ['MASKUSDT', 'MASKBUSD', 'MASKEUR', 'MASKBTC'],
    'pancakeswap-token': ['CAKEUSDT', 'CAKEBUSD', 'CAKEEUR', 'CAKEBTC'],
    'blur': ['BLURUSDT', 'BLURBUSD'],
    'lido-dao': ['LDOUSDT', 'LDOBUSD'],
    'radix': ['XRDUSDT'],
    'conflux-token': ['CFXUSDT', 'CFXBUSD'],
    'gmx': ['GMXUSDT', 'GMXBUSD'],
    'synthetix-network-token': ['SNXUSDT', 'SNXBUSD', 'SNXEUR', 'SNXBTC'],
    'zilliqa': ['ZILUSDT', 'ZILBUSD', 'ZILEUR', 'ZILBTC'],
    'decred': ['DCRUSDT', 'DCRBUSD', 'DCREUR', 'DCRBTC'],
    'zcash': ['ZECUSDT', 'ZECBUSD', 'ZECEUR', 'ZECBTC'],
    'compound-governance-token': ['COMPUSDT', 'COMPBUSD', 'COMPEUR', 'COMPBTC'],
    'loopring': ['LRCUSDT', 'LRCBUSD', 'LRCEUR', 'LRCBTC'],
    'enjincoin': ['ENJUSDT', 'ENJBUSD', 'ENJEUR', 'ENJBTC'],
    '1inch': ['1INCHUSDT', '1INCHBUSD', '1INCHEUR', '1INCHBTC'],
    'yearn-finance': ['YFIUSDT', 'YFIBUSD', 'YFIEUR', 'YFIBTC'],
    'basic-attention-token': ['BATUSDT', 'BATBUSD', 'BATEUR', 'BATBTC'],
    'chainlink': ['LINKUSDT', 'LINKBUSD', 'LINKEUR', 'LINKBTC'],
    'celsius-degree-token': ['CELUSDT', 'CELBUSD'],
    'waves': ['WAVESUSDT', 'WAVESBUSD', 'WAVESEUR', 'WAVESBTC'],
    'qtum': ['QTUMUSDT', 'QTUMBUSD', 'QTUMEUR', 'QTUMBTC'],
    'dash': ['DASHUSDT', 'DASHBUSD', 'DASHEUR', 'DASHBTC'],
    'omg': ['OMGUSDT', 'OMGBUSD', 'OMGEUR', 'OMGBTC'],
    'ravencoin': ['RVNUSDT', 'RVNBUSD'],
    'icon': ['ICXUSDT', 'ICXBUSD', 'ICXEUR', 'ICXBTC'],
    'ontology': ['ONTUSDT', 'ONTBUSD', 'ONTEUR', 'ONTBTC'],
    'zksync': ['ZKUSDT'],
    'stacks': ['STXUSDT', 'STXBUSD', 'STXEUR', 'STXBTC'],
    'helium': ['HNTUSDT', 'HNTBUSD'],
    'arweave': ['ARUSDT', 'ARBUSD', 'AREUR', 'ARBTC'],
    'livepeer': ['LPTUSDT', 'LPTBUSD'],
    'fetch-ai': ['FETUSDT', 'FETBUSD', 'FETEUR', 'FETBTC'],
    'ocean-protocol': ['OCEANUSDT', 'OCEANBUSD', 'OCEANEUR', 'OCEANBTC'],
    'band-protocol': ['BANDUSDT', 'BANDBUSD', 'BANDEUR', 'BANDBTC'],
    'kusama': ['KSMUSDT', 'KSMBUSD', 'KSMEUR', 'KSMBTC'],
    'celo': ['CELOUSDT', 'CELOBUSD', 'CELOEUR', 'CELOBTC'],
    'compound-usd-coin': ['CUSDUSDT'],
    'terra-luna': ['LUNAUSDT', 'LUNABUSD', 'LUNAEUR', 'LUNABTC'],
    'harmony': ['ONEUSDT', 'ONEBUSD', 'ONEEUR', 'ONEBTC'],
    'ankr': ['ANKRUSDT', 'ANKRBUSD', 'ANKREUR', 'ANKRBTC'],
    'numeraire': ['NMRUSDT', 'NMRBUSD'],
    'storj': ['STORJUSDT', 'STORJBUSD', 'STORJEUR', 'STORJBTC'],
    'skale': ['SKLUSDT', 'SKLBUSD'],
    'reserve-rights': ['RSRUSDT', 'RSRBUSD'],
    'audius': ['AUDIOUSDT', 'AUDIOBUSD'],
    'civic': ['CVICUSDT', 'CVICBUSD'],
    'request-network': ['REQUSDT', 'REQBUSD'],
    'cartesi': ['CTSIUSDT', 'CTSIBUSD'],
    'polymath': ['POLYUSDT', 'POLYBUSD'],
    'origin-protocol': ['OGNUSDT', 'OGNBUSD'],
    'nkn': ['NKNUSDT', 'NKNBUSD'],
    'golem': ['GNTUSDT', 'GNTBUSD'],
    'status': ['SNTUSDT', 'SNTBUSD'],
    'district0x': ['DNTUSDT', 'DNTBUSD'],
    'metal': ['MTLUSDT', 'MTLBUSD'],
    'power-ledger': ['POWRUSDT', 'POWRBUSD'],
    'bancor': ['BNTUSDT', 'BNTBUSD'],
    'funfair': ['FUNUSDT', 'FUNBUSD'],
    
    // Additional popular coins for maximum coverage
    'pepe': ['PEPEUSDT', 'PEPEBUSD'],
    'bonk': ['BONKUSDT'],
    'floki': ['FLOKIUSDT', 'FLOKIBUSD'],
    'worldcoin-wld': ['WLDUSDT', 'WLDBUSD'],
    'sui': ['SUIUSDT', 'SUIBUSD'],
    'pendle': ['PENDLEUSDT', 'PENDLEBUSD'],
    'woo-network': ['WOOUSDT', 'WOOBUSD'],
    'jupiter-exchange-solana': ['JUPUSDT'],
    'pyth-network': ['PYTHUSDT'],
    'jito': ['JTOUSDT'],
    'dogwifcoin': ['WIFUSDT'],
    'popcat': ['POPCATUSDT'],
    'cat-in-a-dogs-world': ['MEWUSDT'],
    'book-of-meme': ['BOOMUSDT'],
    'solana-ecosystem-index': ['SOLUSDT'], // fallback to SOL
    'brett-based': ['BRETTUSDT'],
    'neiro': ['NEIROUSDT'],
    'first-neiro-on-ethereum': ['NEIROUSDT'], // same as above
    'turbo': ['TURBOUSDT'],
    'mog-coin': ['MOGUSDT'],
    'gigachad': ['GCHAUSDT'],
    'apu-apustaja': ['APUUSDT']
  };

  private constructor() {}

  static getInstance(): BinanceComprehensiveManager {
    if (!BinanceComprehensiveManager.instance) {
      BinanceComprehensiveManager.instance = new BinanceComprehensiveManager();
    }
    return BinanceComprehensiveManager.instance;
  }

  async start(coinIds: string[]) {
    console.log(`🚀 Starting comprehensive Binance data for ${coinIds.length} coins`);
    
    this.requestedCoins = coinIds;
    this.isActive = true;
    this.reconnectAttempts = 0;
    
    // Clean up existing connections
    this.cleanup();
    
    // First, fetch all available symbols from Binance
    await this.fetchAvailableSymbols();
    
    // Map requested coins to available Binance symbols
    this.mapCoinsToSymbols();
    
    // Start WebSocket connection
    await this.startWebSocket();
    
    // Set up periodic symbol refresh (every hour)
    this.symbolRefreshInterval = setInterval(() => {
      this.fetchAvailableSymbols();
    }, 3600000);
  }

  private async fetchAvailableSymbols() {
    try {
      console.log('📡 Fetching available Binance symbols...');
      
      const response = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Clear existing symbols
      this.availableSymbols.clear();
      
      // Process symbols
      data.symbols.forEach((symbol: BinanceSymbolInfo) => {
        if (symbol.status === 'TRADING' && 
            (symbol.quoteAsset === 'USDT' || symbol.quoteAsset === 'BUSD' || symbol.quoteAsset === 'EUR')) {
          this.availableSymbols.set(symbol.symbol, symbol);
        }
      });
      
      console.log(`✅ Found ${this.availableSymbols.size} active trading pairs`);
      
      // Re-map coins to symbols with updated data
      if (this.requestedCoins.length > 0) {
        this.mapCoinsToSymbols();
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch Binance symbols:', error);
    }
  }

  private mapCoinsToSymbols() {
    this.coinIdToSymbolMap.clear();
    this.symbolToCoinIdMap.clear();
    
    this.requestedCoins.forEach(coinId => {
      // Check predefined mappings first
      const possibleSymbols = this.COIN_SYMBOL_MAP[coinId] || [];
      
      // Find the first available symbol for this coin
      for (const symbol of possibleSymbols) {
        if (this.availableSymbols.has(symbol)) {
          this.coinIdToSymbolMap.set(coinId, symbol);
          this.symbolToCoinIdMap.set(symbol, coinId);
          break;
        }
      }
      
      // If no predefined mapping found, try to guess based on common patterns
      if (!this.coinIdToSymbolMap.has(coinId)) {
        const guessedSymbols = this.guessSymbolsForCoin(coinId);
        for (const symbol of guessedSymbols) {
          if (this.availableSymbols.has(symbol)) {
            this.coinIdToSymbolMap.set(coinId, symbol);
            this.symbolToCoinIdMap.set(symbol, coinId);
            break;
          }
        }
      }
    });
    
    console.log(`🔗 Mapped ${this.coinIdToSymbolMap.size}/${this.requestedCoins.length} coins to Binance symbols`);
  }

  private guessSymbolsForCoin(coinId: string): string[] {
    // Convert coin ID to potential symbol patterns
    const cleanId = coinId.replace(/-/g, '').toUpperCase();
    const shortId = cleanId.substring(0, 6); // Limit to 6 chars for symbol
    
    return [
      `${shortId}USDT`,
      `${shortId}BUSD`,
      `${shortId}EUR`,
      `${shortId}BTC`,
      `${cleanId}USDT`,
      `${cleanId}BUSD`,
      `${cleanId}EUR`,
      `${cleanId}BTC`,
    ];
  }

  private async startWebSocket() {
    if (!this.isActive || this.coinIdToSymbolMap.size === 0) return;

    const symbols = Array.from(this.coinIdToSymbolMap.values());
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
    const wsUrl = `wss://stream.binance.com/stream?streams=${streams.join("/")}`;
    
    console.log(`🔌 Connecting to Binance WebSocket for ${symbols.length} symbols`);

    try {
      this.ws = new WebSocket(wsUrl);
      
      useSimpleCryptoStore.getState().updateConnection({ 
        connectionMethod: 'websocket',
        isConnected: false 
      });

      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ WebSocket connection timeout');
          this.ws.close();
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log(`✅ Binance WebSocket connected for ${symbols.length} symbols`);
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
            const priceData = this.convertTickerToPrice(data.data);
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
              this.startWebSocket();
            }, delay);
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
      };

    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err);
    }
  }

  private convertTickerToPrice(tickerData: BinanceTickerData): RealCoinPrice | null {
    const coinId = this.symbolToCoinIdMap.get(tickerData.s);
    if (!coinId) return null;

    const lastPrice = parseFloat(tickerData.c);
    const priceChange = parseFloat(tickerData.P);
    const highPrice = parseFloat(tickerData.h);
    const lowPrice = parseFloat(tickerData.l);
    const volume = parseFloat(tickerData.v);

    if (isNaN(lastPrice) || lastPrice <= 0) {
      console.warn(`Invalid price data for ${tickerData.s}:`, tickerData.c);
      return null;
    }

    // Get symbol info for better naming
    const symbolInfo = this.availableSymbols.get(tickerData.s);
    const baseAsset = symbolInfo?.baseAsset || tickerData.s.replace('USDT', '').replace('BUSD', '').replace('EUR', '');

    return {
      id: coinId,
      symbol: baseAsset,
      name: this.formatCoinName(baseAsset),
      current_price: lastPrice,
      price_change_percentage_24h: priceChange,
      high_24h: highPrice,
      low_24h: lowPrice,
      volume_24h: volume,
      last_updated: new Date(),
    };
  }

  private formatCoinName(symbol: string): string {
    // Convert symbol to readable name
    const nameMap: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'BNB',
      'ADA': 'Cardano',
      'SOL': 'Solana',
      'XRP': 'XRP',
      'DOT': 'Polkadot',
      'DOGE': 'Dogecoin',
      'AVAX': 'Avalanche',
      'LINK': 'Chainlink',
      'MATIC': 'Polygon',
      'UNI': 'Uniswap',
      'LTC': 'Litecoin',
      'BCH': 'Bitcoin Cash',
      'ATOM': 'Cosmos',
      'VET': 'VeChain',
      'FIL': 'Filecoin',
      'TRX': 'TRON',
      'ETC': 'Ethereum Classic',
      'XLM': 'Stellar',
      'ALGO': 'Algorand',
      'NEAR': 'NEAR Protocol',
      'APE': 'ApeCoin',
      'SAND': 'The Sandbox',
      'MANA': 'Decentraland',
      'CRV': 'Curve DAO',
      'AAVE': 'Aave',
      'MKR': 'Maker',
      'COMP': 'Compound',
      'SUSHI': 'SushiSwap',
    };
    
    return nameMap[symbol] || symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();
  }

  updateCoins(coinIds: string[]) {
    if (JSON.stringify(coinIds) !== JSON.stringify(this.requestedCoins)) {
      console.log(`🔄 Updating coin list: ${coinIds.length} coins`);
      this.start(coinIds);
    }
  }

  stop() {
    console.log('🛑 Stopping comprehensive Binance manager');
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
    await this.start(this.requestedCoins);
  }

  private cleanup() {
    if (this.ws) {
      this.ws.close(1000, "Cleanup");
      this.ws = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.symbolRefreshInterval) {
      clearInterval(this.symbolRefreshInterval);
      this.symbolRefreshInterval = null;
    }
  }

  getStatus() {
    const store = useSimpleCryptoStore.getState();
    return {
      isActive: this.isActive,
      requestedCoins: this.requestedCoins.length,
      mappedCoins: this.coinIdToSymbolMap.size,
      availableSymbols: this.availableSymbols.size,
      coverage: this.requestedCoins.length > 0 ? (this.coinIdToSymbolMap.size / this.requestedCoins.length) * 100 : 0,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      connection: store.connection,
      unmappedCoins: this.getUnmappedCoins(),
    };
  }

  // Get list of coins that couldn't be mapped to Binance symbols
  getUnmappedCoins(): string[] {
    return this.requestedCoins.filter(coinId => !this.coinIdToSymbolMap.has(coinId));
  }

  // Get mapping information for debugging
  getMappingInfo() {
    return {
      coinToSymbol: Object.fromEntries(this.coinIdToSymbolMap),
      symbolToCoin: Object.fromEntries(this.symbolToCoinIdMap),
      availableSymbols: Array.from(this.availableSymbols.keys()),
      unmappedCoins: this.getUnmappedCoins(),
    };
  }
}

export const binanceComprehensiveManager = BinanceComprehensiveManager.getInstance();