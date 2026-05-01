import { Router, type IRouter } from "express";

const router: IRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function finnhub(path: string, params: Record<string, string | number> = {}) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error("FINNHUB_API_KEY is not configured");

  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub error: ${res.status} ${res.statusText}`);
  return res.json();
}

// Calculate RSI from close prices
function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(period).fill(null);
  if (closes.length <= period) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
  }
  return result;
}

// Calculate SMA
function calculateSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / period;
      result.push(Math.round(avg * 100) / 100);
    }
  }
  return result;
}

// Calculate MACD
function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  function ema(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const result: number[] = [];
    let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(0);
      } else if (i === period - 1) {
        result.push(prev);
      } else {
        prev = data[i] * k + prev * (1 - k);
        result.push(prev);
      }
    }
    return result;
  }

  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);
  const macdLine = closes.map((_, i) =>
    i < slow - 1 ? null : Math.round((fastEMA[i] - slowEMA[i]) * 100) / 100
  );
  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalEMA = ema(validMacd, signal);

  const signalLine: (number | null)[] = macdLine.map(() => null);
  let sigIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      signalLine[i] = sigIdx < signalEMA.length ? Math.round(signalEMA[sigIdx] * 100) / 100 : null;
      sigIdx++;
    }
  }

  const histogram = macdLine.map((m, i) =>
    m !== null && signalLine[i] !== null
      ? Math.round((m - (signalLine[i] as number)) * 100) / 100
      : null
  );

  return { macdLine, signalLine, histogram };
}

router.get("/stocks/search", async (req, res): Promise<void> => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const data = await finnhub("/search", { q });
    const results = (data.result || []).slice(0, 20).map((r: Record<string, string>) => ({
      symbol: r.symbol,
      description: r.description,
      type: r.type,
      displaySymbol: r.displaySymbol,
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Stock search failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

router.get("/stocks/:symbol/quote", async (req, res): Promise<void> => {
  try {
    const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const data = await finnhub("/quote", { symbol: symbol.toUpperCase() });
    if (!data.c || data.c === 0) {
      res.status(404).json({ error: "Stock not found or no data available" });
      return;
    }
    res.json({
      symbol: symbol.toUpperCase(),
      c: data.c,
      d: data.d,
      dp: data.dp,
      h: data.h,
      l: data.l,
      o: data.o,
      pc: data.pc,
      t: data.t,
    });
  } catch (err) {
    req.log.error({ err }, "Stock quote failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

async function fetchYahooCandles(
  symbol: string,
  from: number,
  to: number,
  resolution: string,
): Promise<{ c: number[]; h: number[]; l: number[]; o: number[]; v: number[]; t: number[]; s: string }> {
  const intervalMap: Record<string, string> = {
    "1": "1m", "5": "5m", "15": "15m", "30": "30m",
    "60": "60m", "D": "1d", "W": "1wk", "M": "1mo",
  };
  const interval = intervalMap[resolution] ?? "1d";

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${from}&period2=${to}&interval=${interval}&includePrePost=false`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
  });
  if (!resp.ok) throw new Error(`Yahoo Finance error: ${resp.status}`);
  const json: any = await resp.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("No data from Yahoo Finance");

  const timestamps: number[] = result.timestamp ?? [];
  const quotes = result.indicators?.quote?.[0] ?? {};

  return {
    t: timestamps,
    c: quotes.close ?? [],
    h: quotes.high ?? [],
    l: quotes.low ?? [],
    o: quotes.open ?? [],
    v: quotes.volume ?? [],
    s: timestamps.length > 0 ? "ok" : "no_data",
  };
}

