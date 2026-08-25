import { feishuRequest } from './_lib/feishu';
import { success, error, getQuery } from './_lib/utils';

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

// GET /api/users?action=search&query=xxx&pageSize=20
async function handleSearch(request: Request): Promise<Response> {
  const query = getQuery(request);
  const queryStr = query.get('query') || '';
  const pageSize = Math.min(Number(query.get('pageSize')) || 20, 100);

  if (!queryStr.trim()) {
    return success({ userList: [] });
  }

  try {
    // 使用飞书通讯录搜索接口
    const data = await feishuRequest(
      'POST',
      '/search/v1/user',
      {
        query: queryStr,
        page_size: pageSize,
        query_range: 'user',
      },
    );

    return success({
      userList: (data.users || []).map((user: any) => ({
        user_id: user.user_id || user.open_id,
        name: user.name || {},
        avatar: user.avatar || {},
        department_ids: user.department_ids || [],
      })),
    });
  } catch (err: any) {
    console.error('搜索用户失败，尝试使用通讯录接口:', err);
    
    // fallback: 使用通讯录批量获取接口
    try {
      const data = await feishuRequest(
        'GET',
        `/contact/v3/users?page_size=${pageSize}&user_id_type=user_id`,
      );

      const users = (data.items || []).filter((user: any) => {
        const name = user.name || '';
        return name.includes(queryStr);
      });

      return success({
        userList: users.map((user: any) => ({
          user_id: user.user_id,
          name: { zh_cn: user.name },
          avatar: { avatar_72: user.avatar?.avatar_72 },
          department_ids: user.department_ids || [],
        })),
      });
    } catch (fallbackErr: any) {
      console.error('通讯录接口也失败:', fallbackErr);
      return success({ userList: [] });
    }
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

    // 批量获取用户信息（每次最多50个）
    for (let i = 0; i < userIds.length; i += 50) {
      const batch = userIds.slice(i, i + 50);
      const promises = batch.map(async (userId) => {
        try {
          const data = await feishuRequest(
            'GET',
            `/contact/v3/users/${userId}?user_id_type=user_id`,
          );
          results[userId] = {
            user_id: data.user?.user_id || userId,
            name: { zh_cn: data.user?.name || '未知用户' },
            avatar: { avatar_72: data.user?.avatar?.avatar_72 || '' },
          };
        } catch {
          results[userId] = {
            user_id: userId,
            name: { zh_cn: userId },
            avatar: {},
          };
        }
      });
      await Promise.all(promises);
    }

    return success({ userInfoMap: results });
  } catch (err: any) {
    console.error('批量获取用户失败:', err);
    return error(err?.message || '获取用户信息失败');
  }
}
