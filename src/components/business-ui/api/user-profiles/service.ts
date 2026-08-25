import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { AccountType, UserProfileData } from '@lark-apaas/client-toolkit/tools/services';

/**
 * 获取用户 Profile 卡片数据
 * 独立站不使用妙搭 webComponent（会失败），改为用自研 /api/users 接口返回简单名片
 */
export async function fetchUserProfile(
  userId: string,
  accountType: AccountType = 'apaas',
  signal?: AbortSignal,
): Promise<UserProfileData> {
  try {
    const res = await axiosForBackend({
      url: '/api/users',
      method: 'GET',
      params: { action: 'batch-get', userIds: userId },
      signal,
    });
    const info = res.data?.userInfoMap?.[userId] || {};
    const name = info?.name?.zh_cn || info?.name?.en_us || info?.name || userId;
    const avatar = info?.avatar?.avatar_72 || info?.avatar?.avatar_240 || '';
    const email = info?.email || '';
    return {
      useLarkCard: false,
      userProfileInfo: { name, avatar, email },
    } as unknown as UserProfileData;
  } catch (e) {
    throw new Error('获取名片失败');
  }
}

export type { AccountType, UserProfileData };
