import { bitableListRecords } from './_lib/feishu.js';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from './_lib/constants.js';
import { success, error, extractFields, extractUserId, extractUserName, formatDate, getQuery } from './_lib/utils.js';
import { getSource } from './_lib/datasource.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return error('Method not allowed', 405);
    }

    try {
      const query = getQuery(request);
      const src = getSource(request);
      const { items, pageToken, hasMore } = await bitableListRecords(
        src.tableId,
        undefined,
        undefined,
        query.get('cursor') || undefined,
        Number(query.get('pageSize')) || 20,
        src.appToken,
      );

      const wallItems = items.map((item: any) => {
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
      wallItems.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // 按类型筛选
      const typeFilter = query.get('type') || undefined;
      const filtered = typeFilter
        ? wallItems.filter((item: any) => item.type === typeFilter)
        : wallItems;

      return success({
        items: filtered,
        nextCursor: hasMore ? pageToken : null,
        hasMore,
      });
    } catch (err: any) {
      console.error('获取夸夸墙失败:', err);
      return error(err?.message || '获取夸夸墙失败');
    }
  },
};
