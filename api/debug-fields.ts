import { feishuRequest } from './_lib/feishu.js';
import { success, error } from './_lib/utils.js';

const APP_TOKEN = process.env.BITABLE_APP_TOKEN!;
const TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') return error('Method not allowed', 405);
    try {
      const fields = await feishuRequest(
        'GET',
        `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/fields`,
      );
      const records = await feishuRequest(
        'GET',
        `/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=2`,
      );
      return success({ fields: fields.items, sample: records.items });
    } catch (e: any) {
      return error(e?.message || 'err', 500);
    }
  },
};
