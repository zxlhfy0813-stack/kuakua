import {
  bitableListRecords,
  bitableCreateRecord,
  bitableDeleteRecord,
  bitableBatchGetRecords,
} from './_lib/feishu.js';
import { FIELD_NAMES, PRAISE_TYPE_MAP } from './_lib/constants.js';
import { success, error, extractFields, extractUserId, extractUserName, formatDate, getQuery, getBody } from './_lib/utils.js';
import { getSessionUser } from './_lib/session.js';
import { getSource } from './_lib/datasource.js';

const PRAISE_TABLE_ID_DEFAULT = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default {
  async fetch(request: Request): Promise<Response> {
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
  },
};

// POST /api/praises?action=create
async function handleCreate(request: Request): Promise<Response> {
  const src = getSource(request);
  const body = await getBody(request);
  const praisedUser = body.praisedUser || body.praisedUserId || '';
  const { type, content, likeCount = 1 } = body;

  if (!praisedUser || !content) {
    return error('缺少必填字段', 400);
  }

  const fields: Record<string, any> = {
    [FIELD_NAMES.PRAISED_USER]: [{ id: praisedUser }],
    [FIELD_NAMES.CONTENT]: content,
    [FIELD_NAMES.LIKE_COUNT]: likeCount,
    [FIELD_NAMES.CREATED_AT]: Date.now(),
  };

  const me = getSessionUser(request);
  if (me) {
    fields[FIELD_NAMES.PRAISER] = [{ id: me.open_id }];
  } else if (body.praiser) {
    fields[FIELD_NAMES.PRAISER] = [{ id: body.praiser }];
  }

  if (type && PRAISE_TYPE_MAP[type]) {
    fields[FIELD_NAMES.PRAISE_TYPE] = PRAISE_TYPE_MAP[type];
  }

  const record = await bitableCreateRecord(src.tableId, fields, src.appToken);

  return success({
    id: record.record_id,
    ...extractFields(record),
  }, 201);
}

// GET /api/praises?action=get-by-id&id=xxx
async function handleGetById(request: Request): Promise<Response> {
  const src = getSource(request);
  const id = getQuery(request).get('id');
  if (!id) return error('缺少 id 参数', 400);

  const records = await bitableBatchGetRecords(src.tableId, [id], src.appToken);
  if (!records.length) return error('记录不存在', 404);

  const item = records[0];
  const fields = extractFields(item);

  return success({
    id: item.record_id,
    praiser: extractUserName(fields[FIELD_NAMES.PRAISER]),
    praisedUser: extractUserName(fields[FIELD_NAMES.PRAISED_USER]),
    content: fields[FIELD_NAMES.CONTENT] || '',
    type: fields[FIELD_NAMES.PRAISE_TYPE] || '',
    likeCount: Number(fields[FIELD_NAMES.LIKE_COUNT]) || 0,
    createdAt: formatDate(fields[FIELD_NAMES.CREATED_AT]),
  });
}

// GET /api/praises?action=recent-praised&userId=xxx
async function handleRecentPraised(request: Request): Promise<Response> {
  const src = getSource(request);
  const userId = getQuery(request).get('userId');
  if (!userId) return error('缺少 userId 参数', 400);

  const { items } = await bitableListRecords(src.tableId, undefined, undefined, undefined, 50, src.appToken);

  const praisedByMe = items
    .filter((item: any) => {
      const fields = extractFields(item);
      return extractUserId(fields[FIELD_NAMES.PRAISER]) === userId;
    })
    .map((item: any) => {
      const fields = extractFields(item);
      return {
        userId: extractUserId(fields[FIELD_NAMES.PRAISED_USER]),
        name: extractUserName(fields[FIELD_NAMES.PRAISED_USER]),
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
  const src = getSource(request);
  const recordId = getQuery(request).get('recordId');
  if (!recordId) return error('缺少 recordId 参数', 400);

  await bitableDeleteRecord(src.tableId, recordId, src.appToken);

  return success({ success: true });
}
