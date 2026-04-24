# Newslytic

Stay ahead of the curve, not under the noise.

## Architecture

- `apps/web`: Next.js App Router frontend
- `apps/api`: Express + MongoDB + Gemini backend
- Root workspace scripts to run both services

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy environment template:
   - `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
3. Fill required values in `.env`:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `GNEWS_API_KEY` (optional but recommended for syncing live news)
4. Start local development:
   - `npm run dev`

## Implemented Foundation

- Daily + incremental sync pipeline via cron in `apps/api`
- Mongo data model for news retention (10-day rolling window)
- Gemini-powered summary service
- API endpoints:
  - `GET /health`
  - `GET /api/news/today`
  - `GET /api/news/missed?since=<ISO_DATE>`
- UI starter dashboard for smart news feed with design-token-based theme

## Deploy

Recommended:

- Frontend: Vercel (`apps/web`)
- Backend: Render/Railway/Fly.io (`apps/api`)
- Database: MongoDB Atlas

Set environment variables in hosting dashboard exactly as in `.env.example`.

## Next Build Phases

1. Auth + user profiles
2. Truth-check chatbot with fact-check API cache
3. AI news caster and what-you-missed timeline
4. Community discussions
5. Startup-grade observability, rate limits, and queues
