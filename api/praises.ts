import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  bitableListRecords,
  bitableCreateRecord,
  bitableDeleteRecord,
  bitableBatchGetRecords,
} from './_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_MAP } from './_lib/constants';
import { success, error, extractFields, formatDate } from './_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query.action as string) || 'create';

  try {
    switch (action) {
      case 'create':
        if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
        return await handleCreate(req, res);
      case 'get-by-id':
        if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
        return await handleGetById(req, res);
      case 'recent-praised':
        if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
        return await handleRecentPraised(req, res);
      case 'delete':
        if (req.method !== 'DELETE') return error(res, 'Method not allowed', 405);
        return await handleDelete(req, res);
      default:
        return error(res, 'Unknown action', 400);
    }
  } catch (err: any) {
    console.error('Praises API 错误:', err);
    return error(res, err.message || '服务器错误');
  }
}

// POST /api/praises?action=create
async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const { praisedUserId, praisedUserName, type, content, likeCount = 1 } = req.body;

  if (!praisedUserId || !content) {
    return error(res, '缺少必填字段', 400);
  }

  const fields: Record<string, any> = {
    [FIELD_NAMES.PRAISED_USER]: praisedUserId,
    [FIELD_NAMES.CONTENT]: content,
    [FIELD_NAMES.LIKE_COUNT]: likeCount,
    [FIELD_NAMES.CREATED_AT]: Date.now(),
  };

  if (type && PRAISE_TYPE_MAP[type]) {
    fields[FIELD_NAMES.PRAISE_TYPE] = PRAISE_TYPE_MAP[type];
  }

  const record = await bitableCreateRecord(PRAISE_TABLE_ID, fields);

  return success(res, {
    id: record.record_id,
    ...extractFields(record),
  }, 201);
}

// GET /api/praises?action=get-by-id&id=xxx
async function handleGetById(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  if (!id) return error(res, '缺少 id 参数', 400);

  const records = await bitableBatchGetRecords(PRAISE_TABLE_ID, [id]);
  if (!records.length) return error(res, '记录不存在', 404);

  const item = records[0];
  const fields = extractFields(item);

  return success(res, {
    id: item.record_id,
    praiser: fields[FIELD_NAMES.PRAISER] || '',
    praisedUser: fields[FIELD_NAMES.PRAISED_USER] || '',
    content: fields[FIELD_NAMES.CONTENT] || '',
    type: fields[FIELD_NAMES.PRAISE_TYPE] || '',
    likeCount: Number(fields[FIELD_NAMES.LIKE_COUNT]) || 0,
    createdAt: formatDate(fields[FIELD_NAMES.CREATED_AT]),
  });
}

// GET /api/praises?action=recent-praised&userId=xxx
async function handleRecentPraised(req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId as string;
  if (!userId) return error(res, '缺少 userId 参数', 400);

  const { items } = await bitableListRecords(PRAISE_TABLE_ID, undefined, undefined, undefined, 50);

  const praisedByMe = items
    .filter((item: any) => {
      const fields = extractFields(item);
      return fields[FIELD_NAMES.PRAISER] === userId;
    })
    .map((item: any) => {
      const fields = extractFields(item);
      return {
        userId: fields[FIELD_NAMES.PRAISED_USER],
        name: fields[FIELD_NAMES.PRAISED_USER],
        lastPraiseAt: formatDate(fields[FIELD_NAMES.CREATED_AT]),
      };
    });

  const seen = new Set<string>();
  const unique = praisedByMe.filter((item: any) => {
    if (seen.has(item.userId)) return false;
    seen.add(item.userId);
    return true;
  });

  return success(res, { items: unique.slice(0, 10) });
}

// DELETE /api/praises?action=delete&recordId=xxx
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const recordId = req.query.recordId as string;
  if (!recordId) return error(res, '缺少 recordId 参数', 400);

  await bitableDeleteRecord(PRAISE_TABLE_ID, recordId);

  return success(res, { success: true });
}
