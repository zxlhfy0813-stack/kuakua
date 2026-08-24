import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { Users, TrendingUp, Heart, Send, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  HomeStatisticsResponse,
  HomeFeedsResponse,
  HomeFeedItem,
  HomeTop5Response,
  Top5Item,
  PraiseType,
} from '@shared/api.interface';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const PRAISE_TYPE_LABEL: Record<PraiseType, string> = {
  collaboration: '卓越协作',
  professional: '专业精湛',
  innovation: '积极创新',
  helpful: '乐于助人',
};

const PRAISE_TYPE_STYLE: Record<PraiseType, string> = {
  collaboration:
    'bg-praise-collaboration-bg text-praise-collaboration',
  professional:
    'bg-praise-professional-bg text-praise-professional',
  innovation:
    'bg-praise-innovation-bg text-praise-innovation',
  helpful: 'bg-praise-helpful-bg text-praise-helpful',
};

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <div className="flex items-center gap-5 rounded-xl bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
      {icon}
    </div>
    <div>
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  </div>
);

interface PraiseTagProps {
  type: PraiseType | null;
}

const PraiseTag: React.FC<PraiseTagProps> = ({ type }) => {
  if (!type || !PRAISE_TYPE_LABEL[type]) return null;
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${PRAISE_TYPE_STYLE[type]}`}
    >
      {PRAISE_TYPE_LABEL[type]}
    </span>
  );
};

interface FeedCardProps {
  item: HomeFeedItem;
}

// 简单的文本用户展示组件（用于纯文本用户名）
const TextUserDisplay: React.FC<{ name: string }> = ({ name }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-sm">
    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
      {name.charAt(0)}
    </div>
    <span className="text-card-foreground">{name}</span>
  </span>
);

// 判断是否为有效的妙搭 user_id（uuid 格式）
const isValidUserId = (id: string): boolean => {
  if (!id) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return true;
  if (/^\d+$/.test(id)) return true;
  if (id.startsWith('recognized_')) return true;
  return false;
};

const FeedCard: React.FC<FeedCardProps> = ({ item }) => (
  <div className="rounded-xl bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div className="flex items-center gap-2 text-sm">
      <UserDisplay userId={item.praiser} size="small" />
      <span className="text-muted-foreground">夸了</span>
      <UserDisplay userId={item.praisedUser} size="small" />
    </div>
    {/* <p className="mt-3 text-sm leading-relaxed text-foreground">
      {item.content}
    </p> */}
    <div className="mt-3 flex items-center justify-between">
      <PraiseTag type={item.type} />
      <span className="text-xs text-muted-foreground">
        {dayjs(item.createdAt).fromNow()}
      </span>
    </div>
  </div>
);

interface Top5RowProps {
  item: Top5Item;
}

const MEDAL_COLORS: Record<number, string> = {
  1: 'from-yellow-300 to-yellow-500',
  2: 'from-gray-300 to-gray-400',
  3: 'from-orange-300 to-orange-500',
};

const Top5Row: React.FC<Top5RowProps> = ({ item }) => {
  const medalGradient = MEDAL_COLORS[item.rank];
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        medalGradient
          ? `bg-gradient-to-r ${medalGradient} bg-opacity-15`
          : ''
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          medalGradient
            ? 'bg-white/80 text-foreground'
            : 'bg-accent text-muted-foreground'
        }`}
      >
        {item.rank}
      </span>
      <div className="min-w-0 flex-1">
        <UserDisplay userId={item.userId} size="small" />
      </div>
      <span className="shrink-0 text-sm font-semibold text-primary">
        {item.count}次
      </span>
    </div>
  );
};

const EmptyFeed: React.FC = () => (
  <div className="flex flex-col items-center justify-center rounded-xl bg-card py-16 shadow-sm">
    <Heart className="h-12 w-12 text-muted-foreground/40" />
    <p className="mt-4 text-muted-foreground">还没有夸夸动态</p>
    <Link to="/send" className="mt-4">
      <Button>
        <Send className="mr-2 h-4 w-4" />
        发送第一条夸夸
      </Button>
    </Link>
  </div>
);

