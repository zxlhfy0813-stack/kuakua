import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CreatePraiseRequest,
  CreatePraiseResponse,
  PraiseDetailResponse,
  DeletePraiseResponse,
  RecentPraisedResponse,
} from '@shared/api.interface';

export async function createPraise(
  data: CreatePraiseRequest,
): Promise<CreatePraiseResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/praises',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('发送夸夸失败', error);
    throw error;
  }
}

export async function getPraiseDetail(
  id: string,
): Promise<PraiseDetailResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/praises/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取夸夸详情失败', error);
    throw error;
  }
}

export async function getRecentPraised(): Promise<RecentPraisedResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/praises/recent-praised',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取最近夸过的人失败', error);
    return { userIds: [], userInfos: [] };
  }
}

export async function deletePraise(
  id: string,
): Promise<DeletePraiseResponse> {
  const response = await axiosForBackend({
    url: `/api/praises/${id}`,
    method: 'DELETE',
  });
  if (response.status === 403) {
    throw new Error('无操作权限，请联系管理员分配开发者角色');
  }
  return response.data;
}
