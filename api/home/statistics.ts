import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from '../_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from '../_lib/constants';
import { success, error, extractFields, getWeekStart } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    // 获取所有夸夸记录
    const { items } = await bitableListRecords(PRAISE_TABLE_ID);

    const now = Date.now();
    const weekStart = getWeekStart();

    let totalCount = 0;
    let weekAddedCount = 0;

    for (const item of items) {
      const fields = extractFields(item);
      totalCount++;
      const createdAt = new Date(fields[FIELD_NAMES.CREATED_AT] || 0).getTime();
      if (createdAt >= weekStart) {
        weekAddedCount++;
      }
    }

    return success(res, {
      totalCount,
      weekAddedCount,
      myReceivedCount: 0, // 需要用户身份，暂返回 0
    });
  } catch (err: any) {
    console.error('获取首页统计失败:', err);
    return error(res, err.message || '获取统计数据失败');
  }
}
