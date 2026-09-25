# App Store — description snippet (Terms of Use)

Apple requires a **functional Terms of Use (EULA) link** on the App Store product
page when you sell auto-renewable subscriptions (PayPace Plus Monthly / Yearly).

## What you must do in App Store Connect

### A. App Description (required for review)

In **App Store Connect → PayPace → App Store → [version] → Description**, include
these lines (or equivalent) so the Terms URL is visible on the product page:

```
Terms of Use (EULA): https://iulianaiagodka.github.io/PayPace/terms.html
Privacy Policy: https://iulianaiagodka.github.io/PayPace/privacy.html
```

You can also use Apple’s standard EULA URL instead of (or in addition to) ours:

```
Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

### B. Custom EULA field (recommended)

**App Store Connect → App Information → License Agreement → Edit** → choose
**Apply a custom EULA** and either:

- paste the text from `docs/terms.html`, or  
- if ASC accepts a URL in that flow for your account, use the Terms URL above.

Privacy Policy URL field (App Privacy / App Information) should remain:

`https://iulianaiagodka.github.io/PayPace/privacy.html`

Support URL:

`https://iulianaiagodka.github.io/PayPace/support.html`

## In-app

Settings → Legal already links **Terms of Use**, Privacy Policy, and Support.
The PayPace Plus offer card also links Terms + Privacy.
