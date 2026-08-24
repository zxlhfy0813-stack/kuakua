import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  MyPraisesStatisticsResponse,
  MyPraisesListResponse,
  ExportPraisesResponse,
  DeletePraiseResponse,
  PraiseType,
} from '@shared/api.interface';

export async function getMyPraisesStatistics(): Promise<MyPraisesStatisticsResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/my-praises/statistics',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取我的夸夸统计失败', error);
    throw error;
  }
}

export async function getMyPraises(
  type?: PraiseType,
  page: number = 1,
  pageSize: number = 20,
): Promise<MyPraisesListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/my-praises',
      method: 'GET',
      params: { type, page, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取我的夸夸列表失败', error);
    throw error;
  }
}

export async function exportPraises(
  type?: PraiseType,
): Promise<ExportPraisesResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/my-praises/export',
      method: 'GET',
      params: { type },
    });
    return response.data;
  } catch (error) {
    logger.error('导出夸夸记录失败', error);
    throw error;
  }
}

export async function deletePraise(
  id: string,
): Promise<DeletePraiseResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/my-praises/${id}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error('删除夸夸记录失败', error);
    throw error;
  }
}
