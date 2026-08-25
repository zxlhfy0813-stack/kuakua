import { readCookie } from './session.js';

export interface DataSource {
  name: string;
  appToken: string;
  tableId: string;
}

const DS_COOKIE = 'kuakua_ds';

/**
 * 读取当前激活的数据源（前端在「数据源设置」里写入 cookie）。
 * 未设置时回退到环境变量默认值。
 */
export function getSource(request: Request): { appToken: string; tableId: string } {
  const raw = readCookie(request, DS_COOKIE);
  if (raw) {
    try {
      const ds = JSON.parse(decodeURIComponent(raw));
      if (ds && ds.appToken && ds.tableId) {
        return { appToken: ds.appToken, tableId: ds.tableId };
      }
    } catch {
      // ignore malformed
    }
  }
  return {
    appToken: process.env.BITABLE_APP_TOKEN || '',
    tableId: process.env.PRAISE_TABLE_ID || 'tblpraise',
  };
}
