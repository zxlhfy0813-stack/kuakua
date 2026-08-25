import { feishuRequest } from './_lib/feishu.js';
import { success, error, getQuery } from './_lib/utils.js';

/**
 * 用户搜索 API
 * 支持搜索飞书组织内的用户
 * 
 * GET /api/users?action=search&query=xxx&pageSize=20
 * GET /api/users?action=batch-get&userIds=id1,id2
 */
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    const action = getQuery(request).get('action') || 'search';

    try {
      switch (action) {
        case 'search':
          return await handleSearch(request);
        case 'batch-get':
          return await handleBatchGet(request);
        default:
          return error('Unknown action', 400);
      }
    } catch (err: any) {
      console.error('用户 API 错误:', err);
      return error(err?.message || '服务器错误');
    }
  },
};

// 取用户名的 I18nText 文本
function getText(name: any): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.zh_cn || name.en_us || name.en_name || '';
}

// 拉取通讯录全部用户（分页，每页最多100，上限 1000，若 org 更大可调）
async function fetchAllUsers(): Promise<any[]> {
  const all: any[] = [];
  let pageToken: string | undefined;
  let count = 0;
  const MAX = 1000;
  while (count < MAX) {
    const pageSize = Math.min(100, MAX - count);
    const params = new URLSearchParams();
    params.set('page_size', String(pageSize));
    params.set('user_id_type', 'open_id');
    if (pageToken) params.set('page_token', pageToken);

    const data = await feishuRequest('GET', `/contact/v3/users?${params}`);
    const items = data.items || [];
    all.push(...items);
    count += items.length;
    if (!data.has_more || !data.page_token) break;
    pageToken = data.page_token;
  }
  return all;
}

// GET /api/users?action=search&query=xxx&pageSize=20
// 说明：/search/v1/user 需要「用户」token，这里统一用通讯录列表 + 本地筛选来实现
// 当 query 为空时，返回全部通讯录成员（供“+”号选择）
async function handleSearch(request: Request): Promise<Response> {
  const query = getQuery(request);
  const queryStr = (query.get('query') || '').trim();
  const pageSize = Math.min(Number(query.get('pageSize')) || 100, 200);

  try {
    const users = await fetchAllUsers();

    let matched = users;
    if (queryStr) {
      const lowered = queryStr.toLowerCase();
      matched = users.filter((user: any) => {
        const name = getText(user.name).toLowerCase();
        const enName = (user.en_name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const mobile = user.mobile || '';
        return (
          name.includes(lowered) ||
          enName.includes(lowered) ||
          email.includes(lowered) ||
          mobile.includes(queryStr)
        );
      });
    }

    return success({
      userList: matched.slice(0, pageSize).map((user: any) => ({
        user_id: user.open_id || user.user_id,
        name: user.name || { zh_cn: user.en_name },
        avatar: user.avatar || {},
        department_ids: user.department_ids || [],
      })),
    });
  } catch (err: any) {
    console.error('搜索用户失败:', err);
    return error(err?.message || '搜索用户失败');
  }
}

// GET /api/users?action=batch-get&userIds=id1,id2
async function handleBatchGet(request: Request): Promise<Response> {
  const userIdsStr = getQuery(request).get('userIds') || '';
  const userIds = userIdsStr.split(',').filter(Boolean);

  if (userIds.length === 0) {
    return success({ userInfoMap: {} });
  }

  try {
    const results: Record<string, any> = {};

    // 直接用通讯录列表构建 id->user 映射（单接口更稳定）
    const users = await fetchAllUsers();
    const byId = new Map<string, any>();
    for (const u of users) {
      const id = u.open_id || u.user_id;
      if (id) byId.set(id, u);
    }

    for (const id of userIds) {
      const u = byId.get(id);
      results[id] = u
        ? {
            user_id: u.open_id || u.user_id || id,
            name: { zh_cn: getText(u.name) || u.en_name || id },
            en_name: u.en_name || '',
            email: u.email || '',
            job_title: u.job_title || '',
            department_ids: u.department_ids || [],
            avatar: { avatar_72: u.avatar?.avatar_72 || '' },
          }
        : {
            user_id: id,
            name: { zh_cn: id },
            avatar: {},
          };
    }

    return success({ userInfoMap: results });
  } catch (err: any) {
    console.error('批量获取用户失败:', err);
    return error(err?.message || '获取用户信息失败');
  }
}
