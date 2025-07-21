'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceChart } from '@/components/PriceChart';
import { AlertDialog } from '@/components/AlertDialog';
import { LandingPage } from '@/components/LandingPage';
import { Navbar } from '@/components/Navbar';
import { MarketOverview } from '@/components/MarketOverview';
import { CoinData } from '@/lib/coingecko';
import { 
  RefreshCw,
  X,
  Filter,
  Wifi,
  WifiOff,
  Zap,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

const CURRENCIES = [
  { value: 'usd', label: 'USD ($)', symbol: '$' },
  { value: 'eur', label: 'EUR (€)', symbol: '€' },
  { value: 'inr', label: 'INR (₹)', symbol: '₹' },
  { value: 'gbp', label: 'GBP (£)', symbol: '£' },
  { value: 'jpy', label: 'JPY (¥)', symbol: '¥' },
];

const SORT_OPTIONS = [
  { value: 'market_cap_desc', label: 'Market Cap ↓' },
  { value: 'market_cap_asc', label: 'Market Cap ↑' },
  { value: 'volume_desc', label: 'Volume ↓' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'percent_change_desc', label: '24h % ↓' },
  { value: 'percent_change_asc', label: '24h % ↑' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Coins' },
  { value: 'gainers', label: 'Top Gainers' },
  { value: 'losers', label: 'Top Losers' },
  { value: 'top_100', label: 'Top 100' },
  { value: 'defi', label: 'DeFi' },
  { value: 'nft', label: 'NFT' },
];

const UPDATE_INTERVALS = [
  { value: 10000, label: '10s (Fast)' },
  { value: 30000, label: '30s (Normal)' },
  { value: 60000, label: '1m (Slow)' },
  { value: 300000, label: '5m (Battery)' },
];

export default function Home() {
  const { data: session, status } = useSession();
  
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<CoinData[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('usd');
  const [sortBy, setSortBy] = useState('market_cap_desc');
  const [filterBy, setFilterBy] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [coinsPerPage] = useState(100);
  const [updateInterval, setUpdateInterval] = useState(30000);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const applyFilters = useCallback((coinData: CoinData[], filter: string) => {
    if (!Array.isArray(coinData)) {
      console.error('applyFilters received non-array data:', coinData);
      setFilteredCoins([]);
      return;
    }
    
    let filtered = [...coinData];

    switch (filter) {
      case 'gainers':
        filtered = filtered
          .filter(coin => coin.price_change_percentage_24h > 0)
          .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
          .slice(0, 50);
        break;
      case 'losers':
        filtered = filtered
          .filter(coin => coin.price_change_percentage_24h < 0)
          .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
          .slice(0, 50);
        break;
      case 'top_100':
        filtered = filtered.filter(coin => coin.market_cap_rank && coin.market_cap_rank <= 100);
        break;
      case 'defi':
        filtered = filtered.filter(coin => 
          ['ethereum', 'chainlink', 'uniswap', 'aave', 'compound', 'maker', 'sushiswap'].includes(coin.id)
        );
        break;
      case 'nft':
        filtered = filtered.filter(coin => 
          ['ethereum', 'solana', 'polygon', 'flow', 'wax'].includes(coin.id)
        );
        break;
      default:
        break;
    }

    setFilteredCoins(filtered);
  }, []);

  const fetchCoins = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log(`Fetching coins with currency: ${selectedCurrency}`);
      
      const response = await fetch(
        `/api/crypto/coins?currency=${selectedCurrency}&per_page=${coinsPerPage}&page=${currentPage}&order=${sortBy}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log(`Successfully received ${data.length} coins`);
        setCoins(data);
        applyFilters(data, filterBy);
        setLastUpdate(new Date());
      } else {
        console.error('API returned non-array data:', data);
        setCoins([]);
        setFilteredCoins([]);
        toast.error(data.error || 'Invalid data format received from API');
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      toast.error('Failed to fetch cryptocurrency data. Please try again.');
      setCoins([]);
      setFilteredCoins([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCurrency, coinsPerPage, currentPage, sortBy, filterBy, applyFilters]);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  useEffect(() => {
    applyFilters(coins, filterBy);
  }, [filterBy, coins, applyFilters]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCoins();
    setRefreshing(false);
    toast.success('Market data refreshed!');
  };

  const handleSetAlert = (coin: CoinData) => {
    if (!session) {
      toast.error('Please sign in to set price alerts');
      return;
    }
    setSelectedCoin(coin);
    setShowAlertDialog(true);
  };

  const handleViewDetails = (coin: CoinData) => {
    setSelectedCoin(coin);
    setShowChart(true);
  };

  const toggleRealtimeData = () => {
    setRealtimeEnabled(!realtimeEnabled);
    toast.success(realtimeEnabled ? 'Real-time data disabled' : 'Real-time data enabled');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading CoinPulse...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        <Navbar currentPage="markets" />
        <LandingPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/5">
      <Navbar currentPage="markets" />
      
      <main className="container mx-auto px-4 py-6">
        {/* Market Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold">Cryptocurrency Markets</h1>
              {realtimeEnabled && (
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="flex items-center space-x-1">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span>Live</span>
                  </Badge>
                  {lastUpdate && (
                    <span className="text-xs text-muted-foreground">
                      Updated {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-muted-foreground">
              Track prices, market caps, and trading volumes with real-time updates
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Toggle */}
            <Button
              variant={realtimeEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleRealtimeData}
            >
              {realtimeEnabled ? <Zap className="w-4 h-4 mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}
              {realtimeEnabled ? 'Live' : 'Static'}
            </Button>

            {/* Update Interval Selector */}
            {realtimeEnabled && (
              <Select value={updateInterval.toString()} onValueChange={(value) => setUpdateInterval(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPDATE_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value.toString()}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Currency Selector */}
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Selector */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Selector */}
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Market Overview */}
        <MarketOverview
          coins={filteredCoins}
          currency={selectedCurrency}
          isLoading={isLoading}
          onCoinSelect={handleViewDetails}
        />

        {/* Pagination */}
        {!isLoading && filteredCoins.length >= coinsPerPage && (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={filteredCoins.length < coinsPerPage}
            >
              Next
            </Button>
          </div>
        )}

        {/* Chart Modal */}
        {showChart && selectedCoin && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image
                    src={selectedCoin.image}
                    alt={selectedCoin.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCoin.name}</h2>
                    <p className="text-muted-foreground uppercase">{selectedCoin.symbol}</p>
                  </div>
                  {realtimeEnabled && (
                    <Badge variant="default" className="flex items-center space-x-1">
                      <Activity className="w-3 h-3 animate-pulse" />
                      <span>Live</span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSetAlert(selectedCoin)}
                  >
                    Set Alert
                  </Button>
                  <Button variant="ghost" onClick={() => setShowChart(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <PriceChart
                  coinId={selectedCoin.id}
                  currency={selectedCurrency}
                  coinName={selectedCoin.name}
                  coinImage={selectedCoin.image}
                  currentPrice={selectedCoin.current_price}
                  priceChange24h={selectedCoin.price_change_percentage_24h}
                />
              </div>
            </div>
          </div>
        )}

        {/* Alert Dialog */}
        {showAlertDialog && selectedCoin && (
          <AlertDialog
            coin={selectedCoin}
            currency={selectedCurrency}
            onClose={() => setShowAlertDialog(false)}
            onAlertCreated={() => {
              toast.success('Price alert created successfully!');
            }}
          />
        )}
      </main>
    </div>
  );
}