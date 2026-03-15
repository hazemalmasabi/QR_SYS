import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const messagesDir = path.join(process.cwd(), 'messages');
    const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));

    const defaults: Record<string, { barcode: string; room: string }> = {};

    for (const file of files) {
      const code = file.replace('.json', '');
      try {
        const filePath = path.join(messagesDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        defaults[code] = {
          barcode: data?.settings?.defaultBarcodeText || '',
          room: data?.common?.room || 'Room'
        };
      } catch (err) {
        console.error(`Failed to read or parse translation file ${file}:`, err);
      }
    }

    // Fallback if no english text found
    if (!defaults['en']) {
        defaults['en'] = {
          barcode: 'Scan to view our services',
          room: 'Room'
        };
    }

    return NextResponse.json(defaults);
  } catch (error) {
    console.error('API Error in /api/translations/defaults:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default translations' },
      { status: 500 }
    );
  }
}
