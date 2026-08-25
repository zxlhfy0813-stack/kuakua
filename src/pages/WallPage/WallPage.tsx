import { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { toast } from 'sonner';
import { Loader2, Heart, Trash2 } from 'lucide-react';
import { wallApi, praiseApi } from '@client/src/api';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import UserCell from '@/components/UserCell';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import type {
  WallItem,
  PraiseType,
  PraiseDetailResponse,
} from '@shared/api.interface';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const PAGE_SIZE = 20;

const FILTER_OPTIONS: { label: string; value: PraiseType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '卓越协作', value: 'collaboration' },
  { label: '专业精湛', value: 'professional' },
  { label: '积极创新', value: 'innovation' },
  { label: '乐于助人', value: 'helpful' },
];

const TYPE_LABEL_MAP: Record<PraiseType, string> = {
  collaboration: '卓越协作',
  professional: '专业精湛',
  innovation: '积极创新',
  helpful: '乐于助人',
};

const TYPE_STYLE_MAP: Record<PraiseType, string> = {
  collaboration:
    'bg-praise-collaboration-bg text-praise-collaboration',
  professional:
    'bg-praise-professional-bg text-praise-professional',
  innovation:
    'bg-praise-innovation-bg text-praise-innovation',
  helpful:
    'bg-praise-helpful-bg text-praise-helpful',
};

function TypeBadge({ type }: { type: PraiseType | null }) {
  if (!type) return null;
  const label = TYPE_LABEL_MAP[type];
  const style = TYPE_STYLE_MAP[type];
  if (!label || !style) return null;
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

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

function WallCard({
  item,
  onClick,
}: {
  item: WallItem;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer rounded-xl border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mb-3 flex items-center gap-2 text-sm">
        <UserCell user={item.praiser} size="small" />
        <span className="text-muted-foreground">夸赞</span>
        <UserCell user={item.praisedUser} size="small" />
      </div>

      {/* <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-foreground">
        {item.content}
      </p> */}

      <div className="flex items-center justify-between">
        <TypeBadge type={item.type} />
        <span className="text-xs text-muted-foreground">
          {dayjs(item.createdAt).fromNow()}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        <Heart className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="mb-1 text-base font-medium text-foreground">
        暂无夸夸
      </p>
      <p className="text-sm text-muted-foreground">
        还没有人发出夸赞，去发送第一条夸夸吧
      </p>
    </div>
  );
}

function DetailDialog({
  open,
  detail,
  loading,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  detail: PraiseDetailResponse | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirming(false);
    }
  }, [open]);

  const handleDeleteClick = () => {
    if (!detail) return;
    if (confirming) {
      onDelete(detail.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>夸夸详情</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">夸赞人</span>
              <UserCell user={detail.praiser} size="small" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">被夸人</span>
              <UserCell user={detail.praisedUser} size="small" />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">夸赞理由</p>
              <p className="text-sm leading-relaxed text-foreground">
                {detail.content}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <TypeBadge type={detail.type} />
              <span className="text-xs text-muted-foreground">
                {dayjs(detail.createdAt).fromNow()}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <CanRole roles={['developer']}>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    confirming
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  {confirming ? '再次点击确认删除' : '删除此夸夸'}
                </button>
              </CanRole>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const WallPage = () => {
  const [items, setItems] = useState<WallItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<PraiseType | 'all'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detail, setDetail] = useState<PraiseDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchWall = useCallback(
    async (fetchCursor?: string, fetchType?: PraiseType) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const typeParam =
          fetchType !== undefined ? fetchType : undefined;
        const res = await wallApi.getWall(
          fetchCursor,
          typeParam,
          PAGE_SIZE,
        );
        if (fetchCursor) {
          setItems((prev) => [...prev, ...res.items]);
        } else {
          setItems(res.items);
        }
        setCursor(res.nextCursor ?? undefined);
        setHasMore(res.hasMore);
      } catch {
        toast.error('加载夸夸墙失败');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    const typeParam = activeType === 'all' ? undefined : activeType;
    fetchWall(undefined, typeParam);
  }, [activeType, fetchWall]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loadingRef.current) return;
      const typeParam = activeType === 'all' ? undefined : activeType;
      wallApi.getWall(undefined, typeParam, PAGE_SIZE).then((res) => {
        setItems((prev) => {
          if (prev.length === res.items.length && prev[0]?.id === res.items[0]?.id) {
            return prev;
          }
          return res.items;
        });
        setCursor(res.nextCursor ?? undefined);
        setHasMore(res.hasMore);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [activeType]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          hasMore &&
          !loadingRef.current &&
          cursor
        ) {
          const typeParam = activeType === 'all' ? undefined : activeType;
          fetchWall(cursor, typeParam);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, cursor, activeType, fetchWall]);

  const handleCardClick = async (item: WallItem) => {
    setDialogOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await praiseApi.getPraiseDetail(item.id);
      setDetail(res);
    } catch {
      toast.error('获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTypeChange = (type: PraiseType | 'all') => {
    if (type === activeType) return;
    setActiveType(type);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await praiseApi.deletePraise(id);
      if (result.success) {
        toast.success('删除成功');
        setDialogOpen(false);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error('无权限删除该记录');
      }
    } catch {
      toast.error('删除失败，请稍后重试');
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">夸夸墙</h1>
        <p className="text-sm text-muted-foreground">
          团队的正能量公告墙，每一句夸赞都是前行的动力
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTypeChange(opt.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                activeType === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item: WallItem) => (
            <WallCard
              key={item.id}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="py-6 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>加载中...</span>
          </div>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <p className="text-sm text-muted-foreground">没有更多了</p>
        )}
      </div>

      <DetailDialog
        open={dialogOpen}
        detail={detail}
        loading={detailLoading}
        onOpenChange={setDialogOpen}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default WallPage;
