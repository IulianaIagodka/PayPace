# PayPace

Payday → payday budgeting. Money = energy.

One Expo app at the **repo root**. Develop from the **phone** or the **Mac**. Ship TestFlight from **EAS cloud** or a **local Mac** IPA.

| Doc | Audience |
|-----|----------|
| **[USER-GUIDE.md](./USER-GUIDE.md)** | How to use Home, Pace, categories, receipts, Free/Plus |
| **[TECHNICAL.md](./TECHNICAL.md)** | Architecture, services, invariants, tests, build |
| [RELEASE-YOU.md](./RELEASE-YOU.md) | Owner checklist (ASC, secrets, subscriptions) |
| [SHARED-BUDGET.md](./SHARED-BUDGET.md) | Partner sync + Supabase setup |
| [TESTFLIGHT-EAS.md](./TESTFLIGHT-EAS.md) | Phone / Mac / cloud TestFlight paths |

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
Statement import throws if the file can’t be parsed (no invented expenses).

## Free vs Plus

| Free | Plus |
|------|------|
| Available balance, safe-to-spend, days to payday | Leftover by category (Home, Groceries, Eating out, …) |
| Bills | Allocate amounts per category |
| Manual expenses | Custom categories |
| **3 receipt photo scans** | Unlimited receipt scans |
| | Bank statement import (CSV/text) |
| | Spend-by-category detail + history |
| | Shared budget with a partner |

Default categories: **Home · Groceries · Eating out · Transport · Shopping · Kids · Health · Fun · Travel · Subscriptions · Other**. Home / lists show a category only if it has **spend** or a **user allocation**. One receipt maps to **one** category.

- **Dev:** Settings → **TRY PLUS (DEMO)** (`__DEV__` only).  
- **Store builds:** **PLUS MONTHLY** / **PLUS YEARLY** / **RESTORE PURCHASES** via Apple **StoreKit** (`expo-iap`). Product IDs: `app.paypace.plus.monthly`, `app.paypace.plus.yearly`.  
- Your checklist: **[RELEASE-YOU.md](./RELEASE-YOU.md)**. Product walkthrough: **[USER-GUIDE.md](./USER-GUIDE.md)**.

Also set in `.env` / EAS when ready:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://iulianaiagodka.github.io/PayPace/privacy.html
EXPO_PUBLIC_SUPPORT_URL=https://iulianaiagodka.github.io/PayPace/support.html
```

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
| `npm test` | All unit/E2E scripts (shared budget + control panel + sync + status) |
| `npm run test:shared` | Shared-budget E2E simulation |
| `npm run test:control` | Control-panel helper unit tests |
| `npm run test:sync` | Shared-household sync policy tests |
| `npm run test:status` | Money status chip tests |
| `npm run build:ios` | EAS iOS production build (cloud) |
| `npm run build:ios:local` | Local Mac IPA only |
| `npm run build:ios:local:submit` | Local Mac IPA + TestFlight (one script) |
| `npm run submit:ios` | Submit latest **cloud** build to TestFlight |
| `npm run build:ios:submit` | Cloud build + auto-submit |
