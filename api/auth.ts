import { success, error, getQuery } from './_lib/utils.js';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { getTenantAccessToken } from './_lib/feishu.js';

const APP_ID = process.env.FEISHU_APP_ID || '';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const APP_URL = process.env.APP_URL || 'https://kuakua-orpin.vercel.app';
const CALLBACK = `${APP_URL}/api/auth`;
const COOKIE = 'kuakua_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

const AUTH_INDEX = 'https://open.feishu.cn/open-apis/authen/v1/authorize';

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

// ===== JSAPI 鉴权（飞书内免登需要）：jsapi_ticket + 签名 =====
let _jsapiTicket: string | null = null;
let _jsapiTicketExp = 0;

async function getJsapiTicket(): Promise<string> {
  if (_jsapiTicket && Date.now() < _jsapiTicketExp) return _jsapiTicket;
  const token = await getTenantAccessToken();
  const res = await fetch('https://open.feishu.cn/open-apis/jssdk/ticket/get', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0 || !data.data?.ticket) {
    throw new Error(`获取 jsapi_ticket 失败: ${data.msg} (code: ${data.code})`);
  }
  _jsapiTicket = data.data.ticket;
  _jsapiTicketExp = Date.now() + (data.data.expire - 300) * 1000;
  return _jsapiTicket!;
}

// 飞书 JSAPI 签名：sha1(jsapi_ticket=..&noncestr=..&timestamp=..&url=..)
async function handleJsapiConfig(request: Request): Promise<Response> {
  const url = getQuery(request).get('url') || `${APP_URL}/`;
  try {
    const ticket = await getJsapiTicket();
    const nonceStr = Math.random().toString(36).slice(2);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = createHash('sha1').update(raw).digest('hex');
    return success({
      appId: APP_ID,
      timestamp,
      nonceStr,
      signature,
      jsApiList: ['requestAccess', 'requestAuthCode'],
    });
  } catch (err: any) {
    console.error('JSAPI 配置失败:', err);
    return error(err?.message || '获取 JSAPI 配置失败');
  }
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
    //    新版 OIDC 应用需用 authen/v1/oidc/access_token，老版本用 authen/v1/access_token
    let tokenData: any = null;
    let v1Raw: any = null;
    let oidcRaw: any = null;
    const exchange = async (endpoint: string) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${app_access_token}`,
        },
        body: JSON.stringify({ grant_type: 'authorization_code', code }),
      });
      const raw = await res.text();
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    };
    tokenData = await exchange('https://open.feishu.cn/open-apis/authen/v1/access_token');
    v1Raw = tokenData;
    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      const oidc = await exchange('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token');
      oidcRaw = oidc;
      if (oidc.code === 0 && oidc.data?.access_token) {
        tokenData = oidc;
      }
    }
    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      // code 已使用/失效：若本地已登录则直接回首页，避免重复回调报错
      const existing = readCookie(request, COOKIE);
      if (existing && verifyToken(existing)) {
        return Response.redirect(`${APP_URL}/`, 302);
      }
      console.error('v1 返回:', JSON.stringify(v1Raw), ' OIDC 返回:', JSON.stringify(oidcRaw));
      return error(`飞书登录失败: ${tokenData.msg || JSON.stringify(tokenData)} (code: ${tokenData.code})`, 401);
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
    console.error('飞书登录回调失败:', err?.stack || err);
    const stack = String(err?.stack || err?.message || '').split('\n').slice(0, 6).join(' | ');
    return error(`回调异常: ${err?.message || '未知错误'} :: ${stack}`, 500);
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
      case 'jsapi-config':
        return await handleJsapiConfig(request);
      case 'me':
        return await handleMe(request);
      case 'logout':
        return await handleLogout();
      default:
        return error('Unknown action', 400);
    }
  },
};
