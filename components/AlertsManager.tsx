'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { useFirebaseAlerts } from '@/lib/hooks/use-firebase-alerts';
import { 
  Bell, 
  Trash2, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Wifi,
  RefreshCw,
  User,
  Cloud
} from 'lucide-react';

export function AlertsManager() {
  const { data: session } = useSession();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const {
    alerts,
    isLoading,
    error,
    stats,
    deleteAlert: deleteAlertFromStore,
    toggleAlert: toggleAlertInStore,
    refreshAlerts,
    isAuthenticated
  } = useFirebaseAlerts();

  // Delete alert with UI feedback
  const deleteAlert = async (alertId: string) => {
    setIsDeleting(alertId);
    const success = await deleteAlertFromStore(alertId);
    setIsDeleting(null);
  };

  // Toggle alert with UI feedback
  const toggleAlert = async (alertId: string, isActive: boolean) => {
    await toggleAlertInStore(alertId);
  };

  // Show sign-in prompt for non-authenticated users
  if (!session) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Sign in to manage alerts</h3>
              <p className="text-muted-foreground max-w-md">
                Create personalized price alerts that sync across all your devices and get notified when your target prices are reached.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <Cloud className="w-4 h-4" />
              <span>Alerts are stored securely in the cloud</span>
            </div>
            <Button onClick={() => signIn('google')} size="lg" className="mt-4">
              <User className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.live}</p>
                <p className="text-sm text-muted-foreground">Live Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.triggered}</p>
                <p className="text-sm text-muted-foreground">Triggered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              My Price Alerts
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAlerts}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No alerts created yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first alert by clicking the bell icon on any cryptocurrency
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all",
                    alert.isActive 
                      ? "border-border bg-background" 
                      : "border-muted bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{alert.coinName}</h3>
                          <span className="text-sm text-muted-foreground uppercase">
                            ({alert.coinSymbol})
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {alert.isActive ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          
                          {alert.useLiveData ? (
                            <Badge variant="default" className="text-xs bg-blue-600">
                              <Activity className="w-3 h-3 mr-1" />
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Wifi className="w-3 h-3 mr-1" />
                              Static
                            </Badge>
                          )}
                          
                          {alert.isRecurring && (
                            <Badge variant="outline" className="text-xs">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Condition</p>
                          <div className="flex items-center space-x-1">
                            {alert.condition === 'above' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium">
                              {alert.condition === 'above' ? 'Above' : 'Below'} {formatCurrency(alert.targetPrice, alert.currency)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {alert.triggeredAt && (
                          <div>
                            <p className="text-muted-foreground">Last Triggered</p>
                            <div className="space-y-1">
                              <p className="font-medium">
                                {new Date(alert.triggeredAt).toLocaleDateString()}
                              </p>
                              {alert.lastTriggeredPrice && (
                                <p className="text-xs text-muted-foreground">
                                  at {formatCurrency(alert.lastTriggeredPrice, alert.currency)}
                                  {alert.lastDataSource && (
                                    <span className="ml-1">
                                      ({alert.lastDataSource === 'binance' ? 'Live' : 'Static'})
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAlert(alert.id, alert.isActive)}
                        className="text-xs"
                      >
                        {alert.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAlert(alert.id)}
                        disabled={isDeleting === alert.id}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        {isDeleting === alert.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}