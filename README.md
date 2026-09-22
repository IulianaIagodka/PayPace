# PayPace

Payday → payday resource control. Money = energy.

One Expo app at the **repo root**. Develop from the **phone** or the **Mac**. Ship TestFlight from **EAS cloud** or a **local Mac** IPA.

PayPace is a **dark sci-fi money control panel** — reserves, burn rate, runway, and pacing until the next checkpoint (payday) — not a classic budgeting spreadsheet.

## Setup

```bash
git clone <repo>
cd PayPace
npm install
```

`origin/main` is the source of truth. **Always `git pull` before a build** — a stale checkout ships an old UI (missing design fixes).

## Secrets (receipts + shared budget)

Do **not** commit keys. Use a gitignored `.env` on the Mac:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`app.config.js` copies these into the binary at build time. For cloud / phone EAS builds, set the same names as **production** env vars on [expo.dev](https://expo.dev).

After changing keys, **rebuild** — an old TestFlight build will not pick up new secrets.

If receipt scan fails, the app now shows the real error (missing key, billing, bad photo) instead of a silent demo receipt.

## Free vs Plus

| Free | Plus |
|------|------|
| Available balance, safe-to-spend, days to payday | Leftover by category (Food, Eating out, …) |
| Bills | Allocate amounts per category |
| Manual expenses | Custom categories |
| | Receipt photo scan |
| | Bank statement import |
| | Spend-by-category detail + history |
| | Shared budget with a partner |

Demo unlock: **Settings → TRY PLUS (DEMO)**.

## Preview

```bash
npx expo start
```

Then `i` for the iOS simulator, or scan the QR with Expo Go on the phone (same Wi‑Fi).

## TestFlight

Full steps (phone vs Mac local vs cloud, credentials, keychain): [TESTFLIGHT-EAS.md](./TESTFLIGHT-EAS.md).

```bash
npx eas-cli login
git pull
npm run build:ios:local:submit   # Mac: free local IPA + TestFlight (recommended)
npm run build:ios:submit         # cloud build + auto-submit (uses EAS minutes)
```

## Scripts

| Command | What |
|---------|------|
| `npm start` | Expo dev server |
| `npm run typecheck` | TypeScript |
| `npm run test:shared` | Shared-budget E2E simulation |
| `npm run build:ios` | EAS iOS production build (cloud) |
| `npm run build:ios:local` | Local Mac IPA only |
| `npm run build:ios:local:submit` | Local Mac IPA + TestFlight (one script) |
| `npm run submit:ios` | Submit latest **cloud** build to TestFlight |
| `npm run build:ios:submit` | Cloud build + auto-submit |
