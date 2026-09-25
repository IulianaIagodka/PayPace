# Що зробити тобі окремо (реліз)

Код уже підготовлений під стор. Нижче — кроки, які можу зробити тільки ти (акаунти, ключі, юридичка, App Store Connect).

## 1. Секрети в EAS (обов’язково перед прод-білдом)

На [expo.dev](https://expo.dev) → проект PayPace → Environment variables (**production**):

| Змінна | Навіщо |
|--------|--------|
| `EXPO_PUBLIC_OPENAI_API_KEY` | Скани чеків |
| `EXPO_PUBLIC_SUPABASE_URL` | Shared budget sync |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Shared budget sync |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Опційно (за замовч. GitHub Pages privacy) |
| `EXPO_PUBLIC_TERMS_OF_USE_URL` | Опційно (за замовч. GitHub Pages terms / EULA) |
| `EXPO_PUBLIC_SUPPORT_URL` | Опційно (за замовч. GitHub Pages support) |
| `EXPO_PUBLIC_PLUS_MONTHLY_PRODUCT_ID` | Опційно (за замовч. `app.paypace.plus.monthly`) |
| `EXPO_PUBLIC_PLUS_YEARLY_PRODUCT_ID` | Опційно (за замовч. `app.paypace.plus.yearly`) |
| `EXPO_PUBLIC_PLUS_PRODUCT_ID` | Опційно, legacy restore (`app.paypace.plus`) |

Локально на Mac — ті самі в `.env` (не комітити). Після зміни ключів — **новий білд**.

Plus **не** потребує RevenueCat — лише StoreKit + підписки у App Store Connect.

## 2. Plus = місячна + річна підписка (StoreKit)

1. [App Store Connect](https://appstoreconnect.apple.com) → PayPace → **Subscriptions**
2. Створи **Subscription Group** (наприклад `PayPace Plus`)
3. У групі додай **два Auto-Renewable Subscriptions**:
   - Product ID **`app.paypace.plus.monthly`** — 1 month
   - Product ID **`app.paypace.plus.yearly`** — 1 year
4. Заповни ціни, локалізації, review screenshot для підписок
5. Додай обидва продукти до версії додатку (Agreements / Paid Apps якщо ще не прийняті)
6. Збери **TestFlight** і на **фізичному iPhone** з Sandbox Apple ID перевір:
   - Settings → **PLUS MONTHLY** / **PLUS YEARLY**
   - Settings → **RESTORE PURCHASES**

> У `__DEV__` лишається **TRY PLUS (DEMO)**. У стор-білді демо вимкнене — лише StoreKit.

Симулятор / Expo Go для реальних покупок не підходять.

## 3. Юридичка й стор-метадані (обов’язково для підписок)

Apple відхиляє білд з auto-renewable Plus, якщо на **App Store product page** немає
робочого лінка **Terms of Use (EULA)**.

1. **Privacy / Terms / Support уже в репо:** папка `docs/` → GitHub Pages  
   - Privacy: https://iulianaiagodka.github.io/PayPace/privacy.html  
   - **Terms of Use:** https://iulianaiagodka.github.io/PayPace/terms.html  
   - Support: https://iulianaiagodka.github.io/PayPace/support.html  
2. Увімкни Pages один раз: GitHub → **Settings → Pages → Build and deployment**  
   - Source: **Deploy from a branch**  
   - Branch: **`main`** (після мерджу) → folder **`/docs`** → Save  
3. Перевір у браузері, що `terms.html` відкривається (після мерджу на `main`).  
4. **App Store Connect → Description** — додай у текст опису (видимий на product page):

```
Terms of Use (EULA): https://iulianaiagodka.github.io/PayPace/terms.html
Privacy Policy: https://iulianaiagodka.github.io/PayPace/privacy.html
```

5. **App Information → License Agreement** — або Standard Apple EULA **і** лінк у Description
   (варіант Apple), або **Custom EULA** з текстом/URL наших Terms (`docs/terms.html`).  
6. ASC: скріншоти, age rating, Privacy Nutrition Labels (камера, Photos).  
7. У ASC вкажи Privacy / Support URL.  

Готовий текст / чеклист: [docs/APP-STORE-DESCRIPTION.md](./docs/APP-STORE-DESCRIPTION.md).

## 4. Supabase для Shared Budget

Якщо Plus включає shared budget — доведи схему/політики з `SHARED-BUDGET.md`, щоб create/join працювали в проді.

## 5. Збірка і сабміт

```bash
git pull
npx eas-cli login
# переконайся, що production env vars на місці
npm run build:ios:local:submit   # або npm run build:ios:submit
```

Actions: https://github.com/IulianaIagodka/PayPace/actions

## 6. Що вже зроблено в коді (не треба повторювати)

- 3 безкоштовні скани чеків; один чек → одна категорія; захист від подвійного Add  
- Shared Budget лише в Plus (локальні алерти, без APNs)  
- Statement більше не підставляє фейкові витрати  
- Plus CTA → **MONTHLY** / **YEARLY** StoreKit subscriptions + restore (`expo-iap`), демо лише в dev  
- Категорії за замовч. з alloc 0; у списках лише spent або allocated; картка без бюджету показує spent  
- Pace: LEFT AT PAYDAY, Day 1-based; clean full-bleed bg; єдиний `hudType`  
- Privacy / **Terms of Use** / Support лінки в Settings + Plus card; Error boundary  

Документація: [USER-GUIDE.md](./USER-GUIDE.md) · [TECHNICAL.md](./TECHNICAL.md)

## Готово до сабміту, коли

- [ ] EAS secrets (OpenAI / Supabase) виставлені  
- [ ] Підписки `app.paypace.plus.monthly` + `app.paypace.plus.yearly` живі; покупка проходить у Sandbox на девайсі  
- [ ] Privacy + **Terms of Use** URL відкриваються (GitHub Pages увімкнено)  
- [ ] **Description** містить лінк Terms of Use (EULA); Custom EULA в ASC за бажанням  
- [ ] ASC метадані + скріни готові  
- [ ] Новий білд з `main` після мерджу Terms / останніх фіксів  

