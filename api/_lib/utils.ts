/**
 * 统一 API 响应格式（Vercel Web Handler 标准 Response）
 */
export function success(data: any, status = 200): Response {
  return Response.json(data, { status });
}

export function error(message: string, status = 500): Response {
  return Response.json({ error: message }, { status });
}

/**
 * 从 Web Request 的 URL 中解析查询参数
 */
export function getQuery(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

/**
 * 解析 JSON 请求体（无 body 时返回空对象）
 */
export async function getBody(request: Request): Promise<Record<string, any>> {
  try {
    return (await request.json()) || {};
  } catch {
    return {};
  }
}

/**
 * 从多维表格记录中提取字段值
 */
export function extractFields(record: any): Record<string, any> {
  return record?.fields || {};
}

/**
 * 飞书「人员」字段返回数组 [{ id, name, en_name, avatar_url }]，
 * 取第一个用户的 id（open_id）
 */
export function extractUserId(value: any): string {
  const first = getUserFirst(value);
  if (!first) return '';
  if (typeof first === 'string') return first;
  return first.id || first.user_id || first.open_id || '';
}

/**
 * 飞书「人员」字段返回数组 [{ id, name, en_name, avatar_url }]，
 * 取第一个用户的显示名
 */
export function extractUserName(value: any): string {
  const first = getUserFirst(value);
  if (!first) return '';
  if (typeof first === 'string') return first;
  return first.name || first.en_name || first.user_id || first.id || '';
}

/**
 * 飞书「人员」字段 → 前端展示用对象 { user_id, name, avatar }（飞书样式头像+名字）
 */
export function extractUser(value: any): { user_id: string; name: string; avatar: string } {
  const first = getUserFirst(value);
  if (!first) return { user_id: '', name: '', avatar: '' };
  if (typeof first === 'string') {
    return { user_id: first, name: first, avatar: '' };
  }
  return {
    user_id: first.id || first.user_id || first.open_id || '',
    name: first.name || first.en_name || first.user_id || first.id || '',
    avatar: first.avatar_url || first.avatar?.avatar_72 || first.avatar?.avatar_240 || '',
  };
}

function getUserFirst(value: any): any {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 格式化日期为 ISO 字符串
 */
export function formatDate(dateStr: string | number): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * 获取本周起始时间戳（周一 00:00:00）
 */
export function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay() || 7; // 周日为 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * 获取本月起始时间戳
 */
export function getMonthStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
