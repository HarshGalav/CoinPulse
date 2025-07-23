'use client';

import React from 'react';

interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  formattedDate: string;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  width: number;
  height: number;
  currency: string;
  onHover?: (data: CandlestickData | null, x: number, y: number) => void;
}

export function CandlestickChart({ 
  data, 
  width, 
  height, 
  currency,
  onHover 
}: CandlestickChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Calculate price range
  const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1; // 10% padding

  const chartMinPrice = minPrice - padding;
  const chartMaxPrice = maxPrice + padding;
  const chartPriceRange = chartMaxPrice - chartMinPrice;

  // Chart dimensions
  const margin = { top: 20, right: 60, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate candle width
  const candleWidth = Math.max(2, Math.min(20, chartWidth / data.length * 0.8));
  const candleSpacing = chartWidth / data.length;

  // Price to Y coordinate
  const priceToY = (price: number) => {
    return margin.top + ((chartMaxPrice - price) / chartPriceRange) * chartHeight;
  };

  // X coordinate for each candle
  const indexToX = (index: number) => {
    return margin.left + (index + 0.5) * candleSpacing;
  };

  // Generate Y-axis ticks
  const yTicks = [];
  const tickCount = 8;
  for (let i = 0; i <= tickCount; i++) {
    const price = chartMinPrice + (chartPriceRange * i) / tickCount;
    yTicks.push(price);
  }

  // Generate X-axis ticks
  const xTicks = [];
  const xTickCount = Math.min(8, data.length);
  for (let i = 0; i < xTickCount; i++) {
    const index = Math.floor((data.length - 1) * i / (xTickCount - 1));
    xTicks.push({ index, data: data[index] });
  }

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(1)}K`;
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find the closest candle
    const candleIndex = Math.floor((x - margin.left) / candleSpacing);
    
    if (candleIndex >= 0 && candleIndex < data.length && onHover) {
      onHover(data[candleIndex], event.clientX, event.clientY);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null, 0, 0);
    }
  };

  return (
    <svg 
      width={width} 
      height={height}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="cursor-crosshair"
    >
      {/* Background */}
      <rect width={width} height={height} fill="transparent" />
      
      {/* Grid lines */}
      <g className="opacity-20">
        {/* Horizontal grid lines */}
        {yTicks.map((price, i) => (
          <line
            key={`hgrid-${i}`}
            x1={margin.left}
            y1={priceToY(price)}
            x2={width - margin.right}
            y2={priceToY(price)}
            stroke="currentColor"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Vertical grid lines */}
        {xTicks.map((tick, i) => (
          <line
            key={`vgrid-${i}`}
            x1={indexToX(tick.index)}
            y1={margin.top}
            x2={indexToX(tick.index)}
            y2={height - margin.bottom}
            stroke="currentColor"
            strokeDasharray="2,2"
          />
        ))}
      </g>

      {/* Candlesticks */}
      <g>
        {data.map((candle, index) => {
          const x = indexToX(index);
          const isGreen = candle.close >= candle.open;
          const color = isGreen ? '#10b981' : '#ef4444';
          
          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);
          const openY = priceToY(candle.open);
          const closeY = priceToY(candle.close);
          
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.abs(closeY - openY);
          
          return (
            <g key={index}>
              {/* Wick (high-low line) */}
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={color}
                strokeWidth={1}
              />
              
              {/* Body (open-close rectangle) */}
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
      </g>

      {/* Y-axis */}
      <g>
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          stroke="currentColor"
          className="opacity-30"
        />
        
        {/* Y-axis labels */}
        {yTicks.map((price, i) => (
          <text
            key={`ylabel-${i}`}
            x={margin.left - 8}
            y={priceToY(price)}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-xs fill-current opacity-70"
          >
            {formatPrice(price)}
          </text>
        ))}
      </g>

      {/* X-axis */}
      <g>
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="currentColor"
          className="opacity-30"
        />
        
        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={`xlabel-${i}`}
            x={indexToX(tick.index)}
            y={height - margin.bottom + 16}
            textAnchor="middle"
            className="text-xs fill-current opacity-70"
          >
            {tick.data.formattedDate}
          </text>
        ))}
      </g>
    </svg>
  );
}