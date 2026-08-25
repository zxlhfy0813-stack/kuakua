import { bitableListRecords } from './_lib/feishu.js';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from './_lib/constants.js';
import { success, error, extractFields, extractUserId, extractUserName, formatDate, getWeekStart, getQuery } from './_lib/utils.js';
import { getSessionUser } from './_lib/session.js';
import { getSource } from './_lib/datasource.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    const action = getQuery(request).get('action') || 'statistics';

    try {
      switch (action) {
      case 'statistics':
        return await handleStatistics(request);
      case 'feeds':
        return await handleFeeds(request);
      case 'top5':
        return await handleTop5(request);
        default:
          return error('Unknown action', 400);
      }
    } catch (err: any) {
      console.error('首页 API 错误:', err);
      return error(err?.message || '服务器错误');
    }
  },
};

// GET /api/home?action=statistics
async function handleStatistics(request: Request): Promise<Response> {
  const src = getSource(request);
  const allItems: any[] = [];
  let pageToken: string | undefined;
  let hasMore = true;

  // 获取所有记录来统计
  while (hasMore) {
    const result = await bitableListRecords(src.tableId, undefined, undefined, pageToken, 100, src.appToken);
    allItems.push(...result.items);
    hasMore = result.hasMore;
    pageToken = result.pageToken;
  }

  const weekStart = getWeekStart();
  const me = getSessionUser(request)?.open_id;
  let thisWeekCount = 0;
  let myReceivedCount = 0;
  allItems.forEach((item) => {
    const fields = extractFields(item);
    const createdAt = fields[FIELD_NAMES.CREATED_AT];
    const createdAtTs = createdAt ? new Date(createdAt).getTime() : 0;
    if (createdAtTs >= weekStart) thisWeekCount += 1;
    if (me && extractUserId(fields[FIELD_NAMES.PRAISED_USER]) === me) {
      myReceivedCount += 1;
    }
  });

  return success({
    totalCount: allItems.length,
    weekAddedCount: thisWeekCount,
    myReceivedCount,
  });
}

// GET /api/home?action=feeds&page=1&pageSize=10
async function handleFeeds(request: Request): Promise<Response> {
  const src = getSource(request);
  const query = getQuery(request);
  const page = Number(query.get('page')) || 1;
  const pageSize = Number(query.get('pageSize')) || 10;

  const { items, hasMore } = await bitableListRecords(
    src.tableId,
    undefined,
    undefined,
    undefined,
    100,
    src.appToken,
  );

  const feeds = items.map((item: any) => {
    const fields = extractFields(item);
    return {
      id: item.record_id,
      praiser: extractUserName(fields[FIELD_NAMES.PRAISER]),
      praisedUser: extractUserName(fields[FIELD_NAMES.PRAISED_USER]),
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

  return success({
    items: paged,
    total: feeds.length,
    page,
    pageSize,
    hasMore: start + pageSize < feeds.length,
  });
}

// GET /api/home?action=top5
async function handleTop5(request: Request): Promise<Response> {
  const src = getSource(request);
  const weekStart = getWeekStart();
  const allItems: any[] = [];
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await bitableListRecords(src.tableId, undefined, undefined, pageToken, 100, src.appToken);
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
  const countMap: Record<string, { userId: string; name: string; count: number }> = {};
  thisWeekItems.forEach((item) => {
    const fields = extractFields(item);
    const userId = extractUserId(fields[FIELD_NAMES.PRAISED_USER]);
    if (userId) {
      const name = extractUserName(fields[FIELD_NAMES.PRAISED_USER]);
      countMap[userId] = countMap[userId] || { userId, name, count: 0 };
      countMap[userId].count += 1;
    }
  });

  // 排序取前5
  const top5 = Object.values(countMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      name: item.name,
      count: item.count,
    }));

  return success({ items: top5 });
}
