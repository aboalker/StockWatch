import { useState, useEffect, useRef } from "react";
import {
  useSearchStocks,
  useGetStockQuote,
  useGetStockCandles,
  useGetCompanyProfile,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Search, Building2, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatPrice(p: number | undefined) {
  if (p == null) return "—";
  return p.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(c: number | undefined) {
  if (c == null) return "—";
  const sign = c >= 0 ? "+" : "";
  return `${sign}${c.toFixed(2)}`;
}

function formatPct(p: number | undefined) {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

const PERIODS = [
  { label: "أسبوع", value: "W", resolution: "60", from: 7 },
  { label: "شهر", value: "M", resolution: "D", from: 30 },
  { label: "٣ أشهر", value: "3M", resolution: "D", from: 90 },
  { label: "سنة", value: "Y", resolution: "W", from: 365 },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState(PERIODS[1]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = useSearchStocks(
    { q: query },
    { query: { enabled: query.length >= 2 } }
  );

  const now = Math.floor(Date.now() / 1000);
  const from = now - period.from * 24 * 60 * 60;

  const { data: quote, isLoading: quoteLoading } = useGetStockQuote(symbol);
  const { data: profile } = useGetCompanyProfile(symbol);
  const { data: candles, isLoading: candlesLoading } = useGetStockCandles(symbol, {
    resolution: period.resolution,
    from,
    to: now,
  });

  const chartData = candles?.t?.map((t: number, i: number) => ({
    time: new Date(t * 1000).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    price: candles.c?.[i],
  })) ?? [];

  const isPositive = (quote?.d ?? 0) >= 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectSymbol(s: string) {
    setSymbol(s.toUpperCase());
    setQuery("");
    setShowDropdown(false);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الرئيسية</h2>
          <p className="text-sm text-muted-foreground">ابحث عن سهم وتتبع أداءه</p>
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pr-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            placeholder="ابحث عن سهم (مثال: AAPL، MSFT، TSLA)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
          />
        </div>
        {showDropdown && searchResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-popover border border-popover-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-muted/50 transition-colors"
                onClick={() => selectSymbol(r.symbol ?? "")}
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {(r.symbol ?? "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-popover-foreground">{r.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">{r.type}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quoteLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-card-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-card border-card-border col-span-1 md:col-span-1">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground font-medium">{symbol}</span>
                  <Badge
                    className={cn(
                      "text-xs font-semibold",
                      isPositive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}
                    variant="outline"
                  >
                    {isPositive ? <TrendingUp className="w-3 h-3 ml-1" /> : <TrendingDown className="w-3 h-3 ml-1" />}
                    {formatPct(quote?.dp)}
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-foreground">${formatPrice(quote?.c)}</p>
                <p className={cn("text-sm mt-1", isPositive ? "text-green-400" : "text-red-400")}>
                  {formatChange(quote?.d)} ({formatPct(quote?.dp)})
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-card-border">
              <CardContent className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">أعلى / أدنى اليوم</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-400 font-semibold">${formatPrice(quote?.h)}</span>
                  <div className="flex-1 mx-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    {quote?.h && quote?.l && quote?.c && (
                      <div
                        className="h-full bg-gradient-to-r from-red-400 to-green-400 rounded-full"
                        style={{ width: `${Math.round(((quote.c - quote.l) / (quote.h - quote.l)) * 100)}%` }}
                      />
                    )}
                  </div>
                  <span className="text-sm text-red-400 font-semibold">${formatPrice(quote?.l)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-xs text-muted-foreground">الافتتاح</p>
                    <p className="text-sm font-semibold">${formatPrice(quote?.o)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">السابق</p>
                    <p className="text-sm font-semibold">${formatPrice(quote?.pc)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-card-border">
              <CardContent className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">معلومات الشركة</p>
                <p className="text-sm font-semibold text-foreground truncate">{profile?.name ?? symbol}</p>
                <div className="space-y-1.5">
                  {profile?.country && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <span>{profile.country}</span>
                    </div>
                  )}
                  {profile?.finnhubIndustry && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span>{profile.finnhubIndustry}</span>
                    </div>
                  )}
                  {profile?.marketCapitalization && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>القيمة السوقية: {(profile.marketCapitalization / 1000).toFixed(1)}B$</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">مخطط السعر</CardTitle>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md font-medium transition-all",
                    period.value === p.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {candlesLoading ? (
            <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 90% 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217 90% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
                <XAxis dataKey="time" tick={{ fill: "hsl(215 18% 52%)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215 18% 52%)", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(222 25% 10%)", border: "1px solid hsl(222 20% 18%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                  labelStyle={{ color: "hsl(215 18% 52%)" }}
                  formatter={(v: number) => [`$${v?.toFixed(2)}`, "السعر"]}
                />
                <Area type="monotone" dataKey="price" stroke="hsl(217 90% 58%)" strokeWidth={2} fill="url(#priceGradient)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              لا توجد بيانات متاحة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
