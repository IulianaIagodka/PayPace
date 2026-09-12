# PayPace — TestFlight / App Store Connect

Bundle ID: `app.paypace.PayPace`  
Version: `1.0.0` (marketing) · build auto-increments

## What you need in Apple Developer / App Store Connect

1. Create an **App ID** with bundle id `app.paypace.PayPace`
2. Create the app in **App Store Connect** (name: PayPace)
3. Create an **App Store Connect API Key** (Admin or App Manager)  
   - Note: Key ID, Issuer ID  
   - Download the `.p8` once
4. Know your **Team ID** (Membership details in developer.apple.com)

## Secrets (local or GitHub Actions)

| Variable | Description |
|----------|-------------|
| `DEVELOPMENT_TEAM` | Apple Team ID |
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | `.p8` contents **base64-encoded** (for CI) |
| `APP_IDENTIFIER` | Optional, default `app.paypace.PayPace` |

Encode the key:

```bash
base64 -i AuthKey_XXXXXX.p8 | pbcopy
```

## Local build + TestFlight (Mac with Xcode)

```bash
cd PayPace
bundle install
export DEVELOPMENT_TEAM=YOUR_TEAM_ID
export APP_STORE_CONNECT_API_KEY_ID=...
export APP_STORE_CONNECT_ISSUER_ID=...
export APP_STORE_CONNECT_API_KEY_PATH=~/AuthKey_XXXXXX.p8

# IPA only
bundle exec fastlane ipa

# Build + upload to TestFlight
bundle exec fastlane beta
```

Or from Xcode: **Product → Archive → Distribute App → App Store Connect → Upload**.

## GitHub Actions

Workflow: `.github/workflows/testflight.yml`

1. Add the secrets above in the repo **Settings → Secrets and variables → Actions**
2. Run **Actions → TestFlight → Run workflow**
3. Wait for processing in App Store Connect → TestFlight

## Note about this Cloud Agent environment

This Linux environment **cannot** compile an iOS IPA (no Xcode). Use a Mac or the GitHub Actions macOS runner above.
