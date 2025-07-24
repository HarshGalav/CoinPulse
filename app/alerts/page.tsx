'use client';

import { AlertsManager } from '@/components/AlertsManager';
import { Navbar } from '@/components/Navbar';

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPage="alerts" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Price Alerts</h1>
          <p className="text-muted-foreground">
            Manage your cryptocurrency price alerts and notifications
          </p>
        </div>
        
        <AlertsManager />
      </main>
    </div>
  );
}