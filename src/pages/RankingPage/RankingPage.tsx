import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Award, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import UserCell from '@/components/UserCell';
import { getRanking, exportRanking } from '@client/src/api/ranking';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { RankingItem } from '@shared/api.interface';
import { cn } from '@/lib/utils';

// 简单的文本用户展示组件
const TextUserDisplay: React.FC<{ name: string; size?: 'small' | 'large' }> = ({ name, size = 'small' }) => {
  const isLarge = size === 'large';
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full bg-muted",
      isLarge ? "px-3 py-1 text-base" : "px-2 py-0.5 text-sm"
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary",
        isLarge ? "h-6 w-6 text-sm" : "h-4 w-4 text-[10px]"
      )}>
        {name.charAt(0)}
      </div>
      <span className="text-card-foreground">{name}</span>
    </span>
  );
};

// 判断是否为有效的妙搭 user_id（uuid 格式）
const isValidUserId = (id: string): boolean => {
  if (!id) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return true;
  if (/^\d+$/.test(id)) return true;
  if (id.startsWith('recognized_')) return true;
  return false;
};

type Period = 'week' | 'month';

const RANKING_PAGE_TABS: { key: Period; label: string }[] = [
  { key: 'week', label: '本周榜' },
  { key: 'month', label: '本月榜' },
];

const PERIOD_LABEL: Record<Period, string> = {
  week: '本周榜',
  month: '本月榜',
};

const RANKING_MEDAL_CONFIG: Record<
  number,
  {
    icon: React.ReactNode;
    gradient: string;
    iconColor: string;
  }
> = {
  1: {
    icon: <Trophy className="h-7 w-7" />,
    gradient:
      'bg-gradient-to-r from-[hsl(45_90%_85%)] to-[hsl(45_70%_92%)]',
    iconColor: 'text-[hsl(45_80%_45%)]',
  },
  2: {
    icon: <Medal className="h-7 w-7" />,
    gradient:
      'bg-gradient-to-r from-[hsl(0_0%_88%)] to-[hsl(0_0%_94%)]',
    iconColor: 'text-[hsl(0_0%_50%)]',
  },
  3: {
    icon: <Award className="h-7 w-7" />,
    gradient:
      'bg-gradient-to-r from-[hsl(25_60%_80%)] to-[hsl(25_40%_88%)]',
    iconColor: 'text-[hsl(25_50%_40%)]',
  },
};

const RankingPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>('week');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const fetchRanking = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const data = await getRanking(p);
      setItems(data.items);
    } catch (error) {
      logger.error('获取排行榜失败', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking(period);
  }, [period, fetchRanking]);

  const handleTabChange = (tab: Period) => {
    if (tab !== period) {
      setPeriod(tab);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const data = await exportRanking(period);

      const rows = data.items.map((item) => ({
        '排名': item.rank,
        '用户ID': item.userId,
        '收到夸夸次数': item.count,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 24 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      const sheetName = period === 'week' ? '本周榜' : '本月榜';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const fileName = `夸夸排行榜_${PERIOD_LABEL[period]}_${dayjs().format('YYYY-MM-DD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`已导出 ${rows.length} 条排行榜记录`);
    } catch (error) {
      logger.error('导出排行榜失败', error);
      toast.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  }, [period]);

  return (
    <div className="mx-auto max-w-[800px] p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            夸夸排行榜
          </h1>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? '导出中...' : '下载榜单'}
        </button>
      </div>

      <div className="mb-6 flex gap-6 border-b border-border">
        {RANKING_PAGE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'relative pb-3 text-sm font-medium transition-colors',
              period === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {period === tab.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <RankingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {items.slice(0, 3).map((item: RankingItem) => (
            <TopRankRow key={item.userId} item={item} />
          ))}

          {items.length > 3 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {items.slice(3).map((item: RankingItem, idx: number) => (
                <NormalRankRow
                  key={item.userId}
                  item={item}
                  isOdd={idx % 2 === 0}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TopRankRow: React.FC<{ item: RankingItem }> = ({ item }) => {
  const config = RANKING_MEDAL_CONFIG[item.rank];
  if (!config) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl px-5 py-4 shadow-sm',
        config.gradient,
      )}
    >
      <div className={cn('flex-shrink-0', config.iconColor)}>
        {config.icon}
      </div>

      <span className="w-6 text-center text-xl font-extrabold text-foreground">
        {item.rank}
      </span>

      <div className="flex-shrink-0">
        <UserCell user={{ user_id: item.userId, name: item.name }} size="small" />
      </div>

      <div className="ml-auto flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-primary">
          {item.count}
        </span>
        <span className="text-xs text-muted-foreground">赞</span>
      </div>
    </div>
  );
};

const NormalRankRow: React.FC<{
  item: RankingItem;
  isOdd: boolean;
}> = ({ item, isOdd }) => (
  <div
    className={cn(
      'flex items-center gap-4 px-5 py-3',
      isOdd ? 'bg-muted/50' : 'bg-card',
    )}
  >
    <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
      {item.rank}
    </span>

    <div className="flex-shrink-0">
        <UserCell user={{ user_id: item.userId, name: item.name }} size="small" />
    </div>

    <div className="ml-auto flex items-baseline gap-1">
      <span className="text-lg font-bold text-primary">
        {item.count}
      </span>
      <span className="text-xs text-muted-foreground">赞</span>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <Trophy className="mb-4 h-16 w-16 text-muted-foreground/30" />
    <p className="text-base text-muted-foreground">
      还没有夸夸记录，快去发送第一条夸夸吧！
    </p>
  </div>
);

const RankingSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2">
    {[1, 2, 3].map((i: number) => (
      <div
        key={i}
        className="flex animate-pulse items-center gap-4 rounded-xl bg-accent px-5 py-4"
      >
        <div className="h-7 w-7 rounded-full bg-accent-foreground/10" />
        <div className="h-6 w-6 rounded bg-accent-foreground/10" />
        <div className="h-10 w-10 rounded-full bg-accent-foreground/10" />
        <div className="h-4 w-20 rounded bg-accent-foreground/10" />
        <div className="ml-auto h-6 w-10 rounded bg-accent-foreground/10" />
      </div>
    ))}
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      {[4, 5, 6, 7].map((i: number) => (
        <div
          key={i}
          className={cn(
            'flex animate-pulse items-center gap-4 px-5 py-3',
            i % 2 !== 0 ? 'bg-muted/50' : 'bg-card',
          )}
        >
          <div className="h-5 w-6 rounded bg-accent-foreground/10" />
          <div className="h-8 w-8 rounded-full bg-accent-foreground/10" />
          <div className="h-4 w-16 rounded bg-accent-foreground/10" />
          <div className="ml-auto h-5 w-8 rounded bg-accent-foreground/10" />
        </div>
      ))}
    </div>
  </div>
);

export default RankingPage;
