import { useState } from "react";
import { useGetWatchlist, useGetWatchlistPrices, useAddToWatchlist, useRemoveFromWatchlist } from "@workspace/api-client-react";
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: watchlist, isLoading: wlLoading, refetch } = useGetWatchlist({
    query: { enabled: !!user } as any,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prices } = useGetWatchlistPrices({
    query: { enabled: !!user && (watchlist?.length ?? 0) > 0 } as any,
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookMarked className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">قائمة المتابعة</h2>
          <p className="text-muted-foreground max-w-sm">
            سجّل دخولك لتتمكن من إضافة الأسهم ومتابعتها في وقت واحد
          </p>
          <Button onClick={login} className="gap-2">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Button>
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">قائمة المتابعة</h2>
          <p className="text-sm text-muted-foreground">{watchlist?.length ?? 0} أسهم مضافة</p>
        </div>
        {totalValue > 0 && (
          <div className="text-left">
            <p className="text-xs text-muted-foreground">إجمالي الأسعار</p>
            <p className="text-lg font-bold text-foreground">${totalValue.toFixed(2)}</p>
          </div>
        )}
      </div>

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
        <div className="space-y-3">
          {watchlist.map((item) => {
            const p = priceMap[item.symbol ?? ""];
            const isPos = (p?.changePercent ?? 0) >= 0;
            return (
              <Card key={item.id} className="bg-card border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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
                          <div className={cn("flex items-center gap-1 text-xs justify-end", isPos ? "text-green-400" : "text-red-400")}>
                            {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPos ? "+" : ""}{p.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        <Skeleton className="h-8 w-20" />
                      )}
                      <button
                        onClick={() => removeSymbol(item.symbol ?? "")}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3">
          <BookMarked className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground">لا توجد أسهم في قائمتك</p>
          <p className="text-sm text-muted-foreground/60">أضف رموز الأسهم أعلاه لمتابعة أسعارها</p>
        </div>
      )}
    </div>
  );
}
