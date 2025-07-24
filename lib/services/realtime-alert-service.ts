'use client';

import { useSimpleCryptoStore } from '../stores/simple-crypto-store';
import toast from 'react-hot-toast';

interface Alert {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currency: string;
  isActive: boolean;
  isRecurring: boolean;
  useLiveData?: boolean;
}

class RealtimeAlertService {
  private static instance: RealtimeAlertService;
  private alerts: Alert[] = [];
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastPrices: Record<string, number> = {};

  private constructor() {}

  static getInstance(): RealtimeAlertService {
    if (!RealtimeAlertService.instance) {
      RealtimeAlertService.instance = new RealtimeAlertService();
    }
    return RealtimeAlertService.instance;
  }

  // Add alerts to monitor
  addAlerts(alerts: Alert[]) {
    this.alerts = alerts.filter(alert => alert.isActive && alert.useLiveData);
    console.log(`📊 Monitoring ${this.alerts.length} live alerts`);
    
    if (this.alerts.length > 0 && !this.isMonitoring) {
      this.startMonitoring();
    } else if (this.alerts.length === 0 && this.isMonitoring) {
      this.stopMonitoring();
    }
  }

  // Start real-time monitoring
  private startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚀 Starting real-time alert monitoring');
    
    // Check alerts every 5 seconds for live data
    this.checkInterval = setInterval(() => {
      this.checkLiveAlerts();
    }, 5000);
  }

  // Stop monitoring
  private stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('🛑 Stopping real-time alert monitoring');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check alerts against live prices
  private checkLiveAlerts() {
    const store = useSimpleCryptoStore.getState();
    const { prices, connection } = store;
    
    if (!connection.isConnected) {
      console.log('⚠️ No live connection, skipping alert check');
      return;
    }

    for (const alert of this.alerts) {
      const livePrice = prices[alert.coinId];
      
      if (!livePrice) continue;
      
      const currentPrice = livePrice.current_price;
      const lastPrice = this.lastPrices[alert.coinId];
      
      // Only check if price has changed to avoid duplicate alerts
      if (lastPrice === currentPrice) continue;
      
      this.lastPrices[alert.coinId] = currentPrice;
      
      const shouldTrigger = 
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice);

      if (shouldTrigger) {
        this.triggerAlert(alert, currentPrice);
      }
    }
  }

  // Trigger an alert
  private async triggerAlert(alert: Alert, currentPrice: number) {
    console.log(`🚨 Alert triggered for ${alert.coinName}: ${currentPrice}`);
    
    // Show browser notification
    this.showBrowserNotification(alert, currentPrice);
    
    // Show toast notification
    toast.success(
      `🚨 ${alert.coinName} ${alert.condition} ${alert.targetPrice}! Current: ${currentPrice}`,
      { duration: 8000 }
    );
    
    // Call server-side alert processing
    try {
      await fetch('/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          currentPrice,
          dataSource: 'binance',
          triggeredAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to process server-side alert:', error);
    }
    
    // Remove from monitoring if not recurring
    if (!alert.isRecurring) {
      this.alerts = this.alerts.filter(a => a.id !== alert.id);
      console.log(`Removed non-recurring alert ${alert.id}`);
    }
  }

  // Show browser notification
  private showBrowserNotification(alert: Alert, currentPrice: number) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🚨 Price Alert: ${alert.coinName}`, {
        body: `Price went ${alert.condition} ${alert.targetPrice}! Current: ${currentPrice}`,
        icon: '/favicon.ico',
        tag: `alert-${alert.id}`,
        requireInteraction: true
      });
    }
  }

  // Request notification permission
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Get monitoring status
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      alertCount: this.alerts.length,
      monitoredCoins: [...new Set(this.alerts.map(a => a.coinId))]
    };
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
    this.alerts = [];
    this.lastPrices = {};
  }
}

export const realtimeAlertService = RealtimeAlertService.getInstance();