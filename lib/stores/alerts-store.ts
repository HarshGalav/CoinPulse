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
  currentPrice?: number;
  createdAt: string;
  triggeredAt?: string | null;
  lastTriggeredPrice?: number | null;
  lastDataSource?: string | null;
}

class AlertsStore {
  private static instance: AlertsStore;
  private storageKey = 'crypto-alerts';

  private constructor() {}

  static getInstance(): AlertsStore {
    if (!AlertsStore.instance) {
      AlertsStore.instance = new AlertsStore();
    }
    return AlertsStore.instance;
  }

  // Get all alerts from localStorage
  getAlerts(): Alert[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading alerts from localStorage:', error);
      return [];
    }
  }

  // Save alerts to localStorage
  private saveAlerts(alerts: Alert[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(alerts));
    } catch (error) {
      console.error('Error saving alerts to localStorage:', error);
    }
  }

  // Add a new alert
  addAlert(alertData: Omit<Alert, 'id' | 'createdAt'>): Alert {
    const newAlert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      triggeredAt: null,
      lastTriggeredPrice: null,
      lastDataSource: null
    };

    const alerts = this.getAlerts();
    alerts.unshift(newAlert); // Add to beginning
    this.saveAlerts(alerts);
    
    return newAlert;
  }

  // Update an alert
  updateAlert(alertId: string, updates: Partial<Alert>): boolean {
    const alerts = this.getAlerts();
    const index = alerts.findIndex(alert => alert.id === alertId);
    
    if (index === -1) return false;
    
    alerts[index] = { ...alerts[index], ...updates };
    this.saveAlerts(alerts);
    
    return true;
  }

  // Delete an alert
  deleteAlert(alertId: string): boolean {
    const alerts = this.getAlerts();
    const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
    
    if (filteredAlerts.length === alerts.length) return false;
    
    this.saveAlerts(filteredAlerts);
    return true;
  }

  // Toggle alert active status
  toggleAlert(alertId: string): boolean {
    const alerts = this.getAlerts();
    const alert = alerts.find(a => a.id === alertId);
    
    if (!alert) return false;
    
    return this.updateAlert(alertId, { isActive: !alert.isActive });
  }

  // Get alert by ID
  getAlert(alertId: string): Alert | null {
    const alerts = this.getAlerts();
    return alerts.find(alert => alert.id === alertId) || null;
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return this.getAlerts().filter(alert => alert.isActive);
  }

  // Get alerts by coin
  getAlertsByCoin(coinId: string): Alert[] {
    return this.getAlerts().filter(alert => alert.coinId === coinId);
  }

  // Clear all alerts (for testing/reset)
  clearAllAlerts(): void {
    this.saveAlerts([]);
  }

  // Get statistics
  getStats() {
    const alerts = this.getAlerts();
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
}

export const alertsStore = AlertsStore.getInstance();
export type { Alert };