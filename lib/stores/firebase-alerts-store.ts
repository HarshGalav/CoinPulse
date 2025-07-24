'use client';

// Simplified alerts store that works with localStorage and simulated user sessions
// This provides the same interface as Firebase but works without complex setup

export interface Alert {
  id: string;
  userId: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currency: string;
  isActive: boolean;
  isRecurring: boolean;
  useLiveData?: boolean;
  currentPrice?: number;
  createdAt: string;
  updatedAt?: string;
  triggeredAt?: string | null;
  lastTriggeredPrice?: number | null;
  lastDataSource?: string | null;
  triggerCount?: number;
}

class FirebaseAlertsStore {
  private static instance: FirebaseAlertsStore;
  private localCache: Alert[] = [];
  private storageKey = 'user-alerts';

  private constructor() {
    this.loadFromCache();
  }

  static getInstance(): FirebaseAlertsStore {
    if (!FirebaseAlertsStore.instance) {
      FirebaseAlertsStore.instance = new FirebaseAlertsStore();
    }
    return FirebaseAlertsStore.instance;
  }

  // Cache management
  private saveToCache(alerts: Alert[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(alerts));
      this.localCache = alerts;
    } catch (error) {
      console.error('Error saving alerts to cache:', error);
    }
  }

  private loadFromCache(): Alert[] {
    try {
      const cached = localStorage.getItem(this.storageKey);
      if (cached) {
        this.localCache = JSON.parse(cached);
        return this.localCache;
      }
    } catch (error) {
      console.error('Error loading alerts from cache:', error);
    }
    return [];
  }

  // Get user alerts (filtered by userId)
  async getUserAlerts(userId: string): Promise<Alert[]> {
    const allAlerts = this.loadFromCache();
    const userAlerts = userId ? allAlerts.filter(alert => alert.userId === userId) : [];
    return userAlerts;
  }

  // Real-time listener simulation (calls callback immediately and returns unsubscribe function)
  subscribeToUserAlerts(userId: string, callback: (alerts: Alert[]) => void): () => void {
    const getUserAlertsAndCallback = async () => {
      const alerts = await this.getUserAlerts(userId);
      callback(alerts);
    };

    // Call immediately
    getUserAlertsAndCallback();

    // Return unsubscribe function (no-op for localStorage)
    return () => {};
  }

  // Create new alert
  async createAlert(userId: string, alertData: Omit<Alert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!userId) {
      throw new Error('User authentication required');
    }

    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAlert: Alert = {
      ...alertData,
      id: alertId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      triggerCount: 0,
    };

    const allAlerts = this.loadFromCache();
    allAlerts.unshift(newAlert);
    this.saveToCache(allAlerts);
    
    return alertId;
  }

  // Update alert
  async updateAlert(userId: string, alertId: string, updates: Partial<Alert>): Promise<void> {
    if (!userId) {
      throw new Error('User authentication required');
    }

    const allAlerts = this.loadFromCache();
    const alertIndex = allAlerts.findIndex(alert => alert.id === alertId && alert.userId === userId);
    
    if (alertIndex === -1) {
      throw new Error('Alert not found');
    }

    allAlerts[alertIndex] = {
      ...allAlerts[alertIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveToCache(allAlerts);
  }

  // Delete alert
  async deleteAlert(userId: string, alertId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication required');
    }

    const allAlerts = this.loadFromCache();
    const filteredAlerts = allAlerts.filter(alert => !(alert.id === alertId && alert.userId === userId));
    
    if (filteredAlerts.length === allAlerts.length) {
      throw new Error('Alert not found');
    }

    this.saveToCache(filteredAlerts);
  }

  // Toggle alert status
  async toggleAlert(userId: string, alertId: string): Promise<void> {
    const allAlerts = this.loadFromCache();
    const alert = allAlerts.find(a => a.id === alertId && a.userId === userId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    await this.updateAlert(userId, alertId, { 
      isActive: !alert.isActive 
    });
  }

  // Mark alert as triggered
  async markAlertTriggered(alertId: string, currentPrice: number, dataSource: string): Promise<void> {
    const allAlerts = this.loadFromCache();
    const alertIndex = allAlerts.findIndex(a => a.id === alertId);
    
    if (alertIndex === -1) {
      throw new Error('Alert not found');
    }

    const alert = allAlerts[alertIndex];
    const updates: Partial<Alert> = {
      triggeredAt: new Date().toISOString(),
      lastTriggeredPrice: currentPrice,
      lastDataSource: dataSource,
      updatedAt: new Date().toISOString(),
      triggerCount: (alert.triggerCount || 0) + 1,
    };

    // Disable non-recurring alerts
    if (!alert.isRecurring) {
      updates.isActive = false;
    }

    allAlerts[alertIndex] = { ...alert, ...updates };
    this.saveToCache(allAlerts);
  }

  // Get statistics
  getStats(alerts: Alert[]) {
    const activeAlerts = alerts.filter(alert => alert.isActive);
    const liveAlerts = alerts.filter(alert => alert.useLiveData);
    const triggeredAlerts = alerts.filter(alert => alert.triggeredAt);

    return {
      total: alerts.length,
      active: activeAlerts.length,
      live: liveAlerts.length,
      triggered: triggeredAlerts.length
    };
  }

  // Get cached alerts (for immediate UI load)
  getCachedAlerts(): Alert[] {
    return this.localCache;
  }

  // Clear cache
  clearCache(): void {
    localStorage.removeItem(this.storageKey);
    this.localCache = [];
  }
}

export const firebaseAlertsStore = FirebaseAlertsStore.getInstance();