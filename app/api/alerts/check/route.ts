import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { coingeckoApi } from '@/lib/coingecko';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    // Get all active alerts
    const alertsRef = adminDb.collection('alerts');
    const snapshot = await alertsRef.where('isActive', '==', true).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ message: 'No active alerts found' });
    }

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
      userEmail: string;
    }

    const alerts: Alert[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Alert));

    // Group alerts by coin to minimize API calls
    const coinIds = [...new Set(alerts.map(alert => alert.coinId))];
    const currencies = [...new Set(alerts.map(alert => alert.currency))];
    
    const triggeredAlerts = [];

    for (const currency of currencies) {
      const prices = await coingeckoApi.getSimplePrices(coinIds, currency);
      
      for (const alert of alerts.filter(a => a.currency === currency)) {
        const currentPrice = prices[alert.coinId]?.[currency];
        
        if (!currentPrice) continue;

        const shouldTrigger = 
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);

        if (shouldTrigger) {
          triggeredAlerts.push({
            ...alert,
            currentPrice,
            triggeredAt: new Date().toISOString()
          });

          // Send email notification
          try {
            await resend.emails.send({
              from: 'Crypto Tracker <alerts@yourdomain.com>',
              to: [alert.userEmail],
              subject: `🚨 Price Alert: ${alert.coinName} (${alert.coinSymbol.toUpperCase()})`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1f2937;">Price Alert Triggered!</h2>
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0;">${alert.coinName} (${alert.coinSymbol.toUpperCase()})</h3>
                    <p style="margin: 5px 0;"><strong>Target Price:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: alert.currency }).format(alert.targetPrice)}</p>
                    <p style="margin: 5px 0;"><strong>Current Price:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: alert.currency }).format(currentPrice)}</p>
                    <p style="margin: 5px 0;"><strong>Condition:</strong> Price went ${alert.condition} target</p>
                  </div>
                  <p>This alert was triggered on ${new Date().toLocaleString()}.</p>
                  <p><a href="${process.env.NEXTAUTH_URL}" style="color: #3b82f6;">View your dashboard</a></p>
                </div>
              `
            });
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }

          // Update alert in database
          const alertRef = adminDb.collection('alerts').doc(alert.id);
          
          if (alert.isRecurring) {
            // For recurring alerts, just update the triggered timestamp
            await alertRef.update({
              triggeredAt: new Date().toISOString(),
              lastTriggeredPrice: currentPrice
            });
          } else {
            // For one-time alerts, deactivate them
            await alertRef.update({
              isActive: false,
              triggeredAt: new Date().toISOString(),
              lastTriggeredPrice: currentPrice
            });
          }

          // Store notification history
          await adminDb.collection('notifications').add({
            userEmail: alert.userEmail,
            alertId: alert.id,
            coinId: alert.coinId,
            coinName: alert.coinName,
            coinSymbol: alert.coinSymbol,
            targetPrice: alert.targetPrice,
            currentPrice,
            condition: alert.condition,
            currency: alert.currency,
            triggeredAt: new Date().toISOString(),
            type: 'price_alert'
          });
        }
      }
    }

    return NextResponse.json({
      message: `Checked ${alerts.length} alerts, triggered ${triggeredAlerts.length}`,
      triggeredAlerts: triggeredAlerts.length
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    );
  }
}