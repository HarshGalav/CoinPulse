import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Simple in-memory storage for alerts (for demo purposes)
// In production, you'd use a proper database
const alertsStorage = new Map<string, any[]>();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAlerts = alertsStorage.get(session.user.email) || [];
    return NextResponse.json(userAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { coinId, coinName, coinSymbol, targetPrice, condition, isRecurring, currency } = body;

    if (!coinId || !targetPrice || !condition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const alertData = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userEmail: session.user.email,
      coinId,
      coinName,
      coinSymbol,
      targetPrice: parseFloat(targetPrice),
      condition, // 'above' or 'below'
      isRecurring: isRecurring || false,
      currency: currency || 'usd',
      isActive: true,
      createdAt: new Date().toISOString(),
      triggeredAt: null,
    };

    // Store in memory (for demo)
    const userAlerts = alertsStorage.get(session.user.email) || [];
    userAlerts.push(alertData);
    alertsStorage.set(session.user.email, userAlerts);
    
    return NextResponse.json(alertData);
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    const userAlerts = alertsStorage.get(session.user.email) || [];
    const alertIndex = userAlerts.findIndex(alert => alert.id === alertId);

    if (alertIndex === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    userAlerts.splice(alertIndex, 1);
    alertsStorage.set(session.user.email, userAlerts);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}