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
    // 注意：需要用户身份来筛选"我收到的夸夸"
    // 目前返回所有数据的统计
    const userId = req.query.userId as string | undefined;

    const { items } = await bitableListRecords(PRAISE_TABLE_ID);

    const now = Date.now();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    let totalReceived = 0;
    let weekAdded = 0;
    let monthAdded = 0;

    for (const item of items) {
      const fields = extractFields(item);
      const targetUser = fields[FIELD_NAMES.PRAISED_USER] || '';

      // 如果指定了 userId，只统计该用户的
      if (userId && targetUser !== userId) continue;

      totalReceived++;
      const createdAt = new Date(fields[FIELD_NAMES.CREATED_AT] || 0).getTime();
      if (createdAt >= weekStart) weekAdded++;
      if (createdAt >= monthStart) monthAdded++;
    }

    return success(res, {
      totalReceived,
      weekAdded,
      monthAdded,
    });
  } catch (err: any) {
    console.error('获取我的夸夸统计失败:', err);
    return error(res, err.message || '获取统计失败');
  }
}
