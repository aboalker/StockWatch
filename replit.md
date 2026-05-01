# StockWatch — مراقب الأسهم

## Overview

Full-stack Arabic RTL stock analysis SaaS dashboard. pnpm workspace monorepo with React+Vite frontend and Express backend.

## Stack
#بب




3chv nbv mbm
#vjbhkbkmkbk
- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4, Arabic RTL, Tajawal font
- **UI Components**: shadcn/ui (Radix UI primitives), Recharts for charts
- **Backend**: Express 5 + Pino logger
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect / PKCE)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle)
- **Market data**: Finnhub (free tier, quotes/search/profile) + Yahoo Finance (historical candles, free, no key)
- **AI**: OpenAI `gpt-4o-mini` with Arabic investment advisor prompt

## Required Secrets

- `FINNHUB_API_KEY` — stock quotes, search, company profiles (get free at https://finnhub.io)
- `OPENAI_API_KEY` — AI chat advisor

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Important Notes

- After codegen, must run: `printf 'export * from "./generated/api";\n' > lib/api-zod/src/index.ts` (orval overwrites it with duplicate exports)
- Candles: Finnhub free plan doesn't include historical OHLCV; backend auto-falls back to Yahoo Finance v8 API
- Auth: Watchlist and AI Chat require login (Replit Auth)
- Mobile auth routes were removed — web only app

## Pages (Arabic RTL)

1. **الرئيسية** (`/`) — Stock search, live quote, area price chart
2. **مقارنة الأسهم** (`/compare`) — Compare up to 4 stocks side-by-side
3. **التحليل الفني** (`/technical`) — RSI, MACD, SMA20/50 charts
4. **قائمة المتابعة** (`/watchlist`) — Auth-gated personal watchlist with live prices
5. **المستشار الذكي** (`/chat`) — Auth-gated AI chat with Arabic investment advisor

## Artifacts

- `artifacts/api-server` — Express API server (port 8080)
- `artifacts/stockwatch` — React+Vite frontend (preview path `/`)
- `artifacts/mockup-sandbox` — Component preview server (port 8081)

## Packages

- `lib/api-spec` — OpenAPI spec + codegen scripts
- `lib/api-zod` — Zod schemas generated from OpenAPI
- `lib/api-client-react` — React Query hooks generated from OpenAPI
- `lib/db` — Drizzle ORM schema and client
- `lib/replit-auth-web` — Replit Auth web hook (`useAuth`)

See the `pnpm-workspace` skill for workspace structure details.
