# ShifTora — store listing copy (Apple App Store + Google Play)

**Date:** 2026-08-16 · **Author:** dev@ops · **Task:** audit + prepare (ukol-403)
**Status:** ⛔ PREPARED COPY ONLY — nothing uploaded. iOS build 12 is mid-review; no Apple/ASC/TestFlight
mutation was performed. App Store Connect and Google Play were read **GET-only** to capture current state.
**Scope note:** no app source code was changed by this task.

---

## 0. What this app actually is (code-verified)

ShifTora (`pro.itenterprise.shiftora`) is a **B2B restaurant staff-scheduling + light-POS tool**,
**invite-code bound**, and **free**. It is not a generic consumer shift tracker.

Backend: `https://api.shiftora.it-enterprise.cloud` (ours) — `mobile/src/lib/config.ts`.

### Verified feature surface (present in `mobile/src`)

| Area | Evidence |
|---|---|
| Roles owner / manager / employee, role-gated tabs | `mobile/src/app/(app)/(tabs)/_layout.tsx` |
| Create shift, assign employees, edit, my/upcoming | `mobile/src/app/(app)/(tabs)/shifts.tsx`, `mobile/src/components/shift-edit-modal.tsx` |
| Auto-generate schedule (FAB → `POST /api/shifts/generate`) | `mobile/src/app/(app)/(tabs)/shifts.tsx` |
| Signed check-in QR, refreshes every 8 min | `mobile/src/app/(app)/(tabs)/shifts.tsx` (`/api/shifts/{id}/checkin-tokens`) |
| QR scan clock-in, tap clock-out | `mobile/src/app/(app)/attendance/scan-qr.tsx`, `mobile/src/app/(app)/attendance/index.tsx` |
| Optional GPS at clock-in; geofence configurable | `mobile/src/lib/checkin.ts`, `mobile/src/app/(app)/settings.tsx`, `mobile/src/components/GeofenceMap.tsx` |
| Offline check-in/out queue, syncs when back online | `mobile/src/lib/offline-checkin-queue.ts`, `mobile/src/lib/offline-checkin-sync.ts` |
| Anomalies LATE_ARRIVAL / MISSED_SHIFT / EARLY_LEAVE + resolve | `mobile/src/app/(app)/alerts.tsx`; `backend/prisma/schema.prisma:31-35` |
| Analytics: overview, labor-cost, per-employee, workload forecast, trends/recommendations | `mobile/src/app/(app)/(tabs)/analytics.tsx` |
| Invite codes: generate / copy / revoke; join by code | `mobile/src/app/(app)/invitations.tsx` |
| Floor + table management | `mobile/src/app/(app)/(tabs)/floor.tsx`, `mobile/src/app/(app)/tables-manage.tsx` |
| Menu categories + items | `mobile/src/app/(app)/menu-manage.tsx` |
| Table orders: add/adjust/remove/cancel, record CASH or CARD | `mobile/src/app/(app)/order/[tableId].tsx` |
| Kitchen live tickets (preparing / ready) | `mobile/src/app/(app)/(tabs)/kitchen.tsx` |
| Push notifications | `mobile/src/lib/notifications.ts` |
| Self-serve account deletion (`DELETE /api/users/me`) | `mobile/src/components/delete-account.tsx` |
| In-app Privacy + Terms | `mobile/src/app/privacy.tsx`, `mobile/src/app/terms.tsx` |

### Free — code-confirmed
`grep` for `stripe|subscription|billing|paywall|purchase|plan` over `mobile/src` returns **zero** billing code.
`mobile/src/app/terms.tsx` states verbatim: *"Shiftora is currently provided at no charge and contains no
in-app purchases or paid tiers. Every feature described in the app is available to every workspace."*
`PRE_LAUNCH_CHECKLIST.md` records that Stripe was removed from mobile for Apple guideline 3.1.1.
Backend billing endpoints exist but the app never calls them and `getActivePlan()` returns `business` for all.

### Language reality — **English only**
- No i18n library in `mobile/package.json` (no i18next / expo-localization / intl).
- No `src/i18n` or locales directory; **all UI strings are hardcoded English**.
- `mobile/app.json` → `CFBundleLocalizations: ["en"]`, `CFBundleDevelopmentRegion: "en"`.

