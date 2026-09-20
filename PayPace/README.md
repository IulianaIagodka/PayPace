# PayPace

**Know exactly what you can spend until payday.**

PayPace is an iOS budgeting app built around one idea: your budget period is **current payday → next payday**, not a calendar month.

## Positioning

Targets searches like:

- paycheck budget
- payday budget
- budget until payday
- money until payday
- weekly budget / biweekly budget
- safe to spend

Not a traditional “budget tracker.” The emotional benefit is: *I know I’m safe until payday.*

## Core formula

```
Current balance
− mandatory expenses before next payday
− savings
− emergency buffer
− spending buffer
− spending already logged
= money available until payday

Safe to spend today = remaining ÷ days until payday
```

## Screens

1. Welcome  
2. Create first pay cycle (balance → payday → bills)  
3. Home / Safe to spend  
4. Add expense  
5. Upcoming bills  
6. Pay cycle details  
7. History (Premium)  
8. Settings  

## MVP scope

Included: pay schedules (monthly, twice monthly, every 2 weeks, weekly, custom), bills, optional buffers, daily spending, local notifications, free/premium gates.

Not included: bank connections, investments, credit scores, heavy reports, social, AI, receipt scanning.

## Monetization

| Free | Premium ($2.99/mo or $19.99/yr) |
|------|--------------------------------|
| 1 active pay cycle | Unlimited pay cycles |
| Basic bills | Recurring bills |
| Daily safe-to-spend | History, widgets*, advanced notifications, shared household* |

\*Widgets and shared household are positioned for Premium; widget extension ships in a follow-up.

## Open in Xcode

1. On a Mac, clone the repo and open **`PayPace/PayPace.xcodeproj`** (the blue project icon), not a single `.swift` file  
2. Xcode 15+ · iPhone simulator (iOS 17+)  
3. Set your Development Team under **Signing & Capabilities**  
4. Run  

If Xcode says the project is corrupted: pull the latest branch, then reopen. The project must include `project.xcworkspace` inside the `.xcodeproj` package.  

For TestFlight, prefer the Expo app in `PayPaceApp/` (`eas build --local` + `eas submit`) — that path does not need this Xcode project.  


## TestFlight

See [`TESTFLIGHT.md`](TESTFLIGHT.md) for Fastlane + GitHub Actions upload.

Quick local upload (Mac):

```bash
cd PayPace
bundle install
export DEVELOPMENT_TEAM=YOUR_TEAM_ID
export APP_STORE_CONNECT_API_KEY_ID=...
export APP_STORE_CONNECT_ISSUER_ID=...
export APP_STORE_CONNECT_API_KEY_PATH=~/AuthKey_XXXXXX.p8   # local .p8 path
# or: export APP_STORE_CONNECT_API_KEY_CONTENT=$(base64 -i AuthKey_XXXXXX.p8)
bundle exec fastlane beta
```

## Project structure

```
PayPace/
├── PayPace.xcodeproj
├── PayPace/
│   ├── PayPaceApp.swift
│   ├── Models/
│   ├── Services/          # calculator, persistence, notifications
│   ├── Theme/
│   └── Views/             # onboarding, home, bills, settings…
└── PayPaceTests/
```

## Design

Calm, warm, iOS-native SwiftUI: large numbers, generous whitespace, soft sage accent, subtle motion — not corporate banking or spreadsheet UI.
