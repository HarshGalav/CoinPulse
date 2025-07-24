import { NextRequest, NextResponse } from 'next/server';

// Since we're using client-side localStorage, the server just returns empty
// The actual data will be managed on the client side
export async function GET(request: NextRequest) {
  try {
    // Return empty array - client will load from localStorage
    return NextResponse.json({
      success: true,
      alerts: [],
      count: 0,
      message: 'Using client-side storage'
    });

  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      coinId,
      coinName,
      coinSymbol,
      targetPrice,
      condition,
      isRecurring,
      currency,
      useLiveData,
      currentPrice
    } = await request.json();

    if (!coinId || !coinName || !coinSymbol || !targetPrice || !condition || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, we'll simulate creating an alert
    // In a real implementation, this would save to a database
    const alertId = `alert-${Date.now()}`;

    return NextResponse.json({
      success: true,
      alertId,
      message: 'Alert created successfully (demo mode)'
    });

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
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll simulate deleting an alert
    // In a real implementation, this would delete from a database
    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully (demo mode)'
    });

  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}