The house standard (CZ SK PL RU UA EN HE) is **not met by this app**. Any non-English store listing must
therefore disclose that the interface is English — included in the cs/ru/uk copy below.

### iPhone-only — code-confirmed
`mobile/app.json` → `ios.supportsTablet: false`. Zero iPad screenshot sets is correct and consistent.

---

## 1. Real URLs (found, verified live — not invented)

| Field | Value | Check |
|---|---|---|
| Support URL | `https://it-enterprise.pro/` | HTTP 200 |
| Marketing URL | `https://it-enterprise.pro/` | HTTP 200 |
| Privacy policy URL | `https://it-enterprise.pro/privacy-policy/shiftora/` | HTTP 200, real content ("Zásady ochrany soukromí — Shiftora") |

Source: these are the values already set in App Store Connect (read GET-only). They are **not** present
anywhere in the repo — the repo contains only the backend URL. Privacy/Terms also exist as in-app screens.

⚠️ The privacy policy page is **Czech-only**. For the `en-US` listing an English version is advisable.

---

## 2. What the 2026-08-12 drafts proposed, and what I cut

Source: `/opt/devcollab/docs/STORE-DESCRIPTIONS-DRAFTS-2026-08-12.md` §2 (ShifTora).
That draft was written **from the backend only** — it says so explicitly: *"Only the backend is on this box;
the mobile app (screens, UI languages) is a separate Expo repo not present here."* Now that the mobile repo
is available, several of its claims do not survive.

### Cut list

| # | Draft claim | Verdict | Why |
|---|---|---|---|
| 1 | "pokročilé funkce jsou v placených tarifech" / "advanced features are on paid plans" | **CUT** | Hard falsehood. Zero billing code in mobile; `terms.tsx` says free, no IAP; Stripe removed for guideline 3.1.1. Advertising paid tiers with no IAP is itself an Apple 3.1.1 / metadata-mismatch rejection trigger. |
| 2 | "subscription tiers free/pro/business via Stripe" | **CUT** | Backend-only, unreachable from the app. |
| 3 | "AI insights (Gemini)" as a headline feature | **CUT as "AI"**, kept as "trends and recommendations" | `backend/src/services/analytics.ts:409` → `aiResult ?? rules`. Gemini is used only if `GEMINI_API_KEY` is set, otherwise a deterministic rules fallback. The user always gets output, so the *output* is safe to claim; the word "AI" is config-dependent and both stores scrutinise AI claims. |
| 4 | Listing in cs/sk/pl/ru/uk/en/he (house standard) | **CUT** | App has no i18n at all — English only. Non-English listings kept **only** where the store locale already exists, each with an explicit English-UI disclosure. |
| 5 | Draft's own flag "confirm the language list" | **RESOLVED** | Answer: English only. |
| 6 | "shift-swap, availability/preferences, in-app chat" (draft already excluded) | **stays cut** | Confirmed absent in mobile too. |

### Additionally cut from the **currently live** listings (which the draft never saw)

| # | Live claim | Verdict | Why |
|---|---|---|---|
| 7 | "Více provozoven" / "Several venues" / "Кілька закладів" / "Несколько заведений" | **CUT** | Misleading. `User.restaurantId` is a single nullable scalar (`backend/prisma/schema.prisma:74`) and `/api/restaurants/my` returns one restaurant. A user belongs to **one** venue. Reworded to the true statement: each restaurant's data stays separate (tenant isolation). |
| 8 | cs: "Odbavení QR kódem — zaměstnanec se při příchodu **a odchodu** načte QR kódem" | **CORRECTED** | Only **clock-in** uses the QR scanner; clock-out is a button (`attendance/index.tsx` → `submitCheckout`). Same error in the live en/uk/ru text ("clock in **and out** by scanning"). |
| 9 | Whole POS surface omitted | **ADDED** | Floor, Kitchen, menu and table orders are prominent tabs but appear in no live listing. Added, honestly framed. |
| 10 | "Upozornění na odchylky — hlásí pozdní příchody" (cs, Apple) | **EXPANDED** | Understated: all three of late / missed / early-leave exist. |

### Claims deliberately **kept** because they verified

