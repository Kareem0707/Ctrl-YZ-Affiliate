import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';
import { WithdrawalRequest } from '@/lib/types';

function generateWithdrawalId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `WD-${digits}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketerId = searchParams.get('marketerId');
    const db = await readDatabase();

    if (marketerId) {
      const filtered = db.withdrawals.filter((w) => w.marketerId === marketerId);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(db.withdrawals);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const db = await readDatabase();
    const marketer = db.marketers.find((m) => m.id === data.marketerId);

    if (!marketer) {
      return NextResponse.json({ error: 'Marketer not found' }, { status: 404 });
    }

    if (marketer.walletBalance < data.amount) {
      return NextResponse.json({ error: 'رصيد المحفظة المتاح أقل من المبلغ المطلوب' }, { status: 400 });
    }

    // Deduct immediately from wallet balance
    marketer.walletBalance -= data.amount;

    const now = new Date().toISOString();
    const newWithdrawal: WithdrawalRequest = {
      id: `wd-${Date.now().toString(36)}`,
      requestId: generateWithdrawalId(),
      marketerId: data.marketerId,
      marketerName: data.marketerName || marketer.name,
      marketerPhone: data.marketerPhone || marketer.phone,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      accountDetails: data.accountDetails,
      status: 'pending',
      createdAt: now,
    };

    db.withdrawals.unshift(newWithdrawal);
    logSyncEvent(db, 'withdrawal_created', newWithdrawal.id);
    await writeDatabase(db);

    return NextResponse.json(newWithdrawal, { status: 201 });
  } catch (error: any) {
    console.error('API POST /api/withdrawals error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create withdrawal' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status, receiptOrReason } = await request.json();
    const db = await readDatabase();
    const index = db.withdrawals.findIndex((w) => w.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    const req = db.withdrawals[index];
    const marketer = db.marketers.find((m) => m.id === req.marketerId);
    const now = new Date().toISOString();

    req.status = status;
    req.processedAt = now;

    if (status === 'approved') {
      req.transactionReceipt = receiptOrReason || 'TX-SUCCESS-VERIFIED';
      if (marketer) {
        marketer.totalWithdrawn += req.amount;
      }
    } else if (status === 'rejected') {
      req.rejectReason = receiptOrReason || 'تم رفض العملية';
      // Refund back to wallet balance
      if (marketer) {
        marketer.walletBalance += req.amount;
      }
    }

    db.withdrawals[index] = req;
    logSyncEvent(db, 'withdrawal_updated', req.id);
    await writeDatabase(db);

    return NextResponse.json(req);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update withdrawal' }, { status: 500 });
  }
}
