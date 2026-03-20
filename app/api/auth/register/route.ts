import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫 Email 和密碼' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密碼至少需要 6 個字元' }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: '此 Email 已被註冊' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name ?? null}, ${email}, ${hash})
    `;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    return NextResponse.json({ error: '註冊失敗，請稍後再試' }, { status: 500 });
  }
}
