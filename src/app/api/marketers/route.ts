import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';
import { Marketer } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const id = searchParams.get('id');

    const db = await readDatabase();

    if (code) {
      const cleaned = code.trim().toLowerCase();
      const match = db.marketers.find((m) => m.affiliateCode.toLowerCase() === cleaned);
      return NextResponse.json(match || null);
    }

    if (id) {
      const match = db.marketers.find((m) => m.id === id || m.uid === id);
      return NextResponse.json(match || null);
    }

    return NextResponse.json(db.marketers);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const db = await readDatabase();
    const now = new Date().toISOString();

    if (data.id) {
      const idx = db.marketers.findIndex((m) => m.id === data.id);
      if (idx > -1) {
        const updated: Marketer = { ...db.marketers[idx], ...data };
        db.marketers[idx] = updated;
        logSyncEvent(db, 'marketer_saved', updated.id);
        await writeDatabase(db);
        return NextResponse.json(updated);
      }
    }

    const newMarketer: Marketer = {
      id: `marketer-${Date.now().toString(36)}`,
      uid: data.uid || `user-${Date.now()}`,
      name: data.name || 'مسوق جديد',
      email: data.email || 'marketer@example.com',
      phone: data.phone || '',
      whatsapp: data.whatsapp || data.phone || '',
      affiliateCode: (data.affiliateCode || `AFF-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
      walletBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      ordersCount: 0,
      deliveredCount: 0,
      deliveryRate: 100,
      status: 'active',
      payoutInfo: data.payoutInfo || {
        method: 'vodafone_cash',
        accountNumber: data.phone || '',
        accountHolderName: data.name || '',
      },
      createdAt: now,
    };

    db.marketers.unshift(newMarketer);
    logSyncEvent(db, 'marketer_saved', newMarketer.id);
    await writeDatabase(db);

    return NextResponse.json(newMarketer, { status: 201 });
  } catch (error: any) {
    console.error('API POST /api/marketers error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save marketer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, action, ...updates } = await request.json();
    const db = await readDatabase();
    const marketer = db.marketers.find((m) => m.id === id);

    if (!marketer) {
      return NextResponse.json({ error: 'Marketer not found' }, { status: 404 });
    }

    if (action === 'toggle_status') {
      marketer.status = marketer.status === 'active' ? 'suspended' : 'active';
    } else {
      Object.assign(marketer, updates);
    }

    logSyncEvent(db, 'marketer_saved', marketer.id);
    await writeDatabase(db);
    return NextResponse.json(marketer);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update marketer' }, { status: 500 });
  }
}
