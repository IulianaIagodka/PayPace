# PayPace Maestro E2E

UI flows for journeys from [E2E-TESTING-PLAN.md](../E2E-TESTING-PLAN.md).

## Prerequisites

1. **Native iOS build** with `__DEV__` (debug / local dev client). Expo Go is not enough — `appId` is `app.paypace.PayPace`.
2. [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) installed.
3. iOS Simulator booted; app installed (`npx expo run:ios` or a local IPA).

Debug-only controls (`__DEV__`): Settings **SEED DEMO CYCLE** / **EXHAUST FREE SCANS** / **RESET APP DATA**; Receipt **LOAD DEMO RECEIPT**; Statement **LOAD DEMO STATEMENT**.

## Run

```bash
npm run test:e2e           # all flows
npm run test:e2e:smoke     # tag smoke (J1–J8)
npm run test:e2e:plus      # tag plus (J5–J6, J8)

maestro test .maestro/flows/01-onboarding.yaml
```

## Flows

| File | Journey |
|------|---------|
| `flows/01-onboarding.yaml` | J1 onboarding → Home |
| `flows/02-add-expense.yaml` | J2 log expense |
| `flows/03-pace-after-spend.yaml` | J3 Pace after spend |
| `flows/04-plus-gates-free.yaml` | J5 Free → Plus gates |
| `flows/05-plus-allocate.yaml` | J6 Allocate + category rail |
| `flows/06-statement-import.yaml` | J8 demo statement import |
| `flows/07-receipt-quota.yaml` | J4 demo receipt + quota gate |
| `flows/smoke.yaml` | J1→J2→J3 one session |
| `helpers/seed-demo.yaml` | Onboarding to 3000 / 15 days |
| `helpers/unlock-plus.yaml` | Settings TRY PLUS (DEMO) |

Domain asserts without a simulator: `npm run test:e2e-seed`, `npm run test:demo-receipt`.
