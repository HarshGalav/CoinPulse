"use client";

import { useState } from "react";
import { useRealBinanceWebSocket } from "@/lib/real-binance-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PaginatedCryptoList() {
  const [currentPage, setCurrentPage] = useState(0);
  const { 
    prices, 
    isConnected, 
    lastUpdate, 
    error, 
    totalPages,
    reconnect 
  } = useRealBinanceWebSocket(currentPage);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0;
    return (
      <span className={isPositive ? "text-green-600" : "text-red-600"}>
        {isPositive ? "+" : ""}{percentage.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Crypto Prices</h2>
          <p className="text-gray-600">
            Page {currentPage + 1} of {totalPages} • 
            {isConnected ? (
              <span className="text-green-600 ml-1">● Connected</span>
            ) : (
              <span className="text-red-600 ml-1">● Disconnected</span>
            )}
          </p>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={handlePrevPage} 
            disabled={currentPage === 0}
            variant="outline"
          >
            Previous
          </Button>
          <Button 
            onClick={handleNextPage} 
            disabled={currentPage >= totalPages - 1}
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-red-600">{error}</p>
              <Button onClick={reconnect} variant="outline" size="sm">
                Reconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crypto Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {prices.length > 0 ? (
          prices.map((coin) => (
            <Card key={coin.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{coin.symbol}</span>
                  <span className="text-sm font-normal text-gray-500">
                    {coin.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xl font-bold">
                    {formatPrice(coin.current_price)}
                  </div>
                  <div className="text-sm">
                    24h: {formatPercentage(coin.price_change_percentage_24h)}
                  </div>
                  <div className="text-xs text-gray-500">
                    H: {formatPrice(coin.high_24h)} | L: {formatPrice(coin.low_24h)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">
              {isConnected ? "Loading prices..." : "Connecting to real-time data..."}
            </p>
          </div>
        )}
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-sm text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}