# Що зробити тобі окремо (реліз)

Код уже підготовлений під стор. Нижче — кроки, які можу зробити тільки ти (акаунти, ключі, юридичка, App Store Connect).

## 1. Секрети в EAS (обов’язково перед прод-білдом)

На [expo.dev](https://expo.dev) → проект PayPace → Environment variables (**production**):

| Змінна | Навіщо |
|--------|--------|
| `EXPO_PUBLIC_OPENAI_API_KEY` | Скани чеків |
| `EXPO_PUBLIC_SUPABASE_URL` | Shared budget sync |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Shared budget sync |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Покупки Plus (iOS public SDK key) |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Посилання Privacy (якщо не `https://paypace.app/privacy`) |
| `EXPO_PUBLIC_SUPPORT_URL` | Підтримка |
| `EXPO_PUBLIC_PLUS_PRODUCT_ID` | ID продукту (за замовч. `app.paypace.plus`) |
| `EXPO_PUBLIC_PLUS_ENTITLEMENT_ID` | Entitlement у RevenueCat (за замовч. `plus`) |

Локально на Mac — ті самі в `.env` (не комітити). Після зміни ключів — **новий білд**.

## 2. Plus = реальна покупка (App Store + RevenueCat)

1. [App Store Connect](https://appstoreconnect.apple.com) → PayPace → In-App Purchases  
   - Створи продукт (наприклад Non-Consumable або Auto-Renewable) з Product ID **`app.paypace.plus`** (або зміни `EXPO_PUBLIC_PLUS_PRODUCT_ID`).
2. Зареєструйся / увійди в [RevenueCat](https://www.revenuecat.com), додай iOS app з bundle `app.paypace.PayPace`.
3. У RevenueCat: Entitlement **`plus`** → прив’яжи App Store продукт; зроби **Current offering** з цим пакетом.
4. Встав **iOS public API key** у `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
5. Збери production / TestFlight і перевір **GET PLUS** + **RESTORE PURCHASES** (не Simulator для реальних покупок — Sandbox Apple ID на девайсі).

> У `__DEV__` лишається **TRY PLUS (DEMO)**. У стор-білді демо-розблокування вимкнене.

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
- Plus CTA → IAP / restore (RevenueCat), демо лише в dev  
- Privacy / Support лінки в Settings  
- Error boundary  

## Готово до сабміту, коли

- [ ] EAS secrets виставлені  
- [ ] RevenueCat + IAP продукт живі, покупка проходить у Sandbox  
- [ ] Privacy policy URL відкривається  
- [ ] ASC метадані + скріни готові  
- [ ] Новий білд з `main` після мерджу цього PR  
