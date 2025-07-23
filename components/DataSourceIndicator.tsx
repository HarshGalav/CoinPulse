'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  Clock, 
  CheckCircle,
  Zap,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSourceIndicatorProps {
  lastUpdate: Date | null;
  priceCount: number;
  isRealTime: boolean;
  dataSource: string;
  updateFrequency: string;
}

export function DataSourceIndicator({
  lastUpdate,
  priceCount,
  isRealTime,
  dataSource,
  updateFrequency
}: DataSourceIndicatorProps) {
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  };

  const isDataFresh = () => {
    if (!lastUpdate) return false;
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    return diff < 10000; // Fresh if updated within 10 seconds
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Data Source</span>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {dataSource}
            </Badge>
            
            {isRealTime && (
              <Badge variant="default" className="text-xs bg-green-600">
                <Zap className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>{priceCount} coins</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{updateFrequency}</span>
            </div>
            
            {lastUpdate && (
              <div className={cn(
                "flex items-center space-x-2 text-xs",
                isDataFresh() ? "text-green-600" : "text-yellow-600"
              )}>
                <CheckCircle className="w-3 h-3" />
                <span>{getTimeSinceUpdate()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Live market data from Binance Exchange
          </span>
          
          {isDataFresh() && (
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}