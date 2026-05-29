import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'admin_session';

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession() {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getSessionSecret());
  return token;
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function isAuthenticated(req: Request | NextRequest): Promise<boolean> {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  return !!(await verifySession(decodeURIComponent(match[1])));
}
