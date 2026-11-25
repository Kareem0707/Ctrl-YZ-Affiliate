import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/rateLimit';
import { mapPrismaOrderStatus } from '@/lib/serializers';
import { toMoneyNumber } from '@/lib/validators';

export const dynamic = 'force-dynamic';

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 7) return '***';
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function maskCustomerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '***';
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : '***';
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}***`;
}

function maskAddress(governorate: string, city: string | null, address: string): string {
  const cleanAddr = address.trim();
  const partialStreet = cleanAddr.length > 10 ? `${cleanAddr.slice(0, 10)}***` : '***';
  const region = city && city !== governorate ? `${governorate} - ${city}` : governorate;
  return `${region} (${partialStreet})`;
}

/**
 * GET /api/orders/track?orderNumber=ORD-...
 * Dedicated public privacy-safe shipment tracking endpoint.
 * Masks phone, surname, and exact street address; never exposes affiliate or wholesale/profit fields.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'orders:track',
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();

    if (!orderNumber || orderNumber.length < 4 || orderNumber.length > 40) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم طلب صحيح', code: 'INVALID_ORDER_NUMBER' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: { equals: orderNumber.toUpperCase(), mode: 'insensitive' },
      },
      include: {
        items: {
          include: {
            product: { select: { images: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'لم يتم العثور على شحنة بهذا الرقم', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: mapPrismaOrderStatus(order.status),
      dbStatus: order.status,
      customerName: maskCustomerName(order.customerName),
      customerPhoneMasked: maskPhone(order.customerPhone),
      governorate: order.governorate,
      customerCity: order.customerCity ?? order.governorate,
      customerAddressMasked: maskAddress(
        order.governorate,
        order.customerCity,
        order.customerAddress
      ),
      subtotal: toMoneyNumber(order.subtotal),
      shippingFee: toMoneyNumber(order.shippingFee),
      totalAmount: toMoneyNumber(order.totalAmount),
      shippingCompany: order.shippingCompany ?? null,
      trackingNumber: order.trackingNumber ?? null,
      statusNotes: order.statusNotes ?? null,
      statusHistory,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        returnedQuantity: item.returnedQuantity,
        unitPrice: toMoneyNumber(item.unitPrice),
        image: item.product?.images?.[0] ?? '',
      })),
      createdAt: order.createdAt.toISOString(),
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      returnWindowEndsAt: order.returnWindowEndsAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('API GET /api/orders/track error:', error);
    return NextResponse.json(
      { error: 'تعذر جلب بيانات الشحنة حالياً', code: 'TRACK_FAILED' },
      { status: 500 }
    );
  }
}
