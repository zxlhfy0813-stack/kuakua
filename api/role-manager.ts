import { success, error } from './_lib/utils';

/**
 * 角色管理 API
 * 注意：飞书妙搭的角色管理依赖平台内部 API，
 * 独立部署后需要自行实现权限管理逻辑。
 * 这里提供一个简化的实现。
 */

// 简化的角色存储（实际应使用数据库）
const ADMIN_USERS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    try {
      // 返回简化的角色信息
      return success([
        {
          bizID: 'developer',
          name: '开发者',
          description: '可以发送和管理夸夸',
          roleMembers: {
            userList: ADMIN_USERS.map((id) => ({ userID: id })),
          },
        },
      ]);
    } catch (err: any) {
      console.error('获取角色失败:', err);
      return error(err?.message || '获取角色失败');
    }
  },
};
