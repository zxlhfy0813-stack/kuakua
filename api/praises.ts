import {
  bitableListRecords,
  bitableCreateRecord,
  bitableDeleteRecord,
  bitableBatchGetRecords,
} from './_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_MAP } from './_lib/constants';
import { success, error, extractFields, formatDate, getQuery, getBody } from './_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(request: Request): Promise<Response> {
  const action = getQuery(request).get('action') || 'create';

  try {
    switch (action) {
      case 'create':
        if (request.method !== 'POST') return error('Method not allowed', 405);
        return await handleCreate(request);
      case 'get-by-id':
        if (request.method !== 'GET') return error('Method not allowed', 405);
        return await handleGetById(request);
      case 'recent-praised':
        if (request.method !== 'GET') return error('Method not allowed', 405);
        return await handleRecentPraised(request);
      case 'delete':
        if (request.method !== 'DELETE') return error('Method not allowed', 405);
        return await handleDelete(request);
      default:
        return error('Unknown action', 400);
    }
  } catch (err: any) {
    console.error('Praises API 错误:', err);
    return error(err?.message || '服务器错误');
  }
}

// POST /api/praises?action=create
async function handleCreate(request: Request): Promise<Response> {
  const body = await getBody(request);
  const { praisedUserId, praisedUserName, type, content, likeCount = 1 } = body;

  if (!praisedUserId || !content) {
    return error('缺少必填字段', 400);
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

  return success({
    id: record.record_id,
    ...extractFields(record),
  }, 201);
}

// GET /api/praises?action=get-by-id&id=xxx
async function handleGetById(request: Request): Promise<Response> {
  const id = getQuery(request).get('id');
  if (!id) return error('缺少 id 参数', 400);

  const records = await bitableBatchGetRecords(PRAISE_TABLE_ID, [id]);
  if (!records.length) return error('记录不存在', 404);

  const item = records[0];
  const fields = extractFields(item);

  return success({
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
async function handleRecentPraised(request: Request): Promise<Response> {
  const userId = getQuery(request).get('userId');
  if (!userId) return error('缺少 userId 参数', 400);

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

  return success({ items: unique.slice(0, 10) });
}

// DELETE /api/praises?action=delete&recordId=xxx
async function handleDelete(request: Request): Promise<Response> {
  const recordId = getQuery(request).get('recordId');
  if (!recordId) return error('缺少 recordId 参数', 400);

  await bitableDeleteRecord(PRAISE_TABLE_ID, recordId);

  return success({ success: true });
}
