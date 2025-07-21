'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CoinData } from '@/lib/coingecko';
import { X, Bell } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AlertDialogProps {
  coin: CoinData;
  currency: string;
  onClose: () => void;
  onAlertCreated: () => void;
}

export function AlertDialog({ coin, currency, onClose, onAlertCreated }: AlertDialogProps) {
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetPrice || isNaN(parseFloat(targetPrice))) {
      toast.error('Please enter a valid target price');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coinId: coin.id,
          coinName: coin.name,
          coinSymbol: coin.symbol,
          targetPrice: parseFloat(targetPrice),
          condition,
          isRecurring,
          currency,
        }),
      });

      if (response.ok) {
        toast.success('Price alert created successfully!');
        onAlertCreated();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create alert');
      }
    } catch (error) {
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
              <label className="text-sm font-medium">Current Price</label>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(coin.current_price, currency)}
              </p>
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

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}