import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    const { isActive } = await request.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // For now, we'll simulate toggling an alert
    // In a real implementation, this would update the database
    return NextResponse.json({
      success: true,
      message: `Alert ${isActive ? 'enabled' : 'disabled'} successfully (demo mode)`,
      isActive
    });

  } catch (error) {
    console.error('Error toggling alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}