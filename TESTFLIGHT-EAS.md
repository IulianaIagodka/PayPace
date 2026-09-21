# TestFlight via EAS

Project: [@iuliana.iagodka/paypace](https://expo.dev/accounts/iuliana.iagodka/projects/paypace)  
Bundle ID: `app.paypace.PayPace`

Run all commands from the **repo root** (this is the Expo project).

## One-time Apple credentials (Mac)

```bash
npm install
npx eas-cli credentials -p ios
```

Build Credentials → let Expo manage Distribution Certificate & Provisioning Profile.

## Build + upload

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
