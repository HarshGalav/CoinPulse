"use client";

import { useState, useEffect } from "react";
import { CoinData } from "./coingecko";

// DEPRECATED: This file is deprecated and replaced by simple-realtime.ts
// Keeping minimal exports to prevent breaking changes

export interface RealtimePrice {
  id: string;
  symbol: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

export interface RealtimeDataOptions {
  currency: string;
  coinIds: string[];
  onPriceUpdate: (prices: RealtimePrice[]) => void;
  onError: (error: Error) => void;
  updateInterval?: number; // in milliseconds
}

class RealtimeDataManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private activeConnections: Map<string, RealtimeDataOptions> = new Map();
  private isOnline: boolean = true;

  constructor() {
    // Monitor online/offline status
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.resumeAllConnections();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        this.pauseAllConnections();
      });
    }
  }

  /**
   * Start real-time price updates for specified coins
   * DEPRECATED: No longer makes API calls
   */
  startPriceUpdates(connectionId: string, options: RealtimeDataOptions): void {
    console.log(
      `DEPRECATED: startPriceUpdates called for ${connectionId} - use simple-realtime.ts instead`
    );
    // Do nothing - this is deprecated
  }

  /**
   * Stop real-time price updates
   */
  stopPriceUpdates(connectionId: string): void {
    const interval = this.intervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(connectionId);
    }

    this.activeConnections.delete(connectionId);
    console.log(`Stopped real-time updates for ${connectionId}`);
  }

  /**
   * Fetch current prices from CoinGecko API
   * DEPRECATED: No longer makes API calls
   */
  private async fetchPrices(connectionId: string): Promise<void> {
    console.log(
      `DEPRECATED: fetchPrices called for ${connectionId} - no API calls made`
    );
    // Do nothing - this is deprecated and no longer makes API calls
  }

  /**
   * Get enhanced real-time data with market data
   * DEPRECATED: No longer makes API calls
   */
  async getEnhancedRealtimeData(
    coinIds: string[],
    currency: string
  ): Promise<CoinData[]> {
    console.log(
      `DEPRECATED: getEnhancedRealtimeData called - no API calls made`
    );
    return []; // Return empty array instead of making API calls
  }

  /**
   * Pause all active connections
   */
  private pauseAllConnections(): void {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    console.log("Paused all real-time connections (offline)");
  }

  /**
   * Resume all active connections
   */
  private resumeAllConnections(): void {
    this.activeConnections.forEach((options, connectionId) => {
      const interval = setInterval(() => {
        this.fetchPrices(connectionId);
      }, options.updateInterval || 30000);

      this.intervals.set(connectionId, interval);
    });
    console.log("Resumed all real-time connections (online)");
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): boolean {
    return this.intervals.has(connectionId) && this.isOnline;
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.activeConnections.clear();
  }
}

// Export singleton instance
export const realtimeDataManager = new RealtimeDataManager();

// React hook for real-time price updates
export function useRealtimePrices(
  coinIds: string[],
  currency: string,
  updateInterval: number = 30000
) {
  const [prices, setPrices] = useState<RealtimePrice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (coinIds.length === 0) return;

    const connectionId = `realtime-${Date.now()}`;

    const options: RealtimeDataOptions = {
      currency,
      coinIds,
      updateInterval,
      onPriceUpdate: (newPrices) => {
        setPrices(newPrices);
        setIsConnected(true);
        setError(null);
      },
      onError: (err) => {
        setError(err);
        setIsConnected(false);
      },
    };

    realtimeDataManager.startPriceUpdates(connectionId, options);

    return () => {
      realtimeDataManager.stopPriceUpdates(connectionId);
      setIsConnected(false);
    };
  }, [coinIds, currency, updateInterval]);

  return { prices, isConnected, error };
}
