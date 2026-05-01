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
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

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
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar border-l border-sidebar-border flex flex-col relative overflow-hidden">
        {/* Ambient top glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="p-5 flex items-center gap-3 relative z-10">
          <div className="relative w-10 h-10 rounded-xl bg-primary flex items-center justify-center gold-glow flex-shrink-0">
            <Zap className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-sidebar-foreground leading-tight tracking-wide">مراقب الأسهم</h1>
            <p className="text-[11px] text-muted-foreground font-medium tracking-widest uppercase">StockWatch</p>
          </div>
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
            title={theme === "dark" ? "الوضع المضيء" : "الوضع المظلم"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.span key="sun" initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -60, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="mx-4 h-px bg-gradient-to-l from-transparent via-sidebar-border to-transparent" />

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {navItems.map(({ href, label, icon: Icon }, i) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 relative group",
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-primary"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 36 }}
                    />
                  )}
                  <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200", !active && "group-hover:scale-110")} />
                  <span className="relative z-10">{label}</span>
                  {active && (
                    <div className="mr-auto relative flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground/60 relative pulse-live" />
                    </div>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 h-px bg-gradient-to-l from-transparent via-sidebar-border to-transparent" />

        {/* User area */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-10 rounded-xl bg-muted animate-pulse"
              />
            ) : user ? (
              <motion.div
                key="user"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-3"
              >
                <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-primary/30">
                  <AvatarImage src={user.profileImageUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                    {user.firstName?.charAt(0) ?? <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {user.firstName ?? "مستخدم"}
                  </p>
                  <button
                    onClick={logout}
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors duration-150 mt-0.5"
                  >
                    <LogOut className="w-3 h-3" />
                    تسجيل الخروج
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <Button
                  onClick={login}
                  className="w-full gap-2 text-sm font-semibold"
                  size="sm"
                >
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main content with page transition */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
