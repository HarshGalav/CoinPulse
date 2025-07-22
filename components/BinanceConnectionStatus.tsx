'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BinanceConnectionStatusProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
  connectionAttempts: number;
  maxAttempts: number;
  onReconnect: () => void;
  priceCount: number;
}

export function BinanceConnectionStatus({
  isConnected,
  lastUpdate,
  error,
  connectionAttempts,
  maxAttempts,
  onReconnect,
  priceCount
}: BinanceConnectionStatusProps) {
  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (isConnected) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getStatusText = () => {
    if (error) return 'Connection Error';
    if (isConnected) return 'Connected to Binance';
    if (connectionAttempts > 0) return `Reconnecting... (${connectionAttempts}/${maxAttempts})`;
    return 'Connecting...';
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-4 h-4" />;
    if (isConnected) return <CheckCircle className="w-4 h-4" />;
    return <RefreshCw className="w-4 h-4 animate-spin" />;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("flex items-center space-x-2", getStatusColor())}>
              {getStatusIcon()}
              <span className="font-medium text-sm">{getStatusText()}</span>
            </div>
            
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                {priceCount} coins
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            
            {(error || !isConnected) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                disabled={connectionAttempts >= maxAttempts}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}