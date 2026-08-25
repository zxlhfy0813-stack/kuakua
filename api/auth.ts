import { success, error, getQuery } from './_lib/utils.js';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { getTenantAccessToken } from './_lib/feishu.js';

const APP_ID = process.env.FEISHU_APP_ID || '';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const APP_URL = process.env.APP_URL || 'https://kuakua-orpin.vercel.app';
const CALLBACK = `${APP_URL}/api/auth`;
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

// 用临时授权 code 换取用户会话（app_access_token → user_access_token → user_info）
async function exchangeCode(code: string): Promise<any> {
  const appRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const appData = await appRes.json();
  if (appData.code !== 0 || !appData.app_access_token) {
    throw new Error(`获取 app_access_token 失败: ${appData.msg} (code: ${appData.code})`);
  }
  const app_access_token = appData.app_access_token;

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

  let tokenData: any = await exchange('https://open.feishu.cn/open-apis/authen/v1/access_token');
  if (tokenData.code !== 0 || !tokenData.data?.access_token) {
    const oidc = await exchange('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token');
    if (oidc.code === 0 && oidc.data?.access_token) tokenData = oidc;
  }
  if (tokenData.code !== 0 || !tokenData.data?.access_token) {
    throw new Error(`${tokenData.msg || JSON.stringify(tokenData)} (code: ${tokenData.code})`);
  }
  const t = tokenData.data;
  const user_access_token = t.access_token;

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

  return {
    u: u.open_id || t.open_id,
    n: u.name || t.name || u.en_name || '',
    a: u.avatar_url || t.avatar_url || '',
    m: u.email || t.email || '',
    t: user_access_token,
    e: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
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

// ?action=exchange&code=xxx → 返回 { loggedIn, user, token }（JSON，不跳转）
async function handleExchange(request: Request): Promise<Response> {
  const code = getQuery(request).get('code');
  if (!code) return error('缺少 code 参数', 400);
  try {
    const session = await exchangeCode(code);
    const token = makeToken(session);
    return success({
      loggedIn: true,
      user: {
        open_id: session.u,
        name: session.n,
        avatar: session.a,
        email: session.m || '',
        access_token: session.t,
      },
      token,
    });
  } catch (err: any) {
    console.error('换取登录态失败:', err);
    return error(err?.message || '登录失败', 401);
  }
}

// 外部扫码浏览器跳转到 /api/auth?code=xxx 时，返回一个小 HTML，里面 fetch 换取并写 localStorage 后跳回首页
function handleBridge(request: Request): Response {
  const q = getQuery(request);
  const code = q.get('code') || '';
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>登录中...</title></head><body><script>
(function(){
  var code = ${JSON.stringify(code)};
  if(!code){ location.replace('/'); return; }
  fetch('/api/auth?action=exchange&code=' + encodeURIComponent(code), {credentials:'same-origin'})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d && d.loggedIn && d.token){
        try{ localStorage.setItem('kuakua_session', JSON.stringify({user:d.user, token:d.token})); }catch(e){}
      }
      location.replace('/');
    })
    .catch(function(){ location.replace('/'); });
})();
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleMe(request: Request): Promise<Response> {
  let token = request.headers.get('x-kuakua-token') || getQuery(request).get('token') || '';
  if (!token) {
    // 兼容旧 cookie
    const cookie = request.headers.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)kuakua_session=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return success({ loggedIn: false, user: null });
  const session = verifyToken(token);
  if (!session) return success({ loggedIn: false, user: null });
  return success({
    loggedIn: true,
    user: {
      open_id: session.u,
      name: session.n,
      avatar: session.a,
      email: session.m || '',
      access_token: session.t,
    },
  });
}

async function handleLogout(): Promise<Response> {
  return success({ success: true });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const q = getQuery(request);
    const action = q.get('action');

    if (q.get('code')) {
      if (action === 'exchange') return await handleExchange(request);
      return handleBridge(request);
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
