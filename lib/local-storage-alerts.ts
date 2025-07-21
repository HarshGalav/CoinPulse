'use client';

export interface LocalAlert {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currency: string;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: string;
  userEmail: string;
}

const ALERTS_KEY = 'crypto-alerts';

export class LocalAlertsManager {
  // Get all alerts for a user
  static getAlerts(userEmail: string): LocalAlert[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      const allAlerts: LocalAlert[] = stored ? JSON.parse(stored) : [];
      return allAlerts.filter(alert => alert.userEmail === userEmail);
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  // Add a new alert
  static addAlert(alert: Omit<LocalAlert, 'id' | 'createdAt'>): LocalAlert {
    if (typeof window === 'undefined') throw new Error('Not in browser environment');

    const newAlert: LocalAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      const allAlerts: LocalAlert[] = stored ? JSON.parse(stored) : [];
      allAlerts.push(newAlert);
      localStorage.setItem(ALERTS_KEY, JSON.stringify(allAlerts));
      return newAlert;
    } catch (error) {
      console.error('Error adding alert:', error);
      throw error;
    }
  }

  // Delete an alert
  static deleteAlert(alertId: string, userEmail: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      const allAlerts: LocalAlert[] = stored ? JSON.parse(stored) : [];
      const filteredAlerts = allAlerts.filter(
        alert => !(alert.id === alertId && alert.userEmail === userEmail)
      );
      
      localStorage.setItem(ALERTS_KEY, JSON.stringify(filteredAlerts));
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
    }
  }

  // Update an alert
  static updateAlert(alertId: string, userEmail: string, updates: Partial<LocalAlert>): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      const allAlerts: LocalAlert[] = stored ? JSON.parse(stored) : [];
      const alertIndex = allAlerts.findIndex(
        alert => alert.id === alertId && alert.userEmail === userEmail
      );

      if (alertIndex === -1) return false;

      allAlerts[alertIndex] = { ...allAlerts[alertIndex], ...updates };
      localStorage.setItem(ALERTS_KEY, JSON.stringify(allAlerts));
      return true;
    } catch (error) {
      console.error('Error updating alert:', error);
      return false;
    }
  }

  // Get active alerts for checking
  static getActiveAlerts(): LocalAlert[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      const allAlerts: LocalAlert[] = stored ? JSON.parse(stored) : [];
      return allAlerts.filter(alert => alert.isActive);
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }
}