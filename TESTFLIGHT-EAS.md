# TestFlight via EAS

Project: [@iuliana.iagodka/paypace](https://expo.dev/accounts/iuliana.iagodka/projects/paypace)  
Bundle ID: `app.paypace.PayPace`

`origin/main` is the source of truth. Code from the **phone** (Cursor) or the **Mac**, then ship an IPA either **on this Mac** or **in EAS cloud**.

Run all commands from the **repo root**. Do **not** add `eas-cli` to `package.json` (expo-doctor flags it). Use `npx eas-cli` or install once:

```bash
npm install -g eas-cli
```

## Keep phone and Mac in sync

Two Cursor sessions on `main` without pull/push will diverge.

1. Before work on **either** device: `git pull`
2. After changes: commit and `git push`
3. On the Mac, `git pull` again **before** any build

The phone cannot compile an IPA. From the phone you push code (and can start a **cloud** build). The Mac pulls, then builds locally or also in the cloud.

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

On the phone: Expo Go, same Wi‑Fi, scan the QR.

## Cloud build (phone or Mac)

EAS compiles on Expo’s servers. This is the path to use **from the phone** (Cursor agent / laptop without a local Xcode build).

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

## Local build (Mac only)

Same production profile, compiled on this Mac. `--auto-submit` does **not** work with `--local`.

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

### If local build fails: RuntimeScheduler / SWIFT_RETURNS_RETAINED

Xcode 26.2–26.3 (Swift 6.2) rejects `SWIFT_RETURNS_RETAINED` on `RuntimeScheduler` constructors in `expo-modules-jsi`. SDK 57’s official Xcode floor is 26.4; Sequoia often cannot install that.

The repo already patches this (`patches/expo-modules-jsi+57.1.0.patch`, applied on `npm install`). After pulling, run `npm install` before `npm run build:ios:local`.

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
