import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  BarChart3,
  TrendingUp,
  LineChart,
  BookMarked,
  MessageSquare,
  LogIn,
  LogOut,
  User,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "الرئيسية", icon: BarChart3 },
  { href: "/compare", label: "مقارنة الأسهم", icon: TrendingUp },
  { href: "/technical", label: "التحليل الفني", icon: LineChart },
  { href: "/watchlist", label: "قائمة المتابعة", icon: BookMarked },
  { href: "/chat", label: "المستشار الذكي", icon: MessageSquare },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading, login, logout } = useAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      <aside className="w-64 flex-shrink-0 bg-sidebar border-l border-sidebar-border flex flex-col">
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-sidebar-foreground leading-tight">مراقب الأسهم</h1>
            <p className="text-xs text-muted-foreground">StockWatch</p>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                  {active && (
                    <div className="mr-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/70" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-sidebar-border" />

        <div className="p-4">
          {isLoading ? (
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={user.profileImageUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                  {user.firstName?.charAt(0) ?? <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.firstName ?? "مستخدم"}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          ) : (
            <Button
              onClick={login}
              className="w-full gap-2 text-sm"
              size="sm"
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </Button>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
