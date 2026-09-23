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

## 3. Юридичка й стор-метадані

1. **Privacy / Support уже в репо:** папка `docs/` → GitHub Pages  
   - Privacy: https://iulianaiagodka.github.io/PayPace/privacy.html  
   - Support: https://iulianaiagodka.github.io/PayPace/support.html  
2. Увімкни Pages один раз: GitHub → **Settings → Pages → Build and deployment**  
   - Source: **Deploy from a branch**  
   - Branch: **`main`** (після мерджу) → folder **`/docs`** → Save  
3. App Store Connect: опис, ключові слова, скріншоти, age rating, Privacy Nutrition Labels (камера, Photos).  
4. У ASC вкажи ті самі Privacy / Support URL.

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

- 3 безкоштовні скани чеків  
- Shared Budget лише в Plus  
- Statement більше не підставляє фейкові витрати  
- Plus CTA → **MONTHLY** / **YEARLY** StoreKit subscriptions + restore (`expo-iap`), демо лише в dev  
- Privacy / Support лінки в Settings  
- Error boundary  

## Готово до сабміту, коли

- [ ] EAS secrets (OpenAI / Supabase) виставлені  
- [ ] Підписки `app.paypace.plus.monthly` + `app.paypace.plus.yearly` живі; покупка проходить у Sandbox на девайсі  
- [ ] Privacy policy URL відкривається (GitHub Pages увімкнено)  
- [ ] ASC метадані + скріни готові  
- [ ] Новий білд з `main` після мерджу цього PR  
