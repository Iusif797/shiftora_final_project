# ShifTora — store listing BACKUP (state BEFORE the 2026-08-16 correction)

**Captured:** 2026-08-16 (UTC 2026-08-16T11:24:12Z) · **By:** dev@ops
**Purpose:** rollback source. Every field below is the verbatim value read from the live store APIs
(GET-only) immediately before any write. To roll back, PATCH these exact values back.

**App:** `pro.itenterprise.shiftora` · Apple app id `6791556081` · Play package `pro.itenterprise.shiftora`

---

## 1. APPLE APP STORE — before

### appInfo `a50bc0be-0f26-4665-aea9-186d997ce445`

- appStoreState: `READY_FOR_SALE`
- state: `READY_FOR_DISTRIBUTION`

#### appInfoLocalization `abc286bc-f0ba-4e2e-8ad2-86a3c8a7f9c4` — locale `cs`

- **name** (8 chars): `ShifTora`
- **subtitle** (29 chars): `Směny a docházka v restauraci`
- **privacyPolicyUrl** (50 chars): `https://it-enterprise.pro/privacy-policy/shiftora/`
- **privacyChoicesUrl**: _(null)_
- **privacyPolicyText**: _(null)_

#### appInfoLocalization `761d25f3-2e26-41c9-a183-c1709c165f7d` — locale `en-US`

- **name** (28 chars): `ShifTora — Restaurant Shifts`
- **subtitle** (29 chars): `Shift scheduling & attendance`
- **privacyPolicyUrl** (50 chars): `https://it-enterprise.pro/privacy-policy/shiftora/`
- **privacyChoicesUrl**: _(null)_
- **privacyPolicyText**: _(null)_

### appStoreVersion `a4049f8e-66aa-4e57-81b0-a6a6e8eb3861` — version `1.0` · state `READY_FOR_SALE`

- platform: `IOS` · releaseType: `AFTER_APPROVAL`

#### appStoreVersionLocalization `1a762c0d-555c-41c7-b69b-84553114e2b2` — locale `cs`

- **keywords** (87 chars):

```
směny,rozpis směn,docházka,restaurace,personál,zaměstnanci,plánování,QR,provozovna,mzdy
```

- **promotionalText** (132 chars):

```
Kdo přišel, kdy odešel a kolik odpracoval — víte hned.
Směny a docházka pro restauraci, odbavení QR kódem, přehledy na pár kliknutí.
```

- **supportUrl** (26 chars):

```
https://it-enterprise.pro/
```

- **marketingUrl** (26 chars):

```
https://it-enterprise.pro/
```

- **whatsNew**: _(null)_
- **description** (928 chars):

```
ShifTora je nástroj pro řízení práce v restauraci — od rozpisu směn po docházku a přehledy.

CO UMÍ

• Rozpis směn — vytvoříte směny, přiřadíte je lidem, nebo si necháte rozpis vygenerovat automaticky
• Odbavení QR kódem — zaměstnanec se při příchodu načte QR kódem, odchod odbaví tlačítkem; žádné papíry a žádné dohady
• Upozornění na odchylky — aplikace sama hlásí pozdní příchody
• Přehledy — docházka, mzdové náklady, vytížení personálu
• Role — vlastník, manažer a zaměstnanec vidí každý jen to své
• Zvací kódy — vlastník vygeneruje kód, zaměstnanec se jím připojí
• Oddělená data — každá restaurace má svá data jen pro sebe
• Upozornění při výpadku sítě

PRO KOHO

Pro majitele a manažery restaurací, kteří chtějí mít rozpis směn a docházku na jednom místě, a pro personál, který se odbaví během vteřiny telefonem.

PŘIHLÁŠENÍ

Aplikace vyžaduje účet. Zaměstnanci se připojují ke své restauraci zvacím kódem od vlastníka.
```

#### appStoreVersionLocalization `1ee3b8dc-54a6-406c-923e-7f27fbeda717` — locale `en-US`

- **keywords** (88 chars):

```
shifts,shift schedule,attendance,restaurant,staff,employees,rota,timesheet,QR,scheduling
```

- **promotionalText**: _(null)_
- **supportUrl** (26 chars):

```
https://it-enterprise.pro/
```

- **marketingUrl** (26 chars):

```
https://it-enterprise.pro/
```

- **whatsNew**: _(null)_
- **description** (941 chars):

```
ShifTora is a tool for running a restaurant — from the shift schedule to attendance and reports.

WHAT IT DOES

• Shift schedule — create shifts, assign them to people, or let the app generate the schedule automatically
• QR clock-in — staff clock in by scanning a QR code and clock out with a tap; no paper and no arguments
• Alerts — the app reports late arrivals on its own
• Reports — attendance, labour cost, staff workload
• Roles — owner, manager and employee each see only what concerns them
• Invite codes — the owner generates a code, the employee joins with it
• Separated data — each restaurant keeps its data to itself
• A notice when the device loses network

WHO IT IS FOR

Owners and managers of restaurants who want the schedule and attendance in one place, and staff who clock in within a second from their phone.

SIGNING IN

The app requires an account. Employees join their restaurant with an invite code from the owner.
```

---

## 2. GOOGLE PLAY — before

Read via `edits().listings().list()` (edit inserted, listed, deleted — nothing committed).

### Play locale `cs-CZ`

- **title** (8 chars): `ShifTora`
- **short description** (67 chars): `Správa směn a docházky pro restaurace. Odbavení QR kódem, přehledy.`
- **video**: `None`
- **full description** (934 chars):

