# PayPace — technical guide

Expo 57 / React Native app at the **repo root**. Single codebase; iOS is the shipping target (TestFlight / App Store).

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Expo SDK 57, React 19, RN 0.86 |
| Nav | React Navigation — bottom tabs + native stack (`App.tsx`) |
| State | `BudgetProvider` (`src/store/BudgetContext.tsx`) + AsyncStorage |
| IAP | `expo-iap` subscriptions (`type: 'subs'`) |
| Receipts | OpenAI via `EXPO_PUBLIC_OPENAI_API_KEY` |
| Shared budget | Supabase (`householdCloud`, Realtime + ~20m poll) |
| Fonts | Orbitron (display) + Barlow Condensed (labels/body) |
| UI tokens | `src/theme/hud.ts` → `hud` + `hudType` |

## Layout

```
App.tsx                 # providers, fonts, tabs/stack
src/
  screens/              # Home, Activity(Trans), Status(Pace), Settings, …
  components/           # HUDPanel, ui (CategoryCell, HudButton, …)
  store/BudgetContext   # cycle, envelopes, expenses, plus entitlement
  services/             # pure logic (pace, categories, receipts, sync)
  models/               # types + calculator snapshot
  theme/                # colors, fonts, hud
scripts/                # node --experimental-strip-types unit tests
docs/                   # GitHub Pages (privacy/support)
```

### Tabs (user-facing names)

| Route | Screen | Label |
|-------|--------|-------|
| `Home` | HomeScreen | Home |
| `Activity` | ActivityScreen | Trans |
| `Status` | StatusScreen | Pace |
| `Settings` | SettingsScreen | Settings |

Stack: Onboarding, AddExpense, Bills, PayCycle, History, Allocate, ReceiptScan, StatementImport, CategoryBalances, SharedBudget.

## Domain model (cycle)

A **pay cycle** holds balance, payday, bills, envelopes, expenses. Snapshot math lives in `src/models/calculator.ts` (days left, spent, remaining, safe today, etc.).

### Day pace (`src/services/dayPace.ts`)

- `DayPaceLock { date, allowance }` — morning lock of today’s allowance.
- Today’s spend burns only the lock; underspend stays reserved for today; overspend reduces the future pool.
- Home “Safe to spend today” reads the lock; empty-day edge cases must not leave a sticky 0 (see lock refresh when date changes).

### Control panel / Pace (`src/services/controlPanel.ts` + StatusScreen)

- UI copy: **LEFT AT PAYDAY** (projected leftover), **PACE** (trajectory / burn status).
- Timeline: **Day `{daysElapsed + 1}` of N** (1-based for humans).

## Categories & envelopes

| File | Role |
|------|------|
| `categories.ts` | `BUILTIN_CATEGORIES`, keywords, `normalizeCategory`, `shouldShowCategory` |
| `envelopes.ts` | `defaultEnvelopes` (alloc **0**), `ensureEnvelopes`, migrate legacy keys |
| `categoryBalances.ts` | spent/allocated rows; `categoryBalancesForDisplay` filters |

**Builtins (order):** home, groceries, food (Eating out), transport, shopping, kids, health, fun, travel, subscriptions, other.

**Visibility:** `shouldShowCategory(spent, allocated)` → show iff spent > 0 **or** allocated > 0.

**CategoryCell / EnvelopeModule:** if `allocated > 0` → remaining / planned + filled meter; else show **spent** and an **empty** meter (same card layout — never hide the bar, never misleading `0/0`).

Legacy migration maps `rent`/`utilities`→home, `childcare`→kids, old food/fun envelope keys, etc.

## Receipts

| Piece | Behavior |
|-------|----------|
| `receiptAnalyzer.ts` | Vision/LLM parse → line items |
| `receiptCategory.ts` | `dominantReceiptCategory` + `withReceiptCategory` — **one category per receipt** |
| `ReceiptScanScreen` | `saveLock` ref prevents double-add on rapid taps |
| `receiptScanQuota.ts` | Free: 3 scans; Plus: unlimited |

Statement import (`statementAnalyzer.ts`) fails closed — no invented expenses.

## Plus billing (`src/services/plusBilling.ts`)

- Products: `app.paypace.plus.monthly`, `app.paypace.plus.yearly` (`expo-iap`, `type: 'subs'`).
- Settings UI: monthly / yearly / restore; `__DEV__` demo unlock.
- Gates: Allocate, custom categories, unlimited scans, statement import, shared budget, category detail.

No RevenueCat. No `aps-environment` — partner metric alerts are **local** (`expo-notifications` local only).

## Shared household

- Create/join invite code → Supabase `households` (see `SHARED-BUDGET.md`, `supabase/schema.sql`).
- Merge policy: `householdMerge.ts`, sync policy tests in `scripts/householdSync.test.mts`.
- Realtime + foreground pull + ~20m reconcile; `partnerMetricsNotify` for local pings.

## UI system

- **Background:** full-bleed clean panel (`ScreenBackground`) — no grain texture on shipping main.
- **Chrome:** `HUDPanel`, rivets/corners via `hud` tokens; compact Settings uses `hud.padCompact`.
- **Typography:** always prefer `hudType.*` (`screenTitle`, `brand`, `body`, `bodyStrong`, `value` / `valueMid` / `valueHero`, `label`, `link`, `field`) — avoid ad-hoc `colors.ink` / random sizes so screens stay consistent.

## Persistence & secrets

- Local: AsyncStorage via `persistence.ts`.
- Build-time env (`app.config.js` → `expo.extra`):  
  `EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_SUPABASE_*`, optional Plus product IDs, privacy/support URLs.
- Never commit `.env`. Rebuild after secret changes.

## Tests

```bash
npm test                 # shared + control + sync + status + pace + range + notify + scans
npm run test:control     # Pace labels / control panel
npm run test:pace        # dayPace lock math
npm run test:receipt-category
npm run test:categories
npm run typecheck
```

Leaf services are tested with `node --experimental-strip-types` (no Expo runtime). Prefer keeping domain logic in `services/` so tests stay importable.

## Build / ship

| Path | Command |
|------|---------|
| Dev | `npx expo start` |
| Local Mac → TF | `npm run build:ios:local:submit` |
| Cloud EAS | `npm run build:ios:submit` |
| Actions | https://github.com/IulianaIagodka/PayPace/actions (self-hosted Mac runner when configured) |

Always `git pull` on `main` before a release build. Owner checklist: [RELEASE-YOU.md](./RELEASE-YOU.md). User-facing product doc: [USER-GUIDE.md](./USER-GUIDE.md).

## Recent product invariants (do not regress)

1. One receipt → one category (line items OK).
2. Category rail/lists: spent **or** allocated only; cards show spent when alloc = 0.
3. Default envelopes start at allocated 0 (no fake auto-budget).
4. Pace Day is 1-based; labels LEFT AT PAYDAY / PACE.
5. Receipt save is single-flight (`saveLock`).
6. Screen text goes through `hudType`.
