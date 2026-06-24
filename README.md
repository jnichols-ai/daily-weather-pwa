# Daily Weather PWA

Hourly weather (Location, Temp F, Condition, Wind Speed, Heat Index) for ~50 cities across
DE / MD / WV Eastern Panhandle / VA I-81 & I-95 corridors / Northern & Central VA / the
Nashville, TN area — stored in monday.com and viewable as an installable PWA with a live
map and a searchable history table.

## How it works

- `src/lib/cities.js` — the master list of cities + coordinates. Edit this file to add/remove locations.
- `/api/cron/weather` — pulls the latest observation from the National Weather Service (api.weather.gov)
  for every city, computes heat index, and writes to two monday.com boards:
  - **Weather History** — append-only log, one row per city per hourly run (powers search/filter).
  - **Weather Current Conditions** — one row per city, overwritten each run (powers the map).
- `.github/workflows/hourly-weather.yml` — a GitHub Actions workflow that calls `/api/cron/weather`
  every hour. This runs entirely on GitHub's servers — not tied to your computer.
- `/` — the PWA itself: a Map tab (current conditions, live pins) and a Search tab (filter history
  by location/date). The map auto-refreshes every 60 minutes; there's also a manual "Refresh now" button.

**Why GitHub Actions instead of Vercel Cron:** Vercel's free Hobby plan only allows daily cron
schedules — an hourly `vercel.json` cron fails to deploy. GitHub Actions has no such restriction and is
free for this volume, so it's used as the hourly trigger instead. If you ever upgrade to Vercel Pro,
you can switch to native Vercel Cron (see the commented-out config in `vercel.json`).

## One-time setup

### 1. monday.com API token
In monday.com: avatar (bottom-left) → **Admin** → **API**, generate a personal token with board
read/write access. You'll set this as `MONDAY_API_TOKEN`.

The boards are already created in the **Service** workspace:
- Weather History: board ID `18419232698`
- Weather Current Conditions: board ID `18419232702`

(These IDs are already the defaults in `src/lib/monday.js` — only override via env vars if you
recreate the boards.)

### 2. Push this repo to GitHub
```bash
cd daily-weather-pwa
git init
git add .
git commit -m "Initial commit: Daily Weather PWA"
gh repo create daily-weather-pwa --private --source=. --remote=origin --push
# or manually: create a repo on github.com, then `git remote add origin <url> && git push -u origin main`
```

### 3. Deploy to Vercel
- Go to vercel.com → **Add New Project** → import the GitHub repo.
- Framework preset: Next.js (auto-detected).
- Add Environment Variables (Project Settings → Environment Variables):
  - `MONDAY_API_TOKEN` — from step 1
  - `CRON_SECRET` — any random string, e.g. generate with `openssl rand -hex 32`
  - `NWS_USER_AGENT` — e.g. `daily-weather-pwa (your-email@example.com)` (NWS requires this)
- Deploy. Note the resulting URL, e.g. `https://daily-weather-pwa.vercel.app`.

### 4. Wire up the hourly GitHub Action
In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, add:
- `WEATHER_APP_URL` — your Vercel URL from step 3 (no trailing slash), e.g. `https://daily-weather-pwa.vercel.app`
- `CRON_SECRET` — the same value you set in Vercel

The workflow runs automatically every hour. You can also trigger it manually from the repo's
**Actions** tab → "Hourly weather pull" → **Run workflow**, to test immediately without waiting.

### 5. Install the PWA
Open the Vercel URL on your phone or desktop Chrome/Edge and use "Add to Home Screen" / the install
icon in the address bar.

## Local development
```bash
npm install
cp .env.example .env.local   # fill in MONDAY_API_TOKEN, CRON_SECRET, NWS_USER_AGENT
npm run dev
```
Visit `http://localhost:3000`. To test the cron logic locally:
```bash
curl http://localhost:3000/api/cron/weather -H "Authorization: Bearer <your CRON_SECRET>"
```
