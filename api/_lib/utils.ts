import type { VercelResponse } from '@vercel/node';

/**
 * 统一 API 响应格式
 */
export function success(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json(data);
}

export function error(res: VercelResponse, message: string, status = 500) {
  return res.status(status).json({ error: message });
}

/**
 * 从多维表格记录中提取字段值
 */
export function extractFields(record: any): Record<string, any> {
  return record?.fields || {};
}

/**
 * 格式化日期为 ISO 字符串
 */
export function formatDate(dateStr: string | number): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * 获取本周起始时间戳（周一 00:00:00）
 */
export function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay() || 7; // 周日为 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * 获取本月起始时间戳
 */
export function getMonthStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
