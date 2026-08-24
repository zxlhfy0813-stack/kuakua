import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  WallListResponse,
  PraiseType,
} from '@shared/api.interface';

export async function getWall(
  cursor?: string,
  type?: PraiseType,
  pageSize: number = 20,
): Promise<WallListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/wall',
      method: 'GET',
      params: { cursor, type, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取夸夸墙失败', error);
    throw error;
  }
}
