import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from '../_lib/feishu';
import { FIELD_NAMES } from '../_lib/constants';
import { success, error, extractFields, getWeekStart, getMonthStart } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    const period = (req.query.period as string) || 'week';
    const { items } = await bitableListRecords(PRAISE_TABLE_ID);

    const timeStart = period === 'month' ? getMonthStart() : getWeekStart();

    const countMap: Record<string, number> = {};
    for (const item of items) {
      const fields = extractFields(item);
      const userId = fields[FIELD_NAMES.PRAISED_USER] || '';
      const createdAt = new Date(fields[FIELD_NAMES.CREATED_AT] || 0).getTime();
      if (createdAt >= timeStart && userId) {
        countMap[userId] = (countMap[userId] || 0) + 1;
      }
    }

    const sorted = Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .map(([userId, count], index) => ({
        userId,
        count,
        rank: index + 1,
      }));

    return success(res, { items: sorted });
  } catch (err: any) {
    console.error('导出排行榜失败:', err);
    return error(res, err.message || '导出排行榜失败');
  }
}
