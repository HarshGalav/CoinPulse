'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Activity, Wifi, WifiOff, Zap } from 'lucide-react';
import { useSimpleCryptoStore } from '@/lib/stores/simple-crypto-store';

interface LivePriceChartProps {
  coinId: string;
  currency: string;
  coinName: string;
  coinImage?: string;
  currentPrice?: number;
  priceChange24h?: number;
  isLiveDataEnabled?: boolean;
}

interface ChartData {
  timestamp: number;
  price: number;
  date: string;
  formattedDate: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  isLive?: boolean;
}

export function LiveCandlestickChart({ 
  coinId, 
  currency, 
  coinName, 
  coinImage, 
  currentPrice, 
  priceChange24h,
  isLiveDataEnabled = false
}: LivePriceChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeframe, setTimeframe] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [liveMode, setLiveMode] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  
  // Subscribe to real-time price updates
  const realtimePrice = useSimpleCryptoStore((state) => state.prices[coinId]);
  const connection = useSimpleCryptoStore((state) => state.connection);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; payload?: any }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isLivePoint = data?.isLive;
      
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            {isLivePoint && (
              <Badge variant="default" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
          <p className="font-semibold text-lg">
            {formatCurrency(payload[0].value, currency)}
          </p>
          {isLivePoint && (
            <p className="text-xs text-muted-foreground mt-1">
              Real-time data from Binance
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Fetch historical chart data
  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${timeframe}`
      );
      const data = await response.json();
      
      const formattedData: ChartData[] = (data.prices || []).map(([timestamp, price]: [number, number]) => {
        const date = new Date(timestamp);
        return {
          timestamp,
          price,
          date: date.toLocaleDateString(),
          formattedDate: timeframe <= 1 
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : timeframe <= 7
            ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
            : date.toLocaleDateString([], { month: 'short', year: '2-digit' }),
          isLive: false
        };
      });
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coinId, currency, timeframe]);

  // Update chart with live data
  useEffect(() => {
    if (!liveMode || !realtimePrice || !isLiveDataEnabled) return;

    const now = new Date();
    const newDataPoint: ChartData = {
      timestamp: now.getTime(),
      price: realtimePrice.current_price,
      date: now.toLocaleDateString(),
      formattedDate: timeframe <= 1 
        ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : timeframe <= 7
        ? now.toLocaleDateString([], { month: 'short', day: 'numeric' })
        : now.toLocaleDateString([], { month: 'short', year: '2-digit' }),
      isLive: true
    };

    setChartData(prevData => {
      // Remove old live data points and add new one
      const historicalData = prevData.filter(d => !d.isLive);
      
      // Keep only recent live points (last 50 for performance)
      const existingLiveData = prevData.filter(d => d.isLive).slice(-49);
      
      return [...historicalData, ...existingLiveData, newDataPoint];
    });

    setLastLiveUpdate(now);
  }, [realtimePrice, liveMode, timeframe, isLiveDataEnabled]);

  // Initial data fetch
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Toggle live mode
  const toggleLiveMode = () => {
    if (!isLiveDataEnabled) return;
    
    if (!liveMode) {
      // Entering live mode - refresh data first
      fetchChartData().then(() => {
        setLiveMode(true);
      });
    } else {
      // Exiting live mode - refresh to get clean historical data
      setLiveMode(false);
      fetchChartData();
    }
  };

  const timeframes = [
    { label: '24H', value: 1 },
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '1Y', value: 365 },
  ];

  const isPositive = priceChange24h ? priceChange24h >= 0 : true;
  const chartColor = isPositive ? '#10b981' : '#ef4444';
  const liveColor = '#3b82f6'; // Blue for live data points
  const gradientId = `gradient-${coinId}`;

  // Separate live and historical data for different styling
  const historicalData = chartData.filter(d => !d.isLive);
  const liveData = chartData.filter(d => d.isLive);
  const allData = chartData;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {coinImage && (
              <img
                src={coinImage}
                alt={coinName}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <CardTitle className="text-2xl">{coinName}</CardTitle>
              {currentPrice && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-3xl font-bold">
                    {formatCurrency(currentPrice, currency)}
                  </span>
                  {priceChange24h !== undefined && (
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
                      {Math.abs(priceChange24h).toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Live Mode Toggle */}
            {isLiveDataEnabled && (
              <div className="flex items-center space-x-2">
                <Button
                  variant={liveMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleLiveMode}
                  className={cn(
                    "transition-all",
                    liveMode && "animate-pulse"
                  )}
                >
                  {liveMode ? (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Live
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-1" />
                      Enable Live
                    </>
                  )}
                </Button>
                
                {liveMode && (
                  <div className="flex items-center space-x-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      connection.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                    )} />
                    <span className="text-xs text-muted-foreground">
                      {connection.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              Area
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Line
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-wrap gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(tf.value)}
                className="text-xs"
                disabled={liveMode} // Disable timeframe changes in live mode
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          {liveMode && lastLiveUpdate && (
            <div className="text-xs text-muted-foreground">
              Last update: {lastLiveUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        {liveMode && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-300">
                Live mode active - Chart updates with real-time price data
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : (
          <div className="h-96 relative">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={allData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={liveMode ? liveColor : chartColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={liveMode ? liveColor : chartColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return `${value.toFixed(2)}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={liveMode ? liveColor : chartColor}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: liveMode ? liveColor : chartColor }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={allData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return `${value.toFixed(2)}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={liveMode ? liveColor : chartColor}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: liveMode ? liveColor : chartColor }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}