Auto-generated schedule (real FAB → `/api/shifts/generate`), signed rotating check-in QR, geofence/location
check, offline clock-in queue, anomaly severity + resolve, labour-cost / per-employee / workload-forecast
analytics, invite codes, role separation, self-serve account deletion.

### Wording guards applied

- Payments described as **"record how the bill was settled — cash or card"**, never "take/process payments".
  `order/[tableId].tsx` only records an outcome (`Cash payment recorded`), and `privacy.tsx` states ShifTora
  does not take card payments or store card details. An added line says so explicitly in the description.
- Not claimed anywhere: **biometric login** (no `expo-local-authentication` in `package.json`, despite an
  `NSFaceIDUsageDescription` string in `app.json` — see §6), **light/dark theme switching** (single dark
  theme, no `useColorScheme`), **iPad support**, **multi-language UI**.

---

## 3. APPLE APP STORE — final copy

Listing locales that already exist in App Store Connect: **cs** and **en-US** (read GET-only). Do not add
new locales — the app UI is English.

Shared across both locales:

- **Support URL:** `https://it-enterprise.pro/`
- **Marketing URL:** `https://it-enterprise.pro/`
- **Privacy policy URL:** `https://it-enterprise.pro/privacy-policy/shiftora/`

### Apple · en-US

**App name** — 28 / 30 characters

```
ShifTora — Restaurant Shifts
```

**Subtitle** — 29 / 30 characters

```
Shift scheduling & attendance
```

**Promotional text** — 166 / 170 characters

```
Free for every restaurant. Plan shifts, clock in and out with a QR code, catch late arrivals automatically, and see attendance, labour cost and workload in one place.
```

**Keywords** — 99 / 100 characters

```
restaurant,rota,staff scheduling,time clock,timesheet,QR check-in,employees,labour cost,hospitality
```

**Description** — 1985 / 4000 characters

```
ShifTora runs the working day of a restaurant — from the shift schedule to attendance, alerts and reports.

ShifTora is free. Every feature is available to every restaurant. There are no subscriptions, no paid tiers and no in-app purchases.

SCHEDULING
• Create shifts and assign them to your team
• Let ShifTora propose a schedule automatically from past attendance
• Staff see their own assigned and upcoming shifts

CLOCK IN AND OUT
• The manager displays a check-in QR code that is signed and refreshes every few minutes
• Staff clock in by scanning it and clock out with a tap
• An optional location check confirms the person is really at the restaurant
• Clock-ins made without signal are kept on the device and sync once you are back online

ATTENDANCE ALERTS
• Late arrivals, missed shifts and early leaves are raised automatically
• Every alert carries a severity and can be marked as resolved

REPORTS (owner)
• Attendance rate and hours worked
• Labour cost and a per-employee breakdown
• Workload forecast, plus trends and staffing recommendations

FLOOR AND ORDERS
• Table plan and table management
• Menu categories and items
• Take an order at the table, adjust it, and record how the bill was settled - cash or card
• Kitchen view with live tickets marked preparing or ready
• ShifTora does not process card payments and never stores card details; it only records the outcome

ROLES AND ACCESS
• Owner, manager and employee each see only what concerns them
• The owner generates an invite code and staff join the restaurant with it
• Each restaurant's data stays separate from every other restaurant

YOUR ACCOUNT
ShifTora requires an account and membership of a restaurant. You can delete your account and its data at any time from Profile or Settings - no email and no support request needed.

ShifTora is a tool for running a workplace. It does not replace your payroll, accounting or fiscal systems, and the restaurant remains responsible for labour-law compliance.
```


### Apple · cs

**App name** — 27 / 30 characters

```
ShifTora — směny restaurace
```

**Subtitle** — 29 / 30 characters

```
Směny a docházka v restauraci
```

**Promotional text** — 159 / 170 characters

```
Zdarma pro každou restauraci. Naplánujte směny, odbavte příchod QR kódem, hlídejte pozdní příchody a mějte docházku, mzdové náklady i vytížení na jednom místě.
```

**Keywords** — 91 / 100 characters

```
restaurace,rozpis,docházka,personál,zaměstnanci,plánování,QR,píchačky,mzdové náklady,gastro
```

**Description** — 1963 / 4000 characters

