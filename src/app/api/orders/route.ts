import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';
import { Order, OrderStatus } from '@/lib/types';

function generateOrderNumber(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${digits}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('affiliateId');
    const orderNumber = searchParams.get('orderNumber');

    const db = await readDatabase();

    if (orderNumber) {
      const cleaned = orderNumber.trim().toUpperCase();
      const match = db.orders.find((o) => o.orderNumber.toUpperCase() === cleaned);
      return NextResponse.json(match || null);
    }

    if (affiliateId) {
      const filtered = db.orders.filter((o) => o.affiliateId === affiliateId);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(db.orders);
  } catch (error: any) {
    console.error('API GET /api/orders error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const db = await readDatabase();
    const now = new Date().toISOString();
    const orderNumber = generateOrderNumber();

    const items = data.items || [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const wholesaleTotal = items.reduce((sum: number, item: any) => sum + ((item.wholesalePrice || 0) * item.quantity), 0);
    const affiliateCommission = items.reduce(
      (sum: number, item: any) => sum + ((item.commission ?? (item.price - item.wholesalePrice)) * item.quantity),
      0
    );
    const shippingFee = Number(data.shippingFee ?? 45);
    const totalAmount = subtotal + shippingFee;
    const platformProfit = Math.max(0, wholesaleTotal - (items.length * 150));

    const newOrder: Order = {
      id: `ord-${Date.now().toString(36)}`,
      orderNumber,
      affiliateId: data.affiliateId,
      affiliateName: data.affiliateName,
      affiliatePhone: data.affiliatePhone,
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      customerPhone2: data.customerPhone2 || '',
      governorate: data.governorate || 'القاهرة',
      customerCity: data.customerCity || '',
      customerAddress: data.customerAddress || '',
      notes: data.notes || '',
      items,
      subtotal,
      shippingFee,
      totalAmount,
      wholesaleTotal,
      affiliateCommission,
      platformProfit,
      status: 'pending',
      shippingCompany: data.shippingCompany,
      trackingNumber: data.trackingNumber,
      statusNotes: 'تم إنشاء الطلب بنجاح وهو قيد المراجعة',
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'تم تسجيل الطلب في قاعدة البيانات' },
      ],
      isCommissionPaid: false,
      createdAt: now,
      updatedAt: now,
    };

    db.orders.unshift(newOrder);

    // If order was created by registered affiliate, update their pending balance
    if (data.affiliateId) {
      const marketer = db.marketers.find(
        (m) => m.id === data.affiliateId || m.uid === data.affiliateId
      );
      if (marketer) {
        marketer.pendingBalance += affiliateCommission;
        marketer.ordersCount += 1;
      }
    }

    // Deduct stock from products
    items.forEach((item: any) => {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    });

    logSyncEvent(db, 'order_created', newOrder.id);
    await writeDatabase(db);

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    console.error('API POST /api/orders error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create order' }, { status: 500 });
  }
}
