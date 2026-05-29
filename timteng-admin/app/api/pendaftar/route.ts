import { NextResponse } from 'next/server';
import { getPendaftar } from '@/lib/sheets';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: Request) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getPendaftar();
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error('Error fetching pendaftar:', err);
    return NextResponse.json({ error: 'Gagal mengambil data dari Google Sheets' }, { status: 500 });
  }
}
