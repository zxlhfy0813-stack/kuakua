'use client';

import { useQuery, queryOptions, type QueryClient } from '@tanstack/react-query';

import { listUsersByIds, type AccountType } from './service';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

/**
 * 带 fallback 的批量获取用户信息
 */
async function fetchUsersByIds(
  userIds: string[],
  accountType: AccountType = 'apaas',
) {
  // 直接使用后端 API（独立/飞书 webview 环境下 SDK 会失效或卡住）
  try {
    const res = await axiosForBackend({
      url: '/api/users',
      method: 'GET',
      params: { action: 'batch-get', userIds: userIds.join(',') },
    });

    return {
      data: {
        userInfoMap: res.data?.userInfoMap || {},
      },
    };
  } catch (fallbackErr) {
    console.error('后端用户 API 也失败:', fallbackErr);
    // 返回空结果，显示为 "未知用户"
    const fallbackMap: Record<string, any> = {};
    userIds.forEach((id) => {
      fallbackMap[id] = {
        user_id: id,
        name: id,
        avatar: {},
      };
    });
    return { data: { userInfoMap: fallbackMap } };
  }
}

export const userQueries = {
  all: () => ['users'] as const,
  byIds: (userIds: string[], accountType: AccountType = 'apaas') =>
    queryOptions({
      queryKey: [...userQueries.all(), 'byIds', accountType, userIds.join(',')],
      queryFn: () => fetchUsersByIds(userIds, accountType),
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      enabled: userIds.length > 0,
    }),
};

/**
 * 批量获取用户信息的 hook
 */
export function useUsersByIds(
  userIds: string[],
  accountType: AccountType = 'apaas',
) {
  return useQuery(userQueries.byIds(userIds, accountType));
}

/**
 * 清除用户缓存
 */
export function clearUserCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: userQueries.all() });
}
