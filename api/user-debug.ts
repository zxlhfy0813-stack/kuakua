import { feishuRequest } from './_lib/feishu.js';
import { success, error } from './_lib/utils.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') return error('Method not allowed', 405);
    const out: any = {};
    // 1) 通讯录批量获取（需要 contact:user.base:readonly）
    try {
      const d = await feishuRequest(
        'GET',
        '/contact/v3/users?page_size=3&user_id_type=open_id',
      );
      out.list = { ok: true, total: d?.total, names: (d?.items || []).map((u: any) => u?.name) };
    } catch (e: any) {
      out.list = { ok: false, err: e?.message };
    }
    // 2) 通讯录搜索（需要 contact:user.search:readonly）
    try {
      const d = await feishuRequest(
        'POST',
        '/search/v1/user',
        { query: '张', page_size: 5, query_range: 'user' },
      );
      out.search = { ok: true, n: (d?.users || []).length };
    } catch (e: any) {
      out.search = { ok: false, err: e?.message };
    }
    return success(out);
  },
};
