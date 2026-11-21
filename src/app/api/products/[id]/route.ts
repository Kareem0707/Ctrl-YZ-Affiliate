import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await readDatabase();
    const product = db.products.find((p) => p.id === params.id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await readDatabase();
    const filtered = db.products.filter((p) => p.id !== params.id);
    db.products = filtered;
    logSyncEvent(db, 'product_deleted', params.id);
    await writeDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete product' }, { status: 500 });
  }
}
