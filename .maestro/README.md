# PayPace Maestro E2E

UI smoke for journeys **J1–J3** from [E2E-TESTING-PLAN.md](../E2E-TESTING-PLAN.md).

## Prerequisites

1. **Native iOS build** with `__DEV__` (debug / local dev client). Expo Go is not enough — `appId` is `app.paypace.PayPace`.
2. [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) installed.
3. iOS Simulator booted; app installed (`npx expo run:ios` or a local IPA).

Debug-only Settings controls (seed / reset) ship only in `__DEV__`.

## Run

```bash
# All flows under .maestro/flows
npm run test:e2e

# Smoke tag only (01–03 + smoke.yaml)
npm run test:e2e:smoke

# One flow
maestro test .maestro/flows/01-onboarding.yaml
```

## Flows

| File | Journey |
|------|---------|
| `flows/01-onboarding.yaml` | J1 onboarding → Home |
| `flows/02-add-expense.yaml` | J2 log expense |
| `flows/03-pace-after-spend.yaml` | J3 Pace after spend |
| `flows/smoke.yaml` | J1→J2→J3 in one session |
| `helpers/seed-demo.yaml` | Shared onboarding to 3000 / 15 days |

Domain seed math (safe today = 200) is asserted in CI via `npm run test:e2e-seed` without a simulator.
