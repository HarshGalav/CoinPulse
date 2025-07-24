'use client';

import { useEffect, useState } from 'react';
import { binanceComprehensiveManager } from '../../lib/services/binance-comprehensive-manager';

export function BinanceConnectionTest() {
  const [status, setStatus] = useState<any>(null);
  const [testCoins] = useState(['bitcoin', 'ethereum', 'binancecoin']);

  useEffect(() => {
    const testConnection = async () => {
      console.log('🧪 Testing Binance connection with test coins:', testCoins);
      
      // Start connection with test coins
      await binanceComprehensiveManager.start(testCoins);
      
      // Check status every 2 seconds
      const interval = setInterval(() => {
        const currentStatus = binanceComprehensiveManager.getStatus();
        console.log('🧪 Current status:', currentStatus);
        setStatus(currentStatus);
      }, 2000);

      return () => {
        clearInterval(interval);
        binanceComprehensiveManager.stop();
      };
    };

    testConnection();
  }, []);

  if (!status) {
    return <div className="p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-gray-900 dark:text-gray-100">🧪 Testing Binance connection...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded space-y-2">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">🧪 Binance Connection Test</h3>
      <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
        <div>Active: {status.isActive ? '✅' : '❌'}</div>
        <div>Requested Coins: {status.requestedCoins}</div>
        <div>Mapped Coins: {status.mappedCoins}</div>
        <div>Available Symbols: {status.availableSymbols}</div>
        <div>Coverage: {status.coverage?.toFixed(1)}%</div>
        <div>Connected: {status.connection?.isConnected ? '✅' : '❌'}</div>
        <div>Error: {status.connection?.error || 'None'}</div>
        <div>Unmapped: {status.unmappedCoins?.join(', ') || 'None'}</div>
      </div>
    </div>
  );
}