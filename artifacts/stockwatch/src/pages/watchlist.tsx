import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetWatchlist,
  getGetWatchlistQueryKey,
  useGetWatchlistPrices,
  getGetWatchlistPricesQueryKey,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Plus, Trash2, TrendingUp, TrendingDown, BookMarked, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function WatchlistPage() {
  const { user, isLoading: authLoading, login } = useAuth();
  const [input, setInput] = useState("");

  const { data: watchlist, isLoading: wlLoading, refetch } = useGetWatchlist({
    query: { queryKey: getGetWatchlistQueryKey(), enabled: !!user },
  });

  const { data: prices } = useGetWatchlistPrices({
    query: { queryKey: getGetWatchlistPricesQueryKey(), enabled: !!user && (watchlist?.length ?? 0) > 0 },
  });

  const addMutation = useAddToWatchlist({
    mutation: {
      onSuccess: () => { refetch(); setInput(""); },
    },
  });

  const removeMutation = useRemoveFromWatchlist({
    mutation: { onSuccess: () => refetch() },
  });

  function addSymbol() {
    const s = input.trim().toUpperCase();
    if (!s) return;
    addMutation.mutate({ data: { symbol: s } });
  }

  function removeSymbol(symbol: string) {
    removeMutation.mutate({ symbol });
  }

  if (authLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center space-y-5"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center gold-glow">
            <BookMarked className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">قائمة المتابعة</h2>
            <p className="text-muted-foreground max-w-sm mt-2 leading-relaxed">
              سجّل دخولك لتتمكن من إضافة الأسهم ومتابعتها في وقت واحد
            </p>
          </div>
          <Button onClick={login} className="gap-2 px-8 font-semibold">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Button>
        </motion.div>
      </div>
    );
  }

  const priceMap: Record<string, { price: number; change: number; changePercent: number }> = {};
  if (prices) {
    for (const p of prices) {
      if (p.symbol) {
        priceMap[p.symbol] = {
          price: p.currentPrice ?? 0,
          change: p.change ?? 0,
          changePercent: p.changePercent ?? 0,
        };
      }
    }
  }

  const totalValue = watchlist?.reduce((acc, item) => {
    return acc + (priceMap[item.symbol ?? ""]?.price ?? 0);
  }, 0) ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">قائمة المتابعة</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{watchlist?.length ?? 0} أسهم مضافة</p>
        </div>
        {totalValue > 0 && (
          <div className="text-left">
            <p className="text-xs text-muted-foreground">إجمالي الأسعار</p>
            <p className="text-lg font-bold text-foreground">${totalValue.toFixed(2)}</p>
          </div>
        )}
      </motion.div>

      <Card className="bg-card border-card-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="أضف رمز سهم (مثال: AMZN)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              className="bg-background border-border"
            />
            <Button onClick={addSymbol} disabled={addMutation.isPending || !input.trim()} size="sm">
              <Plus className="w-4 h-4 ml-1" />
              إضافة
            </Button>
          </div>
        </CardContent>
      </Card>

      {wlLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : watchlist && watchlist.length > 0 ? (
        <AnimatePresence>
          <div className="space-y-3">
            {watchlist.map((item, i) => {
              const p = priceMap[item.symbol ?? ""];
              const isPos = (p?.changePercent ?? 0) >= 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                >
                  <Card className="card-hover bg-card border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                            <span className="font-bold text-primary text-sm">{(item.symbol ?? "?").charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{item.symbol}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.addedAt ?? "").toLocaleDateString("ar-SA")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {p ? (
                            <div className="text-left">
                              <p className="font-bold text-foreground">${p.price.toFixed(2)}</p>
                              <div className={cn("flex items-center gap-1 text-xs justify-end font-medium", isPos ? "text-green-400" : "text-red-400")}>
                                {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {isPos ? "+" : ""}{p.changePercent.toFixed(2)}%
                              </div>
                            </div>
                          ) : (
                            <Skeleton className="h-8 w-20" />
                          )}
                          <button
                            onClick={() => removeSymbol(item.symbol ?? "")}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 space-y-3"
        >
          <BookMarked className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">لا توجد أسهم في قائمتك</p>
          <p className="text-sm text-muted-foreground/50">أضف رموز الأسهم أعلاه لمتابعة أسعارها</p>
        </motion.div>
      )}
    </div>
  );
}
