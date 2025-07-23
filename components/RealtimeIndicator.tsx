'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Zap, 
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
  updateInterval: number;
  onToggle: () => void;
  enabled: boolean;
  priceChanges?: number; // Number of price changes in last update
  connectionMethod?: 'websocket' | 'polling'; // Connection method indicator
}

export function RealtimeIndicator({ 
  isConnected, 
  lastUpdate, 
  updateInterval, 
  onToggle, 
  enabled,
  priceChanges = 0,
  connectionMethod = 'websocket'
}: RealtimeIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastUpdate) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - lastUpdate.getTime();
      const seconds = Math.floor(diff / 1000);
      
      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const getStatusColor = () => {
    if (!enabled) return 'secondary';
    if (isConnected) return 'default';
    return 'destructive';
  };

  const getStatusIcon = () => {
    if (!enabled) return <Wifi className="w-3 h-3" />;
    if (isConnected) return <Activity className="w-3 h-3 animate-pulse" />;
    return <WifiOff className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (!enabled) return 'Static';
    if (isConnected) {
      return connectionMethod === 'websocket' ? 'Live (WS)' : 'Live (API)';
    }
    return 'Offline';
  };

  const getUpdateIntervalText = () => {
    if (updateInterval < 60000) {
      return `${updateInterval / 1000}s`;
    } else {
      return `${updateInterval / 60000}m`;
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Status Badge */}
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className={cn(
          "flex items-center space-x-2",
          enabled && isConnected && "bg-green-600 hover:bg-green-700"
        )}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </Button>

      {/* Update Info */}
      {enabled && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{getUpdateIntervalText()}</span>
          </div>
          
          {lastUpdate && (
            <div className="flex items-center space-x-1">
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
          )}
          
          {priceChanges > 0 && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>{priceChanges} updates</span>
            </Badge>
          )}
          
          {enabled && isConnected && (
            <Badge 
              variant={connectionMethod === 'websocket' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {connectionMethod === 'websocket' ? 'WebSocket' : 'REST API'}
            </Badge>
          )}
        </div>
      )}

      {/* Connection Status Indicator */}
      {enabled && (
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
        )} />
      )}
    </div>
  );
}