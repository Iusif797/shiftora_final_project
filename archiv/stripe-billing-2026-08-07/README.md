# Stripe / předplatné — odloženo z mobilní aplikace 7. 8. 2026

**Nic tu není smazané. Je to uklizené stranou.** Kód žije dál v této složce
a v historii gitu; z aplikace zmizela jen *cesta*, kterou se k platbě dalo dojít.

## Proč

Apple, pravidlo App Store Review Guidelines **3.1.1 (In-App Purchase)**: digitální
předplatné, které odemyká funkce uvnitř aplikace, musí jít přes nákup v aplikaci
(IAP). ShifTora vedla platbu na Stripe Checkout otevíraný v prohlížeči. V App Store
Connect je přitom cena *Free* a **žádný IAP** — takový build je vysoce rizikový na
zamítnutí a blokuje odeslání k recenzi.

Pokyn chiefa 7. 8. 2026 13:27: *„odeber Stripe ze ShifTory — není tam aktivní pro
Apple, pak to nastavíme přes Google Play."*

**Předplatné se neruší jako záměr.** Ruší se jen tato konkrétní cesta k němu.

## Co bylo odloženo sem

| Soubor | Původní umístění | Co dělal |
|---|---|---|
| `mobile/src/app/(app)/billing.tsx` | `mobile/src/app/(app)/billing.tsx` | obrazovka s tarify Free/Pro/Business, tlačítko „Upgrade" → Stripe Checkout, „Manage subscription and billing" → Stripe Customer Portal |
| `mobile/src/lib/use-subscription.ts` | `mobile/src/lib/use-subscription.ts` | `useUpgradePlan()` (POST `/api/billing/create-checkout-session` + `Linking.openURL`), `useManageBilling()` (POST `/api/billing/create-portal-session`) |
| `mobile/src/components/paywall.tsx` | `mobile/src/components/paywall.tsx` | `PaywallGate`, `LimitWarning` — obojí `router.push('/(app)/billing')` |
| `mobile/src/types/app-billing-types.ts` | blok v `mobile/src/types/app.ts` | typy `PlanTier`, `PlanFeatures`, `SubscriptionInfo`, `PlanOption`, `CheckoutSession` |

## Co se přitom muselo změnit jinde (druhá půlka)

Odebrat obrazovku a nechat na ni odkaz = pád aplikace. Proto zároveň:

- `mobile/src/app/(app)/_layout.tsx` — zrušena `<Stack.Screen name="billing">`
- `mobile/src/app/(app)/(tabs)/analytics.tsx` — `PaywallGate` odstraněn; obsah se
  vykresluje přímo. Chování se **nemění**: `useHasFeature()` vracel natvrdo `true`,
  takže `locked` byl vždy `false` a brána stejně nikdy nezamkla.
- `mobile/src/app/(app)/(tabs)/shifts.tsx` — zrušena kontrola `canAutoGenerate`
  (rovněž vždy `true`) a hláška „Auto-generate schedule requires a Pro plan."
- `mobile/src/app/(app)/order/[tableId].tsx` — z nabídky způsobů platby zmizela
  položka **„Stripe checkout"** i mutace `payStripe` (POST `/api/orders/:id/pay`
  s `{method:'STRIPE'}` → `WebBrowser.openBrowserAsync` → `/confirm-payment`).
  Hotovost a platební terminál zůstávají.
- `mobile/src/types/pos.ts` — `PaymentMethod` už neobsahuje `'STRIPE'`
- `mobile/src/lib/api/api.ts` — `SubscriptionError` / `SUBSCRIPTION_REQUIRED`
  přejmenováno na `FeatureUnavailableError` / `FEATURE_UNAVAILABLE`; zpracování
  HTTP 402 zůstává, jen bez slovníku předplatného
- `mobile/src/app/terms.tsx`, `mobile/src/app/privacy.tsx` — právní texty srovnány
  se skutečností (aplikace nemá placené funkce ani nákupy a nezpracovává karty)

## Backend se NESAHAL

`backend/src/routes/billing.ts`, `backend/src/lib/stripe.ts`, webhooky, tabulky ani
existující předplatná **zůstávají beze změny**. Chief chce platby později přes Google
Play; do té doby na tyhle endpointy prostě nevede cesta z aplikace.

## Jak to vrátit

1. `git mv` soubory z této složky zpět na původní místa (tabulka výše)
2. vrátit blok typů z `app-billing-types.ts` do `mobile/src/types/app.ts`
3. vrátit `<Stack.Screen name="billing">` do `(app)/_layout.tsx`
4. **napřed vyřešit 3.1.1** — na iOS buď skutečné IAP, nebo funkce neprodávat
   uvnitř aplikace vůbec
