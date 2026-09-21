# PayPace

Payday → payday envelope budgeting. Money = energy.

One Expo app at the **repo root**. Build with EAS (cloud) or on your Mac.

## Setup

```bash
git clone <repo>
cd PayPace
npm install
```

## Local (Mac)

```bash
npx expo start
# then press i for iOS simulator, or scan QR with Expo Go / dev client
```

Native iOS folder (optional, for Xcode):

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

## Cloud TestFlight (EAS)

```bash
npx eas-cli login
npm run build:ios          # cloud build
npm run submit:ios         # upload to TestFlight
# or
npm run build:ios:submit
```

Details: [TESTFLIGHT-EAS.md](./TESTFLIGHT-EAS.md)

## Shared budget

Couple sync via invite code: [SHARED-BUDGET.md](./SHARED-BUDGET.md)

## Scripts

| Command | What |
|---------|------|
| `npm start` | Expo dev server |
| `npm run typecheck` | TypeScript |
| `npm run test:shared` | Shared-budget E2E simulation |
| `npm run build:ios` | EAS iOS production build |
| `npm run submit:ios` | Submit latest build to TestFlight |
