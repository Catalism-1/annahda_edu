import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const isProtected = request.nextUrl.pathname.startsWith('/admin/dashboard');
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('admin_session')?.value;
  if (!token || !(await verifySession(token))) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/dashboard/:path*'] };
