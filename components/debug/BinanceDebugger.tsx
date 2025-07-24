'use client';

import { useState } from 'react';
import { useBinanceConnectionStatus } from '@/lib/hooks/use-binance-comprehensive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function BinanceDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [mappingInfo, setMappingInfo] = useState<any>(null);
  
  const {
    isConnected,
    connectionMethod,
    lastUpdate,
    error,
    updateCount,
    requestedCoins,
    mappedCoins,
    availableSymbols,
    coverage,
    getUnmappedCoins,
    getMappingInfo,
    reconnect,
  } = useBinanceConnectionStatus();

  const handleShowMapping = () => {
    const info = getMappingInfo();
    setMappingInfo(info);
    console.log('Binance Mapping Info:', info);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur"
        >
          🔍 Binance Debug
        </Button>
      </div>
    );
  }

  const unmappedCoins = getUnmappedCoins();

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <Card className="bg-background/95 backdrop-blur border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Binance Comprehensive Debug</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Connection Status */}
          <div>
            <div className="font-medium mb-1">Connection</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Method:</span>
                <Badge variant="outline" className="text-xs">
                  {connectionMethod}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Updates:</span>
                <span>{updateCount}</span>
              </div>
              {error && (
                <div className="text-red-600 text-xs mt-1 p-1 bg-red-50 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Coverage Stats */}
          <div>
            <div className="font-medium mb-1">Coverage</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Requested:</span>
                <span>{requestedCoins}</span>
              </div>
              <div className="flex justify-between">
                <span>Mapped:</span>
                <span className="text-green-600">{mappedCoins}</span>
              </div>
              <div className="flex justify-between">
                <span>Available Symbols:</span>
                <span>{availableSymbols.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Coverage:</span>
                <Badge variant={coverage > 80 ? "default" : coverage > 50 ? "secondary" : "destructive"} className="text-xs">
                  {coverage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Unmapped Coins */}
          {unmappedCoins.length > 0 && (
            <div>
              <div className="font-medium mb-1">Unmapped Coins ({unmappedCoins.length})</div>
              <div className="max-h-20 overflow-y-auto text-xs text-muted-foreground">
                {unmappedCoins.slice(0, 10).map(coin => (
                  <div key={coin} className="truncate">{coin}</div>
                ))}
                {unmappedCoins.length > 10 && (
                  <div className="text-xs text-muted-foreground">
                    ... and {unmappedCoins.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Update */}
          {lastUpdate && (
            <div>
              <div className="font-medium mb-1">Last Update</div>
              <div className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              className="text-xs h-6"
            >
              Reconnect
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowMapping}
              className="text-xs h-6"
            >
              Show Mapping
            </Button>
          </div>

          {/* Mapping Info */}
          {mappingInfo && (
            <div className="mt-3 p-2 bg-muted rounded text-xs">
              <div className="font-medium mb-1">Mapping Sample</div>
              <div className="max-h-32 overflow-y-auto">
                {Object.entries(mappingInfo.coinToSymbol).slice(0, 5).map(([coin, symbol]) => (
                  <div key={coin} className="flex justify-between">
                    <span className="truncate">{coin}:</span>
                    <span className="text-green-600">{symbol as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}