import { Router, type IRouter } from "express";

const router: IRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface FinnhubSearchResult {
  symbol: string;
  description: string;
  type: string;
  displaySymbol: string;
}

interface FinnhubSearchResponse {
  result: FinnhubSearchResult[];
}

interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

interface FinnhubCandle {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  t: number[];
  s: string;
}

interface FinnhubProfile {
  name: string;
  ticker: string;
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  shareOutstanding: number;
  logo: string;
  finnhubIndustry: string;
  weburl: string;
  phone: string;
}

interface FinnhubBasicFinancials {
  metric: {
    peTTM?: number;
    peNormalizedAnnual?: number;
    [key: string]: number | undefined;
  };
}

async function finnhub<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error("FINNHUB_API_KEY is not configured");

  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub error: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
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

  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);

  const macdLine = fastEma.map((f, i) =>
    f !== 0 && slowEma[i] !== 0
      ? Math.round((f - slowEma[i]) * 100) / 100
      : null
  );

  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalEmaInput = validMacd.length >= signal ? validMacd : [];
  const signalEmaResult = signalEmaInput.length ? ema(signalEmaInput, signal) : [];

  const signalLine: (number | null)[] = macdLine.map((m, i) => {
    const validIdx = macdLine.slice(0, i + 1).filter((v): v is number => v !== null).length - 1;
    if (m === null || validIdx < 0 || validIdx >= signalEmaResult.length) return null;
    const s = signalEmaResult[validIdx];
    return s !== 0 ? Math.round(s * 100) / 100 : null;
  });

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
    const data = await finnhub<FinnhubSearchResponse>("/search", { q });
    const results = (data.result || []).slice(0, 20).map((r) => ({
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

async function fetchPeRatio(symbol: string): Promise<number | null> {
  try {
    const metrics = await finnhub<FinnhubBasicFinancials>("/stock/metric", {
      symbol,
      metric: "all",
    });
    const pe = metrics?.metric?.peTTM ?? metrics?.metric?.peNormalizedAnnual ?? null;
    return typeof pe === "number" && pe > 0 ? Math.round(pe * 100) / 100 : null;
  } catch {
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!resp.ok) return null;
      const json = (await resp.json()) as {
        quoteSummary?: {
          result?: Array<{ summaryDetail?: { trailingPE?: { raw?: number } } }>;
        };
      };
      const pe = json?.quoteSummary?.result?.[0]?.summaryDetail?.trailingPE?.raw ?? null;
      return typeof pe === "number" && pe > 0 ? Math.round(pe * 100) / 100 : null;
    } catch {
      return null;
    }
  }
}

router.get("/stocks/:symbol/quote", async (req, res): Promise<void> => {
  try {
    const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const [data, peRatio] = await Promise.all([
      finnhub<FinnhubQuote>("/quote", { symbol: symbol.toUpperCase() }),
      fetchPeRatio(symbol.toUpperCase()),
    ]);
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
      peRatio,
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
): Promise<FinnhubCandle> {
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
  const json = (await resp.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            close?: number[];
            high?: number[];
            low?: number[];
            open?: number[];
            volume?: number[];
          }>;
        };
      }>;
    };
  };
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

async function fetchCandles(symbol: string, from: number, to: number, resolution: string): Promise<FinnhubCandle> {
  try {
    const finnhubData = await finnhub<FinnhubCandle>("/stock/candle", {
      symbol: symbol.toUpperCase(),
      resolution,
      from,
      to,
    });
    if (finnhubData.s === "ok" && finnhubData.c?.length) {
      return finnhubData;
    }
    throw new Error("No Finnhub data");
  } catch {
    return fetchYahooCandles(symbol.toUpperCase(), from, to, resolution);
  }
}

router.get("/stocks/:symbol/candles", async (req, res): Promise<void> => {
  try {
    const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const resolution = String(req.query.resolution || "D");
    const now = Math.floor(Date.now() / 1000);
    const from = req.query.from ? Number(req.query.from) : now - 365 * 24 * 3600;
    const to = req.query.to ? Number(req.query.to) : now;

    const data = await fetchCandles(symbol, from, to, resolution);

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
    const data = await finnhub<FinnhubProfile>("/stock/profile2", { symbol: symbol.toUpperCase() });
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
    const from = req.query.from ? Number(req.query.from) : now - 365 * 24 * 3600;
    const to = req.query.to ? Number(req.query.to) : now;

    let data: FinnhubCandle;
    try {
      data = await fetchCandles(symbol, from, to, resolution);
    } catch {
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
          fetchCandles(symbol, from, now, resolution).catch(
            (): FinnhubCandle => ({ c: [], h: [], l: [], o: [], v: [], t: [], s: "no_data" })
          ),
          finnhub<FinnhubQuote>("/quote", { symbol }).catch((): FinnhubQuote => ({
            c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0,
          })),
          finnhub<FinnhubProfile>("/stock/profile2", { symbol }).catch(
            (): Pick<FinnhubProfile, "name"> => ({ name: symbol })
          ),
        ]);
        return {
          symbol,
          name: profile.name || symbol,
          candles: {
            c: candles.c,
            h: candles.h,
            l: candles.l,
            o: candles.o,
            v: candles.v,
            t: candles.t,
            s: candles.s,
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
