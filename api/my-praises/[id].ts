import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bitableDeleteRecord } from '../_lib/feishu';
import { success, error } from '../_lib/utils';

const PRAISE_TABLE_ID = process.env.PRAISE_TABLE_ID || 'tblpraise';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return error(res, 'Method not allowed', 405);
  }

  try {
    const { id } = req.query;
    await bitableDeleteRecord(PRAISE_TABLE_ID, id as string);
    return success(res, { success: true });
  } catch (err: any) {
    console.error('删除夸夸失败:', err);
    return error(res, err.message || '删除失败');
  }
}
