import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';
import { Product } from '@/lib/types';

export async function GET() {
  try {
    const db = await readDatabase();
    return NextResponse.json(db.products);
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
      const idx = db.products.findIndex((p) => p.id === data.id);
      if (idx > -1) {
        const updated: Product = {
          ...db.products[idx],
          ...data,
          updatedAt: now,
        };
        db.products[idx] = updated;
        logSyncEvent(db, 'product_saved', updated.id);
        await writeDatabase(db);
        return NextResponse.json(updated);
      }
    }

    const newProduct: Product = {
      id: `prod-${Date.now().toString(36)}`,
      name_en: data.name_en || 'New Product',
      name_ar: data.name_ar || 'منتج جديد',
      brand: data.brand || 'Ctrl YZ',
      category: data.category || 'Streetwear',
      costPrice: Number(data.costPrice || 260),
      wholesalePrice: Number(data.wholesalePrice || 370),
      suggestedPrice: Number(data.suggestedPrice || 590),
      minPrice: Number(data.minPrice || 510),
      price: Number(data.suggestedPrice || 590),
      salePrice: data.salePrice ? Number(data.salePrice) : undefined,
      commission: Number(data.commission || (Number(data.suggestedPrice || 590) - Number(data.wholesalePrice || 370))),
      description_en: data.description_en || '',
      description_ar: data.description_ar || '',
      images: data.images && data.images.length > 0 ? data.images : ['/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'],
      marketingDriveUrl: data.marketingDriveUrl || '',
      adCopies: data.adCopies || [],
      sizes: data.sizes && data.sizes.length > 0 ? data.sizes : ['M', 'L', 'XL', '2XL', '3XL'],
      colors: data.colors && data.colors.length > 0 ? data.colors : [{ name: 'Jet Black', hex: '#111827' }],
      stock: Number(data.stock ?? 100),
      isActive: data.isActive !== false,
      isFeatured: Boolean(data.isFeatured),
      createdAt: now,
      updatedAt: now,
    };

    db.products.unshift(newProduct);
    logSyncEvent(db, 'product_saved', newProduct.id);
    await writeDatabase(db);

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('API POST /api/products error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save product' }, { status: 500 });
  }
}
