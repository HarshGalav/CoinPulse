'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

interface CoinSearchProps {
  onCoinSelect: (coinId: string) => void;
  className?: string;
}

export function CoinSearch({ onCoinSelect, className }: CoinSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchCoins = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/crypto/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.coins?.slice(0, 10) || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCoins, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleCoinSelect = (coinId: string) => {
    onCoinSelect(coinId);
    setQuery('');
    setShowResults(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search cryptocurrencies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            results.map((coin) => (
              <button
                key={coin.id}
                onClick={() => handleCoinSelect(coin.id)}
                className="w-full flex items-center space-x-3 p-3 hover:bg-accent text-left"
              >
                <img
                  src={coin.thumb}
                  alt={coin.name}
                  className="w-6 h-6 rounded-full"
                />
                <div>
                  <p className="font-medium">{coin.name}</p>
                  <p className="text-sm text-muted-foreground uppercase">
                    {coin.symbol}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}