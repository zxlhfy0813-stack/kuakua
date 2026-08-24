import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  bitableListRecords,
  bitableCreateRecord,
} from '../_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_MAP } from '../_lib/constants';
import { success, error, extractFields, formatDate } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handleCreate(req, res);
  }
  return error(res, 'Method not allowed', 405);
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  try {
    const { praisedUser, type, content, likeCount } = req.body;

    if (!praisedUser || !content) {
      return error(res, '被夸人和夸赞内容不能为空', 400);
    }

    const fields: Record<string, any> = {
      [FIELD_NAMES.PRAISER]: req.body.praiser || 'anonymous',
      [FIELD_NAMES.PRAISED_USER]: praisedUser,
      [FIELD_NAMES.CONTENT]: content,
      [FIELD_NAMES.LIKE_COUNT]: likeCount || 1,
      [FIELD_NAMES.CREATED_AT]: Date.now(),
    };

    if (type && PRAISE_TYPE_MAP[type]) {
      fields[FIELD_NAMES.PRAISE_TYPE] = PRAISE_TYPE_MAP[type];
    }

    const record = await bitableCreateRecord(PRAISE_TABLE_ID, fields);

    return success(res, {
      id: record.record_id,
      success: true,
    }, 201);
  } catch (err: any) {
    console.error('创建夸夸失败:', err);
    return error(res, err.message || '创建夸夸失败');
  }
}
