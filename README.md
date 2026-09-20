# PayPace

**Know exactly what you can spend until payday.**

## Apps in this repo

| Folder | Stack | Notes |
|--------|-------|-------|
| `PayPaceApp/` | **Expo (React Native)** | Prefer this for TestFlight via EAS cloud builds |
| `PayPace/` | Native SwiftUI | Original iOS project (Xcode Archive) |

## Expo → TestFlight (recommended)

```bash
cd PayPaceApp
npm install
npx eas-cli login
npx eas-cli init
npm run build:ios:submit
```

Details: [`PayPaceApp/TESTFLIGHT-EAS.md`](PayPaceApp/TESTFLIGHT-EAS.md)

## Native Swift → TestFlight

See [`PayPace/TESTFLIGHT.md`](PayPace/TESTFLIGHT.md)
