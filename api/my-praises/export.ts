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
    const userId = req.query.userId as string | undefined;
    const typeFilter = req.query.type as string | undefined;

    const { items } = await bitableListRecords(PRAISE_TABLE_ID);

    let filtered = items;
    if (userId) {
      filtered = items.filter(
        (item: any) => extractFields(item)[FIELD_NAMES.PRAISED_USER] === userId,
      );
    }

    if (typeFilter) {
      const typeName = {
        collaboration: '卓越协作',
        professional: '专业精湛',
        innovation: '积极创新',
        helpful: '乐于助人',
      }[typeFilter];
      if (typeName) {
        filtered = filtered.filter(
          (item: any) => extractFields(item)[FIELD_NAMES.PRAISE_TYPE] === typeName,
        );
      }
    }

    filtered.sort((a: any, b: any) => {
      const aTime = new Date(
        extractFields(a)[FIELD_NAMES.CREATED_AT] || 0,
      ).getTime();
      const bTime = new Date(
        extractFields(b)[FIELD_NAMES.CREATED_AT] || 0,
      ).getTime();
      return bTime - aTime;
    });

    const list = filtered.map((item: any) => {
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

    return success(res, { items: list });
  } catch (err: any) {
    console.error('导出夸夸记录失败:', err);
    return error(res, err.message || '导出失败');
  }
}
