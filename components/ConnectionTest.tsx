'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { testBinanceConnection, testBinanceWebSocket } from '@/lib/test-binance-connection';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function ConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    rest?: { success: boolean; error?: any };
    websocket?: { success: boolean; error?: any };
  }>({});

  const runTests = async () => {
    setTesting(true);
    setResults({});

    try {
      // Test REST API
      console.log("Testing REST API...");
      const restResult = await testBinanceConnection();
      setResults(prev => ({ ...prev, rest: restResult }));

      // Test WebSocket
      console.log("Testing WebSocket...");
      const wsResult = await testBinanceWebSocket();
      setResults(prev => ({ ...prev, websocket: wsResult }));

    } catch (error) {
      console.error("Test failed:", error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (success?: boolean) => {
    if (success === undefined) return null;
    return (
      <Badge variant={success ? "default" : "destructive"} className="ml-2">
        {success ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Working
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </>
        )}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Binance Connection'
          )}
        </Button>

        {(results.rest || results.websocket) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">REST API:</span>
              {getStatusBadge(results.rest?.success)}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">WebSocket:</span>
              {getStatusBadge(results.websocket?.success)}
            </div>

            {(results.rest?.error || results.websocket?.error) && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-600">
                <div className="font-medium mb-1">Errors:</div>
                {results.rest?.error && (
                  <div>REST: {String(results.rest.error)}</div>
                )}
                {results.websocket?.error && (
                  <div>WebSocket: {String(results.websocket.error)}</div>
                )}
              </div>
            )}

            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-600">
              <div className="font-medium mb-1">Recommendation:</div>
              {results.websocket?.success ? (
                "WebSocket is working! You'll get real-time updates."
              ) : results.rest?.success ? (
                "REST API is working! The app will use polling for updates."
              ) : (
                "Both connections failed. Check your network or try again later."
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}