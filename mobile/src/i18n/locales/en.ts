/**
 * English catalog — THE SOURCE OF TRUTH for the key set.
 *
 * The strings live in `en-parts/*.ts` so that several people (or agents) can
 * work on different areas of the app without fighting over one file. The
 * composition below is what defines `TranslationKey`; every other locale is
 * declared as `Catalog`, so a missing or misspelled key is a compile error,
 * not a runtime surprise.
 */
import { enCore } from './en-parts/core';
import { enAuth } from './en-parts/auth';
import { enAccount } from './en-parts/account';
import { enSchedule } from './en-parts/schedule';
import { enOperations } from './en-parts/operations';

export const en = {
  ...enCore,
  ...enAuth,
  ...enAccount,
  ...enSchedule,
  ...enOperations,
};

export type TranslationKey = keyof typeof en;

/** Shape every locale must satisfy in full. */
export type Catalog = { [K in TranslationKey]: string };

export const enCatalog: Catalog = en;
