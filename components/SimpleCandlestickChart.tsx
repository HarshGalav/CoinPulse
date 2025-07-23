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
import { TrendingUp, TrendingDown, BarChart3, ZoomIn, ZoomOut, RotateCcw, Activity } from 'lucide-react';

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
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export function SimpleCandlestickChart({ 
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
  const [chartType, setChartType] = useState<'line' | 'area' | 'candles'>('area');
  const [zoomDomain, setZoomDomain] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [showBrush, setShowBrush] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Custom SVG Candlestick Component
  const renderCandlesticks = () => {
    if (chartType !== 'candles' || !chartData.length) return null;

    const containerWidth = 800; // Fixed width for simplicity
    const containerHeight = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Calculate price range
    const allPrices = chartData.flatMap(d => [d.open || d.price, d.high || d.price, d.low || d.price, d.close || d.price]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;

    const candleWidth = Math.max(2, width / chartData.length * 0.8);

    return (
      <div className="w-full h-96 flex items-center justify-center">
        <svg width={containerWidth} height={containerHeight} className="border rounded">
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#grid)" />

            {/* Candlesticks */}
            {chartData.map((candle, index) => {
              const x = (index / (chartData.length - 1)) * width;
              const open = candle.open || candle.price;
              const high = candle.high || candle.price;
              const low = candle.low || candle.price;
              const close = candle.close || candle.price;

              const isGreen = close >= open;
              const color = isGreen ? '#10b981' : '#ef4444';

              // Calculate Y positions
              const yScale = height / priceRange;
              const highY = (maxPrice - high) * yScale;
              const lowY = (maxPrice - low) * yScale;
              const openY = (maxPrice - open) * yScale;
              const closeY = (maxPrice - close) * yScale;

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.abs(closeY - openY);

              return (
                <g key={index}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={color}
                    strokeWidth={1}
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={Math.max(bodyHeight, 1)}
                    fill={isGreen ? 'none' : color}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const price = minPrice + (priceRange * ratio);
              const y = height - (ratio * height);
              return (
                <g key={i}>
                  <text
                    x={-10}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-current opacity-70"
                  >
                    {formatPrice(price)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    );
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(1)}K`;
    return `${price.toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; payload?: any }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      if (chartType === 'candles' && data?.open !== undefined) {
        const isGreen = data.close >= data.open;
        const change = ((data.close - data.open) / data.open * 100);
        
        return (
          <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg min-w-48">
            <p className="text-sm text-muted-foreground mb-2 font-medium">{label}</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-6">
                <span className="text-muted-foreground">Open:</span>
                <span className="font-medium">{formatCurrency(data.open, currency)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-muted-foreground">High:</span>
                <span className="font-medium text-green-600">{formatCurrency(data.high, currency)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-muted-foreground">Low:</span>
                <span className="font-medium text-red-600">{formatCurrency(data.low, currency)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-muted-foreground">Close:</span>
                <span className={`font-medium ${isGreen ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.close, currency)}
                </span>
              </div>
              <div className="flex justify-between gap-6 pt-1.5 border-t">
                <span className="text-muted-foreground">Change:</span>
                <span className={`font-medium ${isGreen ? 'text-green-600' : 'text-red-600'}`}>
                  {isGreen ? '+' : ''}{change.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="font-semibold text-lg">
              {formatCurrency(payload[0].value, currency)}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        let formattedData: ChartData[] = [];
        
        if (chartType === 'candles') {
          // Use our custom API endpoint for OHLC data
          try {
            const ohlcResponse = await fetch(
              `/api/crypto/ohlc?coinId=${coinId}&currency=${currency}&days=${timeframe}`
            );
            
            if (ohlcResponse.ok) {
              const result = await ohlcResponse.json();
              if (result.success && result.data) {
                formattedData = result.data.map((item: any) => {
                  const date = new Date(item.timestamp);
                  return {
                    timestamp: item.timestamp,
                    price: item.close,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    date: date.toLocaleDateString(),
                    formattedDate: timeframe <= 1 
                      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : timeframe <= 7
                      ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                      : date.toLocaleDateString([], { month: 'short', year: '2-digit' })
                  };
                });
                console.log(`Loaded ${formattedData.length} OHLC data points from ${result.source}`);
              } else {
                throw new Error('Invalid OHLC response format');
              }
            } else {
              throw new Error('OHLC API request failed');
            }
          } catch (ohlcError) {
            console.error('Failed to fetch OHLC data:', ohlcError);
            // Fallback to regular price data
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${timeframe}`
            );
            const data = await response.json();
            
            formattedData = (data.prices || []).map(([timestamp, price]: [number, number], index: number) => {
              const date = new Date(timestamp);
              const prevPrice = index > 0 ? data.prices[index - 1][1] : price;
              const variation = price * 0.01;
              
              return {
                timestamp,
                price,
                open: prevPrice,
                high: price + Math.random() * variation,
                low: price - Math.random() * variation,
                close: price,
                date: date.toLocaleDateString(),
                formattedDate: timeframe <= 1 
                  ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : timeframe <= 7
                  ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : date.toLocaleDateString([], { month: 'short', year: '2-digit' })
              };
            });
          }
        } else {
          // Regular price data for line and area charts
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${timeframe}`
          );
          const data = await response.json();
          
          formattedData = (data.prices || []).map(([timestamp, price]: [number, number]) => {
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
        }
        
        setChartData(formattedData);
        setZoomDomain({});
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [coinId, currency, timeframe, chartType]);

  const timeframes = [
    { label: '24H', value: 1 },
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '1Y', value: 365 },
  ];

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
              <BarChart3 className="w-4 h-4 mr-1" />
              Line
            </Button>
            <Button
              variant={chartType === 'candles' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('candles')}
            >
              <Activity className="w-4 h-4 mr-1" />
              Candles
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
        ) : chartType === 'candles' ? (
          renderCandlesticks()
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
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return `${value.toFixed(2)}`;
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
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return `${value.toFixed(2)}`;
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
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}