import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  HomeStatisticsResponse,
  HomeFeedsResponse,
  HomeTop5Response,
} from '@shared/api.interface';

export async function getHomeStatistics(): Promise<HomeStatisticsResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/home',
      method: 'GET',
      params: { action: 'statistics' },
    });
    return response.data;
  } catch (error) {
    logger.error('获取首页统计失败', error);
    throw error;
  }
}

export async function getHomeFeeds(
  cursor?: string,
  pageSize: number = 20,
): Promise<HomeFeedsResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/home',
      method: 'GET',
      params: { action: 'feeds', cursor, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取首页动态失败', error);
    throw error;
  }
}

export async function getHomeTop5(): Promise<HomeTop5Response> {
  try {
    const response = await axiosForBackend({
      url: '/api/home',
      method: 'GET',
      params: { action: 'top5' },
    });
    return response.data;
  } catch (error) {
    logger.error('获取首页TOP5失败', error);
    throw error;
  }
}
