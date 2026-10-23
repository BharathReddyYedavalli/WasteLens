# WasteLens waste-audit measurement notes

This document describes what Stage 2 counts actually mean. It is a design and
interpretation reference, **not a report of a completed field study**.

## Two ways to count

**Quick count (unchanged):** Press Recycling, Compost, Trash, Reuse or Not sure
to record one observer-entered category. This is not proof that an item was
processed in any specific way.

**Optional item-level observation:** Open **Add item details**, pick a visible
item type, and tap the destination category. This records an item label plus the
same original category and timestamp. Item identification is manual, not Gemini.

**Optional rule-based spot check:** If the observer has checked the collection
rules **for the actual site and its collector**, the observer may explicitly
acknowledge that and report whether a recycling, compost, or trash placement
matched or potentially conflicted with those rules. Otherwise the entry stays
unassessed. Reuse and Not sure cannot be graded as bin placements.

**Important:** Frisco municipal *residential* curbside rules cannot be assumed
to apply to a school cafeteria, commercial building or private collection
contract. WasteLens neither verifies that the observer checked the right policy
nor independently verifies the reported sorting assessment.

## Meaning of the visible report

- **Items counted:** All observations, including legacy entries without details.
- **Items identified:** Observations with a manually selected item type.
- **Placements checked:** Item-level bin observations that the observer says
  were compared with the site's actual collection rules.
- **Possible wrong-bin placements:** The subset of checked bin observations
  the observer marked as conflicting with those rules.
- **Most observed / flagged for follow-up:** Counts of manually entered item
  types. These are exploratory priorities, not a measured landfill reduction.
- **Trash + uncertain percentage:** A share of manually selected categories,
  not a recycling rate, contamination rate or carbon-savings metric.

No percentage of "correct recycling", environmental impact, or carbon savings
is estimated. A future controlled study would require an independent rules
reference, comparable sampling, and appropriate reviewer checks.

## Data preservation and exports

Each audit entry keeps the original `kind` and `at` fields and may add
`item_type`, `sorting_check` (`matches` / `mismatch`) and
`rules_checked=true`. Old saved entries without these optional fields work
unchanged. The server stores an account-owned snapshot using its existing
SQLite schema, and draft entries stay in browser local storage.

CSV exports include every original observation and additional columns:
`item_type`, `site_rules_checked`, `placement_review`. Older entries
receive blank values in those columns.

Only the audit name and the original five category counts are sent to Gemini
**if** the account holder explicitly requests AI suggestions. Item-level
observations, school information and on-site rule statements are not sent in
that suggestions request.

## Automated verification and later field testing

The backend tests cover legacy audit compatibility, mixed old/new entries,
valid checked spot checks, invalid/missing checks, unknown item types and
account access controls. The frontend receives a TypeScript production build.

Real-world testing has **not** yet been completed. Before a competition
submission, a human tester should verify the five one-tap count buttons,
optional detail fields, rule confirmation, the report, undo, save/reopen,
CSV export, loading an older audit, all appearance themes, Spanish/Hindi,
mobile layouts, and users with no account.
