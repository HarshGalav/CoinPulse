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
  Brush,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PriceChartProps {
  coinId: string;
  currency: string;
  coinName: string;
  coinImage?: string;
  currentPrice?: number;
  priceChange24h?: number;
}

interface ChartData {
  timestamp: number;
  price: number;
  date: string;
  formattedDate: string;
}

export function PriceChart({ 
  coinId, 
  currency, 
  coinName, 
  coinImage, 
  currentPrice, 
  priceChange24h 
}: PriceChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeframe, setTimeframe] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [zoomDomain, setZoomDomain] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [showBrush, setShowBrush] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Zoom functionality
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    if (chartData.length === 0) return;
    
    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? 1 + zoomFactor : 1 - zoomFactor;
    
    const currentStart = zoomDomain.startIndex || 0;
    const currentEnd = zoomDomain.endIndex || chartData.length - 1;
    const currentRange = currentEnd - currentStart;
    
    const newRange = Math.max(10, Math.min(chartData.length, currentRange * delta));
    const center = (currentStart + currentEnd) / 2;
    
    const newStart = Math.max(0, Math.floor(center - newRange / 2));
    const newEnd = Math.min(chartData.length - 1, Math.floor(center + newRange / 2));
    
    setZoomDomain({ startIndex: newStart, endIndex: newEnd });
  }, [chartData, zoomDomain]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setZoomDomain({});
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    if (chartData.length === 0) return;
    
    const currentStart = zoomDomain.startIndex || 0;
    const currentEnd = zoomDomain.endIndex || chartData.length - 1;
    const currentRange = currentEnd - currentStart;
    
    if (currentRange <= 10) return; // Minimum zoom level
    
    const newRange = currentRange * 0.8;
    const center = (currentStart + currentEnd) / 2;
    
    const newStart = Math.max(0, Math.floor(center - newRange / 2));
    const newEnd = Math.min(chartData.length - 1, Math.floor(center + newRange / 2));
    
    setZoomDomain({ startIndex: newStart, endIndex: newEnd });
  }, [chartData, zoomDomain]);

  // Zoom out
  const zoomOut = useCallback(() => {
    if (chartData.length === 0) return;
    
    const currentStart = zoomDomain.startIndex || 0;
    const currentEnd = zoomDomain.endIndex || chartData.length - 1;
    const currentRange = currentEnd - currentStart;
    
    if (currentRange >= chartData.length - 1) return; // Maximum zoom level
    
    const newRange = Math.min(chartData.length, currentRange * 1.25);
    const center = (currentStart + currentEnd) / 2;
    
    const newStart = Math.max(0, Math.floor(center - newRange / 2));
    const newEnd = Math.min(chartData.length - 1, Math.floor(center + newRange / 2));
    
    setZoomDomain({ startIndex: newStart, endIndex: newEnd });
  }, [chartData, zoomDomain]);

  // Add wheel event listener
  useEffect(() => {
    const chartElement = chartRef.current;
    if (chartElement) {
      chartElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        chartElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${timeframe}`
        );
        const data = await response.json();
        
        const formattedData = (data.prices || []).map(([timestamp, price]: [number, number]) => {
          const date = new Date(timestamp);
          return {
            timestamp,
            price,
            date: date.toLocaleDateString(),
            formattedDate: timeframe <= 1 
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : timeframe <= 7
              ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
              : date.toLocaleDateString([], { month: 'short', year: '2-digit' })
          };
        });
        
        setChartData(formattedData);
        // Reset zoom when data changes
        setZoomDomain({});
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [coinId, currency, timeframe]);

  const timeframes = [
    { label: '24H', value: 1 },
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '1Y', value: 365 },
  ];

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="font-semibold text-lg">
            {formatCurrency(payload[0].value, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  const isPositive = priceChange24h ? priceChange24h >= 0 : true;
  const chartColor = isPositive ? '#10b981' : '#ef4444';
  const gradientId = `gradient-${coinId}`;

  // Get zoomed data
  const getZoomedData = () => {
    if (!zoomDomain.startIndex && !zoomDomain.endIndex) {
      return chartData;
    }
    const start = zoomDomain.startIndex || 0;
    const end = zoomDomain.endIndex || chartData.length - 1;
    return chartData.slice(start, end + 1);
  };

  const zoomedData = getZoomedData();

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
              <BarChart3 className="w-4 h-4" />
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
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={chartData.length === 0}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={chartData.length === 0}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              disabled={chartData.length === 0 || (!zoomDomain.startIndex && !zoomDomain.endIndex)}
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBrush(!showBrush)}
              disabled={chartData.length === 0}
              title="Toggle Brush Selector"
            >
              Brush
            </Button>
          </div>
        </div>
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
          <div ref={chartRef} className="h-96 relative">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={zoomedData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
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
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
                      return `$${value.toFixed(2)}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor }}
                  />
                  {showBrush && (
                    <Brush
                      dataKey="formattedDate"
                      height={30}
                      stroke={chartColor}
                      fill={chartColor}
                      fillOpacity={0.1}
                      onChange={(brushData) => {
                        if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                          setZoomDomain({
                            startIndex: brushData.startIndex,
                            endIndex: brushData.endIndex
                          });
                        }
                      }}
                    />
                  )}
                </AreaChart>
              ) : (
                <LineChart data={zoomedData}>
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
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
                      return `$${value.toFixed(2)}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: chartColor }}
                  />
                  {showBrush && (
                    <Brush
                      dataKey="formattedDate"
                      height={30}
                      stroke={chartColor}
                      fill={chartColor}
                      fillOpacity={0.1}
                      onChange={(brushData) => {
                        if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                          setZoomDomain({
                            startIndex: brushData.startIndex,
                            endIndex: brushData.endIndex
                          });
                        }
                      }}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
            
            {/* Zoom indicator */}
            {(zoomDomain.startIndex !== undefined || zoomDomain.endIndex !== undefined) && (
              <div className="absolute top-2 left-2 bg-background/90 backdrop-blur border rounded px-2 py-1 text-xs text-muted-foreground">
                Zoomed View
              </div>
            )}
            
            {/* Trackpad zoom hint */}
            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur border rounded px-2 py-1 text-xs text-muted-foreground">
              Use trackpad/mouse wheel to zoom
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}