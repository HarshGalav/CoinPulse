'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { firebaseAlertsStore, Alert } from '@/lib/stores/firebase-alerts-store';
import toast from 'react-hot-toast';

export function useFirebaseAlerts() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id;

  // Load alerts on mount and when user changes
  useEffect(() => {
    if (!userId) {
      // Load cached alerts for non-authenticated users
      const cachedAlerts = firebaseAlertsStore.getCachedAlerts();
      setAlerts(cachedAlerts);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Subscribe to real-time updates
    const unsubscribe = firebaseAlertsStore.subscribeToUserAlerts(userId, (updatedAlerts) => {
      setAlerts(updatedAlerts);
      setIsLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [userId]);

  // Create alert
  const createAlert = useCallback(async (alertData: Omit<Alert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) {
      toast.error('Please sign in to create alerts');
      return null;
    }

    try {
      const alertId = await firebaseAlertsStore.createAlert(userId, alertData);
      toast.success('Alert created successfully!');
      return alertId;
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
      return null;
    }
  }, [userId]);

  // Update alert
  const updateAlert = useCallback(async (alertId: string, updates: Partial<Alert>) => {
    if (!userId) {
      toast.error('Please sign in to update alerts');
      return false;
    }

    try {
      await firebaseAlertsStore.updateAlert(userId, alertId, updates);
      return true;
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
      return false;
    }
  }, [userId]);

  // Delete alert
  const deleteAlert = useCallback(async (alertId: string) => {
    if (!userId) {
      toast.error('Please sign in to delete alerts');
      return false;
    }

    try {
      await firebaseAlertsStore.deleteAlert(userId, alertId);
      toast.success('Alert deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
      return false;
    }
  }, [userId]);

  // Toggle alert
  const toggleAlert = useCallback(async (alertId: string) => {
    if (!userId) {
      toast.error('Please sign in to toggle alerts');
      return false;
    }

    try {
      await firebaseAlertsStore.toggleAlert(userId, alertId);
      const alert = alerts.find(a => a.id === alertId);
      toast.success(`Alert ${alert?.isActive ? 'disabled' : 'enabled'}`);
      return true;
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Failed to update alert');
      return false;
    }
  }, [userId, alerts]);

  // Get statistics
  const stats = firebaseAlertsStore.getStats(alerts);

  // Refresh alerts
  const refreshAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const freshAlerts = await firebaseAlertsStore.getUserAlerts(userId);
      setAlerts(freshAlerts);
    } catch (error) {
      console.error('Error refreshing alerts:', error);
      setError('Failed to refresh alerts');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    alerts,
    isLoading,
    error,
    stats,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    refreshAlerts,
    isAuthenticated: !!userId,
  };
}