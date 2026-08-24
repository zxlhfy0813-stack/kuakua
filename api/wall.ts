import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from '../_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from '../_lib/constants';
import { success, error, extractFields, formatDate } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    const { items, pageToken, hasMore } = await bitableListRecords(
      PRAISE_TABLE_ID,
      undefined,
      undefined,
      req.query.cursor as string | undefined,
      Number(req.query.pageSize) || 20,
    );

    const wallItems = items.map((item: any) => {
      const fields = extractFields(item);
      return {
        id: item.record_id,
        praiser: fields[FIELD_NAMES.PRAISER] || '',
        praisedUser: fields[FIELD_NAMES.PRAISED_USER] || '',
        content: fields[FIELD_NAMES.CONTENT] || '',
        type: PRAISE_TYPE_REVERSE[fields[FIELD_NAMES.PRAISE_TYPE]] || null,
        likeCount: Number(fields[FIELD_NAMES.LIKE_COUNT]) || 0,
        createdAt: formatDate(fields[FIELD_NAMES.CREATED_AT]),
      };
    });

    // 按创建时间倒序
    wallItems.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // 按类型筛选
    const typeFilter = req.query.type as string | undefined;
    const filtered = typeFilter
      ? wallItems.filter((item: any) => item.type === typeFilter)
      : wallItems;

    return success(res, {
      items: filtered,
      nextCursor: hasMore ? pageToken : null,
      hasMore,
    });
  } catch (err: any) {
    console.error('获取夸夸墙失败:', err);
    return error(res, err.message || '获取夸夸墙失败');
  }
}