```
ShifTora vede provozní den restaurace — od rozpisu směn přes docházku a upozornění až po přehledy.

ShifTora je zdarma. Všechny funkce má k dispozici každá restaurace. Žádné předplatné, žádné placené tarify, žádné nákupy v aplikaci.

ROZPIS SMĚN
• Vytvoříte směny a přiřadíte k nim lidi
• Necháte ShifToru navrhnout rozpis automaticky z dosavadní docházky
• Zaměstnanec vidí své přiřazené a nadcházející směny

PŘÍCHOD A ODCHOD
• Manažer zobrazí QR kód pro odbavení, který je podepsaný a každých pár minut se obnovuje
• Zaměstnanec se při příchodu načte QR kódem, odchod odbaví tlačítkem
• Volitelné ověření polohy potvrdí, že člověk je skutečně na provozovně
• Odbavení pořízená bez signálu zůstanou v telefonu a odešlou se, jakmile je síť zpět

UPOZORNĚNÍ NA DOCHÁZKU
• Pozdní příchody, zmeškané směny a dřívější odchody hlásí aplikace sama
• Každé upozornění má závažnost a lze je označit za vyřešené

PŘEHLEDY (vlastník)
• Docházkovost a odpracované hodiny
• Mzdové náklady a rozpad po zaměstnancích
• Předpověď vytížení, trendy a doporučení k obsazení směn

PROVOZ A OBJEDNÁVKY
• Plán stolů a správa stolů
• Kategorie a položky menu
• Založíte objednávku u stolu, upravíte ji a zaznamenáte, jak byl účet zaplacen — hotově, nebo kartou
• Kuchyňský pohled s živými tickety ve stavu připravuje se, nebo hotovo
• ShifTora nezpracovává platby kartou a neukládá údaje z karet; eviduje pouze výsledek

ROLE A PŘÍSTUP
• Vlastník, manažer i zaměstnanec vidí jen to, co se jich týká
• Vlastník vygeneruje zvací kód a zaměstnanec se jím připojí k restauraci
• Data každé restaurace zůstávají oddělená od ostatních

VÁŠ ÚČET
ShifTora vyžaduje účet a členství v restauraci. Účet i jeho data můžete kdykoli smazat v Profilu nebo Nastavení — bez e-mailu a bez žádosti na podporu.

Pozor: rozhraní aplikace je v angličtině.

ShifTora je nástroj pro řízení provozu. Nenahrazuje mzdový, účetní ani fiskální systém a za dodržování pracovněprávních předpisů odpovídá restaurace.
```


---

## 4. GOOGLE PLAY — final copy

Listing locales that already exist in Play: **cs-CZ** (default), **en-US**, **uk**, **ru-RU** (read GET-only).


### Play · en-US

**Title** — 28 / 30 characters

```
ShifTora — Restaurant Shifts
```

**Short description** — 74 / 80 characters

```
Free shift scheduling, QR clock-in and attendance reports for restaurants.
```

**Full description** — 1985 / 4000 characters

```
ShifTora runs the working day of a restaurant — from the shift schedule to attendance, alerts and reports.

ShifTora is free. Every feature is available to every restaurant. There are no subscriptions, no paid tiers and no in-app purchases.

SCHEDULING
• Create shifts and assign them to your team
• Let ShifTora propose a schedule automatically from past attendance
• Staff see their own assigned and upcoming shifts

CLOCK IN AND OUT
• The manager displays a check-in QR code that is signed and refreshes every few minutes
• Staff clock in by scanning it and clock out with a tap
• An optional location check confirms the person is really at the restaurant
• Clock-ins made without signal are kept on the device and sync once you are back online

ATTENDANCE ALERTS
• Late arrivals, missed shifts and early leaves are raised automatically
• Every alert carries a severity and can be marked as resolved

REPORTS (owner)
• Attendance rate and hours worked
• Labour cost and a per-employee breakdown
• Workload forecast, plus trends and staffing recommendations

FLOOR AND ORDERS
• Table plan and table management
• Menu categories and items
• Take an order at the table, adjust it, and record how the bill was settled - cash or card
• Kitchen view with live tickets marked preparing or ready
• ShifTora does not process card payments and never stores card details; it only records the outcome

ROLES AND ACCESS
• Owner, manager and employee each see only what concerns them
• The owner generates an invite code and staff join the restaurant with it
• Each restaurant's data stays separate from every other restaurant

YOUR ACCOUNT
ShifTora requires an account and membership of a restaurant. You can delete your account and its data at any time from Profile or Settings - no email and no support request needed.

ShifTora is a tool for running a workplace. It does not replace your payroll, accounting or fiscal systems, and the restaurant remains responsible for labour-law compliance.
```


