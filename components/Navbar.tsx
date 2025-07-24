'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  TrendingUp, 
  User, 
  LogOut, 
  Menu, 
  X,
  Bell,
  BarChart3,
  Newspaper,
  Calculator,
  Wallet,
  Search,
  Star
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  currentPage?: 'markets' | 'portfolio' | 'alerts' | 'news' | 'tools' | 'watchlist';
  onCoinSelect?: (coinId: string) => void;
  availableCoins?: Array<{
    id: string;
    symbol: string;
    name: string;
    image?: string;
  }>;
}

// Popular cryptocurrencies for search suggestions
const POPULAR_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
];

export function Navbar({ currentPage = 'markets', onCoinSelect, availableCoins = [] }: NavbarProps) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof POPULAR_CRYPTOS>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const navigationItems = [
    { id: 'markets', label: 'Markets', icon: BarChart3, href: '/' },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet, href: '/portfolio' },
    { id: 'alerts', label: 'Alerts', icon: Bell, href: '/alerts' },
    { id: 'watchlist', label: 'Watchlist', icon: Star, href: '/watchlist' },
    { id: 'news', label: 'News', icon: Newspaper, href: '/news' },
    { id: 'tools', label: 'Tools', icon: Calculator, href: '/tools' },
  ];

  // Handle search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Use available coins if provided, otherwise fall back to popular cryptos
    const coinsToSearch = availableCoins.length > 0 ? availableCoins : POPULAR_CRYPTOS;

    // Filter cryptocurrencies based on search query
    const filtered = coinsToSearch.filter(crypto =>
      crypto.name.toLowerCase().includes(query.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(query.toLowerCase()) ||
      crypto.id.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10); // Limit to 10 results for better UX

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const handleSearchSelect = (crypto: typeof POPULAR_CRYPTOS[0]) => {
    setSearchQuery('');
    setShowSearchResults(false);
    
    // If we're on the markets page and have a coin select callback, use it
    if (currentPage === 'markets' && onCoinSelect) {
      onCoinSelect(crypto.id);
    } else {
      // Navigate to markets page with the coin search parameter
      router.push(`/?search=${crypto.id}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSearchSelect(searchResults[0]);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CoinPulse
              </span>
              <Badge variant="secondary" className="text-xs">
                Free
              </Badge>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <Link key={item.id} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={isActive ? "bg-primary text-primary-foreground" : ""}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search cryptocurrencies..."
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <>
                  {/* Dark backdrop overlay */}
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 dark:bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto ring-1 ring-white/20">
                    {searchResults.map((crypto) => (
                      <button
                        key={crypto.id}
                        type="button"
                        onClick={() => handleSearchSelect(crypto)}
                        className="w-full px-4 py-3 text-left hover:bg-white/10 hover:backdrop-blur-sm flex items-center gap-3 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {crypto.image && (
                          <img
                            src={crypto.image}
                            alt={crypto.name}
                            className="w-6 h-6 rounded-full flex-shrink-0 ring-1 ring-border"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-white">{crypto.name}</div>
                          <div className="text-sm text-white/70 uppercase font-mono">{crypto.symbol}</div>
                        </div>
                        <div className="text-xs text-white/60 flex-shrink-0 bg-white/10 px-2 py-1 rounded">
                          #{crypto.symbol}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              {/* No Results */}
              {showSearchResults && searchQuery.length > 0 && searchResults.length === 0 && (
                <>
                  {/* Dark backdrop overlay */}
                  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 dark:bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 p-4 text-center text-white/80 ring-1 ring-white/20">
                    No cryptocurrencies found for &quot;{searchQuery}&quot;
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            {session ? (
              <div className="flex items-center space-x-3">
                <Link href="/alerts">
                  <Button variant="ghost" size="sm">
                    <Bell className="w-4 h-4" />
                  </Button>
                </Link>
                
                <div className="flex items-center space-x-2">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium hidden sm:block">
                    {session.user?.name?.split(' ')[0]}
                  </span>
                </div>
                
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button onClick={() => signIn('google')}>
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t py-4">
            <div className="flex flex-col space-y-2">
              {/* Mobile Search */}
              <div className="relative mb-4 md:hidden">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search cryptocurrencies..."
                    className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </form>
                
                {/* Mobile Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="mt-2 bg-black/90 dark:bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl max-h-40 overflow-y-auto ring-1 ring-white/20">
                    {searchResults.map((crypto) => (
                      <button
                        key={crypto.id}
                        type="button"
                        onClick={() => {
                          handleSearchSelect(crypto);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-3 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {crypto.image && (
                          <img
                            src={crypto.image}
                            alt={crypto.name}
                            className="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-border"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate text-white">{crypto.name}</div>
                          <div className="text-xs text-white/70 uppercase font-mono">{crypto.symbol}</div>
                        </div>
                        <div className="text-xs text-white/60 flex-shrink-0 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                          #{crypto.symbol}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Navigation Items */}
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <Link key={item.id} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              {!session && (
                <Button 
                  className="w-full justify-start mt-4" 
                  onClick={() => {
                    signIn('google');
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}