const EmptyTop5: React.FC = () => (
  <div className="flex flex-col items-center py-8 text-muted-foreground">
    <Trophy className="h-8 w-8 opacity-40" />
    <p className="mt-2 text-sm">本周暂无排行数据</p>
  </div>
);

const PAGE_SIZE = 20;

async function fetchHomeStatistics(): Promise<HomeStatisticsResponse> {
  const res = await axiosForBackend({ url: '/api/home/statistics', method: 'GET' });
  return res.data;
}

async function fetchHomeFeeds(cursor?: string, pageSize: number = 20): Promise<HomeFeedsResponse> {
  const res = await axiosForBackend({ url: '/api/home/feeds', method: 'GET', params: { cursor, pageSize } });
  return res.data;
}

async function fetchHomeTop5(): Promise<HomeTop5Response> {
  const res = await axiosForBackend({ url: '/api/home/top5', method: 'GET' });
  return res.data;
}

const HomePage: React.FC = () => {
  const [stats, setStats] = useState<HomeStatisticsResponse | null>(null);
  const [feeds, setFeeds] = useState<HomeFeedItem[]>([]);
  const [top5, setTop5] = useState<Top5Item[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [statsData, feedsData, top5Data] = await Promise.all([
          fetchHomeStatistics(),
          fetchHomeFeeds(undefined, PAGE_SIZE),
          fetchHomeTop5(),
        ]);
        setStats(statsData);
        setFeeds(feedsData.items);
        setNextCursor(feedsData.nextCursor);
        setHasMore(feedsData.hasMore);
        setTop5(top5Data.items);
      } catch (err) {
        logger.error('首页数据加载失败', err);
        toast.error('数据加载失败，请稍后重试');
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (loadingRef.current) return;
      try {
        const [statsData, feedsData, top5Data] = await Promise.all([
          fetchHomeStatistics(),
          fetchHomeFeeds(undefined, PAGE_SIZE),
          fetchHomeTop5(),
        ]);
        setStats(statsData);
        setFeeds(feedsData.items);
        setNextCursor(feedsData.nextCursor);
        setHasMore(feedsData.hasMore);
        setTop5(top5Data.items);
      } catch {
        // Silent fail for background polling
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !nextCursor) return;
    loadingRef.current = true;
    setLoadingFeeds(true);
    try {
      const data = await fetchHomeFeeds(nextCursor, PAGE_SIZE);
      setFeeds((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      logger.error('加载更多动态失败', err);
      toast.error('加载更多失败');
    } finally {
      setLoadingFeeds(false);
      loadingRef.current = false;
    }
  }, [hasMore, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingFeeds) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingFeeds, loadMore]);

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 指标卡区域 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          icon={<Users className="h-7 w-7" />}
          value={stats?.totalCount ?? 0}
          label="夸夸总数"
        />
        <StatCard
          icon={<TrendingUp className="h-7 w-7" />}
          value={stats?.weekAddedCount ?? 0}
          label="本周新增"
        />
        <StatCard
          icon={<Heart className="h-7 w-7" />}
          value={stats?.myReceivedCount ?? 0}
          label="我收到的夸夸"
        />
      </div>

      {/* 动态流 + TOP5 分栏 */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 左侧动态流 */}
        <div className="min-w-0 flex-1 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            最新动态
          </h2>
          {feeds.length === 0 ? (
            <EmptyFeed />
          ) : (
            <>
              {feeds.map((item: HomeFeedItem) => (
                <FeedCard key={item.id} item={item} />
              ))}
              <div ref={sentinelRef} className="py-4 text-center">
                {loadingFeeds && (
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                {!hasMore && feeds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    没有更多动态了
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 右侧 TOP5 */}
        <div className="w-full shrink-0 space-y-4 lg:w-80">
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                本周 TOP5
              </h2>
            </div>
            {top5.length === 0 ? (
              <EmptyTop5 />
            ) : (
              <div className="space-y-1">
                {top5.map((item: Top5Item) => (
                  <Top5Row key={item.userId} item={item} />
                ))}
              </div>
            )}
          </div>
          <Link to="/send" className="block">
            <Button className="w-full" size="lg">
              <Send className="mr-2 h-4 w-4" />
              发送夸夸
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
