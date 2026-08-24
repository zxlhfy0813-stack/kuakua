import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  RankingResponse,
  RankingExportResponse,
} from '@shared/api.interface';

export async function getRanking(
  period: string = 'week',
): Promise<RankingResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/ranking',
      method: 'GET',
      params: { action: 'list', period },
    });
    return response.data;
  } catch (error) {
    logger.error('获取排行榜失败', error);
    throw error;
  }
}

export async function exportRanking(
  period: string = 'week',
): Promise<RankingExportResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/ranking',
      method: 'GET',
      params: { action: 'export', period },
    });
    return response.data;
  } catch (error) {
    logger.error('导出排行榜失败', error);
    throw error;
  }
}