### Play · cs-CZ

**Title** — 27 / 30 characters

```
ShifTora — směny restaurace
```

**Short description** — 74 / 80 characters

```
Rozpis směn, odbavení QR kódem a přehledy docházky pro restaurace. Zdarma.
```

**Full description** — 1963 / 4000 characters

```
ShifTora vede provozní den restaurace — od rozpisu směn přes docházku a upozornění až po přehledy.

ShifTora je zdarma. Všechny funkce má k dispozici každá restaurace. Žádné předplatné, žádné placené tarify, žádné nákupy v aplikaci.

ROZPIS SMĚN
• Vytvoříte směny a přiřadíte k nim lidi
• Necháte ShifToru navrhnout rozpis automaticky z dosavadní docházky
• Zaměstnanec vidí své přiřazené a nadcházející směny

PŘÍCHOD A ODCHOD
• Manažer zobrazí QR kód pro odbavení, který je podepsaný a každých pár minut se obnovuje
• Zaměstnanec se při příchodu načte QR kódem, odchod odbaví tlačítkem
• Volitelné ověření polohy potvrdí, že člověk je skutečně na provozovně
• Odbavení pořízená bez signálu zůstanou v telefonu a odešlou se, jakmile je síť zpět

UPOZORNĚNÍ NA DOCHÁZKU
• Pozdní příchody, zmeškané směny a dřívější odchody hlásí aplikace sama
• Každé upozornění má závažnost a lze je označit za vyřešené

PŘEHLEDY (vlastník)
• Docházkovost a odpracované hodiny
• Mzdové náklady a rozpad po zaměstnancích
• Předpověď vytížení, trendy a doporučení k obsazení směn

PROVOZ A OBJEDNÁVKY
• Plán stolů a správa stolů
• Kategorie a položky menu
• Založíte objednávku u stolu, upravíte ji a zaznamenáte, jak byl účet zaplacen — hotově, nebo kartou
• Kuchyňský pohled s živými tickety ve stavu připravuje se, nebo hotovo
• ShifTora nezpracovává platby kartou a neukládá údaje z karet; eviduje pouze výsledek

ROLE A PŘÍSTUP
• Vlastník, manažer i zaměstnanec vidí jen to, co se jich týká
• Vlastník vygeneruje zvací kód a zaměstnanec se jím připojí k restauraci
• Data každé restaurace zůstávají oddělená od ostatních

VÁŠ ÚČET
ShifTora vyžaduje účet a členství v restauraci. Účet i jeho data můžete kdykoli smazat v Profilu nebo Nastavení — bez e-mailu a bez žádosti na podporu.

Pozor: rozhraní aplikace je v angličtině.

ShifTora je nástroj pro řízení provozu. Nenahrazuje mzdový, účetní ani fiskální systém a za dodržování pracovněprávních předpisů odpovídá restaurace.
```


### Play · ru-RU

**Title** — 26 / 30 characters

```
ShifTora — смены ресторана
```

**Short description** — 65 / 80 characters

```
Графики смен, отметка по QR и отчёты по учёту времени. Бесплатно.
```

**Full description** — 2032 / 4000 characters

