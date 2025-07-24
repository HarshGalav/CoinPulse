import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { alertId, currentPrice, dataSource, triggeredAt } = await request.json();

    if (!alertId || !currentPrice || !triggeredAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the alert from database
    const alertRef = adminDb.collection('alerts').doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    const alert = { id: alertDoc.id, ...alertDoc.data() };

    // Update alert in database
    if (alert.isRecurring) {
      // For recurring alerts, just update the triggered timestamp
      await alertRef.update({
        triggeredAt,
        lastTriggeredPrice: currentPrice,
        lastDataSource: dataSource || 'binance'
      });
    } else {
      // For one-time alerts, deactivate them
      await alertRef.update({
        isActive: false,
        triggeredAt,
        lastTriggeredPrice: currentPrice,
        lastDataSource: dataSource || 'binance'
      });
    }

    // Send email notification if user email exists
    if (alert.userEmail) {
      try {
        const dataSourceBadge = dataSource === 'binance' 
          ? '<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">🔴 LIVE</span>'
          : '<span style="background: #6b7280; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">STATIC</span>';
          
        await resend.emails.send({
          from: 'Crypto Tracker <alerts@yourdomain.com>',
          to: [alert.userEmail],
          subject: `🚨 Live Alert: ${alert.coinName} (${alert.coinSymbol.toUpperCase()})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">🚨 Live Price Alert Triggered!</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <h3 style="margin: 0;">${alert.coinName} (${alert.coinSymbol.toUpperCase()})</h3>
                  ${dataSourceBadge}
                </div>
                <p style="margin: 5px 0;"><strong>Target Price:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: alert.currency }).format(alert.targetPrice)}</p>
                <p style="margin: 5px 0;"><strong>Current Price:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: alert.currency }).format(currentPrice)}</p>
                <p style="margin: 5px 0;"><strong>Condition:</strong> Price went ${alert.condition} target</p>
                <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
                  <strong>Data Source:</strong> ${dataSource === 'binance' ? 'Binance (Real-time)' : 'CoinGecko (Static)'}
                </p>
                <div style="background: #dbeafe; padding: 10px; border-radius: 6px; margin-top: 10px;">
                  <p style="margin: 0; font-size: 12px; color: #1e40af;">
                    ⚡ This alert was triggered by real-time price monitoring
                  </p>
                </div>
              </div>
              <p>This alert was triggered on ${new Date(triggeredAt).toLocaleString()}.</p>
              <p><a href="${process.env.NEXTAUTH_URL}" style="color: #3b82f6;">View your dashboard</a></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
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
      dataSource: dataSource || 'binance',
      triggeredAt,
      type: 'live_price_alert',
      isRealtime: true
    });

    return NextResponse.json({
      success: true,
      message: 'Alert triggered successfully',
      alertId,
      currentPrice,
      dataSource
    });

  } catch (error) {
    console.error('Error triggering alert:', error);
    return NextResponse.json(
      { error: 'Failed to trigger alert' },
      { status: 500 }
    );
  }
}