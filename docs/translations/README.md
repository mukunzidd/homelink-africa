# Translation reviews

`messages/fr.json`, `rw.json` and `sw.json` were first written by an
assistant from the English. On 2026-11-09 each was read against the English
by a separate model reviewer briefed to read as a native would, and corrected:

| Language | Strings changed | Log |
|---|---|---|
| French | 367 | [2026-11-09-review-fr.md](2026-11-09-review-fr.md) |
| Kinyarwanda | 280 | [2026-11-09-review-rw.md](2026-11-09-review-rw.md) |
| Swahili | 232 | [2026-11-09-review-sw.md](2026-11-09-review-sw.md) |

Each log has every change (key, before, after, why), a **Still needs a native
reader** list, and the terminology the file now uses everywhere.

These were model reviews, not native ones. They fixed real errors: a booking
reference labelled "insurance number" in Kinyarwanda, "sokwe" (chimpanzee)
for gorilla in Swahili, "deux-pièces" (a one-bedroom flat) for two bedrooms
in French, escrow worded as money confiscated or deducted. The Kinyarwanda
reviewer was told to change only what it was sure of and to list the rest;
its uncertain list is the longest and the one to start with.

## Before launch

1. A native reader per language goes through the "Still needs a native
   reader" list in each log, then reads the busiest screens in the app
   (home, a stay, booking steps, trips, messages, help).
2. The legal pages (`legal.*`) also need a lawyer in each language.
3. Formats the app builds itself, not from these files, also want a native
   eye: Kinyarwanda dates ("12 Ukwakira 2026") and relative times
   ("hashize iminota 5"), and Swahili weekday abbreviations (Jtt … Jpi), all
   in `src/lib/domain/date-format.ts`.

4. Strings added after the reviews, written by an assistant and not yet
   reviewed in any language but English: how a guest gets in
   (`booking.manage.gettingIn`, `booking.manage.entry.*`,
   `workspace.editor.entry*`).

## Guard rails

`src/i18n/messages.test.ts` checks that every language has the English keys
and placeholders, never says lease or bail, has no empty string, and that
every message renders: a straight apostrophe before a brace (`cy'{count…}`)
quotes the whole plural in ICU, and four Kinyarwanda strings showed their
source text that way until this review. `make sweep` with `ALL_LOCALES=1`
opens every page in fr, rw and sw on a phone and flags clipped or
overflowing text.
