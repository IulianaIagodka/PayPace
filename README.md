# PayPace

**Know exactly what you can spend until payday.**

## Apps in this repo

| Folder | Stack | Notes |
|--------|-------|-------|
| `PayPaceApp/` | **Expo (React Native)** | Prefer this for TestFlight via EAS cloud builds |
| `PayPace/` | Native SwiftUI | Original iOS project (Xcode Archive) |

## Expo → TestFlight (recommended)

**Important:** `app.json` / `eas.json` live in `PayPaceApp/`.  
If you run `eas build` from the repo root you get:

`Run this command inside a project directory.`

```bash
cd PayPaceApp
npm install
npx eas-cli login
npm run build:ios
# or:
npm run build:ios:submit
```

From the repo root you can also use the forwarder scripts:

```bash
npm run build:ios
```

`npm warn deprecated rimraf/glob` during install is noisy but not a build failure.

Details: [`PayPaceApp/TESTFLIGHT-EAS.md`](PayPaceApp/TESTFLIGHT-EAS.md)

## Shared budget (couple sync)

See [`PayPaceApp/SHARED-BUDGET.md`](PayPaceApp/SHARED-BUDGET.md) — invite code + Supabase sync.

## Native Swift → TestFlight

See [`PayPace/TESTFLIGHT.md`](PayPace/TESTFLIGHT.md)
