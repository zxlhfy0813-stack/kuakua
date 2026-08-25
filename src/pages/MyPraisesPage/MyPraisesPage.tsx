import { useState, useEffect, useCallback } from 'react';
import { myPraisesApi } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import dayjs from 'dayjs';
import type { MyPraiseItem, PraiseType } from '@shared/api.interface';
import { useKuakuaAuth } from '@/auth';
import React from 'react';

// 简单的文本用户展示组件
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

const PRAISE_TYPE_CONFIG: Record<PraiseType, { label: string; bgClass: string; textClass: string }> = {
  collaboration: {
    label: '卓越协作',
    bgClass: 'bg-praise-collaboration-bg',
    textClass: 'text-praise-collaboration',
  },
  professional: {
    label: '专业精湛',
    bgClass: 'bg-praise-professional-bg',
    textClass: 'text-praise-professional',
  },
  innovation: {
    label: '积极创新',
    bgClass: 'bg-praise-innovation-bg',
    textClass: 'text-praise-innovation',
  },
  helpful: {
    label: '乐于助人',
    bgClass: 'bg-praise-helpful-bg',
    textClass: 'text-praise-helpful',
  },
};

const FILTER_OPTIONS: Array<{ value: PraiseType | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'collaboration', label: '卓越协作' },
  { value: 'professional', label: '专业精湛' },
  { value: 'innovation', label: '积极创新' },
  { value: 'helpful', label: '乐于助人' },
];

const PAGE_SIZE = 20;

const MyPraisesPage = () => {
  const { user, loading, login } = useKuakuaAuth();
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [weekAdded, setWeekAdded] = useState<number>(0);
  const [monthAdded, setMonthAdded] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  const [activeFilter, setActiveFilter] = useState<PraiseType | 'all'>('all');
  const [items, setItems] = useState<MyPraiseItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [listLoading, setListLoading] = useState<boolean>(true);

  const fetchStatistics = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await myPraisesApi.getMyPraisesStatistics();
      setTotalReceived(data.totalReceived);
      setWeekAdded(data.weekAdded);
      setMonthAdded(data.monthAdded);
    } catch (error) {
      logger.error('获取统计数据失败', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (type: PraiseType | 'all', pageNum: number) => {
    setListLoading(true);
    try {
      const typeParam = type === 'all' ? undefined : type;
      const data = await myPraisesApi.getMyPraises(typeParam, pageNum, PAGE_SIZE);
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      logger.error('获取夸夸列表失败', error);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatistics();
      fetchList(activeFilter, page);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeFilter, page, fetchStatistics, fetchList]);

  useEffect(() => {
    fetchList(activeFilter, page);
  }, [activeFilter, page, fetchList]);

  const handleFilterChange = (value: PraiseType | 'all') => {
    setActiveFilter(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!loading && !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-foreground">请先登录</p>
        <p className="text-sm text-muted-foreground">登录后即可查看你收到的夸夸</p>
        <button
          onClick={login}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          飞书扫码登录
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">我的夸夸</h1>

        <div className="mb-8 grid grid-cols-3 gap-6">
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <p className="mb-2 text-sm text-muted-foreground">收到的夸夸总数</p>
            {statsLoading ? (
              <div className="h-10 w-20 animate-pulse rounded bg-accent" />
            ) : (
              <p className="text-4xl font-extrabold text-primary">{totalReceived}</p>
            )}
          </div>
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <p className="mb-2 text-sm text-muted-foreground">本周新增</p>
            {statsLoading ? (
              <div className="h-10 w-20 animate-pulse rounded bg-accent" />
            ) : (
              <p className="text-4xl font-extrabold text-primary">{weekAdded}</p>
            )}
          </div>
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <p className="mb-2 text-sm text-muted-foreground">本月新增</p>
            {statsLoading ? (
              <div className="h-10 w-20 animate-pulse rounded bg-accent" />
            ) : (
              <p className="text-4xl font-extrabold text-primary">{monthAdded}</p>
            )}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {listLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-card p-6 shadow-sm">
                <div className="mb-3 h-5 w-32 animate-pulse rounded bg-accent" />
                <div className="mb-2 h-4 w-full animate-pulse rounded bg-accent" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-accent" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="rounded-xl bg-card shadow-sm">
              {items.map((item, index) => (
                <PraiseCard
                  key={item.id}
                  item={item}
                  isLast={index === items.length - 1}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-3 text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface PraiseCardProps {
  item: MyPraiseItem;
  isLast: boolean;
}

const PraiseCard = ({ item, isLast }: PraiseCardProps) => {
  const typeConfig = item.type ? PRAISE_TYPE_CONFIG[item.type] : null;

  return (
    <div
      className={`p-6 ${!isLast ? 'border-b border-border' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TextUserDisplay name={item.praiser} />
        </div>
        {typeConfig && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${typeConfig.bgClass} ${typeConfig.textClass}`}
          >
            {typeConfig.label}
          </span>
        )}
      </div>
      {/* <p className="mb-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {item.content}
      </p> */}
      <p className="text-xs text-muted-foreground">
        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
      </p>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-xl bg-card py-16 shadow-sm">
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      className="mb-4 text-muted-foreground/40"
    >
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      <path
        d="M30 35C30 32.2386 32.2386 30 35 30C37.7614 30 40 32.2386 40 35C40 37.7614 37.7614 40 35 40C32.2386 40 30 37.7614 30 35Z"
        fill="currentColor"
        opacity="0.3"
      />
      <path
        d="M40 45C40 42.2386 42.2386 40 45 40C47.7614 40 50 42.2386 50 45C50 47.7614 47.7614 50 45 50C42.2386 50 40 47.7614 40 45Z"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
    <p className="mb-1 text-base font-medium text-foreground">还没有收到夸夸</p>
    <p className="text-sm text-muted-foreground">
      和同事们多多互动，收获更多认可吧
    </p>
  </div>
);

export default MyPraisesPage;
