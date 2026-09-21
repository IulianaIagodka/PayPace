# TestFlight via EAS

Project: [@iuliana.iagodka/paypace](https://expo.dev/accounts/iuliana.iagodka/projects/paypace)  
Bundle ID: `app.paypace.PayPace`

Run all commands from the **repo root** (this is the Expo project).

Install the CLI globally (do **not** add `eas-cli` to `package.json` — expo-doctor flags it):

```bash
npm install -g eas-cli
# or use npx eas-cli … (npm scripts already do this)
```

## One-time Apple credentials (Mac)

```bash
npm install
npx eas-cli login
npx eas-cli credentials -p ios
```

Build Credentials → let Expo manage Distribution Certificate & Provisioning Profile.

## Cloud build + upload

```bash
npm run build:ios
npm run submit:ios
# or
npm run build:ios:submit
```

## Local build (Mac, no Xcode Archive UI)

Needs: Xcode installed, CocoaPods (`pod --version`), unlocked login keychain.

```bash
brew install cocoapods   # if needed
security unlock-keychain ~/Library/Keychains/login.keychain-db
npm run build:ios:local
```

Submit the IPA from the path printed at the end of the build:

```bash
npx eas-cli submit --platform ios --profile production --path ./your-build.ipa
```

### If local build fails: certificate not imported

Error looks like:

`Distribution certificate with fingerprint … hasn't been imported successfully`

1. Unlock the login keychain (dialog / `security unlock-keychain` above), then retry.
2. If it still fails, refresh credentials and retry:

```bash
npx eas-cli credentials -p ios
# remove Distribution Certificate → let EAS create a new one
npm run build:ios:local
```

## Local preview

```bash
npx expo start
```