```
ShifTora ведёт рабочий день ресторана — от графика смен до учёта времени, уведомлений и отчётов.

ShifTora бесплатна. Все функции доступны каждому ресторану. Нет подписок, платных тарифов и покупок в приложении.

ГРАФИК СМЕН
• Создавайте смены и назначайте на них людей
• Позвольте ShifTora предложить график автоматически по прошлым отметкам
• Сотрудник видит свои назначенные и ближайшие смены

ПРИХОД И УХОД
• Менеджер показывает QR-код отметки: он подписан и обновляется каждые несколько минут
• Сотрудник отмечает приход сканированием, уход — одним нажатием
• Необязательная проверка геопозиции подтверждает, что человек действительно на месте
• Отметки, сделанные без связи, сохраняются в телефоне и отправляются, когда сеть вернётся

УВЕДОМЛЕНИЯ ПО УЧЁТУ
• Опоздания, пропущенные смены и ранние уходы фиксируются автоматически
• У каждого уведомления есть уровень важности, его можно закрыть как решённое

ОТЧЁТЫ (владелец)
• Посещаемость и отработанные часы
• Затраты на персонал и разбивка по сотрудникам
• Прогноз загрузки, тренды и рекомендации по расстановке

ЗАЛ И ЗАКАЗЫ
• План столов и управление столами
• Категории и позиции меню
• Откройте заказ за столом, измените его и запишите, как оплачен счёт — наличными или картой
• Кухонный экран с живыми тикетами в статусе «готовится» или «готово»
• ShifTora не проводит платежи по картам и не хранит данные карт; фиксируется только результат

РОЛИ И ДОСТУП
• Владелец, менеджер и сотрудник видят только то, что их касается
• Владелец создаёт код приглашения, сотрудник по нему присоединяется к ресторану
• Данные каждого ресторана хранятся отдельно от других

ВАШ АККАУНТ
ShifTora требует аккаунт и членство в ресторане. Аккаунт и его данные можно удалить в любой момент в Профиле или Настройках — без письма и без обращения в поддержку.

Внимание: интерфейс приложения на английском языке.

ShifTora — инструмент управления работой заведения. Она не заменяет зарплатную, бухгалтерскую или фискальную систему; за соблюдение трудового законодательства отвечает ресторан.
```


### Play · uk

**Title** — 26 / 30 characters

```
ShifTora — зміни ресторану
```

**Short description** — 77 / 80 characters

```
Графіки змін, відмітка за QR і звіти обліку часу для ресторанів. Безкоштовно.
```

**Full description** — 2058 / 4000 characters

```
ShifTora веде робочий день ресторану — від графіка змін до обліку часу, сповіщень і звітів.

ShifTora безкоштовна. Усі функції доступні кожному ресторану. Немає підписок, платних тарифів і покупок у застосунку.

ГРАФІК ЗМІН
• Створюйте зміни та призначайте на них людей
• Дозвольте ShifTora запропонувати графік автоматично за попередніми відмітками
• Працівник бачить свої призначені та найближчі зміни

ПРИХІД І ВИХІД
• Менеджер показує QR-код відмітки: він підписаний і оновлюється кожні кілька хвилин
• Працівник відмічає прихід скануванням, вихід — одним дотиком
• Необовʼязкова перевірка геопозиції підтверджує, що людина справді на місці
• Відмітки, зроблені без звʼязку, зберігаються у телефоні й надсилаються, щойно мережа повернеться

СПОВІЩЕННЯ ПРО ОБЛІК
• Запізнення, пропущені зміни та ранні виходи фіксуються автоматично
• Кожне сповіщення має рівень важливості, його можна закрити як вирішене

ЗВІТИ (власник)
• Відвідуваність і відпрацьовані години
• Витрати на персонал і розподіл за працівниками
• Прогноз навантаження, тренди та рекомендації щодо розстановки

ЗАЛА І ЗАМОВЛЕННЯ
• План столів і керування столами
• Категорії та позиції меню
• Відкрийте замовлення за столом, змініть його та запишіть, як оплачено рахунок — готівкою чи карткою
• Кухонний екран із живими тикетами у статусі «готується» або «готово»
• ShifTora не проводить платежі карткою і не зберігає дані карток; фіксується лише результат

РОЛІ ТА ДОСТУП
• Власник, менеджер і працівник бачать лише те, що їх стосується
• Власник створює код запрошення, працівник за ним приєднується до ресторану
• Дані кожного ресторану зберігаються окремо від інших

ВАШ ОБЛІКОВИЙ ЗАПИС
ShifTora потребує обліковий запис і членство в ресторані. Обліковий запис і його дані можна видалити будь-коли у Профілі або Налаштуваннях — без листа і без звернення до підтримки.

Увага: інтерфейс застосунку англійською мовою.

ShifTora — інструмент керування роботою закладу. Він не замінює зарплатну, бухгалтерську чи фіскальну систему; за дотримання трудового законодавства відповідає ресторан.
```


---

## 5. Screenshot audit

