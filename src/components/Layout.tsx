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
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
} from "@/components/ui/breadcrumb";
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
  const activeTitle =
    [...NAV_ITEMS, ...ADMIN_NAV_ITEMS].find((item) => item.path === pathname)?.label ?? "夸夸平台";

  const isAdmin = user?.open_id === ADMIN_USER_ID;

  const handleLogout = () => {
    logout();
  };

  const handleLogin = () => {
    login();
  };

  const isLoggedIn = !!user;
  const userName = user?.name ?? "游客";
  const userAvatar = isLoggedIn ? user?.avatar : GUEST_AVATAR;

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    夸
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold">{appName || "夸夸平台"}</span>
                    <span className="text-xs text-muted-foreground">
                      团队认可文化
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.path}
                      tooltip={item.label}
                    >
                      <Link to={item.path}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isAdmin &&
                  ADMIN_NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.path}
                        tooltip={item.label}
                      >
                        <Link to={item.path}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={userName}>
                    <Avatar className="size-6">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="text-xs">
                        {userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden">
                      {userName}
                    </span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="w-48"
                >
                  {isLoggedIn ? (
                    <>
                      <div className="px-2 py-1.5 text-sm">
                        <p className="font-medium">{userName}</p>
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
                          <DropdownMenuItem
                            onSelect={(e: Event) => e.preventDefault()}
                          >
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
                            <AlertDialogAction onClick={handleLogout}>
                              确认退出
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={handleLogin}>
                      <LogIn className="mr-2 size-4" />
                      登录
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden p-8">
        <header className="flex items-center gap-2 mb-6">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="text-foreground font-medium">
                {activeTitle}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </>
  );
}

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
