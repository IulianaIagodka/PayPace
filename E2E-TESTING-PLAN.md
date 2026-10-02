# PayPace — план end-to-end тестування

Мета: перевірити повні користувацькі сценарії «від старту до результату» на реальному UI / наближених до пристрою шарах, а не лише ізольовану математику в `scripts/*.test.mts`.

---

## 1. Що вже є (і чого не вистачає)

| Шар | Стан | Приклади |
|-----|------|----------|
| Unit / domain | Є | `dayPace`, `controlPanel`, `categoriesDisplay`, `statementParse`, … |
| Service «E2E» (без UI) | Є | `scripts/sharedBudget.e2e.mts` — create → join → spends → merge → 3-й член |
| UI E2E (симулятор / пристрій) | Немає | немає Maestro / Detox / testID-покриття |
| Manual device / StoreKit | Чеклист | `RELEASE-YOU.md` (Plus sandbox, TestFlight) |

Цей план закриває **UI E2E + ручні критичні шляхи**, не замінює unit-тести.

---

## 2. Цілі й межі

### Цілі

1. Регресія ключових флоу перед TestFlight / стором.
2. Швидка перевірка інваріантів продукту з `TECHNICAL.md` на UI.
3. Покриття Free vs Plus гейтів без ручного «все клікнути».
4. Відтворювані сценарії для двох пристроїв (shared budget) — де можливо.

### Поза scope (поки)

- Повний візуальний pixel-diff / скріншот-регресія App Store.
- Навантажувальне тестування Supabase.
- Автоматизація реальних Apple IAP у CI (лише ручний sandbox на iPhone).
- Android (shipping target = iOS).

---

## 3. Рекомендований стек

| Рішення | Роль |
|---------|------|
| **Maestro** | Основний UI E2E для Expo/iOS (YAML-флоу, стабільний для RN) |
| Існуючі `npm test` | Доменна логіка + service E2E shared budget |
| Ручний чеклист | Камера/Photos, StoreKit, Realtime на двох телефонах |
| `testID` на ключових контролах | Стабільні селектори Maestro |

Альтернатива (важча): Detox. Для PayPace Maestro достатньо — менше інфра, швидший старт.

**Seed / reset:** для автотестів — dev-кнопка або deep-link «reset store» / preloaded AsyncStorage fixture (тільки `__DEV__` або debug-білд). Без цього онбординг і Plus-гейты важко повторювати.

---

## 4. Середовища

| Env | Для чого |
|-----|----------|
| iOS Simulator + debug Expo / dev client | Автоматизовані UI-флоу без камери/IAP |
| Фізичний iPhone + TestFlight | Камера, Photos, StoreKit sandbox, Realtime |
| Два телефони + Supabase staging | Shared budget create/join/sync |
| CI (опційно пізніше) | Maestro на симуляторі після `npm test` + typecheck |

Секрети для E2E-білду: ті ж `EXPO_PUBLIC_*`, що в `RELEASE-YOU.md`. Для CI — окремий Supabase project / ключі з обмеженими політиками.

---

## 5. Критичні user journeys (пріоритет P0 → P2)

### P0 — must ship

#### J1. Онбординг → Home safe today

1. Fresh install → welcome → баланс → payday → (опційно bills) → result.
2. **Go to home** → вкладка Home.
3. Assert: видно **Safe to spend today** > 0 (для валідних даних), прогрес до payday, немає онбордингу після рестарту.

#### J2. Ручна витрата → Home / Trans / Pace

1. Home або Trans → **+** / Add expense.
2. Сума + категорія + зберегти.
3. Assert:
   - Home: категорія з’явилась (spent / — або spent / planned).
   - Trans: витрата в списку сьогоднішнього циклу.
   - Pace: **LEFT TO SPEND NOW** зменшився; **SAFE TODAY** з’їв денний ліміт; Day = 1-based.

#### J3. Day pace lock (день витрат)

1. Після онбордингу зафіксувати safe today.
2. Додати витрату < ліміту → safe today зменшується, пул майбутніх днів не «роздувається» від underspend.
3. Додати витрату > залишку сьогодні → майбутній пул зменшується (overspend).
4. (Ручний / clock-mock) зміна дати → новий morning lock; sticky 0 на порожньому дні не лишається.

