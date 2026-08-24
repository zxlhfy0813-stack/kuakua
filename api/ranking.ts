import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from './_lib/feishu';
import { FIELD_NAMES } from './_lib/constants';
import { success, error, extractFields, getWeekStart, getMonthStart } from './_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  const action = (req.query.action as string) || 'list';

  try {
    switch (action) {
      case 'list':
        return await handleList(req, res);
      case 'export':
        return await handleExport(req, res);
      default:
        return error(res, 'Unknown action', 400);
    }
  } catch (err: any) {
    console.error('排行榜 API 错误:', err);
    return error(res, err.message || '服务器错误');
  }
}

async function getAllPraises() {
  const allItems: any[] = [];
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await bitableListRecords(PRAISE_TABLE_ID, undefined, undefined, pageToken, 100);
    allItems.push(...result.items);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  return allItems;
}

// GET /api/ranking?action=list&period=week
async function handleList(req: VercelRequest, res: VercelResponse) {
  const period = (req.query.period as string) || 'week';
  const timeStart = period === 'month' ? getMonthStart() : getWeekStart();

  const allItems = await getAllPraises();

  // 按时间段筛选
  const filtered = allItems.filter((item) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= timeStart;
  });

  // 统计每个被夸人收到的夸赞数
  const countMap: Record<string, number> = {};
  filtered.forEach((item) => {
    const fields = extractFields(item);
    const user = fields[FIELD_NAMES.PRAISED_USER] || '';
    if (user) {
      countMap[user] = (countMap[user] || 0) + 1;
    }
  });

  const ranking = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .map(([userId, count], index) => ({
      rank: index + 1,
      userId,
      count,
    }));

  return success(res, {
    items: ranking,
    period,
    total: filtered.length,
  });
}

// GET /api/ranking?action=export&period=week
async function handleExport(req: VercelRequest, res: VercelResponse) {
  const period = (req.query.period as string) || 'week';
  const timeStart = period === 'month' ? getMonthStart() : getWeekStart();

  const allItems = await getAllPraises();

  const filtered = allItems.filter((item) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= timeStart;
  });

  const countMap: Record<string, number> = {};
  filtered.forEach((item) => {
    const fields = extractFields(item);
    const user = fields[FIELD_NAMES.PRAISED_USER] || '';
    if (user) {
      countMap[user] = (countMap[user] || 0) + 1;
    }
  });

  const ranking = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .map(([userId, count], index) => ({
      rank: index + 1,
      userId,
      count,
    }));

  return success(res, {
    items: ranking,
    period,
    exportedAt: new Date().toISOString(),
  });
}
