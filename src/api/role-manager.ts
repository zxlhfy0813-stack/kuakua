import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export interface RoleMemberUser {
  userID?: string;
  name?: { zh_cn?: string; [key: string]: string | undefined };
  avatar?: string;
}

export interface RoleMemberInfo {
  userList?: RoleMemberUser[];
  departmentList?: { id?: string; name?: { zh_cn?: string } }[];
  groupChatList?: { chatID?: string; name?: { zh_cn?: string }; avatar?: string }[];
  allEmployees?: boolean;
  public?: boolean;
  presetGroup?: { isContainsAdmin?: boolean };
}

export interface RoleInfo {
  bizID?: string;
  name?: string;
  description?: string;
  roleMembers?: RoleMemberInfo;
}

export async function getRoles(): Promise<RoleInfo[]> {
  const response = await axiosForBackend({
    url: '/api/role-manager/roles',
    method: 'GET',
  });
  if (response.status === 403) {
    throw new Error('无操作权限');
  }
  return response.data;
}

export async function addRoleMembers(
  bizID: string,
  members: Record<string, unknown>,
): Promise<void> {
  const response = await axiosForBackend({
    url: `/api/role-manager/roles/${bizID}/members`,
    method: 'POST',
    data: { members },
  });
  if (response.status === 403) {
    throw new Error('无操作权限');
  }
  return response.data;
}

export async function removeRoleMembers(
  bizID: string,
  members: Record<string, unknown>,
): Promise<void> {
  const response = await axiosForBackend({
    url: `/api/role-manager/roles/${bizID}/members/batch_remove`,
    method: 'POST',
    data: { members },
  });
  if (response.status === 403) {
    throw new Error('无操作权限');
  }
  return response.data;
}
