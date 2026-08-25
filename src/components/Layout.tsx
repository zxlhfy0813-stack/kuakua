import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Send,
  Heart,
  Trophy,
  LayoutGrid,
  LogOut,
  LogIn,
  Shield,
  Database,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// 飞书 SDK hooks - 在非飞书环境中安全调用
import { useAppInfo } from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { useKuakuaAuth } from "@/auth";

const ADMIN_USER_ID = '1855639467108443';

const NAV_ITEMS = [
  { path: "/", label: "首页", icon: Home },
  { path: "/send", label: "发送夸夸", icon: Send },
  { path: "/my-praises", label: "我的夸夸", icon: Heart },
  { path: "/ranking", label: "夸夸排行榜", icon: Trophy },
  { path: "/wall", label: "夸夸墙", icon: LayoutGrid },
  { path: "/data-source", label: "数据源", icon: Database },
];

const ADMIN_NAV_ITEMS = [
  { path: "/role-management", label: "角色管理", icon: Shield },
];

const GUEST_AVATAR =
  "https://lf3-static.bytednsdoc.com/obj/eden-cn/LMfspH/ljhwZthlaukjlkulzlp/miao/no-person.svg";

function LayoutContent() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { user, login, logout } = useKuakuaAuth();

  let appInfo: any;
  try {
    appInfo = useAppInfo();
  } catch {
    appInfo = { appName: "夸夸平台" };
  }

  const appName = appInfo?.appName;
  const isAdmin = user?.open_id === ADMIN_USER_ID;
  const isLoggedIn = !!user;
  const userName = user?.name ?? "游客";
  const userAvatar = isLoggedIn ? user?.avatar : GUEST_AVATAR;

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              夸
            </div>
            <span className="hidden font-semibold sm:inline">{appName || "夸夸平台"}</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                  pathname === item.path ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {isAdmin &&
              ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                    pathname === item.path ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-2 rounded-full px-1.5 py-1 hover:bg-accent">
                <Avatar className="size-7">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="text-xs">{userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[8rem] truncate text-sm sm:inline">{userName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-48">
              {isLoggedIn ? (
                <>
                  <div className="px-2 py-1.5 text-sm">
                    <p className="truncate font-medium">{userName}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/my-praises")}>
                    <Heart className="mr-2 size-4" />
                    我的夸夸
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/send")}>
                    <Send className="mr-2 size-4" />
                    发送夸夸
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wall")}>
                    <LayoutGrid className="mr-2 size-4" />
                    夸夸墙
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
                        <LogOut className="mr-2 size-4" />
                        退出登录
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
                        <AlertDialogDescription>
                          退出后需要重新登录才能使用夸夸平台
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={logout}>确认退出</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <DropdownMenuItem onClick={login}>
                  <LogIn className="mr-2 size-4" />
                  登录
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

const Layout = () => {
  return <LayoutContent />;
};

export default Layout;