> Математика вже в `dayPace.test.mts`; UI E2E перевіряє, що Home/Pace показують ті самі числа.

#### J4. Free receipt quota

1. Free user: 3 успішні скани (mock Vision / stub analyzer у debug).
4-й скан → апселл Plus / блок.
2. Double-tap **Add everything** → одна витрата (saveLock).
3. Один чек = одна категорія (домінантна / ручна зміна).

#### J5. Plus gates (без реальної оплати)

У `__DEV__`: **TRY PLUS (DEMO)**.

1. Free: Allocate / Shared budget / Statement import / Category balances → PlusUnlock.
2. Demo Plus → ті самі екрани відкриваються.
3. Settings: Plus card показує unlocked стан.

#### J6. Allocate + category cards

1. Plus → Allocate → виділити groceries / food.
2. Home: картки з allocated > 0 показують **spent / planned** + meter; без alloc — **spent / —**, не `0/0`.
3. Порожні категорії (0 spent, 0 alloc) не в rail.

---

### P1 — high value

#### J7. Bills + Edit pay cycle

1. Settings → Bills: add / mark paid / edit.
2. Pay Cycle: зміна балансу / payday; опційний reset day lock.
3. Home/Pace оновлюються; timeline Day коректний якщо витрати старші за новий start.

#### J8. Statement import (Plus)

1. Завантажити fixture `scripts/fixtures/mbank-ekonto.csv`.
2. Preview: групування по днях + категоріях.
3. Confirm → витрати з датами в правильному циклі.
4. Поганий файл → помилка, без вигаданих витрат.

#### J9. Period report prompt

1. Симулювати кінець тижня/місяця (fixture дат або clock).
2. Alert View / Later.
3. View → PeriodReport; Later → лінк на Pace.

#### J10. History / Trans list UX

1. Expand / collapse груп по датах.
2. Видалення / редагування витрати (якщо є) → перерахунок Home/Pace.

---

### P2 — shared & store

#### J11. Shared budget (2 пристрої)

Автоматизовано на рівні сервісу вже є (`test:shared`). UI/device:

1. Device A (Plus): Create → invite code.
2. Device B (Plus): Join з кодом.
3. A додає витрату → B бачить після Realtime або Sync now / foreground.
4. Обидва бачать той самий баланс / payday / bills.
5. Третій join → reject.
6. Локальні partner metric notifications (без APNs).

#### J12. StoreKit (лише ручний)

1. Sandbox Apple ID на TestFlight.
2. PLUS MONTHLY / YEARLY / RESTORE.
3. Після restore Plus-фічі доступні; без демо-кнопки в прод-білді.

#### J13. Persistence / cold start

1. Онбординг + витрати → kill app → reopen → дані на місці.
2. Shared household id / Plus entitlement не губляться без логічної причини.

---

## 6. Матриця покриття (що чим тестуємо)

| Journey | Unit/service | UI Maestro | Manual device |
|---------|--------------|------------|---------------|
| J1 Onboarding | — | P0 | smoke |
| J2 Manual expense | calculator / categories | P0 | smoke |
| J3 Day pace | `test:pace` | P0 числа на UI | edge date change |
| J4 Receipt quota / one category | `test:scans`, `test:receipt-category` | P0 з mock | реальна камера |
| J5 Plus gates | — | P0 demo | StoreKit J12 |
| J6 Allocate / cards | `test:categories` | P0 | — |
| J7 Bills / cycle | `test:cycle`, `test:range` | P1 | — |
| J8 Statement | `test:statement*` | P1 fixture | — |
| J9 Period reports | `test:reports` | P1 | — |
| J10 Trans UX | — | P1 | — |
| J11 Shared | `test:shared`, `test:sync`, `test:notify` | опційно 1-device UI | **2 phones P0 для релізу** |
| J12 IAP | — | — | **P0 реліз** |
| J13 Persistence | — | P1 | smoke |

---

## 7. Інваріанти, які E2E не повинен ламати

