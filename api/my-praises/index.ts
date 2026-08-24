import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableListRecords } from '../_lib/feishu';
import { FIELD_NAMES, PRAISE_TYPE_REVERSE } from '../_lib/constants';
import { success, error, extractFields, formatDate } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    const userId = req.query.userId as string | undefined;
    const typeFilter = req.query.type as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const { items } = await bitableListRecords(PRAISE_TABLE_ID);

    // 筛选我收到的夸夸
    let filtered = items;
    if (userId) {
      filtered = items.filter(
        (item: any) => extractFields(item)[FIELD_NAMES.PRAISED_USER] === userId,
      );
    }

    // 按类型筛选
    if (typeFilter) {
      const typeName = {
        collaboration: '卓越协作',
        professional: '专业精湛',
        innovation: '积极创新',
        helpful: '乐于助人',
      }[typeFilter];
      if (typeName) {
        filtered = filtered.filter(
          (item: any) => extractFields(item)[FIELD_NAMES.PRAISE_TYPE] === typeName,
        );
      }
    }

    // 按创建时间倒序
    filtered.sort((a: any, b: any) => {
      const aTime = new Date(
        extractFields(a)[FIELD_NAMES.CREATED_AT] || 0,
      ).getTime();
      const bTime = new Date(
        extractFields(b)[FIELD_NAMES.CREATED_AT] || 0,
      ).getTime();
      return bTime - aTime;
    });

    // 分页
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const list = paged.map((item: any) => {
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
      items: list,
      total,
    });
  } catch (err: any) {
    console.error('获取我的夸夸列表失败:', err);
    return error(res, err.message || '获取列表失败');
  }
}
