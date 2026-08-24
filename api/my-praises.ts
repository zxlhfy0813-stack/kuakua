import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords, bitableDeleteRecord } from './_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from './_lib/constants';
import {
  success,
  error,
  extractFields,
  formatDate,
  getWeekStart,
  getMonthStart,
} from './_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query.action as string) || 'list';

  try {
    switch (action) {
      case 'list':
        if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
        return await handleList(req, res);
      case 'statistics':
        if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
        return await handleStatistics(req, res);
      case 'delete':
        if (req.method !== 'DELETE') return error(res, 'Method not allowed', 405);
        return await handleDelete(req, res);
      case 'export':
        if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
        return await handleExport(req, res);
      default:
        return error(res, 'Unknown action', 400);
    }
  } catch (err: any) {
    console.error('我的夸夸 API 错误:', err);
    return error(res, err.message || '服务器错误');
  }
}

// GET /api/my-praises?action=list&userId=xxx
async function handleList(req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId as string;
  if (!userId) return error(res, '缺少 userId 参数', 400);

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

  return success(res, { items: userPraises });
}

// GET /api/my-praises?action=statistics&userId=xxx
async function handleStatistics(req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId as string;
  if (!userId) return error(res, '缺少 userId 参数', 400);

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

  return success(res, {
    totalCount: userPraises.length,
    thisWeekCount,
    thisMonthCount,
  });
}

// DELETE /api/my-praises?action=delete&recordId=xxx
async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const recordId = req.query.recordId as string;
  if (!recordId) return error(res, '缺少 recordId 参数', 400);

  await bitableDeleteRecord(PRAISE_TABLE_ID, recordId);

  return success(res, { success: true });
}

// GET /api/my-praises?action=export&userId=xxx
async function handleExport(req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId as string;
  if (!userId) return error(res, '缺少 userId 参数', 400);

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

  return success(res, {
    items: userPraises,
    exportedAt: new Date().toISOString(),
  });
}
