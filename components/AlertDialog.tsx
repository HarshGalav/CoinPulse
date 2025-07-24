'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CoinData } from '@/lib/coingecko';
import { X, Bell, Activity, TrendingUp, TrendingDown, User } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useSimpleCryptoStore } from '@/lib/stores/simple-crypto-store';
import { useFirebaseAlerts } from '@/lib/hooks/use-firebase-alerts';
import { useSession, signIn } from 'next-auth/react';
import toast from 'react-hot-toast';

interface AlertDialogProps {
  coin: CoinData;
  currency: string;
  onClose: () => void;
  onAlertCreated: () => void;
  isLiveDataEnabled?: boolean;
}

export function AlertDialog({ coin, currency, onClose, onAlertCreated, isLiveDataEnabled = false }: AlertDialogProps) {
  const { data: session } = useSession();
  const { createAlert } = useFirebaseAlerts();
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useLiveData, setUseLiveData] = useState(isLiveDataEnabled);

  // Subscribe to real-time price updates
  const realtimePrice = useSimpleCryptoStore((state) => state.prices[coin.id]);
  const connection = useSimpleCryptoStore((state) => state.connection);

  // Use live price if available, otherwise fall back to static price
  const currentPrice = (useLiveData && realtimePrice) ? realtimePrice.current_price : coin.current_price;
  const priceChange24h = (useLiveData && realtimePrice) ? realtimePrice.price_change_percentage_24h : coin.price_change_percentage_24h;
  const hasLiveData = !!realtimePrice && connection.isConnected;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('Please sign in to create alerts');
      return;
    }
    
    if (!targetPrice || isNaN(parseFloat(targetPrice))) {
      toast.error('Please enter a valid target price');
      return;
    }

    setIsLoading(true);
    try {
      const alertId = await createAlert({
        coinId: coin.id,
        coinName: coin.name,
        coinSymbol: coin.symbol,
        targetPrice: parseFloat(targetPrice),
        condition,
        isRecurring,
        currency,
        useLiveData: useLiveData && hasLiveData,
        currentPrice: currentPrice,
        isActive: true
      });

      if (alertId) {
        onAlertCreated();
        onClose();
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Set Price Alert
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium">Cryptocurrency</label>
              <div className="flex items-center space-x-2 mt-1 p-2 bg-muted rounded-md">
                <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                <span className="font-medium">{coin.name}</span>
                <span className="text-muted-foreground uppercase">({coin.symbol})</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Price</label>
                {isLiveDataEnabled && (
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant={useLiveData ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseLiveData(!useLiveData)}
                      disabled={!hasLiveData}
                      className="text-xs"
                    >
                      {useLiveData ? (
                        <>
                          <Activity className="w-3 h-3 mr-1" />
                          Live
                        </>
                      ) : (
                        "Static"
                      )}
                    </Button>
                    {useLiveData && (
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        connection.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                      )} />
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3 mt-2">
                <p className="text-2xl font-bold">
                  {formatCurrency(currentPrice, currency)}
                </p>
                
                {priceChange24h !== undefined && (
                  <div className={cn(
                    "flex items-center text-sm font-medium px-2 py-1 rounded-full",
                    priceChange24h >= 0 
                      ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30" 
                      : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
                  )}>
                    {priceChange24h >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(priceChange24h).toFixed(2)}%
                  </div>
                )}
              </div>
              
              {useLiveData && hasLiveData && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 text-xs mb-2">
                    <Activity className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                      Live Alert Mode Enabled
                    </span>
                  </div>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-4">
                    <li>• Real-time price monitoring from Binance</li>
                    <li>• Instant browser notifications</li>
                    <li>• Faster alert triggering (5-second checks)</li>
                    <li>• Email notifications with live data badge</li>
                  </ul>
                </div>
              )}
              
              {!hasLiveData && isLiveDataEnabled && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-2 text-xs">
                    <Bell className="w-3 h-3 text-yellow-600" />
                    <span className="text-yellow-700 dark:text-yellow-300">
                      Live data not available for this coin - Using static price
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="targetPrice" className="text-sm font-medium">
                Target Price ({currency.toUpperCase()})
              </label>
              <Input
                id="targetPrice"
                type="number"
                step="any"
                placeholder="Enter target price"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div className="relative mb-4">
              <label className="text-sm font-medium">Alert Condition</label>
              <Select value={condition} onValueChange={(value: 'above' | 'below') => setCondition(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[60]" side="bottom" align="start">
                  <SelectItem value="above">Price goes above target</SelectItem>
                  <SelectItem value="below">Price goes below target</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="recurring" className="text-sm">
                Recurring alert (continues after triggered)
              </label>
            </div>

            {!session && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300 mb-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Sign in required</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                  Sign in to create alerts that sync across all your devices and get real-time notifications.
                </p>
                <Button 
                  type="button" 
                  onClick={() => signIn('google')} 
                  size="sm" 
                  className="w-full"
                >
                  <User className="w-3 h-3 mr-2" />
                  Sign in with Google
                </Button>
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !session} 
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}