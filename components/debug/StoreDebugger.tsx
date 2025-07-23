'use client';

import { useState } from 'react';
import { useSimpleCryptoStore } from '@/lib/stores/simple-crypto-store';
import { useSimpleConnectionStatus } from '@/lib/hooks/use-simple-crypto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { simpleWebSocketManager } from '@/lib/services/simple-websocket-manager';

export function StoreDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  
  // Use stable selectors to prevent infinite loops
  const pricesCount = useSimpleCryptoStore((state) => Object.keys(state.prices).length);
  const connection = useSimpleConnectionStatus();
  const managerStatus = simpleWebSocketManager.getStatus();

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur"
        >
          🐛 Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Store Debugger</CardTitle>
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
                <Badge variant={connection.isConnected ? "default" : "destructive"} className="text-xs">
                  {connection.isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Method:</span>
                <Badge variant="outline" className="text-xs">
                  {connection.connectionMethod}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Updates:</span>
                <span>{connection.updateCount}</span>
              </div>
              {connection.error && (
                <div className="text-red-600 text-xs mt-1 p-1 bg-red-50 rounded">
                  {connection.error}
                </div>
              )}
            </div>
          </div>

          {/* Manager Status */}
          <div>
            <div className="font-medium mb-1">Manager</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Active:</span>
                <span>{managerStatus.isActive ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span>Page:</span>
                <span>{managerStatus.currentPage}</span>
              </div>
              <div className="flex justify-between">
                <span>Attempts:</span>
                <span>{managerStatus.reconnectAttempts}/{managerStatus.maxAttempts}</span>
              </div>
            </div>
          </div>

          {/* Data Status */}
          <div>
            <div className="font-medium mb-1">Data</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Prices:</span>
                <span>{pricesCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Page:</span>
                <span>{managerStatus.currentPage}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span>
                  {connection.lastUpdate 
                    ? connection.lastUpdate.toLocaleTimeString()
                    : "Never"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Recent Prices */}
          {pricesCount > 0 && (
            <div>
              <div className="font-medium mb-1">Recent Prices</div>
              <div className="text-xs text-muted-foreground">
                {pricesCount} prices loaded
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => connection.reconnect()}
              className="text-xs h-6"
            >
              Reconnect
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const store = useSimpleCryptoStore.getState();
                store.reset();
              }}
              className="text-xs h-6"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}