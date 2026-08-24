import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { UserPlus, X, Shield, Loader2 } from 'lucide-react';
import { roleManagerApi } from '@client/src/api';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import type { User } from '@client/src/components/business-ui/types/user';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type { RoleMemberUser } from '@client/src/api/role-manager';
import { Image } from '@client/src/components/ui/image';

const ROLE_BIZ_ID = 'developer';

function MemberRow({
  member,
  onRemove,
}: {
  member: RoleMemberUser;
  onRemove: (userId: string) => void;
}) {
  const userId = member.userID;
  if (!userId) return null;

  const displayName = member.name?.zh_cn || userId;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        {member.avatar ? (
          <Image src={member.avatar} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {displayName.charAt(0)}
          </div>
        )}
        <span className="rounded-md bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground">
          {displayName}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(userId)}
      >
        <X className="mr-1 h-4 w-4" />
        移除
      </Button>
    </div>
  );
}

export default function RoleManagementPage() {
  const [members, setMembers] = useState<RoleMemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const roles = await roleManagerApi.getRoles();
      const devRole = roles.find((r) => r.bizID === ROLE_BIZ_ID);
      setMembers(devRole?.roleMembers?.userList ?? []);
    } catch {
      toast.error('加载成员列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;

    setSaving(true);
    try {
      const userList = selectedUsers
        .map((u) => ({ userID: u.user_id }))
        .filter((u): u is { userID: string } => !!u.userID);

      if (userList.length === 0) {
        toast.error('未选中有效用户');
        return;
      }

      await roleManagerApi.addRoleMembers(ROLE_BIZ_ID, { userList });
      toast.success(`已添加 ${userList.length} 位成员`);
      setAddOpen(false);
      setSelectedUsers([]);
      setLoading(true);
      await loadMembers();
    } catch {
      toast.error('添加成员失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await roleManagerApi.removeRoleMembers(ROLE_BIZ_ID, {
        userList: [{ userID: userId }],
      });
      toast.success('已移除成员');
      setRemoveTarget(null);
      setMembers((prev) => prev.filter((m) => m.userID !== userId));
    } catch {
      toast.error('移除成员失败');
    }
  };

  return (
    <div className="mx-auto max-w-[800px]">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">角色管理</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          管理开发者角色的成员，拥有开发者角色的人员可以删除夸夸记录
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">开发者</h2>
            <p className="text-xs text-muted-foreground">
              拥有删除夸夸记录的权限
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {members.length} 位成员
          </Badge>
        </div>

        <div className="mb-4 border-t border-border pt-4">
          <Button
            size="sm"
            onClick={() => {
              setSelectedUsers([]);
              setAddOpen(true);
            }}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            添加成员
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              暂无开发者成员
            </p>
            <p className="text-xs text-muted-foreground/60">
              点击上方按钮添加成员
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <MemberRow
                key={member.userID}
                member={member}
                onRemove={(id) => setRemoveTarget(id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedUsers([]);
          setAddOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加开发者成员</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-3 text-sm text-muted-foreground">
              搜索并选择要添加为开发者的用户
            </p>
            <UserSelect
              multiple
              valueType="object"
              value={selectedUsers}
              onChange={(val) => setSelectedUsers((val as User[]) ?? [])}
              placeholder="搜索用户..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedUsers.length === 0 || saving}
            >
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              添加 {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除该成员？</AlertDialogTitle>
            <AlertDialogDescription>
              移除后该用户将失去开发者角色，无法删除夸夸记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) handleRemove(removeTarget);
              }}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
