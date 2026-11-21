import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, logSyncEvent } from '@/lib/serverDb';

export async function GET() {
  try {
    const db = await readDatabase();
    return NextResponse.json({
      settings: db.settings,
      governorates: db.governorates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await readDatabase();

    if (body.settings) {
      db.settings = { ...db.settings, ...body.settings };
    }

    if (body.governorates && Array.isArray(body.governorates)) {
      db.governorates = body.governorates;
    }

    logSyncEvent(db, 'settings_updated');
    await writeDatabase(db);

    return NextResponse.json({
      settings: db.settings,
      governorates: db.governorates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update settings' }, { status: 500 });
  }
}
