import { bitableListRecords, bitableDeleteRecord } from './_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from './_lib/constants';
import {
  success,
  error,
  extractFields,
  formatDate,
  getWeekStart,
  getMonthStart,
  getQuery,
} from './_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(request: Request): Promise<Response> {
  const action = getQuery(request).get('action') || 'list';

  try {
    switch (action) {
      case 'list':
        if (request.method !== 'GET') return error('Method not allowed', 405);
        return await handleList(request);
      case 'statistics':
        if (request.method !== 'GET') return error('Method not allowed', 405);
        return await handleStatistics(request);
      case 'delete':
        if (request.method !== 'DELETE') return error('Method not allowed', 405);
        return await handleDelete(request);
      case 'export':
        if (request.method !== 'GET') return error('Method not allowed', 405);
        return await handleExport(request);
      default:
        return error('Unknown action', 400);
    }
  } catch (err: any) {
    console.error('我的夸夸 API 错误:', err);
    return error(err?.message || '服务器错误');
  }
}

// GET /api/my-praises?action=list&userId=xxx
async function handleList(request: Request): Promise<Response> {
  const userId = getQuery(request).get('userId');
  if (!userId) return error('缺少 userId 参数', 400);

  const { items } = await bitableListRecords(
    PRAISE_TABLE_ID,
    undefined,
    undefined,
    undefined,
    200,
  );

  const userPraises = items
    .filter((item: any) => {
      const fields = extractFields(item);
      return fields[FIELD_NAMES.PRAISED_USER] === userId;
    })
    .map((item: any) => {
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

  userPraises.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return success({ items: userPraises });
}

// GET /api/my-praises?action=statistics&userId=xxx
async function handleStatistics(request: Request): Promise<Response> {
  const userId = getQuery(request).get('userId');
  if (!userId) return error('缺少 userId 参数', 400);

  const { items } = await bitableListRecords(
    PRAISE_TABLE_ID,
    undefined,
    undefined,
    undefined,
    200,
  );

  const userPraises = items.filter((item: any) => {
    const fields = extractFields(item);
    return fields[FIELD_NAMES.PRAISED_USER] === userId;
  });

  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const thisWeekCount = userPraises.filter((item: any) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= weekStart;
  }).length;

  const thisMonthCount = userPraises.filter((item: any) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= monthStart;
  }).length;

  return success({
    totalCount: userPraises.length,
    thisWeekCount,
    thisMonthCount,
  });
}

// DELETE /api/my-praises?action=delete&recordId=xxx
async function handleDelete(request: Request): Promise<Response> {
  const recordId = getQuery(request).get('recordId');
  if (!recordId) return error('缺少 recordId 参数', 400);

  await bitableDeleteRecord(PRAISE_TABLE_ID, recordId);

  return success({ success: true });
}

// GET /api/my-praises?action=export&userId=xxx
async function handleExport(request: Request): Promise<Response> {
  const userId = getQuery(request).get('userId');
  if (!userId) return error('缺少 userId 参数', 400);

  const { items } = await bitableListRecords(
    PRAISE_TABLE_ID,
    undefined,
    undefined,
    undefined,
    200,
  );

  const userPraises = items
    .filter((item: any) => {
      const fields = extractFields(item);
      return fields[FIELD_NAMES.PRAISED_USER] === userId;
    })
    .map((item: any) => {
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

  return success({
    items: userPraises,
    exportedAt: new Date().toISOString(),
  });
}
