'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function SimpleStoreDebugger() {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur"
        >
          🐛 Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Simple Debug</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <div className="font-medium mb-1">Status</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Debug Mode:</span>
                <Badge variant="default" className="text-xs">
                  Active
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <Badge variant="outline" className="text-xs">
                  {process.env.NODE_ENV}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Check browser console for detailed logs
          </div>
        </CardContent>
      </Card>
    </div>
  );
}