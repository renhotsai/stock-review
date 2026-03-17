import { NextResponse } from 'next/server';
import { setupDatabase } from '@/lib/db';

// One-time migration endpoint — call once after deployment to ensure
// all columns exist: GET /api/setup
export async function GET() {
  try {
    await setupDatabase();
    return NextResponse.json({ ok: true, message: 'Database schema is up to date.' });
  } catch (error) {
    console.error('Setup failed:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
