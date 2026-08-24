import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  bitableListRecords,
  bitableDeleteRecord,
} from '../_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from '../_lib/constants';
import { success, error, extractFields, formatDate } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    return handleGet(id as string, res);
  }
  if (req.method === 'DELETE') {
    return handleDelete(id as string, res);
  }
  return error(res, 'Method not allowed', 405);
}

async function handleGet(id: string, res: VercelResponse) {
  try {
    const { items } = await bitableListRecords(PRAISE_TABLE_ID);
    const item = items.find((i: any) => i.record_id === id);

    if (!item) {
      return error(res, '夸夸记录不存在', 404);
    }

    const fields = extractFields(item);
    return success(res, {
      id: item.record_id,
      praiser: fields[FIELD_NAMES.PRAISER] || '',
      praisedUser: fields[FIELD_NAMES.PRAISED_USER] || '',
      content: fields[FIELD_NAMES.CONTENT] || '',
      type: PRAISE_TYPE_REVERSE[fields[FIELD_NAMES.PRAISE_TYPE]] || null,
      likeCount: Number(fields[FIELD_NAMES.LIKE_COUNT]) || 0,
      createdAt: formatDate(fields[FIELD_NAMES.CREATED_AT]),
    });
  } catch (err: any) {
    console.error('获取夸夸详情失败:', err);
    return error(res, err.message || '获取详情失败');
  }
}

async function handleDelete(id: string, res: VercelResponse) {
  try {
    await bitableDeleteRecord(PRAISE_TABLE_ID, id);
    return success(res, { success: true });
  } catch (err: any) {
    console.error('删除夸夸失败:', err);
    return error(res, err.message || '删除失败');
  }
}
