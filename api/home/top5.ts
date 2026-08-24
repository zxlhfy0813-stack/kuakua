import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from '../_lib/feishu';
import { FIELD_NAMES } from '../_lib/constants';
import { success, error, extractFields, getWeekStart } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    const { items } = await bitableListRecords(PRAISE_TABLE_ID);
    const weekStart = getWeekStart();

    // 统计本周每人被夸次数
    const countMap: Record<string, number> = {};
    for (const item of items) {
      const fields = extractFields(item);
      const userId = fields[FIELD_NAMES.PRAISED_USER] || '';
      const createdAt = new Date(fields[FIELD_NAMES.CREATED_AT] || 0).getTime();
      if (createdAt >= weekStart && userId) {
        countMap[userId] = (countMap[userId] || 0) + 1;
      }
    }

    // 排序取 TOP5
    const sorted = Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count], index) => ({
        userId,
        count,
        rank: index + 1,
      }));

    return success(res, { items: sorted });
  } catch (err: any) {
    console.error('获取 TOP5 失败:', err);
    return error(res, err.message || '获取 TOP5 失败');
  }
}
