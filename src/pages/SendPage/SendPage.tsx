import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useKuakuaAuth } from '@/auth';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { listUsersByIds } from '@client/src/components/business-ui/api/users/service';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { praiseApi } from '@client/src/api';
import type { PraiseType } from '@shared/api.interface';
import { Loader2, Plus, Clock, ThumbsUp } from 'lucide-react';

interface PraiseTypeOption {
  key: PraiseType;
  label: string;
  bgClass: string;
  textClass: string;
}

const PRAISE_TYPE_OPTIONS: PraiseTypeOption[] = [
  {
    key: 'collaboration',
    label: '卓越协作',
    bgClass: 'bg-praise-collaboration-bg',
    textClass: 'text-praise-collaboration',
  },
  {
    key: 'professional',
    label: '专业精湛',
    bgClass: 'bg-praise-professional-bg',
    textClass: 'text-praise-professional',
  },
  {
    key: 'innovation',
    label: '积极创新',
    bgClass: 'bg-praise-innovation-bg',
    textClass: 'text-praise-innovation',
  },
  {
    key: 'helpful',
    label: '乐于助人',
    bgClass: 'bg-praise-helpful-bg',
    textClass: 'text-praise-helpful',
  },
];

interface LikeCountOption {
  key: string;
  label: string;
  value: number;
}

const LIKE_COUNT_OPTIONS: LikeCountOption[] = [
  { key: 'amazing', label: '叹为观止', value: 1000 },
  { key: 'brilliant', label: '拍案叫绝', value: 800 },
  { key: 'endless', label: '赞不绝口', value: 500 },
  { key: 'custom', label: '自定义数量', value: 0 },
];

const MAX_CONTENT_LENGTH = 500;

const getTypeOption = (
  type: PraiseType | null,
): PraiseTypeOption | undefined =>
  PRAISE_TYPE_OPTIONS.find((opt: PraiseTypeOption) => opt.key === type);

