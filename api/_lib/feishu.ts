/**
 * 飞书多维表格 API 客户端
 * 使用 tenant_access_token 认证，支持 CRUD 操作
 */

const FEISHU_APP_ID = process.env.FEISHU_APP_ID!;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BITABLE_APP_TOKEN = process.env.BITABLE_APP_TOKEN!;
const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

// Token 缓存（避免频繁请求）
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * 获取 tenant_access_token
 */
export async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    },
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 tenant_access_token 失败: ${data.msg}`);
  }

  cachedToken = data.tenant_access_token;
  tokenExpiry = Date.now() + (data.expire - 300) * 1000; // 提前5分钟刷新
  return cachedToken!;
}

/**
 * 通用飞书 API 请求
 */
export async function feishuRequest(
  method: string,
  path: string,
  body?: any,
): Promise<any> {
  const token = await getTenantAccessToken();
  const url = `https://open.feishu.cn/open-apis${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`飞书 API 错误 [${path}]: ${data.msg} (code: ${data.code})`);
  }
  return data.data;
}

// ========== 多维表格 CRUD ==========

/**
 * 查询多维表格记录
 */
export async function bitableListRecords(
  tableId: string,
  filter?: string,
  sort?: string[],
  pageToken?: string,
  pageSize: number = 100,
): Promise<{ items: any[]; pageToken?: string; hasMore: boolean }> {
  const params = new URLSearchParams();
  params.set('page_size', String(pageSize));
  if (pageToken) params.set('page_token', pageToken);
  if (filter) params.set('filter', filter);
  if (sort) params.set('sort', JSON.stringify(sort));

  const data = await feishuRequest(
    'GET',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records?${params}`,
  );

  return {
    items: data.items || [],
    pageToken: data.page_token,
    hasMore: data.has_more || false,
  };
}

/**
 * 创建多维表格记录
 */
export async function bitableCreateRecord(
  tableId: string,
  fields: Record<string, any>,
): Promise<any> {
  const data = await feishuRequest(
    'POST',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records`,
    { fields },
  );
  return data.record;
}

/**
 * 更新多维表格记录
 */
export async function bitableUpdateRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, any>,
): Promise<any> {
  const data = await feishuRequest(
    'PUT',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    { fields },
  );
  return data.record;
}

/**
 * 删除多维表格记录
 */
export async function bitableDeleteRecord(
  tableId: string,
  recordId: string,
): Promise<void> {
  await feishuRequest(
    'DELETE',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
  );
}

/**
 * 批量查询多维表格记录
 */
export async function bitableBatchGetRecords(
  tableId: string,
  recordIds: string[],
): Promise<any[]> {
  const data = await feishuRequest(
    'POST',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records/batch_get`,
    { record_ids: recordIds },
  );
  return data.records || [];
}
