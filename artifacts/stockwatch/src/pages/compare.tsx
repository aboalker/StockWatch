import { useState } from "react";
import { useCompareStocks } from "@workspace/api-client-react";
import type { StockComparisonItem } from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(217 90% 58%)",
  "hsl(142 76% 55%)",
  "hsl(38 92% 50%)",
  "hsl(195 80% 48%)",
];

function buildTimeSeriesData(stocks: StockComparisonItem[]) {
  if (!stocks.length) return [];

  const stockMaps: Map<string, number>[] = stocks.map((stock) => {
    const map = new Map<string, number>();
    const t: number[] = (stock.candles as any)?.t ?? [];
    const c: number[] = (stock.candles as any)?.c ?? [];
    t.forEach((ts: number, i: number) => {
      if (c[i] != null && c[i] > 0) {
        const dateStr = new Date(ts * 1000).toISOString().slice(0, 10);
        map.set(dateStr, c[i]);
      }
    });
    return map;
  });

  const allDates = Array.from(
    new Set(stockMaps.flatMap((m) => Array.from(m.keys())))
  ).sort();

  if (allDates.length === 0) return [];

  const baseValues: (number | null)[] = stocks.map((_, i) =>
    stockMaps[i].get(allDates[0]) ?? null
  );

  return allDates.map((date) => {
    const point: Record<string, number | string | null> = {
      date: date.slice(5),
    };
    stocks.forEach((stock, i) => {
      const price = stockMaps[i].get(date) ?? null;
      const base = baseValues[i];
      if (price != null && base != null && base > 0) {
        point[stock.symbol ?? `S${i}`] = parseFloat(
          (((price - base) / base) * 100).toFixed(2)
        );
      } else {
        point[stock.symbol ?? `S${i}`] = null;
      }
    });
    return point;
  });
}

export default function ComparePage() {
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "MSFT"]);
  const [input, setInput] = useState("");

  const { data, isLoading } = useCompareStocks(
    { symbols: symbols.join(",") },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: symbols.length >= 1 } as any }
  );

  function addSymbol() {
    const s = input.trim().toUpperCase();
    if (s && !symbols.includes(s) && symbols.length < 4) {
      setSymbols([...symbols, s]);
      setInput("");
    }
  }

  function removeSymbol(s: string) {
    setSymbols(symbols.filter((x) => x !== s));
  }

  const tableData = data ?? [];
  const chartData = buildTimeSeriesData(tableData);

  const sampleEvery = Math.max(1, Math.floor(chartData.length / 60));
  const displayData = chartData.filter((_, i) => i % sampleEvery === 0 || i === chartData.length - 1);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">مقارنة الأسهم</h2>
        <p className="text-sm text-muted-foreground">قارن أداء حتى ٤ أسهم في آن واحد</p>
      </div>

      <Card className="bg-card border-card-border">
        <CardContent className="p-5">
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="أضف رمز سهم (مثال: TSLA)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              className="max-w-xs bg-background border-border"
            />
            <Button onClick={addSymbol} disabled={symbols.length >= 4 || !input.trim()} size="sm">
              <Plus className="w-4 h-4 ml-1" />
              إضافة
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {symbols.map((s, i) => (
              <Badge
                key={s}
                variant="outline"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                style={{ borderColor: COLORS[i], color: COLORS[i] }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                {s}
                <button onClick={() => removeSymbol(s)} className="opacity-60 hover:opacity-100 transition-opacity mr-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: symbols.length }).map((_, i) => (
              <Card key={i} className="bg-card border-card-border">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-24 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))
          : tableData.map((item, i) => {
              const isPos = (item.changePercent ?? 0) >= 0;
              return (
                <Card key={item.symbol} className="bg-card border-card-border" style={{ borderTopColor: COLORS[i], borderTopWidth: 2 }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: COLORS[i] }}>{item.symbol}</span>
                      {isPos ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <p className="text-xl font-bold text-foreground">${(item.currentPrice ?? 0).toFixed(2)}</p>
                    <p className={cn("text-xs mt-0.5", isPos ? "text-green-400" : "text-red-400")}>
                      {isPos ? "+" : ""}{(item.changePercent ?? 0).toFixed(2)}%
                    </p>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground truncate">{item.name ?? ""}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">الأداء النسبي — آخر سنة (%)</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {isLoading ? (
            <div className="h-72 bg-muted/30 rounded-lg animate-pulse" />
          ) : displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={displayData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(displayData.length / 6)}
                />
                <YAxis
                  tick={{ fill: "hsl(215 18% 52%)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222 25% 10%)",
                    border: "1px solid hsl(222 20% 18%)",
                    borderRadius: 8,
                    color: "hsl(210 20% 92%)",
                  }}
                  formatter={(v: number, name: string) => [
                    `${v > 0 ? "+" : ""}${v?.toFixed(2)}%`,
                    name,
                  ]}
                  labelStyle={{ color: "hsl(215 18% 52%)", marginBottom: 4 }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "hsl(210 20% 85%)", fontSize: 12 }}>{value}</span>
                  )}
                />
                <ReferenceLine y={0} stroke="hsl(215 18% 35%)" strokeDasharray="4 4" />
                {tableData.map((item, i) => (
                  <Line
                    key={item.symbol}
                    type="monotone"
                    dataKey={item.symbol ?? `S${i}`}
                    name={item.symbol ?? `S${i}`}
                    stroke={COLORS[i]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              أضف أسهماً للمقارنة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
