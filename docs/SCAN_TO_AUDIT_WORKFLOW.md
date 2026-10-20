# Stage 4: Scan-to-action workflow

The existing scan result already provides a sorting plan, optional Frisco
residential policy lookup, Ask WasteLens, and a nearby-facility search. This
stage connects those tools rather than creating another page or search engine.

## What changed

After an image is analyzed, two contextual actions appear directly after
sorting instructions and the source-backed local-rule option:

- **Find nearby options** scrolls to the existing ZIP-code facility finder
  inside the scan results. It does not automatically search or imply that
  a listed facility accepts the identified item. The existing call-ahead
  cautions, source labels and map remain in place.
- **Record an observation** opens the existing community audit. A temporary
  header shows the scanned item's **AI-generated name** for reference,
  alongside a reminder that nothing has been counted. Optional item
  details are expanded so the user can choose the *actual observed item*
  and site-specific bin, or simply use the original one-tap categories.
  **No automatic category selection, audit entry, recycling claim or XP
  action is made.** The user must explicitly press a counting button.
- **Back to scan** returns to the original scan, preserving the existing
  result and its help, source references and photo until the user resets it.

The audit handoff is temporary React state, not a new backend endpoint or
saved field. Ordinary sidebar navigation clears that handoff context.
Drafts, saved account audits, CSV exports, and the scanner's existing
feedback and recorded-action systems are unchanged.

## Why we did not automate more

A photographed object does not prove someone observed its disposal in a
specific bin. An AI guess about an item category is not a verified
observation. A nearby facility is not evidence of item acceptance.
Residential curbside rules may not apply to school contractors.

For these reasons Stage 4 intentionally **does not**:

- count scans as waste observations;
- infer the actual disposal destination;
- mark a reported bin placement as verified;
- automatically recommend an unconfirmed recycling center;
- claim any environmental savings or improvement from navigation alone.

## Automated checks and final manual validation

The normal GitHub checks compile the TypeScript/React production build and
run the FastAPI backend tests. No new backend contract or schema is needed
for this frontend-only workflow, and no new dependencies were added.

The final manual stress test should verify:
1. Scan a photo and choose Find nearby options: the existing ZIP finder
   receives focus of navigation/scroll, but doesn't silently submit a search.
2. Choose Record an observation: the audit shows the scanned item name,
   but total counts and any existing draft data remain unchanged.
3. Check the optional item type and manually count a destination; confirm
   undo, CSV and save/reopen work as before.
4. Choose Back to scan: the original result is still visible.
5. Navigate directly through the sidebar to Waste Audit: no stale
   handoff message appears.
6. Repeat on mobile and with English, Spanish, Hindi and all existing
   appearance themes.