const SendPage: React.FC = () => {
  const { user } = useKuakuaAuth();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [recentUsers, setRecentUsers] = useState<{ userId: string; name: string }[]>([]);
  const [praiseType, setPraiseType] = useState<PraiseType | null>(null);
  const [content, setContent] = useState<string>('');
  const [errors, setErrors] = useState<{
    praisedUser?: string;
    content?: string;
  }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedLikeKey, setSelectedLikeKey] = useState<string | null>(null);
  const [customLikeCount, setCustomLikeCount] = useState<string>('');

  useEffect(() => {
    praiseApi.getRecentPraised().then(async (res) => {
      if (res.userIds.length === 0) return;
      try {
        const usersRes = await listUsersByIds(res.userIds);
        const userInfoMap = usersRes.data?.userInfoMap || {};
        const users = res.userIds
          .filter((id: string) => userInfoMap[id])
          .map((id: string) => ({
            userId: id,
            name: userInfoMap[id].name?.zh_cn || userInfoMap[id].name?.en_us || '未知用户',
          }));
        setRecentUsers(users);
      } catch {
        setRecentUsers([]);
      }
    });
  }, []);

  const handleToggleRecentUser = useCallback(
    (userId: string) => {
      setSelectedUserIds((prev) => {
        if (prev.includes(userId)) {
          return prev.filter((id: string) => id !== userId);
        }
        return [...prev, userId];
      });
      if (errors.praisedUser) {
        setErrors((prev) => ({ ...prev, praisedUser: undefined }));
      }
    },
    [errors.praisedUser],
  );

  const validate = useCallback((): boolean => {
    const newErrors: { praisedUser?: string; content?: string } = {};
    if (selectedUserIds.length === 0) {
      newErrors.praisedUser = '请选择被夸人';
    }
    if (!content.trim()) {
      newErrors.content = '请填写夸赞理由';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedUserIds, content]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (selectedUserIds.length === 0) return;

    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) =>
          praiseApi.createPraise({
            praisedUser: userId,
            type: praiseType ?? undefined,
            content: content.trim(),
            likeCount: 1,
            // likeCount: selectedLikeKey === 'custom'
            //   ? Math.min(1000, Math.max(0, parseInt(customLikeCount, 10) || 0))
            //   : (LIKE_COUNT_OPTIONS.find((o: LikeCountOption) => o.key === selectedLikeKey)?.value ?? undefined),
          }),
        ),
      );
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      if (successCount === selectedUserIds.length) {
        toast.success(`已成功发送 ${successCount} 份夸夸！`);
      } else if (successCount > 0) {
        toast.warning(`${successCount}/${selectedUserIds.length} 份发送成功`);
      } else {
        toast.error('发送失败，请稍后重试');
      }
      setSelectedUserIds([]);
      setPraiseType(null);
      setContent('');
      setSelectedLikeKey(null);
      setCustomLikeCount('');
      setErrors({});
    } catch {
      toast.error('发送失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }, [selectedUserIds, praiseType, content, selectedLikeKey, customLikeCount, validate]);

  const handleTypeToggle = useCallback(
    (key: PraiseType) => {
      setPraiseType((prev) => (prev === key ? null : key));
    },
    [],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= MAX_CONTENT_LENGTH) {
        setContent(val);
        if (errors.content) {
          setErrors((prev) => ({ ...prev, content: undefined }));
        }
      }
    },
    [errors.content],
  );

  const handleUserChange = useCallback(
    (value: string[]) => {
      setSelectedUserIds(value);
      if (errors.praisedUser) {
        setErrors((prev) => ({ ...prev, praisedUser: undefined }));
      }
    },
    [errors.praisedUser],
  );

  const selectedTypeOption = getTypeOption(praiseType);

  return (
    <div className="mx-auto max-w-[960px] p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">发送夸夸</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          真诚认可每一位同事，传递正能量
        </p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader className="p-6 pb-0">
          <CardTitle className="text-lg font-semibold text-foreground">
            写一份夸夸
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  被夸人 <span className="text-destructive">*</span>
                </label>
                {recentUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>最近夸过的人</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentUsers.map((user: { userId: string; name: string }) => {
                        const isSelected = selectedUserIds.includes(user.userId);
                        return (
                          <button
                            key={user.userId}
                            type="button"
                            onClick={() => handleToggleRecentUser(user.userId)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground ring-1 ring-inset ring-primary'
                                : 'border border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent'
                            }`}
                          >
                            {user.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <UserSelect
                  multiple
                  value={selectedUserIds}
                  onChange={handleUserChange}
                  placeholder="搜索并选择同事"
                />
                {errors.praisedUser && (
                  <p className="text-xs text-destructive">
                    {errors.praisedUser}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  夸赞类型
                  <span className="ml-1 text-xs text-muted-foreground">
                    (可选)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRAISE_TYPE_OPTIONS.map((option: PraiseTypeOption) => {
                    const isActive = praiseType === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleTypeToggle(option.key)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? `${option.bgClass} ${option.textClass} ring-1 ring-inset ring-current`
                            : 'border border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  点赞数量
                  <span className="ml-1 text-xs text-muted-foreground">
                    (可选)
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {LIKE_COUNT_OPTIONS.map((option: LikeCountOption) => {
                    const isActive = selectedLikeKey === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setSelectedLikeKey(isActive ? null : option.key);
                          if (option.key !== 'custom') setCustomLikeCount('');
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground ring-1 ring-inset ring-primary'
                            : 'border border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {option.label}
                        {option.key !== 'custom' && (
                          <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {option.value}赞
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedLikeKey === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={customLikeCount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        if (v === '' || (/^\d+$/.test(v) && parseInt(v, 10) <= 1000)) {
                          setCustomLikeCount(v);
                        }
                      }}
                      placeholder="0 - 1000"
                      className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs text-muted-foreground">赞</span>
                  </div>
                )}
              </div> */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  夸赞内容 <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="写下你想对TA说的话..."
                  rows={5}
                  className={`w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.content ? 'border-destructive' : 'border-border'
                  }`}
                />
                <div className="flex items-center justify-between">
                  {errors.content ? (
                    <p className="text-xs text-destructive">{errors.content}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {content.length}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  selectedUserIds.length > 1
                    ? `发送夸夸（${selectedUserIds.length}人）`
                    : '发送夸夸'
                )}
              </Button>
            </div>

            <div className="w-full lg:w-80">
              <div className="sticky top-6 space-y-4">
                <p className="text-sm font-medium text-foreground">预览效果</p>
                <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6">
                  {selectedUserIds.length > 0 ? (
                    <div key="preview-with-users" className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedUserIds.map((uid) => (
                          <UserDisplay key={uid} userId={uid} size="small" />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTypeOption && (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${selectedTypeOption.bgClass} ${selectedTypeOption.textClass}`}
                          >
                            {selectedTypeOption.label}
                          </span>
                        )}
                        {selectedLikeKey && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <ThumbsUp className="h-3 w-3" />
                            {selectedLikeKey === 'custom'
                              ? `${customLikeCount || 0}赞`
                              : `${LIKE_COUNT_OPTIONS.find((o: LikeCountOption) => o.key === selectedLikeKey)?.value ?? 0}赞`}
                          </span>
                        )}
                      </div>
                      {content ? (
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {content}
                        </p>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          夸赞内容将显示在这里...
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>来自</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-sm text-card-foreground">
                          {user?.name || '游客'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key="preview-empty" className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-3 rounded-full bg-muted p-3">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        选择被夸人后，<br />这里将显示预览效果
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendPage;
