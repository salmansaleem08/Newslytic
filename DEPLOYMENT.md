# Newslytic Deployment Guide

This setup is optimized for:
- Frontend: Vercel
- Backend: Render (free web service)
- Database: MongoDB Atlas (free tier)

It is also designed to keep working when features are added/removed later with minimal redeploy effort.

## 1) Architecture

- `apps/web` deploys to Vercel
- `apps/api` deploys to Render
- MongoDB Atlas stores persistent app data
- API is called from web via `NEXT_PUBLIC_API_BASE_URL`

## 2) Required accounts

- GitHub (already in use)
- Vercel
- Render
- MongoDB Atlas
- Optional: NewsAPI / GNews / FactCheck / Gemini keys

## 3) Backend deploy (Render)

Create a **Web Service** on Render from this repo.

Render settings:
- Root Directory: `apps/api`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Runtime: Node 20+

Environment variables on Render:
- `NODE_ENV=production`
- `PORT=10000` (or Render default)
- `MONGODB_URI=<atlas-connection-string>`
- `GEMINI_API_KEY=<your-key>`
- `JWT_SECRET=<long-random-32+ chars>`
- `APP_ORIGIN=https://<your-vercel-domain>`
- `APP_ORIGINS=https://<your-vercel-domain>,https://<custom-domain-if-any>`
- `COOKIE_DOMAIN=` (leave empty unless you use a shared custom parent domain)
- `NEWS_SYNC_INTERVAL_MINUTES=240`
- `LOCAL_NEWS_COUNTRY=us`
- Optional providers:
  - `NEWS_API_KEY=...`
  - `GNEWS_API_KEY=...`
  - `FACTCHECK_API_KEY=...`
- Optional TTS:
  - `TTS_PYTHON_BIN=python`
  - `TTS_PYTHON_BIN_NEWS_CASTER=python`
  - `TTS_VOICE=en-US-ChristopherNeural`
  - `CLOUDINARY_CLOUD_NAME=<cloud-name>`
  - `CLOUDINARY_API_KEY=<api-key>`
  - `CLOUDINARY_API_SECRET=<api-secret>`
  - `CLOUDINARY_FOLDER=newslytic/news-caster`

Important:
- Free Render services can sleep, which can delay cron execution.
- Your app still syncs news on demand via feed endpoints, so UX remains functional.

## 4) Frontend deploy (Vercel)

Import repo in Vercel as a project for `apps/web`.

Vercel settings:
- Root Directory: `apps/web`
- Build Command: `npm run build`
- Output: Next.js default

Frontend env vars:
- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-api-domain>`

Redeploy after setting variables.

## 5) Database (Mongo Atlas)

- Create cluster (free tier)
- Add DB user/password
- Network access:
  - easiest: allow all (`0.0.0.0/0`) for initial deploy
  - later tighten to Render egress IP ranges if desired
- Put connection string in `MONGODB_URI`

## 6) Post-deploy verification

Backend checks:
- `GET https://<api-domain>/health` should return `{ ok: true }`

Frontend checks:
- login/signup works
- dashboard feed loads
- truth-check works
- community interactions persist
- trend/sentiment/bias pages render data
- AI news caster loads script/history

## 7) Make future changes easy

Use this release pattern:
1. Develop locally
2. Push to `main`
3. Vercel + Render auto-deploy
4. Verify `/health` and key pages

Tips:
- Keep all config in environment variables, not hardcoded URLs
- Add new variables in both local `.env` and platform dashboards
- Use additive schema updates in Mongo to avoid migrations blocking deploys
- Keep API backward-compatible where possible (new fields optional)

## 8) News Caster storage

If Cloudinary vars are set, News Caster uploads generated audio to Cloudinary and stores remote URLs in Mongo.

If Cloudinary vars are NOT set, News Caster uses local disk (`apps/api/storage/news-caster`) which is ephemeral on free cloud services.

For production reliability, keep Cloudinary enabled.