```
ShifTora je nástroj pro řízení práce v restauraci — od rozpisu směn
po docházku a přehledy.

CO UMÍ

• Rozpis směn — vytvoříte směny, přiřadíte je lidem, nebo si necháte
  rozpis vygenerovat automaticky
• Odbavení QR kódem — zaměstnanec se při příchodu a odchodu načte
  QR kódem, žádné papíry a žádné dohady
• Upozornění na odchylky — aplikace sama hlásí pozdní příchody
  a zmeškané směny
• Přehledy — docházka, mzdové náklady, vytížení personálu
• Role — vlastník, manažer a zaměstnanec vidí každý jen to své
• Zvací kódy — vlastník vygeneruje kód, zaměstnanec se jím připojí
• Více provozoven — každá restaurace má svá data oddělená
• Upozornění při výpadku sítě

PRO KOHO

Pro majitele a manažery restaurací, kteří chtějí mít rozpis směn
a docházku na jednom místě, a pro personál, který se odbaví během
vteřiny telefonem.

PŘIHLÁŠENÍ

Aplikace vyžaduje účet. Zaměstnanci se připojují ke své restauraci
zvacím kódem od vlastníka.
```

### Play locale `en-US`

- **title** (8 chars): `ShifTora`
- **short description** (70 chars): `Shift scheduling and attendance for restaurants. QR clock-in, reports.`
- **video**: `None`
- **full description** (941 chars):

```
ShifTora is a tool for running a restaurant — from the shift schedule to attendance and reports.

WHAT IT DOES

• Shift schedule — create shifts, assign them to people, or let the app generate the schedule automatically
• QR clock-in — staff clock in and out by scanning a QR code, no paper and no arguments
• Alerts — the app reports late arrivals and missed shifts on its own
• Reports — attendance, labour cost, staff workload
• Roles — owner, manager and employee each see only what concerns them
• Invite codes — the owner generates a code, the employee joins with it
• Several venues — each restaurant keeps its data separate
• A notice when the device loses network

WHO IT IS FOR

Owners and managers of restaurants who want the schedule and attendance in one place, and staff who clock in within a second from their phone.

SIGNING IN

The app requires an account. Employees join their restaurant with an invite code from the owner.
```

### Play locale `uk`

- **title** (8 chars): `ShifTora`
- **short description** (69 chars): `Графіки змін і облік робочого часу для ресторанів. Відмітка QR-кодом.`
- **video**: `None`
- **full description** (988 chars):

```
ShifTora — інструмент для керування роботою ресторану: від графіка змін до обліку відвідуваності та звітів.

ЩО ВМІЄ

• Графік змін — створюйте зміни, призначайте їх людям або дозвольте застосунку скласти графік автоматично
• Відмітка QR-кодом — працівник відмічає прихід і вихід скануванням QR-коду, без паперів і суперечок
• Сповіщення — застосунок сам повідомляє про запізнення та пропущені зміни
• Звіти — відвідуваність, витрати на персонал, навантаження
• Ролі — власник, менеджер і працівник бачать лише те, що їх стосується
• Коди запрошення — власник створює код, працівник за ним приєднується
• Кілька закладів — дані кожного ресторану зберігаються окремо
• Попередження про втрату з'єднання з мережею

ДЛЯ КОГО

Для власників і менеджерів ресторанів, які хочуть мати графік і облік в одному місці, та для персоналу, який відмічається за секунду з телефона.

ВХІД

Застосунок потребує обліковий запис. Працівники приєднуються до свого ресторану за кодом запрошення від власника.
```

### Play locale `ru-RU`

- **title** (8 chars): `ShifTora`
- **short description** (67 chars): `Графики смен и учёт рабочего времени для ресторанов. Отметка по QR.`
- **video**: `None`
- **full description** (984 chars):

```
ShifTora — инструмент для управления работой ресторана: от графика смен до учёта посещаемости и отчётов.

ЧТО УМЕЕТ

• График смен — создавайте смены, назначайте их людям или позвольте приложению составить график автоматически
• Отметка по QR-коду — сотрудник отмечает приход и уход сканированием QR-кода, без бумаг и споров
• Уведомления — приложение само сообщает об опозданиях и пропущенных сменах
• Отчёты — посещаемость, затраты на персонал, загрузка
• Роли — владелец, менеджер и сотрудник видят только то, что их касается
• Коды приглашения — владелец создаёт код, сотрудник по нему присоединяется
• Несколько заведений — данные каждого ресторана хранятся отдельно
• Предупреждение о потере связи с сетью

ДЛЯ КОГО

Для владельцев и менеджеров ресторанов, которые хотят держать график и учёт в одном месте, и для персонала, который отмечается за секунду с телефона.

ВХОД

Приложению нужен аккаунт. Сотрудники присоединяются к своему ресторану по коду приглашения от владельца.
```

---

## 3. False claims present in this BEFORE state

| Store | Locale | Offending text |
|---|---|---|
| Play | `cs-CZ` | `Více provozoven` |
| Play | `cs-CZ` | `při příchodu a odchodu` |
| Play | `en-US` | `Several venues` |
| Play | `en-US` | `clock in and out by scanning` |
| Play | `uk` | `Кілька закладів` |
| Play | `uk` | `прихід і вихід скануванням` |
| Play | `ru-RU` | `Несколько заведений` |
| Play | `ru-RU` | `приход и уход сканированием` |

Everything else in this file is correct-as-was and is preserved only for rollback fidelity.