### 5.1 Apple — current sets (read GET-only from App Store Connect)

App id `6791556081`, version id `a4049f8e-66aa-4e57-81b0-a6a6e8eb3861`.

| Locale | Set | Count | Dimensions | State |
|---|---|---|---|---|
| cs | `APP_IPHONE_65` | 4 | 1284 × 2778 | COMPLETE |
| cs | `APP_IPHONE_67` | 4 | 1260 × 2736 | COMPLETE |
| en-US | `APP_IPHONE_65` | 4 | 1284 × 2778 | COMPLETE |
| en-US | `APP_IPHONE_67` | 4 | 1260 × 2736 | COMPLETE |
| — | any `APP_IPAD_*` | **0** | — | — |

✅ **Zero iPad sets is correct** — `mobile/app.json` sets `ios.supportsTablet: false`, so iPad sets are not
required and must not be added.

### 5.2 🔴 The real problem: the screenshots show no product

The eight images are the same four screens in two sizes. Their filenames say exactly what they are:

```
shiftora-iphone65-1-vitejte.png     → Welcome / onboarding carousel
shiftora-iphone65-2-prihlaseni.png  → Sign-in screen
shiftora-iphone65-3-soukromi.png    → Privacy Policy text screen
shiftora-iphone65-4-podminky.png    → Terms of Service text screen
(and shiftora-iphone69-1..4, identical content at 1260 × 2736)
```

**Not one screenshot shows the application actually working.** Two of the four are walls of legal text.
This is stale/misleading in the strong sense: the description promises a schedule, QR clock-in, attendance
alerts, analytics and a floor/kitchen view, and a prospective user sees none of them. It is a metadata
inconsistency in the direction Apple dislikes (screenshots must show the app in use), and it is a severe
conversion problem on both stores.

The likely cause is mechanical: welcome / sign-in / privacy / terms are the only screens reachable
**without a logged-in account and seeded data**. Capturing the real screens needs a demo restaurant.

### 5.3 What the screenshots should show instead

Proposed 4–6 shots, all of which correspond to screens that exist today:

| # | Screen | File | Why |
|---|---|---|---|
| 1 | Schedule with real shifts + the auto-generate FAB | `mobile/src/app/(app)/(tabs)/shifts.tsx` | The headline feature |
| 2 | Check-in QR displayed by a manager | `mobile/src/app/(app)/(tabs)/shifts.tsx` (QR modal) | The differentiator |
| 3 | Owner dashboard "Business pulse" — attendance rate, weekly shifts, active staff, open alerts | `mobile/src/components/dashboard/OwnerDashboard.tsx` | Shows value at a glance |
| 4 | Analytics — labour cost, workload forecast, recommendations | `mobile/src/app/(app)/(tabs)/analytics.tsx` | Backs the "reports" claim |
| 5 | Alerts — late / missed / early with severity | `mobile/src/app/(app)/alerts.tsx` | Backs the "alerts" claim |
| 6 | Floor or Kitchen live tickets | `mobile/src/app/(app)/(tabs)/floor.tsx`, `.../kitchen.tsx` | Backs the POS claim now added to the copy |

Keep **at most one** of welcome/sign-in, and drop the privacy and terms screenshots entirely — they belong
in the app and at the privacy URL, not in the gallery.

### 5.4 No local masters exist

A filesystem sweep (`find / -xdev` for `shiftora-iphone*`, plus `/opt/devcollab`, `/opt/ite-deploy`,
`/opt/devcollab-apps` and all `/home/devops/*work*` trees, read with `sudo -n`) found **no** ShifTora
screenshot source files anywhere on this host. The only ShifTora image assets present locally are:

| Path | Size |
|---|---|
| `/home/devops/ukol-189-work/shiftora/mobile/assets/icon.png` | 1024 × 1024 (RGB, no alpha) |
| `/home/devops/ukol-189-work/shiftora/mobile/assets/adaptive-icon.png` | 1024 × 1024 (RGBA) |
| `/home/devops/ukol-189-work/shiftora/mobile/assets/splash.png` | 1284 × 2778 |
| `/home/devops/ukol-189-work/shiftora/mobile/assets/onboarding/{hero,success,operations}.png` | in-app onboarding art |
| `/home/devops/ukol-189-work/shiftora/mobile/assets/auth/signin-background.png` | in-app art |