З `TECHNICAL.md` — fail = блокер релізу:

1. Один чек → одна категорія.
2. Категорії: show iff spent > 0 **або** allocated > 0; UI **spent / planned** або **spent / —**.
3. Default envelopes allocated = 0.
4. Pace Day 1-based; лейбли LEFT TO SPEND NOW / IF THIS PACE → PAYDAY / PACE.
5. Receipt save single-flight.
6. Statement fail-closed.
7. Shared budget і Allocate — Plus only.

---

## 8. Підготовка коду (перед першими Maestro-флоу)

1. Додати `testID` (мінімум):
   - `onboarding.*` (кроки, Go to home)
   - `tabs.home|activity|status|settings`
   - `home.safeToday`, `home.addExpense`
   - `pace.leftToSpend`, `pace.safeToday`, `pace.dayLabel`, `pace.status`
   - `expense.amount`, `expense.save`, `expense.category`
   - `settings.plusDemo`, `settings.sharedBudget`, `settings.allocate`
   - `plus.unlock`, `receipt.save`, `statement.confirm`
2. Debug-only: **Reset app data** + опційно **Seed demo cycle** (відомі баланс/payday/витрати).
3. Debug stub для receipt analyzer (без OpenAI у CI).
4. Документувати запуск: `maestro test .maestro/…` + потрібний білд.

Не чіпати прод UX ради тестів: `testID` невидимі; seed/reset лише в debug.

---

## 9. Структура репо (пропозиція)

```
.maestro/
  config.yaml
  flows/
    01-onboarding.yaml
    02-add-expense.yaml
    03-pace-after-spend.yaml
    04-plus-gates-free.yaml
    05-plus-allocate.yaml
    06-statement-import.yaml
    …
scripts/fixtures/          # вже є mbank CSV; додати receipt mock JSON за потреби
E2E-TESTING-PLAN.md        # цей документ
```

npm scripts (після впровадження):

```bash
npm test                   # як зараз — domain
npm run test:e2e           # maestro test .maestro/
npm run test:e2e:smoke     # лише J1–J3
```

---

## 10. Фази впровадження

### Фаза A — фундамент

- testID на критичних екранах.
- Debug reset/seed.
- Maestro smoke: J1 + J2 + J3 (числа).
- Чеклист ручний у PR / реліз: J11 (2 phones) + J12.

### Фаза B — Plus і імпорт

- J4 (mock receipt), J5, J6, J8.
- Підключити smoke до локального pre-submit (`build:ios:local` перед сабмітом).

### Фаза C — CI (опційно)

- GitHub Action: `npm test` + typecheck завжди.
- Maestro на macOS runner / self-hosted Mac (у репо вже є ios-local-mac workflow) — nightly або на PR з лейблом `e2e`.

### Фаза D — розширення

- J7, J9, J10, J13.
- За можливості 1-device UI-обгортка shared (без другого телефону) + залишити 2-device manual.

---

## 11. Критерії готовності перед TestFlight

- [ ] `npm test` зелений
- [ ] `npm run typecheck` зелений
- [ ] Maestro smoke (J1–J3) зелений на симуляторі **або** еквівалентний ручний smoke на білді
- [ ] Ручний: Plus sandbox (J12) якщо змінювався IAP
- [ ] Ручний: shared create/join/sync (J11) якщо чіпали household/Supabase
- [ ] Ручний: 1 реальний скан чека на пристрої якщо чіпали ReceiptScan / OpenAI

---

## 12. Звітність

Кожен автофлоу: назва journey, assert-и, артефакт (Maestro debug / відео при fail).

Регресія в PR: у описі коротко — які journeys зачеплені зміною (напр. «dayPace → J3 unit + UI smoke»).

---

## Пов’язані документи

- [USER-GUIDE.md](./USER-GUIDE.md) — очікувана поведінка для assert-ів
- [TECHNICAL.md](./TECHNICAL.md) — інваріанти й карти екранів
- [SHARED-BUDGET.md](./SHARED-BUDGET.md) — create/join/sync
- [RELEASE-YOU.md](./RELEASE-YOU.md) — StoreKit / секрети / релізний чеклист
