/**
 * 夸赞类型
 */
export type PraiseType = 'collaboration' | 'professional' | 'innovation' | 'helpful';

/**
 * 人员（飞书样式：头像+名字）
 */
export type UserRef = { user_id?: string; name?: string; avatar?: string } | string;

/**
 * 创建夸赞请求
 */
export type CreatePraiseRequest = {
  praisedUser: string;
  type?: PraiseType;
  content: string;
  likeCount?: number;
};

/**
 * 创建夸赞响应
 */
export type CreatePraiseResponse = {
  id: string;
  success: boolean;
};

/**
 * 夸赞详情响应
 */
export type PraiseDetailResponse = {
  id: string;
  praiser: UserRef;
  praisedUser: UserRef;
  content: string;
  type: PraiseType | null;
  likeCount: number;
  createdAt: string;
};

/**
 * 删除夸赞响应
 */
export type DeletePraiseResponse = {
  success: boolean;
};

/**
 * 最近被夸响应
 */
export type RecentPraisedResponse = {
  userIds: string[];
  userInfos: any[];
};

/**
 * 首页统计响应
 */
export type HomeStatisticsResponse = {
  totalCount: number;
  weekAddedCount: number;
  myReceivedCount: number;
};

/**
 * 首页动态项
 */
export type HomeFeedItem = {
  id: string;
  praiser: UserRef;
  praisedUser: UserRef;
  content: string;
  type: PraiseType | null;
  likeCount: number;
  createdAt: string;
};

/**
 * 首页动态响应
 */
export type HomeFeedsResponse = {
  items: HomeFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * TOP5 项
 */
export type Top5Item = {
  userId: string;
  name?: string;
  count: number;
  rank: number;
};

/**
 * 首页 TOP5 响应
 */
export type HomeTop5Response = {
  items: Top5Item[];
};

/**
 * 墙列表项
 */
export type WallItem = {
  id: string;
  praiser: UserRef;
  praisedUser: UserRef;
  content: string;
  type: PraiseType | null;
  likeCount: number;
  createdAt: string;
};

/**
 * 墙列表响应
 */
export type WallListResponse = {
  items: WallItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * 排行榜项
 */
export type RankingItem = {
  userId: string;
  name?: string;
  count: number;
  rank: number;
};

/**
 * 排行榜响应
 */
export type RankingResponse = {
  items: RankingItem[];
};

/**
 * 排行榜导出响应
 */
export type RankingExportResponse = {
  items: RankingItem[];
};

/**
 * 我的夸夸统计响应
 */
export type MyPraisesStatisticsResponse = {
  totalReceived: number;
  weekAdded: number;
  monthAdded: number;
};

/**
 * 我的夸夸列表项
 */
export type MyPraiseItem = {
  id: string;
  praiser: UserRef;
  praisedUser: UserRef;
  content: string;
  type: PraiseType | null;
  likeCount: number;
  createdAt: string;
};

/**
 * 我的夸夸列表响应
 */
export type MyPraisesListResponse = {
  items: MyPraiseItem[];
  total: number;
};

/**
 * 导出夸夸响应
 */
export type ExportPraisesResponse = {
  items: MyPraiseItem[];
};
