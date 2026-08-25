import { bitableListRecords } from './_lib/feishu.js';
import { FIELD_NAMES } from './_lib/constants.js';
import { success, error, extractFields, extractUserId, extractUserName, getWeekStart, getMonthStart, getQuery } from './_lib/utils.js';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    const action = getQuery(request).get('action') || 'list';

    try {
      switch (action) {
        case 'list':
          return await handleList(request);
        case 'export':
          return await handleExport(request);
        default:
          return error('Unknown action', 400);
      }
    } catch (err: any) {
      console.error('排行榜 API 错误:', err);
      return error(err?.message || '服务器错误');
    }
  },
};

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
async function handleList(request: Request): Promise<Response> {
  const period = getQuery(request).get('period') || 'week';
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
  const countMap: Record<string, { userId: string; name: string; count: number }> = {};
  filtered.forEach((item) => {
    const fields = extractFields(item);
    const userId = extractUserId(fields[FIELD_NAMES.PRAISED_USER]);
    if (userId) {
      const name = extractUserName(fields[FIELD_NAMES.PRAISED_USER]);
      countMap[userId] = countMap[userId] || { userId, name, count: 0 };
      countMap[userId].count += 1;
    }
  });

  const ranking = Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      name: item.name,
      count: item.count,
    }));

  return success({
    items: ranking,
    period,
    total: filtered.length,
  });
}

// GET /api/ranking?action=export&period=week
async function handleExport(request: Request): Promise<Response> {
  const period = getQuery(request).get('period') || 'week';
  const timeStart = period === 'month' ? getMonthStart() : getWeekStart();

  const allItems = await getAllPraises();

  const filtered = allItems.filter((item) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= timeStart;
  });

  const countMap: Record<string, { userId: string; name: string; count: number }> = {};
  filtered.forEach((item) => {
    const fields = extractFields(item);
    const userId = extractUserId(fields[FIELD_NAMES.PRAISED_USER]);
    if (userId) {
      const name = extractUserName(fields[FIELD_NAMES.PRAISED_USER]);
      countMap[userId] = countMap[userId] || { userId, name, count: 0 };
      countMap[userId].count += 1;
    }
  });

  const ranking = Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      name: item.name,
      count: item.count,
    }));

  return success({
    items: ranking,
    period,
    exportedAt: new Date().toISOString(),
  });
}
