# App Store Connect copy — PayPace

Same pattern as **Rhythma**: for auto-renewable Plus, put Apple’s **standard EULA**
link in the **App Description**. That alone satisfies the Terms of Use metadata check
(Guideline for subscriptions). A Custom EULA in App Information is only needed if you
choose a custom license instead of Apple’s standard one.

## Description (paste into ASC)

Include at least these lines somewhere in the Description text (product page):

```
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://iulianaiagodka.github.io/PayPace/privacy.html
```

Optional (also fine, mirrors in-app / GitHub Pages):

```
Support: https://iulianaiagodka.github.io/PayPace/support.html
```

### Suggested Description body

```
PayPace helps you pace spending from payday to payday — safe-to-spend today, bills, expenses, and a clear path until your next paycheck.

With PayPace you can:
• See how much is safe to spend today
• Track expenses and bills until payday
• Follow your pace on the Pace tab
• Scan receipts (limited on Free; unlimited on Plus)

PayPace Plus (monthly or yearly auto-renewable subscription) unlocks category budgets, unlimited receipt scans, statement import, history, and a shared budget with a partner. Payment is charged to your Apple ID. Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period. Manage or cancel anytime in Apple ID settings.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://iulianaiagodka.github.io/PayPace/privacy.html
```

## Review / metadata URLs

| Field | URL |
|-------|-----|
| Privacy Policy | https://iulianaiagodka.github.io/PayPace/privacy.html |
| Terms of Use (EULA) | https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ |
| Support | https://iulianaiagodka.github.io/PayPace/support.html |

In-app Settings → Legal also links Terms / Privacy / Support. Extra hosted terms:
https://iulianaiagodka.github.io/PayPace/terms.html (optional; **Description must still
use Apple’s stdeula URL** if you keep the Standard Apple EULA, same as Rhythma).

## Subscriptions

- Group: PayPace Plus  
- Monthly: `app.paypace.plus.monthly`  
- Yearly: `app.paypace.plus.yearly`  
- Attach both to the version before submit.
