import { useState } from "react";
import { useGetStockTechnicals, useGetStockCandles, type GetStockCandlesResolution } from "@workspace/api-client-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const PERIODS = [
  { label: "شهر", value: "1M", resolution: "D", days: 30 },
  { label: "٣ أشهر", value: "3M", resolution: "D", days: 90 },
  { label: "٦ أشهر", value: "6M", resolution: "W", days: 180 },
  { label: "سنة", value: "1Y", resolution: "W", days: 365 },
];

function getRsiSignal(rsi: number | undefined) {
  if (rsi == null) return { label: "غير محدد", color: "text-muted-foreground" };
  if (rsi > 70) return { label: "ذروة شراء", color: "text-red-400" };
  if (rsi < 30) return { label: "ذروة بيع", color: "text-green-400" };
  return { label: "محايد", color: "text-yellow-400" };
}

function getMacdSignal(macd: number | undefined, signal: number | undefined) {
  if (macd == null || signal == null) return { label: "غير محدد", color: "text-muted-foreground" };
  if (macd > signal) return { label: "إشارة شراء", color: "text-green-400" };
  return { label: "إشارة بيع", color: "text-red-400" };
}

export default function TechnicalPage() {
  const [input, setInput] = useState("AAPL");
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState(PERIODS[1]);

  const now = Math.floor(Date.now() / 1000);
  const from = now - period.days * 24 * 60 * 60;

  const { data: technicals, isLoading: techLoading } = useGetStockTechnicals(symbol, {
    resolution: period.resolution,
    from,
    to: now,
  });

  const { data: candles } = useGetStockCandles(symbol, {
    resolution: period.resolution as GetStockCandlesResolution,
    from,
    to: now,
  });

  const timestamps = candles?.t ?? technicals?.rsi?.timestamps ?? [];

  const priceData = timestamps.map((t: number, i: number) => ({
    time: new Date(t * 1000).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    price: candles?.c?.[i] ?? null,
    sma20: technicals?.sma20?.values?.[i] ?? null,
    sma50: technicals?.sma50?.values?.[i] ?? null,
  }));

  const rsiData = (technicals?.rsi?.timestamps ?? []).map((t: number, i: number) => ({
    time: new Date(t * 1000).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    rsi: technicals?.rsi?.values?.[i] ?? null,
  }));

  const macdData = (technicals?.macd?.timestamps ?? []).map((t: number, i: number) => ({
    time: new Date(t * 1000).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    macd: technicals?.macd?.macdLine?.[i] ?? null,
    signal: technicals?.macd?.signalLine?.[i] ?? null,
    histogram: technicals?.macd?.histogram?.[i] ?? null,
  }));

  const lastRsi = technicals?.rsi?.values?.filter(Boolean).at(-1) as number | undefined;
  const lastMacd = technicals?.macd?.macdLine?.filter(Boolean).at(-1) as number | undefined;
  const lastSignal = technicals?.macd?.signalLine?.filter(Boolean).at(-1) as number | undefined;
  const lastSma20 = technicals?.sma20?.values?.filter(Boolean).at(-1) as number | undefined;
  const lastSma50 = technicals?.sma50?.values?.filter(Boolean).at(-1) as number | undefined;

  const rsiSignal = getRsiSignal(lastRsi);
  const macdSignal = getMacdSignal(lastMacd, lastSignal);

  function search() {
    if (input.trim()) setSymbol(input.trim().toUpperCase());
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">التحليل الفني</h2>
        <p className="text-sm text-muted-foreground">RSI وMACD والمتوسطات المتحركة</p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pr-9 bg-card border-border w-48"
            placeholder="رمز السهم"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <Button onClick={search} size="sm">تحليل</Button>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md font-medium transition-all",
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "RSI (14)", value: lastRsi?.toFixed(1), signal: rsiSignal },
          { label: "MACD", value: lastMacd?.toFixed(3), signal: macdSignal },
          { label: "SMA 20", value: lastSma20 != null ? `$${lastSma20.toFixed(2)}` : undefined, signal: undefined },
          { label: "SMA 50", value: lastSma50 != null ? `$${lastSma50.toFixed(2)}` : undefined, signal: undefined },
        ].map(({ label, value, signal }) => (
          <Card key={label} className="bg-card border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              {techLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-xl font-bold text-foreground">{value ?? "—"}</p>
              )}
              {signal && (
                <p className={cn("text-xs mt-1 font-medium", signal.color)}>{signal.label}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold">السعر والمتوسطات المتحركة — {symbol}</CardTitle>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-chart-1 rounded" /> السعر</span>
              <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-chart-2 rounded" /> SMA20</span>
              <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-chart-3 rounded" /> SMA50</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {techLoading ? (
            <div className="h-56 bg-muted/30 rounded-lg animate-pulse" />
          ) : priceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="pg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 90% 58%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(217 90% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
                <XAxis dataKey="time" tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222 25% 10%)", border: "1px solid hsl(222 20% 18%)", borderRadius: 8, color: "hsl(210 20% 92%)" }} />
                <Area type="monotone" dataKey="price" stroke="hsl(217 90% 58%)" strokeWidth={2} fill="url(#pg2)" dot={false} name="السعر" connectNulls />
                <Line type="monotone" dataKey="sma20" stroke="hsl(142 76% 55%)" strokeWidth={1.5} dot={false} name="SMA20" connectNulls />
                <Line type="monotone" dataKey="sma50" stroke="hsl(38 92% 50%)" strokeWidth={1.5} dot={false} name="SMA50" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              لا توجد بيانات — جرّب فترة زمنية أطول
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">RSI (14)</CardTitle>
              <Badge
                className={cn("text-xs",
                  rsiSignal.color === "text-red-400" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                  rsiSignal.color === "text-green-400" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                )}
                variant="outline"
              >
                {rsiSignal.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {techLoading ? (
              <div className="h-44 bg-muted/30 rounded-lg animate-pulse" />
            ) : rsiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={rsiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
                  <XAxis dataKey="time" tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222 25% 10%)", border: "1px solid hsl(222 20% 18%)", borderRadius: 8, color: "hsl(210 20% 92%)" }} />
                  <ReferenceLine y={70} stroke="hsl(0 84% 58%)" strokeDasharray="4 2" label={{ value: "70", fill: "hsl(0 84% 58%)", fontSize: 10 }} />
                  <ReferenceLine y={30} stroke="hsl(142 76% 55%)" strokeDasharray="4 2" label={{ value: "30", fill: "hsl(142 76% 55%)", fontSize: 10 }} />
                  <Area type="monotone" dataKey="rsi" stroke="hsl(195 80% 48%)" strokeWidth={2} fill="hsl(195 80% 48% / 0.15)" dot={false} name="RSI" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">MACD</CardTitle>
              <Badge
                className={cn("text-xs",
                  macdSignal.color === "text-red-400" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"
                )}
                variant="outline"
              >
                {macdSignal.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {techLoading ? (
              <div className="h-44 bg-muted/30 rounded-lg animate-pulse" />
            ) : macdData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={macdData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
                  <XAxis dataKey="time" tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222 25% 10%)", border: "1px solid hsl(222 20% 18%)", borderRadius: 8, color: "hsl(210 20% 92%)" }} />
                  <ReferenceLine y={0} stroke="hsl(222 20% 25%)" />
                  <Bar dataKey="histogram" name="الهيستوغرام" fill="hsl(195 80% 48%)" opacity={0.6} />
                  <Line type="monotone" dataKey="macd" stroke="hsl(217 90% 58%)" strokeWidth={1.5} dot={false} name="MACD" connectNulls />
                  <Line type="monotone" dataKey="signal" stroke="hsl(0 84% 58%)" strokeWidth={1.5} dot={false} name="إشارة" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
