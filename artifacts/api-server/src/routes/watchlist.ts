import { Router, type IRouter } from "express";
import { db, watchlistTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function finnhubQuote(symbol: string) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return null;
  try {
    const url = new URL(`${FINNHUB_BASE}/quote`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("token", token);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

router.get("/watchlist", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const items = await db
    .select()
    .from(watchlistTable)
    .where(eq(watchlistTable.userId, req.user.id));
  res.json(items);
});

router.post("/watchlist", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const symbol = String(req.body.symbol || "").trim().toUpperCase();
  if (!symbol) {
    res.status(400).json({ error: "symbol is required" });
    return;
  }

  // Check if already in watchlist
  const [existing] = await db
    .select()
    .from(watchlistTable)
    .where(and(eq(watchlistTable.userId, req.user.id), eq(watchlistTable.symbol, symbol)));

  if (existing) {
    res.status(201).json(existing);
    return;
  }

  const [item] = await db
    .insert(watchlistTable)
    .values({ userId: req.user.id, symbol })
    .returning();
  res.status(201).json(item);
});

router.delete("/watchlist/:symbol", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const symbol = Array.isArray(req.params.symbol)
    ? req.params.symbol[0]
    : req.params.symbol;

  await db
    .delete(watchlistTable)
    .where(and(eq(watchlistTable.userId, req.user.id), eq(watchlistTable.symbol, symbol.toUpperCase())));

  res.sendStatus(204);
});

router.get("/watchlist/prices", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.json([]);
    return;
  }
  const items = await db
    .select()
    .from(watchlistTable)
    .where(eq(watchlistTable.userId, req.user.id));

  const prices = await Promise.all(
    items.map(async (item) => {
      const quote = await finnhubQuote(item.symbol);
      return {
        symbol: item.symbol,
        currentPrice: quote?.c || 0,
        changePercent: quote?.dp || 0,
        change: quote?.d || 0,
      };
    })
  );

  res.json(prices);
});

export default router;
