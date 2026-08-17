# Privacy policy corrections needed — Shiftora

**Live page:** https://it-enterprise.pro/privacy-policy/shiftora/ (HTTP 200, Czech only)
**Hosted at:** `185.185.83.149` — **not** this ops node (157.180.86.49). We cannot publish this
change ourselves from here; it needs whoever administers the `it-enterprise.pro` web host.
(`it-enterprise.pro` DNS is at hosting90/Webglobe, web panel only, not scriptable.)

**Why this matters:** the policy states it "describes the actual state of the app" and that the
same is declared in Google Play Data Safety and App Store App Privacy. Three statements in it are
now wrong. One of them was wrong *before* today's work and is a genuine disclosure gap.

---

## 1. Undisclosed processor — user photos went to a third party (pre-existing gap)

The page says, under *Komu údaje předáváme*:

> Nikomu je neprodáváme ani nepředáváme pro jeho vlastní účely. Zpracovávají je pro nás a podle
> našich pokynů tito poskytovatelé: **Render**, **Resend**, **Expo Push / APNs / FCM**.

That list is incomplete for the versions currently in the stores. The backend's upload route sent
every uploaded image to **`storage.vibecodeapp.com`**, a processor that appears nowhere in the
policy, nowhere in Data Safety, and nowhere in App Privacy:

- `backend/src/routes/upload.ts` — `POST https://storage.vibecodeapp.com/v1/files/upload`
- the returned public CDN URL was stored in `Asset.url` and rendered directly by the app

The policy explicitly lists "fotky, které jste nahráli" among the personal data we process, so
those files are personal data being sent to an undisclosed processor.

**Fixed in code as of 2026-08-16** (branch `backend/nase-infra-bez-vibecode`): uploads are stored
on our own disk and served from our own API. From the build that ships this change, the reality
matches the existing "we don't pass data to anyone else" wording — no new processor to declare.

Note the policy text itself needs no new entry for this once the fix ships; the entry that must
change is Render, below. But **the store declarations should be reviewed** for the versions
already published (Android versionCode ≤ 21, iOS build ≤ 12), which do send photos to
`storage.vibecodeapp.com`.

## 2. "Render" is no longer our server operator

Current text:

> **Render** — provoz serveru a databáze aplikace.

The app now talks to our own backend at `https://api.shiftora.it-enterprise.cloud`, running on our
own node. Render is not involved once a build carrying the new base URL ships.

Suggested replacement:

> **IT Enterprise Solution s.r.o.** — provoz serveru a databáze aplikace na vlastní infrastruktuře
> (datové centrum Hetzner Online GmbH, Německo / EU).

Do not publish this line until a build pointing at `api.shiftora.it-enterprise.cloud` is actually
live in the store, otherwise the policy will again describe something the shipped binary does not do.

## 3. In-app account deletion now exists

Current text:

> V aplikaci zatím tlačítko pro smazání účtu není; žádost se vyřizuje e-mailem výše.

This is no longer true. The app ships a Delete Account control
(`mobile/src/components/delete-account.tsx`) calling `DELETE /api/users/me`, and that endpoint is
live and verified working on our backend. This was added for App Store Guideline 5.1.1(v).

Suggested replacement:

> Účet můžete smazat přímo v aplikaci (Profil → Smazat účet). Smazání je okamžité a nevratné.
> Případně nám můžete napsat na dev@it-enterprise.cz z e-mailové adresy, kterou se přihlašujete.

## 4. Version reference is stale

Current text pins the description to *"Android versionCode 18, iOS build 9"*. Current is
Android versionCode 22 and iOS build 12. Update when the above changes are published.

---

## Also worth deciding (chief)

The policy is **Czech only**, while the app's interface is **English only** and it is listed in
en-US. An English version of this page is advisable for the en-US listing — Apple and Google both
expect the privacy URL to be meaningful to the listing's audience.
