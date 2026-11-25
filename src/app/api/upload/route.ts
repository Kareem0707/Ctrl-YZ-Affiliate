import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { requireAuth } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

interface DetectedImageType {
  ext: '.jpg' | '.png' | '.webp';
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Inspect actual binary Magic Bytes (file header signatures).
 * Strictly rejects SVG, HTML, JS, executables, and spoofed MIME headers.
 */
function detectImageMagicBytes(buf: Buffer): DetectedImageType | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: '.png', mime: 'image/png' };
  }

  // WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Strict ADMIN-only authentication
    await requireAuth(request, ['ADMIN']);

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: 'صيغة الطلب غير صالحة — يجب إرسال multipart/form-data', code: 'INVALID_FORM_DATA' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'لم يتم إرفاق أي ملف صورة', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    // 2. Enforce strict file size bounds (1 byte .. 5 MB)
    if (file.size <= 0) {
      return NextResponse.json(
        { error: 'الملف المرفق فارغ', code: 'EMPTY_FILE' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت)', code: 'FILE_TOO_LARGE' },
        { status: 413 }
      );
    }

    // 3. Read bytes and verify real Magic Bytes (never trust file.type or file.name!)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detected = detectImageMagicBytes(buffer);

    if (!detected) {
      return NextResponse.json(
        {
          error: 'نوع الملف غير مسموح به. يُسمح فقط بصور حقيقية بصيغ JPEG أو PNG أو WebP (مرفوض SVG/HTML/JS).',
          code: 'INVALID_FILE_SIGNATURE',
        },
        { status: 400 }
      );
    }

    // 4. Upload to persistent cloud storage (@vercel/blob) — NEVER write to public/uploads/
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return NextResponse.json(
        {
          error:
            'خدمة التخزين السحابي غير مهيأة على الخادم (BLOB_READ_WRITE_TOKEN مفقود). يرجى ضبط متغير البيئة في Vercel أو .env.local.',
          code: 'BLOB_STORAGE_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const safeObjectPath = `products/${Date.now()}-${nanoid(12)}${detected.ext}`;
    const blob = await put(safeObjectPath, buffer, {
      access: 'public',
      contentType: detected.mime,
      addRandomSuffix: false,
      token: blobToken,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      contentType: detected.mime,
      size: buffer.length,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API POST /api/upload error:', err);
    return NextResponse.json(
      { error: 'فشل رفع الصورة إلى التخزين السحابي', code: 'UPLOAD_FAILED' },
      { status: 500 }
    );
  }
}
