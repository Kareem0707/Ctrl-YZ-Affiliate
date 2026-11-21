import { NextRequest, NextResponse } from 'next/server';
import { readDatabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = Number(searchParams.get('since') || 0);

    const db = await readDatabase();

    const newEvents = db.syncEvents.filter((ev) => ev.timestamp > since);
    const hasChanges = db.lastModified > since;

    return NextResponse.json({
      status: 'connected',
      lastModified: db.lastModified,
      hasChanges,
      events: newEvents,
      counts: {
        orders: db.orders.length,
        products: db.products.length,
        marketers: db.marketers.length,
        withdrawals: db.withdrawals.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Sync error' }, { status: 500 });
  }
}
