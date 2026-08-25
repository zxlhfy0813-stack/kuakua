import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'kuakua_session';
const SECRET = process.env.FEISHU_APP_SECRET || 'kuakua';

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export interface SessionUser {
  open_id: string;
  name: string;
  avatar: string;
  email: string;
  access_token: string;
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function verifyToken(token: string): any {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = sign(payload);
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (obj.e && obj.e < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch {
    return null;
  }
}

export function getSessionUser(request: Request): SessionUser | null {
  // 优先从 header 读取会话 token（前端放 localStorage 并在 axios 请求头带上）
  const headerToken = request.headers.get('x-kuakua-token');
  if (headerToken) {
    const s = verifyToken(headerToken);
    if (s && s.u) {
      return {
        open_id: s.u,
        name: s.n || '',
        avatar: s.a || '',
        email: s.m || '',
        access_token: s.t || '',
      };
    }
    return null;
  }
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const s = verifyToken(token);
  if (!s || !s.u) return null;
  return {
    open_id: s.u,
    name: s.n || '',
    avatar: s.a || '',
    email: s.m || '',
    access_token: s.t || '',
  };
}
