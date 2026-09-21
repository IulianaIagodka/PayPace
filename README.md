# PayPace

Payday → payday envelope budgeting. Money = energy.

One Expo app at the **repo root**. Develop from the **phone** or the **Mac**. Ship TestFlight from **EAS cloud** (phone or Mac) or a **local Mac** IPA.

## Setup

```bash
git clone <repo>
cd PayPace
npm install
```

`origin/main` is the source of truth. `git pull` before work on either device; commit and `git push` after. On the Mac, pull again before any build.

## Preview

```bash
npx expo start
```

Then `i` for the iOS simulator, or scan the QR with Expo Go on the phone (same Wi‑Fi).

Native iOS folder (optional, for Xcode):

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

## TestFlight

Do **not** put `eas-cli` in `package.json`. Full steps (phone vs Mac local vs cloud, credentials, keychain): [TESTFLIGHT-EAS.md](./TESTFLIGHT-EAS.md).

```bash
npx eas-cli login
npm run build:ios           # cloud (works from phone Cursor or Mac)
npm run build:ios:submit    # cloud + upload to TestFlight
npm run build:ios:local     # Mac only → IPA, then submit with --path
```

## Shared budget

Couple sync via invite code: [SHARED-BUDGET.md](./SHARED-BUDGET.md)

## Scripts

| Command | What |
|---------|------|
| `npm start` | Expo dev server |
| `npm run typecheck` | TypeScript |
| `npm run test:shared` | Shared-budget E2E simulation |
| `npm run build:ios` | EAS iOS production build (cloud) |
| `npm run build:ios:local` | EAS iOS production build on this Mac |
| `npm run submit:ios` | Submit latest **cloud** build to TestFlight |
| `npm run build:ios:submit` | Cloud build + auto-submit |
