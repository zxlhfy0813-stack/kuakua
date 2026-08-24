import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from '../_lib/feishu';
import { FIELD_NAMES } from '../_lib/constants';
import { success, error, extractFields } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    const { items } = await bitableListRecords(PRAISE_TABLE_ID);

    // 获取最近 10 个被夸过的人（去重）
    const recentUsers: string[] = [];
    const seen = new Set<string>();

    // 按创建时间倒序
    const sorted = items
      .map((item: any) => ({
        userId: extractFields(item)[FIELD_NAMES.PRAISED_USER] || '',
        createdAt: new Date(
          extractFields(item)[FIELD_NAMES.CREATED_AT] || 0,
        ).getTime(),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    for (const item of sorted) {
      if (item.userId && !seen.has(item.userId)) {
        seen.add(item.userId);
        recentUsers.push(item.userId);
        if (recentUsers.length >= 10) break;
      }
    }

    return success(res, {
      userIds: recentUsers,
      userInfos: [], // 用户信息由前端通过 SDK 获取
    });
  } catch (err: any) {
    console.error('获取最近被夸的人失败:', err);
    return success(res, { userIds: [], userInfos: [] });
  }
}
