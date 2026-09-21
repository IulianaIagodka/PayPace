# TestFlight via EAS

Project: [@iuliana.iagodka/paypace](https://expo.dev/accounts/iuliana.iagodka/projects/paypace)  
Bundle ID: `app.paypace.PayPace`

Run all commands from the **repo root** (this is the Expo project).

## Cursor Cloud Agent

Cloud Agent install runs `npm ci`. Secret `EXPO_TOKEN` authenticates EAS non-interactively.

Tell the agent explicitly when you want a build, e.g. **«збілди і сабміт в TestFlight»**. It will not start builds on its own.

```bash
npm run build:ios
npm run submit:ios
# or
npm run build:ios:submit
```

These use **EAS cloud** builders (no Mac Xcode / Fastlane in the agent VM).

## One-time Apple credentials (Mac)

```bash
npm install
npx eas-cli credentials -p ios
```

Build Credentials → let Expo manage Distribution Certificate & Provisioning Profile.

## Build + upload (Mac terminal)

```bash
npm run build:ios
npm run submit:ios
# or
npm run build:ios:submit
```

## Local preview

```bash
npx expo start
```
