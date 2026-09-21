# TestFlight via EAS

Project: [@iuliana.iagodka/paypace](https://expo.dev/accounts/iuliana.iagodka/projects/paypace)  
Bundle ID: `app.paypace.PayPace`

`origin/main` is the source of truth. Code from the **phone** (Cursor) or the **Mac**, then ship an IPA either **on this Mac** or **in EAS cloud**.

Run all commands from the **repo root**. Do **not** add `eas-cli` to `package.json` (expo-doctor flags it). Use `npx eas-cli`.

## Always pull before you build

A local Mac build uses **whatever commit is checked out**. If you skip `git pull`, TestFlight can ship an old design and miss recent fixes (this is what happened with build 32).

```bash
git checkout main
git pull
```

Then build.

## Keep phone and Mac in sync

Two Cursor sessions on `main` without pull/push will diverge.

1. Before work on **either** device: `git pull`
2. After changes: commit and `git push`
3. On the Mac, `git pull` again **before** any build

The phone cannot compile an IPA itself. Push to `main` (or run the **iOS local Mac** workflow from the GitHub app) and the **self-hosted runner on this Mac** builds the IPA with Xcode, then uploads TestFlight.

The Mac must be powered on, logged in (login keychain unlocked), and online. Cursor does not need to be open.

Cloud EAS (`npm run build:ios`) still works from the phone without this Mac.

## Secrets in the binary

| Build path | Where keys come from |
|------------|----------------------|
| Local Mac (`build:ios:local*`) | `.env` in the repo root (gitignored), and/or EAS production env |
| EAS cloud | EAS **production** environment variables |

Needed for full features: `EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. See [README.md](./README.md) and [SHARED-BUDGET.md](./SHARED-BUDGET.md).

## One-time Mac setup

Needs: Xcode (26.3 works with the `expo-modules-jsi` patch in `patches/`; Expo’s official minimum is 26.4 / Swift 6.3), CocoaPods (`pod --version`), Expo login, Apple Developer.

```bash
npm install
npx eas-cli login
npx eas-cli credentials -p ios
```

Build Credentials → let Expo manage Distribution Certificate & Provisioning Profile.

Current Apple WWDR intermediates must be in the keychain (the 2013 WWDR expired in 2023). See [Local build troubleshooting](#if-local-build-fails-certificate-not-imported).

## Preview on the phone (not TestFlight)

On the Mac, after `git pull`:

```bash
npx expo start
```

On the phone: Expo Go, same Wi‑Fi, scan the QR. That is preview only. TestFlight is a standalone production IPA; EAS may warn that Expo Go is the dev client — the build scripts set `EAS_BUILD_NO_EXPO_GO_WARNING=true`.

## Cloud build (phone or Mac)

EAS compiles on Expo’s servers. This is the path to use **from the phone** (Cursor agent / laptop without a local Xcode build). Uses EAS build minutes.

```bash
git pull
npx eas-cli login
npm run build:ios
npm run submit:ios
```

Or one step:

```bash
npm run build:ios:submit
```

`npm run submit:ios` uploads the **latest cloud** build (`--latest`). It will not pick up a Mac IPA.

The binary shows up in App Store Connect → TestFlight after processing (about 10–15 minutes).

## Remote build on this Mac (GitHub runner)

One-time on the Mac: a GitHub Actions runner labeled `paypace-mac` (`~/actions-runner`, LaunchAgent). Workflow: [`.github/workflows/ios-local-mac.yml`](./.github/workflows/ios-local-mac.yml).

From the phone:

1. Commit and push to `main` (markdown-only pushes are skipped), or
2. GitHub app → **Actions** → **iOS local Mac** → **Run workflow** (optional TestFlight upload)

The job checks out `main`, `npm ci`, `eas build --local --output PayPace.ipa`, then `eas submit --path PayPace.ipa`. Watch the log in the GitHub app.

If the job fails on the distribution certificate, unlock the Mac keychain in the GUI (`security unlock-keychain`) and re-run. Do not call `security show-keychain-info` from the runner — a LaunchAgent cannot talk to the login keychain and the job dies immediately.

## Local build (Mac only, in Terminal)

Same production profile, compiled on this Mac — **no EAS cloud minutes**. `--auto-submit` does **not** work with `--local`.

One command (pull → install → local IPA → TestFlight):

```bash
npm run build:ios:local:submit
```

Uses `scripts/build-ios-local.sh` (loads `.env` if present). Options: `--no-pull`, `--no-submit`.

Manual steps if you prefer:

```bash
git pull
npm install
security unlock-keychain ~/Library/Keychains/login.keychain-db
npm run build:ios:local
```

If macOS asks for keychain access, click **Always Allow**.

Submit the IPA path printed at the end of the build:

```bash
npx eas-cli submit --platform ios --profile production --path ./your-build.ipa
```

### If local build fails: RuntimeScheduler or “sending resultPtr risks causing data races”

Xcode 26.2–26.3 (Swift 6.2) cannot compile stock `expo-modules-jsi`: invalid `SWIFT_RETURNS_RETAINED` on constructors, and `nonisolated(unsafe) let` still trips “sending 'resultPtr'/'thisPtr'/'argumentsPtr' risks causing data races”. SDK 57’s official Xcode floor is 26.4; Sequoia often cannot install that.

The repo patches both (`patches/expo-modules-jsi+57.1.0.patch`, applied on `npm install`). After pulling, run `npm install` before `npm run build:ios:local`.

### If local build fails: certificate not imported

Error looks like:

`Distribution certificate with fingerprint … hasn't been imported successfully`

1. Unlock the login keychain (`security unlock-keychain` above). If macOS shows a keychain dialog during the build, click **Always Allow**.
2. Install current Apple WWDR intermediates. Without them, `security find-identity` treats the distribution cert as invalid:

```bash
curl -fsSLo /tmp/AppleWWDRCAG3.cer https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
curl -fsSLo /tmp/AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
curl -fsSLo /tmp/AppleWWDRCAG5.cer https://www.apple.com/certificateauthority/AppleWWDRCAG5.cer
curl -fsSLo /tmp/AppleWWDRCAG6.cer https://www.apple.com/certificateauthority/AppleWWDRCAG6.cer
security add-certificates -k ~/Library/Keychains/login.keychain-db /tmp/AppleWWDRCAG3.cer /tmp/AppleWWDRCAG4.cer /tmp/AppleWWDRCAG5.cer /tmp/AppleWWDRCAG6.cer
```

Also add G3–G6 to the **System** keychain (Keychain Access, or an admin `security add-certificates -k /Library/Keychains/System.keychain …`) and remove the expired 2013 WWDR if it is still there.

3. If it still fails, refresh credentials and retry:

```bash
npx eas-cli credentials -p ios
# remove Distribution Certificate → let EAS create a new one
npm run build:ios:local
```