The published screenshots exist **only** inside App Store Connect and Google Play. Re-capture therefore
starts from zero — there is nothing to re-crop or re-use.

---

## 6. Google Play graphic requirements — all satisfied

Read GET-only from the Play Developer API (edit inserted, listed, then deleted; nothing committed).
Graphics live on the default locale `cs-CZ`; the other locales inherit them, which is normal Play behaviour.

| Requirement | Required | Present | Verdict |
|---|---|---|---|
| Feature graphic | 1024 × 500 | 1 × **1024 × 500** PNG | ✅ exact |
| App icon | 512 × 512 | 1 × **512 × 512** PNG | ✅ exact |
| Phone screenshots | min 2 | **6 × 1080 × 1920** PNG | ✅ |
| 7-inch tablet | optional | 1 × 1200 × 1920 | present |
| 10-inch tablet | optional | 1 × 1600 × 2560 | present |

**Nothing is missing on Play.** Caveat: the 6 phone screenshots are the cs-CZ set and are almost certainly
the same welcome/sign-in/privacy/terms content as the Apple set — the content problem in §5.2 applies to
Play as well, even though the format requirements pass. The tablet screenshots also imply a tablet
experience that iOS explicitly disclaims (`supportsTablet: false`); consider removing them for consistency.

---

## 7. Needs the chief / needs a Mac

### Needs a Mac + iOS simulator (cannot be done on this Linux host)
1. **Re-capture the 8 Apple screenshots** at 1284 × 2778 and 1260 × 2736 per §5.3. Requires Xcode Simulator.
2. Android phone screenshots (1080 × 1920) can in principle be produced on Linux with an Android emulator,
   so those are **not** Mac-blocked — but they need the same demo data (below).

### Needs the chief (decisions / inputs)
3. **A reviewer demo account** — owner-role login for a demo restaurant with seeded shifts, employees,
   attendance history, tables and menu. This is required twice over: Apple App Review Information (the app
   is sign-in + invite-code gated and *will* fail review without it) and as the data source for every
   screenshot in §5.3. This is the single biggest blocker.
4. **Approval of the free positioning** in public copy — the new text states plainly there are no
   subscriptions or in-app purchases. This is code-true today, but it is a commercial commitment.
5. **English privacy policy page.** `https://it-enterprise.pro/privacy-policy/shiftora/` is live but Czech-only; the en-US listing should point at an
   English version (or the page should be bilingual).
6. **Approval to drop "Several venues"** from all four live Play locales and the Apple cs/en text — it is
   the one live claim that is affirmatively false, and it may have been a deliberate roadmap statement.
7. Confirm whether the Play **tablet** screenshots should be withdrawn (§6).

### Engineering follow-up (out of scope here — no source was changed)
8. `mobile/app.json` declares `NSFaceIDUsageDescription` but the app has **no** `expo-local-authentication`
   dependency and no biometric code. An unused permission string is a (minor) Apple review question and a
   privacy-nutrition inconsistency. Either implement biometric unlock — it is in the house app standard —
   or remove the string. **Not claimed in any copy above.**
9. The app ships a single dark theme and English only, both of which diverge from the house app standard
   (7 languages, 3-mode appearance, biometric login). Flagged, not advertised.

---

## 8. Provenance

- Drafts read: `/opt/devcollab/docs/STORE-DESCRIPTIONS-DRAFTS-2026-08-12.md` (via `sudo -n`, read-only).
- Code audited: `/home/devops/ukol-189-work/shiftora/mobile`, branch `backend/nase-infra-bez-vibecode`
  (branch not switched, nothing committed, no source file modified).
- App Store Connect: **GET only** — `/v1/apps`, `/v1/appInfos`, `/v1/appInfoLocalizations`,
  `/v1/appStoreVersionLocalizations`, `/v1/appScreenshotSets`, `/v1/appScreenshots`. No POST/PATCH/DELETE.
  No TestFlight or metadata submission. iOS build 12 left untouched.
- Google Play: edits insert → listings.list / images.list → **edits.delete**. Nothing committed.
- Credentials were used by reference only (`/home/devops/.config/play-service-account.json`,
  `/home/devops/.app-store/`); no key material was read, printed or copied.
