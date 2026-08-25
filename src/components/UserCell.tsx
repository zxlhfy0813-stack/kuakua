import React from 'react';
import { UserDisplay } from '@client/src/components/business-ui/user-display';

type AnyUser = { user_id?: string; name?: string; avatar?: string } | string;

// 人员单元格：有 open_id 就实时从飞书通讯录拉当前人员信息（与组织同步），否则退化为纯文字
const UserCell: React.FC<{ user?: AnyUser | null; size?: 'small' | 'medium' | 'large' }> = ({
  user,
  size,
}) => {
  const uid = user && typeof user === 'object' ? user.user_id || '' : typeof user === 'string' && user ? user : '';
  const name = user && typeof user === 'object' ? user.name || '' : typeof user === 'string' ? user : '';

  if (uid) {
    return <UserDisplay userId={uid} size={size} />;
  }
  if (name) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-sm">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
          {name.charAt(0)}
        </div>
        <span className="text-card-foreground">{name}</span>
      </span>
    );
  }
  return null;
};

export default UserCell;
