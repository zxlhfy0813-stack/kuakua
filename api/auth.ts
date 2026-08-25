import { success, error, getQuery } from './_lib/utils.js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const APP_ID = process.env.FEISHU_APP_ID || '';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const APP_URL = process.env.APP_URL || 'https://kuakua-orpin.vercel.app';
const CALLBACK = `${APP_URL}/api/auth`;
const COOKIE = 'kuakua_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

const AUTH_INDEX = 'https://open.feishu.cn/open-apis/authen/v1/index';

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', APP_SECRET || 'kuakua').update(payload).digest());
}

function makeToken(obj: any): string {
  const payload = b64url(Buffer.from(JSON.stringify(obj), 'utf8'));
  return `${payload}.${sign(payload)}`;
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

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sessionResponse(session: any): Response {
  const body = session
    ? {
        loggedIn: true,
        user: {
          open_id: session.u,
          name: session.n,
          avatar: session.a,
          email: session.m || '',
          access_token: session.t,
        },
      }
    : success({ loggedIn: false });
  return success(session ? body : { loggedIn: false, user: null });
}

async function handleLoginUrl(): Promise<Response> {
  if (!APP_ID) return error('缺少 FEISHU_APP_ID 配置', 500);
  const state = Math.random().toString(36).slice(2);
  const url = `${AUTH_INDEX}?redirect_uri=${encodeURIComponent(CALLBACK)}&app_id=${APP_ID}&state=${state}`;
  return success({ url });
}

async function handleCallback(request: Request): Promise<Response> {
  const q = getQuery(request);
  const code = q.get('code');
  if (!code) return error('缺少 code 参数', 400);

  try {
    // 1) 用 app_id + app_secret 获取 app_access_token
    const appRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const appData = await appRes.json();
    if (appData.code !== 0 || !appData.app_access_token) {
      return error(`获取 app_access_token 失败: ${appData.msg} (code: ${appData.code})`, 401);
    }
    const app_access_token = appData.app_access_token;

    // 2) 用临时授权 code 换取 user_access_token（必须带 app_access_token 头）
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${app_access_token}`,
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      // code 已使用/失效：若本地已登录则直接回首页，避免重复回调报错
      const existing = readCookie(request, COOKIE);
      if (existing && verifyToken(existing)) {
        return Response.redirect(`${APP_URL}/`, 302);
      }
      return error(`飞书登录失败: ${tokenData.msg} (code: ${tokenData.code})`, 401);
    }
    const t = tokenData.data;
    const user_access_token = t.access_token;

    // 3) 用 user_access_token 获取用户信息（可选，exchange 响应里也带基础字段）
    let u: any = {};
    try {
      const infoRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
        headers: { 'Authorization': `Bearer ${user_access_token}` },
      });
      const infoData = await infoRes.json();
      if (infoData.code === 0 && infoData.data) u = infoData.data;
    } catch {
      // ignore
    }

    const session = {
      u: u.open_id || t.open_id,
      n: u.name || t.name || u.en_name || '',
      a: u.avatar_url || t.avatar_url || '',
      m: u.email || t.email || '',
      t: user_access_token,
      e: Math.floor(Date.now() / 1000) + MAX_AGE,
    };
    const token = makeToken(session);
    const redirect = Response.redirect(`${APP_URL}${getQuery(request).get('to') || '/'}`, 302);
    redirect.headers.append(
      'Set-Cookie',
      `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`,
    );
    return redirect;
  } catch (err: any) {
    console.error('飞书登录回调失败:', err);
    return error(err?.message || '登录失败', 500);
  }
}

async function handleMe(request: Request): Promise<Response> {
  const token = readCookie(request, COOKIE);
  if (!token) return success({ loggedIn: false, user: null });
  const session = verifyToken(token);
  if (!session) return success({ loggedIn: false, user: null });
  return sessionResponse(session);
}

async function handleLogout(): Promise<Response> {
  const redirect = Response.redirect(`${APP_URL}/`, 302);
  redirect.headers.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return redirect;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const q = getQuery(request);
    const action = q.get('action');

    // 飞书回调：带 code 即登录
    if (q.get('code')) {
      return await handleCallback(request);
    }

    switch (action) {
      case 'login-url':
        return await handleLoginUrl();
      case 'me':
        return await handleMe(request);
      case 'logout':
        return await handleLogout();
      default:
        return error('Unknown action', 400);
    }
  },
};
