"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatPercentage,
  formatMarketCap,
  cn,
} from "@/lib/utils";
import { CoinData } from "@/lib/coingecko";
import { useSimpleCrypto } from "@/lib/hooks/use-simple-crypto";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Eye,
  BarChart3,
  Globe,
  Activity,
  DollarSign,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react";

interface MarketOverviewProps {
  coins: CoinData[];
  currency: string;
  isLoading: boolean;
  onCoinSelect: (coin: CoinData) => void;
}

export function MarketOverview({
  coins,
  currency,
  isLoading,
  onCoinSelect,
}: MarketOverviewProps) {
  const [globalStats, setGlobalStats] = useState({
    totalMarketCap: 0,
    totalVolume: 0,
    btcDominance: 0,
    activeCoins: 0,
    markets: 0,
    marketCapChange24h: 0,
  });

  // Use stable real-time data store
  const {
    allPrices: realtimePrices,
    isConnected,
    lastUpdate,
    error,
    reconnect,
    connectionMethod,
  } = useSimpleCrypto({ autoStart: false }); // Don't auto-start, let main page control it

  // Merge real-time prices with coin data using useMemo to prevent infinite loops
  const mergedCoins = useMemo(() => {
    return coins.map((coin) => {
      const realtimePrice = realtimePrices.find((p) => p.id === coin.id);
      if (realtimePrice) {
        return {
          ...coin,
          current_price: realtimePrice.current_price,
          price_change_percentage_24h:
            realtimePrice.price_change_percentage_24h,
        };
      }
      return coin;
    });
  }, [coins, realtimePrices]);

  useEffect(() => {
    if (mergedCoins.length > 0) {
      const totalMarketCap = mergedCoins.reduce(
        (sum, coin) => sum + (coin.market_cap || 0),
        0
      );
      const totalVolume = mergedCoins.reduce(
        (sum, coin) => sum + (coin.total_volume || 0),
        0
      );
      const btcMarketCap =
        mergedCoins.find((coin) => coin.symbol === "btc")?.market_cap || 0;
      const btcDominance =
        totalMarketCap > 0 ? (btcMarketCap / totalMarketCap) * 100 : 0;

      setGlobalStats({
        totalMarketCap,
        totalVolume,
        btcDominance,
        activeCoins: mergedCoins.length,
        markets: mergedCoins.length * 15, // Approximate based on typical exchange listings
        marketCapChange24h: 0, // Will be calculated from real data when available
      });
    }
  }, [mergedCoins]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Global Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 animate-pulse"
                >
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/6"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Market Cap
                </p>
                <p className="text-xl font-bold">
                  {formatMarketCap(globalStats.totalMarketCap)}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">
                    +{globalStats.marketCapChange24h}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">24h Volume</p>
                <p className="text-xl font-bold">
                  {formatMarketCap(globalStats.totalVolume)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all exchanges
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  BTC Dominance
                </p>
                <p className="text-xl font-bold">
                  {globalStats.btcDominance.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bitcoin market share
                </p>
              </div>
              <Zap className="w-8 h-8 text-orange-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Active Cryptos
                </p>
                <p className="text-xl font-bold">
                  {globalStats.activeCoins.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {globalStats.markets.toLocaleString()} markets
                </p>
              </div>
              <Globe className="w-8 h-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              Today&apos;s Cryptocurrency Prices by Market Cap
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className={cn(
                  "text-xs flex items-center gap-1",
                  isConnected ? "bg-green-600" : "bg-gray-500"
                )}
              >
                {isConnected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {isConnected ? "Live Data" : "Offline"}
              </Badge>
              {isConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">#</th>
                  <th className="text-left p-4 font-medium text-sm">Name</th>
                  <th className="text-right p-4 font-medium text-sm">Price</th>
                  <th className="text-right p-4 font-medium text-sm">24h %</th>
                  <th className="text-right p-4 font-medium text-sm">7d %</th>
                  <th className="text-right p-4 font-medium text-sm">
                    Market Cap
                  </th>
                  <th className="text-right p-4 font-medium text-sm">
                    Volume(24h)
                  </th>
                  <th className="text-right p-4 font-medium text-sm">
                    Circulating Supply
                  </th>
                  <th className="text-center p-4 font-medium text-sm">
                    Last 7 Days
                  </th>
                </tr>
              </thead>
              <tbody>
                {mergedCoins.map((coin, index) => {
                  const isPositive = coin.price_change_percentage_24h >= 0;
                  const isTop10 =
                    coin.market_cap_rank && coin.market_cap_rank <= 10;

                  return (
                    <tr
                      key={coin.id}
                      id={`coin-${coin.id}`}
                      className="border-b hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => onCoinSelect(coin)}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {coin.market_cap_rank || index + 1}
                          </span>
                          {isTop10 && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="font-semibold group-hover:text-primary transition-colors">
                              {coin.name}
                            </div>
                            <div className="text-sm text-muted-foreground uppercase">
                              {coin.symbol}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-semibold">
                          {formatCurrency(coin.current_price, currency)}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div
                          className={cn(
                            "flex items-center justify-end font-medium",
                            isPositive ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {formatPercentage(coin.price_change_percentage_24h)}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="text-muted-foreground">
                          <span className="text-muted-foreground">N/A</span>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-medium">
                          {coin.market_cap
                            ? formatMarketCap(coin.market_cap)
                            : "N/A"}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-medium">
                          {coin.total_volume
                            ? formatMarketCap(coin.total_volume)
                            : "N/A"}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="text-sm">
                          {coin.circulating_supply
                            ? `${(coin.circulating_supply / 1000000).toFixed(
                                1
                              )}M ${coin.symbol.toUpperCase()}`
                            : "N/A"}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
