# PayPace (Expo) — TestFlight via EAS

Project: [@iuliana.iagodka/paypace](https://expo.dev/accounts/iuliana.iagodka/projects/paypace)  
Bundle ID: `app.paypace.PayPace`

> Always run EAS from **`PayPaceApp/`** (or use root `npm run build:ios`).  
> Root of the git repo is not an Expo project — that causes  
> `Run this command inside a project directory`.

## One-time Apple credentials (on your Mac)

EAS is logged in, but Apple signing must be set up once interactively:

```bash
cd PayPaceApp
npm install
npx eas-cli credentials -p ios
```

Choose **Build Credentials** → let Expo manage the Distribution Certificate & Provisioning Profile (use the same Apple team as App Store Connect).

## Build + upload to TestFlight

```bash
cd PayPaceApp

# Cloud iOS build
npm run build:ios

# After it finishes — submit to App Store Connect / TestFlight
npm run submit:ios

# Or both:
npm run build:ios:submit
```

## Preview the app locally

```bash
cd PayPaceApp
npx expo start
```
