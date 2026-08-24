import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from './_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from './_lib/constants';
import { success, error, extractFields, formatDate, getWeekStart } from './_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  const action = (req.query.action as string) || 'statistics';

  try {
    switch (action) {
      case 'statistics':
        return await handleStatistics(req, res);
      case 'feeds':
        return await handleFeeds(req, res);
      case 'top5':
        return await handleTop5(req, res);
      default:
        return error(res, 'Unknown action', 400);
    }
  } catch (err: any) {
    console.error('首页 API 错误:', err);
    return error(res, err.message || '服务器错误');
  }
}

// GET /api/home?action=statistics
async function handleStatistics(req: VercelRequest, res: VercelResponse) {
  const allItems: any[] = [];
  let pageToken: string | undefined;
  let hasMore = true;

  // 获取所有记录来统计
  while (hasMore) {
    const result = await bitableListRecords(PRAISE_TABLE_ID, undefined, undefined, pageToken, 100);
    allItems.push(...result.items);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  const weekStart = getWeekStart();
  const thisWeekPraises = allItems.filter((item) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= weekStart;
  });

  return success(res, {
    totalCount: allItems.length,
    thisWeekCount: thisWeekPraises.length,
  });
}

// GET /api/home?action=feeds&page=1&pageSize=10
async function handleFeeds(req: VercelRequest, res: VercelResponse) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;

  const { items, hasMore } = await bitableListRecords(
    PRAISE_TABLE_ID,
    undefined,
    undefined,
    undefined,
    100,
  );

  const feeds = items.map((item: any) => {
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

  // 按创建时间倒序
  feeds.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const start = (page - 1) * pageSize;
  const paged = feeds.slice(start, start + pageSize);

  return success(res, {
    items: paged,
    total: feeds.length,
    page,
    pageSize,
    hasMore: start + pageSize < feeds.length,
  });
}

// GET /api/home?action=top5
async function handleTop5(req: VercelRequest, res: VercelResponse) {
  const weekStart = getWeekStart();
  const allItems: any[] = [];
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await bitableListRecords(PRAISE_TABLE_ID, undefined, undefined, pageToken, 100);
    allItems.push(...result.items);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  // 本周的夸赞记录
  const thisWeekItems = allItems.filter((item) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= weekStart;
  });

  // 统计每个被夸人收到的夸赞数
  const countMap: Record<string, number> = {};
  thisWeekItems.forEach((item) => {
    const fields = extractFields(item);
    const user = fields[FIELD_NAMES.PRAISED_USER] || '';
    if (user) {
      countMap[user] = (countMap[user] || 0) + 1;
    }
  });

  // 排序取前5
  const top5 = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count], index) => ({
      rank: index + 1,
      userId,
      count,
    }));

  return success(res, { items: top5 });
}
