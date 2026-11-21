import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';
import { OrderStatus } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await readDatabase();
    const order = db.orders.find((o) => o.id === params.id || o.orderNumber === params.id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = await readDatabase();
    const index = db.orders.findIndex((o) => o.id === params.id || o.orderNumber === params.id);

    if (index === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = db.orders[index];
    const previousStatus = order.status;
    const now = new Date().toISOString();

    if (body.status) {
      const newStatus = body.status as OrderStatus;
      order.status = newStatus;

      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: newStatus,
        timestamp: now,
        note: body.note || `تم تغيير الحالة إلى ${newStatus}`,
      });

      // When transitioned to delivered, pay out affiliate commission to wallet
      if (newStatus === 'delivered' && !order.isCommissionPaid && order.affiliateId) {
        order.isCommissionPaid = true;
        const marketer = db.marketers.find(
          (m) => m.id === order.affiliateId || m.uid === order.affiliateId
        );
        if (marketer) {
          marketer.pendingBalance = Math.max(0, marketer.pendingBalance - order.affiliateCommission);
          marketer.walletBalance += order.affiliateCommission;
          marketer.totalEarned += order.affiliateCommission;
          marketer.deliveredCount += 1;
          marketer.deliveryRate = Math.round((marketer.deliveredCount / Math.max(1, marketer.ordersCount)) * 100);
        }
      }

      // If returned or cancelled, reverse pending commission
      if (
        (newStatus === 'returned' || newStatus === 'cancelled') &&
        previousStatus !== 'returned' &&
        previousStatus !== 'cancelled'
      ) {
        if (order.affiliateId && !order.isCommissionPaid) {
          const marketer = db.marketers.find(
            (m) => m.id === order.affiliateId || m.uid === order.affiliateId
          );
          if (marketer) {
            marketer.pendingBalance = Math.max(0, marketer.pendingBalance - order.affiliateCommission);
            marketer.deliveryRate = Math.round((marketer.deliveredCount / Math.max(1, marketer.ordersCount)) * 100);
          }
        }
      }
    }

    if (body.shippingCompany !== undefined) order.shippingCompany = body.shippingCompany;
    if (body.trackingNumber !== undefined) order.trackingNumber = body.trackingNumber;
    if (body.statusNotes !== undefined) order.statusNotes = body.statusNotes;
    order.updatedAt = now;

    db.orders[index] = order;
    logSyncEvent(db, 'order_updated', order.id);
    await writeDatabase(db);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('API PATCH /api/orders/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await readDatabase();
    const filtered = db.orders.filter((o) => o.id !== params.id);
    db.orders = filtered;
    logSyncEvent(db, 'order_deleted', params.id);
    await writeDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete order' }, { status: 500 });
  }
}
