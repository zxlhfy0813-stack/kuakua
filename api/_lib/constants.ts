/**
 * 多维表格字段名常量
 * 请根据你的飞书多维表格实际字段名修改
 */
export const FIELD_NAMES = {
  PRAISER: '夸赞人',          // 夸赞人 人员字段
  PRAISED_USER: '被夸人',     // 被夸人 人员字段
  PRAISE_TYPE: '夸赞类型',    // 单选：卓越协作 | 专业精湛 | 积极创新 | 乐于助人
  CONTENT: '夸赞内容',        // 夸赞文字内容
  LIKE_COUNT: '点赞数量',     // 点赞数
  CREATED_AT: '创建日期',     // 创建日期
};

// 夸赞类型映射
export const PRAISE_TYPE_MAP: Record<string, string> = {
  collaboration: '卓越协作',
  professional: '专业精湛',
  innovation: '积极创新',
  helpful: '乐于助人',
};

// 反向映射
export const PRAISE_TYPE_REVERSE: Record<string, string> = {
  卓越协作: 'collaboration',
  专业精湛: 'professional',
  积极创新: 'innovation',
  乐于助人: 'helpful',
};
