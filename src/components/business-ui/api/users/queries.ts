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
  try {
    // 优先使用 SDK
    const result = await listUsersByIds(userIds, accountType);
    // 检查结果是否有效
    const userInfoMap = result?.data?.userInfoMap || {};
    const hasValidData = userIds.some((id) => userInfoMap[id]?.name);
    if (hasValidData) {
      return result;
    }
  } catch (err) {
    console.warn('SDK listUsersByIds 失败，使用后端 API:', err);
  }

  // fallback: 使用后端 API
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
