'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage, formatMarketCap, cn } from '@/lib/utils';
import { CoinData } from '@/lib/coingecko';
import { TrendingUp, TrendingDown, Bell, BarChart3, Star } from 'lucide-react';
import Image from 'next/image';

interface CoinCardProps {
  coin: CoinData;
  currency: string;
  onSetAlert: (coin: CoinData) => void;
  onViewDetails: (coin: CoinData) => void;
}

export function CoinCard({ coin, currency, onSetAlert, onViewDetails }: CoinCardProps) {
  const isPositive = coin.price_change_percentage_24h >= 0;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Image
                src={coin.image}
                alt={coin.name}
                width={40}
                height={40}
                className="rounded-full ring-2 ring-background shadow-sm"
              />
              {coin.market_cap_rank && coin.market_cap_rank <= 10 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white fill-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg leading-tight truncate">{coin.name}</h3>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground uppercase font-medium">
                  {coin.symbol}
                </p>
                {coin.market_cap_rank && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    #{coin.market_cap_rank}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">
              {formatCurrency(coin.current_price, currency)}
            </span>
            <div className={cn(
              "flex items-center text-sm font-medium px-2 py-1 rounded-full",
              isPositive 
                ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30" 
                : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
            )}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {formatPercentage(coin.price_change_percentage_24h)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Market Cap</p>
            <p className="font-semibold">
              {coin.market_cap ? formatMarketCap(coin.market_cap) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">24h Volume</p>
            <p className="font-semibold">
              {coin.total_volume ? formatMarketCap(coin.total_volume) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">24h High</p>
            <p className="font-semibold text-green-600">
              {coin.high_24h ? formatCurrency(coin.high_24h, currency) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">24h Low</p>
            <p className="font-semibold text-red-600">
              {coin.low_24h ? formatCurrency(coin.low_24h, currency) : 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetAlert(coin)}
            className="flex-1 group-hover:border-primary/50 transition-colors"
          >
            <Bell className="w-4 h-4 mr-2" />
            Alert
          </Button>
          <Button
            size="sm"
            onClick={() => onViewDetails(coin)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Chart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}