router.get("/stocks/:symbol/candles", async (req, res): Promise<void> => {
  try {
    const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const resolution = String(req.query.resolution || "D");
    const now = Math.floor(Date.now() / 1000);
    const from = req.query.from ? Number(req.query.from) : now - 365 * 24 * 3600;
    const to = req.query.to ? Number(req.query.to) : now;

    let data;
    try {
      const finnhubData = await finnhub("/stock/candle", {
        symbol: symbol.toUpperCase(),
        resolution,
        from,
        to,
      });
      if (finnhubData.s === "ok" && finnhubData.c?.length) {
        data = finnhubData;
      } else {
        throw new Error("No Finnhub data");
      }
    } catch {
      data = await fetchYahooCandles(symbol.toUpperCase(), from, to, resolution);
    }

    res.json({
      c: data.c || [],
      h: data.h || [],
      l: data.l || [],
      o: data.o || [],
      v: data.v || [],
      t: data.t || [],
      s: data.s || "no_data",
    });
  } catch (err) {
    req.log.error({ err }, "Stock candles failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

router.get("/stocks/:symbol/profile", async (req, res): Promise<void> => {
  try {
    const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const data = await finnhub("/stock/profile2", { symbol: symbol.toUpperCase() });
    res.json({
      name: data.name || symbol,
      ticker: data.ticker || symbol,
      country: data.country || null,
      currency: data.currency || null,
      exchange: data.exchange || null,
      ipo: data.ipo || null,
      marketCapitalization: data.marketCapitalization || null,
      shareOutstanding: data.shareOutstanding || null,
      logo: data.logo || null,
      finnhubIndustry: data.finnhubIndustry || null,
      weburl: data.weburl || null,
      phone: data.phone || null,
    });
  } catch (err) {
    req.log.error({ err }, "Company profile failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

router.get("/stocks/:symbol/technicals", async (req, res): Promise<void> => {
  try {
    const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const resolution = String(req.query.resolution || "D");
    const now = Math.floor(Date.now() / 1000);
    const reqFrom = req.query.from ? Number(req.query.from) : now - 365 * 24 * 3600;
    const from = Math.min(reqFrom, now - 90 * 24 * 3600);

    let data: any;
    try {
      const finnhubData = await finnhub("/stock/candle", {
        symbol: symbol.toUpperCase(),
        resolution,
        from,
        to: now,
      });
      if (finnhubData.s === "ok" && finnhubData.c?.length) {
        data = finnhubData;
      } else {
        throw new Error("No Finnhub data");
      }
    } catch {
      data = await fetchYahooCandles(symbol.toUpperCase(), from, now, resolution);
    }

    if (!data.c || data.s !== "ok" || !data.c.length) {
      res.json({
        symbol: symbol.toUpperCase(),
        rsi: { values: [], timestamps: [] },
        macd: { macdLine: [], signalLine: [], histogram: [], timestamps: [] },
        sma20: { values: [], timestamps: [] },
        sma50: { values: [], timestamps: [] },
        sma200: { values: [], timestamps: [] },
      });
      return;
    }

    const closes: number[] = data.c;
    const timestamps: number[] = data.t;

    const rsiValues = calculateRSI(closes);
    const { macdLine, signalLine, histogram } = calculateMACD(closes);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);

    res.json({
      symbol: symbol.toUpperCase(),
      rsi: { values: rsiValues, timestamps },
      macd: { macdLine, signalLine, histogram, timestamps },
      sma20: { values: sma20, timestamps },
      sma50: { values: sma50, timestamps },
      sma200: { values: sma200, timestamps },
    });
  } catch (err) {
    req.log.error({ err }, "Technicals failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

router.get("/stocks/compare", async (req, res): Promise<void> => {
  try {
    const symbolsStr = String(req.query.symbols || "");
    if (!symbolsStr) {
      res.status(400).json({ error: "symbols parameter is required" });
      return;
    }
    const symbols = symbolsStr.split(",").map((s) => s.trim().toUpperCase()).slice(0, 5);
    const resolution = String(req.query.resolution || "D");
    const now = Math.floor(Date.now() / 1000);
    const from = now - 365 * 24 * 3600;

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const [candles, quote, profile] = await Promise.all([
          finnhub("/stock/candle", { symbol, resolution, from, to: now })
            .then((d: any) => (d.s === "ok" && d.c?.length ? d : null))
            .catch(() => null)
            .then((d: any) => d ?? fetchYahooCandles(symbol, from, now, resolution).catch(() => ({
              c: [], h: [], l: [], o: [], v: [], t: [], s: "no_data",
            }))),
          finnhub("/quote", { symbol }).catch(() => ({ c: 0, dp: 0 })),
          finnhub("/stock/profile2", { symbol }).catch(() => ({ name: symbol })),
        ]);
        return {
          symbol,
          name: profile.name || symbol,
          candles: {
            c: candles.c || [],
            h: candles.h || [],
            l: candles.l || [],
            o: candles.o || [],
            v: candles.v || [],
            t: candles.t || [],
            s: candles.s || "no_data",
          },
          currentPrice: quote.c || 0,
          changePercent: quote.dp || 0,
        };
      })
    );

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Stock comparison failed");
    res.status(503).json({ error: err instanceof Error ? err.message : "Service unavailable" });
  }
});

export default router;
