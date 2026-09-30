# Backend cutover — Render → ours. Will the two diverge?

**Short answer: yes, they are two separate databases and they will diverge the moment both are
in use. But the user base on the old one is effectively zero right now, so a clean cutover today
costs nothing — and waiting is what creates the problem.**

## The mechanism

There is no shared storage between the two backends:

| | Old (what's live now) | New (what build 13 / vc22 use) |
|---|---|---|
| API | `https://shiftora-final-project.onrender.com` | `https://api.shiftora.it-enterprise.cloud` |
| Owned by | the external author's Render account | us (ops node, container `shiftora-nase-api`) |
| Database | Render Postgres — **we have no credentials** | `shiftora-nase-pg` on our node |
| User photos | forwarded to `storage.vibecodeapp.com` | our own disk |

Accounts, restaurants, employees, shifts, check-ins and uploaded photos are written to whichever
backend the installed build points at. An account created on build ≤ 12 does **not** exist on our
backend, so on build 13 that user cannot sign in — it is not a stale-cache problem, the row is
simply in a different database.

## How much data is actually at risk — measured, not assumed

| Evidence | Value | Source |
|---|---|---|
| iOS first available | **2026-08-16 07:00 UTC** (~hours ago) | iTunes lookup API, `releaseDate` |
| iOS ratings | **0** | iTunes lookup API, `userRatingCount` |
| Android public since | Aug 8, 2026 | public Play listing |
| Android installs | **"1+"** — Play's lowest bucket | public Play listing |
| Our database | 1 user, 0 restaurants, 0 employees, 0 shifts, 0 check-ins, 0 assets | direct SQL |

So the population that could be stranded is somewhere between zero and a handful, and those are
almost certainly our own internal/test installs rather than paying restaurants.

## Recommendation

**Cut over now.** The cost of switching is currently ~zero and only grows. Every day the app stays
live pointing at the author's Render service is another day in which:

- real restaurants can sign up, after which their data is on infrastructure we do not control and
  cannot export without the author's cooperation — **there are no Render credentials in the Safe**,
  so a later migration is a hard dependency on an external contractor;
- their uploaded photos keep going to `storage.vibecodeapp.com`, an undisclosed processor.

## What must NOT happen

Do not release build 13 / vc22 to production *and* leave the old build live for long in parallel.
That is the one configuration that actively splits data: some users writing to Render, some to us,
with no reconciliation path. Either cut over, or don't — don't run both for weeks.

## If real users are found on Render after all

We cannot enumerate that database. If the author confirms real accounts exist, the migration is:

1. Author exports the Render Postgres (`pg_dump`) — only he can do this.
2. Import into `shiftora-nase-pg`; the schema is the same Prisma schema, so a straight restore works.
3. Re-point any `Asset.url` rows still holding `storage.vibecodeapp.com` links — those bytes are on
   the third party and would have to be re-fetched before that storage is decommissioned, or those
   images are lost.

Point 3 is time-sensitive and independent of everything else: any file already uploaded by a real
user lives only on `storage.vibecodeapp.com`. If that service goes away, those images are gone.

## Status of the builds

Build 13 (iOS) and versionCode 22 (Android) are **uploaded, not released** — ASC upload without
submission, Play internal/draft. Nothing reaches users until the chief releases, so this document
is the input to that decision, not a description of something already done.
