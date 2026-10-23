# WasteLens — AI Waste Identifier

WasteLens is a **camera-first, experimental** web app for recognizing household objects and offering **item-specific** reuse and disposal suggestions. It uses the **Google Gemini API's free tier** for a first prototype rather than the original Garbage-Crew MobileNet/YOLO models. Those experiments are preserved in earlier branches.

The app has Poppins typography, a minimal green/white camera interface, and a single-page flow: **photo → AI object identification → tailored reuse/disposal guidance → in-page ZIP-code map → Yes/No feedback**. Registered accounts can revisit scan history, and admins can review accounts and feedback without viewing raw photos.

> **Current status:** Backend, frontend, SQLite account/scan storage, and mocked automated tests are implemented. Actual Google Gemini and ZIP-map provider requests still need local end-to-end testing. This is not a certified recycling decision system.

## Quick start on Windows

Prerequisites: Python 3.11, Node.js 22+, and a **Gemini API key** obtained from https://aistudio.google.com/apikey .

1. Clone and switch to this branch:
   ```powershell
   git clone https://github.com/BharathReddyYedavalli/WasteLens.git
   cd WasteLens
   git switch --track origin/feat/free-vision-ai
   ```
2. Copy the API environment template:
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```
   Replace `paste-your-api-key-here` with your own key. **Never paste it into ChatGPT, GitHub, screenshots, browser JavaScript or public code.**
3. Optional: To create your **administrator** account, privately add these two lines to the root `.env` (never commit real passwords):

   ```env
   WASTELENS_ADMIN_EMAIL=your-email@example.com
   WASTELENS_ADMIN_PASSWORD=choose-a-long-unique-password
   ```

   The server creates the admin the first time it starts if that email isn't already in use. No public signup can become an administrator. Use at least 12 password characters. The accounts and saved item analyses live in `backend/data/wastelens.sqlite3`, excluded from Git.

4. Start backend:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
   ```
   Keep this terminal running; verify http://127.0.0.1:8000/api/ai/status returns `"configured": true`.
5. In a **second PowerShell window**, start frontend:
   ```powershell
   cd C:\Users\bhara\WasteLens\frontend
   npm install
   npm run dev
   ```
6. Open the exact local URL displayed by Vite. Sign up to save results, take or upload a photo, and click **Identify with AI**. Use **Yes/No** feedback, and enter a ZIP to show a scrollable facility list and embedded OpenStreetMap pins on the same page. **My History** and **Admin** are in the top navigation.

## API endpoints

- `GET /api/health` — backend readiness
- `GET /api/ai/status` — public supported model list and key-present flag (never the actual key)
- `POST /api/ai/analyze` — photo JPG/PNG/WebP <= 8 MB, `model_id`, `object_hint` and optional 5-digit `zip_code`. When authenticated, saves the analysis and returns a `scan_id`.
- `GET /api/facilities?zip_code=75063` — searches real OSM-mapped recycling features near an approximate ZIP centroid; **acceptance and hours are not verified**.
- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — account login/logout with hashed passwords and HttpOnly session cookies.
- `GET /api/scans`, `POST /api/scans/{id}/feedback` — a signed-in user's own last 200 item analyses and Yes/No/correction.
- `GET /api/admin/overview`, `/api/admin/users`, `/api/admin/feedback` — read-only data scoped to the seeded administrator role.

WasteLens uses `gemini-3.5-flash-lite` for all new scanner, chat, audit-advice, and bottle-label requests, without a model picker. Older scan histories retain their original model IDs. Google's account-specific free tier limits change; check https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/rate-limits before relying on free usage.

## User privacy / limits

- Photos are transmitted to Google only when users request AI analysis. Signed-in users' scan **text results** (name, material guess, tips, model, optional ZIP and feedback) are stored in a local SQLite database. **Raw photos are not saved**. Accounts are protected with Argon2-hashed passwords and opaque HttpOnly login cookies.
- **Google's free API tier may use prompts and uploaded images to improve its products.** Do not submit faces, addresses, identification documents or sensitive photos during testing.
- The API key stays **server-side** in `.env`; `.env` is git-ignored. Do not publicly deploy this proxy without authentication, rate limiting, and quota/abuse controls.
- This prototype does **not** identify recycling symbols or hidden materials with certainty, and it may misidentify objects. The app asks clarifying questions when needed.
- Generated reuse/disposal text is **AI-suggested, not independently verified**, so confirm anything involving batteries, chemicals, sharp items, compost, or electrical components against local official guidance.
- The collection finder embeds Leaflet/OpenStreetMap *inside WasteLens* with a list of mapped places and clickable pins. The facility data comes from OpenStreetMap/Overpass and ZIP centroids from Zippopotam; both require network access and may fail or be incomplete. Clicking a listing stays in WasteLens. Standard OpenStreetMap map attribution is retained. **No material acceptance or opening hours are verified.**
- No fictional facility listings, fake impact scores, or false confidence percentages.

## Testing

```powershell
.\.venv\Scripts\python.exe -m pytest -q backend/tests
cd frontend
npm run build
```

GitHub Actions uses mocked provider responses; **you must test real phone and camera pictures with your own key** to validate image understanding and practical disposal advice.

## Prior research

This new AI branch preserves the earlier MobileNetV3, optional YOLO, benchmarking, and material correction prototypes in Git history and their separate feature branches. The original [Garbage-Crew](https://github.com/BharathReddyYedavalli/Garbage-Crew) repo remains untouched.

## License

Project-specific source: MIT (see LICENSE). Google Gemini service and third-party libraries/fonts are governed by their own terms.

## Privacy and deployment limitations

This implementation is a **local prototype**, not a hardened internet-scale identity service. Administrators can see registered account email addresses and feedback, so disclose that to participants and apply appropriate access/retention policies. Run over HTTPS if deployed (`WASTELENS_COOKIE_SECURE=1`), add persistent per-account/IP rate limits, account recovery, verification, database backups, and delete/export controls before real public launch. Never commit `.env` or the SQLite database. Map tiles and OSM records require attribution and are governed by the providers' usage policies. A recycling-map marker is not proof that a facility accepts the photographed item.

## Unified sidebar, chat, maps and history (October 2026)

On branch `feat/wastelens-unified`, WasteLens includes the working Gemini photo identifier, scan-aware **Ask WasteLens** conversational assistant, a separate **Nearby Centers** tab with the existing in-page OpenStreetMap pins/list, plus the existing **My History**, **Sign In / Sign Up**, and admin feedback screens. The scan page continues to show the embedded map as well.

- Chat requests use the same server-side Gemini API key through `POST /api/ai/chat`. The assistant receives the current scan **summary** (not the camera photo) and a bounded recent chat history. It does not establish verified municipal recycling acceptance.
- Chat messages stay in browser memory for the current tab session (no conversation database), and clear when you scan a new item.
- Nearby locations are community mapping data and are NOT certified item-acceptance listings; call before traveling.
- No additional environment variables are required for chatbot use beyond the existing Gemini key. Existing admin email/password settings are unchanged.
- This is a preview integration branch and should be manually tested before merge or public deployment. Do not deploy an unauthenticated AI proxy publicly without abuse protection and rate limiting.

### Windows: Recover from an interrupted feature merge

If your working folder says `You have unmerged paths`, stop the local servers, then run these commands from the repository root. `git merge --abort` stops the failed merge without discarding previous committed work. Check `git status` first and avoid `git reset --hard`.

```powershell
cd C:\Users\bhara\WasteLens
git status
git merge --abort
git status
git fetch origin
git switch --track origin/feat/wastelens-unified
```

If the branch already exists locally, use `git switch feat/wastelens-unified` followed by `git pull --ff-only`. Verify you have no other local changes that would be overwritten before switching.

## Completely free, embedded recycling finder

**No Google Maps billing, no Google Maps API key, no Google Maps Embed API.**
WasteLens uses:
- **Leaflet** for the interactive in-page map, location pins, popups and synchronized results panel.
- **OpenStreetMap** standard map tiles and community recycling data through public Overpass instances.
- **zipcodes** (MIT-licensed Python package with embedded US ZIP coordinates) for offline postal lookups, avoiding unreliable per-search ZIP geocoding API calls. Approximate ZIP centers may be incomplete or stale. See https://pypi.org/project/zipcodes/ .
- A 15-minute in-memory Overpass search cache to reduce load on public community servers.

In both AI Identifier and the standalone Nearby Centers sidebar, enter a **five-digit US ZIP** such as `75033` or `75063`. The website displays a large map and scrollable facility list, with in-page location selection and optional filters for recycling centers versus drop-off points. No map search redirects and no payment method are required. A facility appearing in the map **does not prove** it accepts the particular item; all tags, contact details and hours are unverified community contributions.

If both public Overpass endpoints are temporarily unavailable, the ZIP map will still display at the approximate center with an explicit unavailability notice; we never invent businesses. Public OSM servers have fair-use restrictions and no service guarantee. This is appropriate for a small demo but should not be described as unlimited, nationwide guaranteed business coverage. In particular:
- OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Community Overpass servers may rate-limit and have outages. Do not run high-volume automated searches.
- Show OSM and GeoNames attribution when using data from the embedded ZIP library, and don't prefetch map tiles.
- Before public high-traffic deployment, choose appropriate hosted/self-hosted tiles and a cached facility database.

To update on Windows, leave `.env` alone and switch from the parent branch after checking `git status`:
```powershell
git fetch origin
git switch --track origin/feat/free-polished-recycling-map
.\\.venv\\Scripts\\python.exe -m pip install -r backend/requirements.txt
```
Then restart Uvicorn and the Vite frontend. Your Gemini and admin credentials are unchanged.

## More reliable free recycling search + object-specific reuse guides

Branch `feat/reuse-guides-and-finder-reliability` updates two user-facing features:

- The original `overpass.kumi.systems` fallback has been replaced by the operator's
  current endpoint `overpass.private.coffee` (see the [OSM Overpass instance list](https://wiki.openstreetmap.org/wiki/Overpass_API)).
  The code also tries another available public global endpoint on a failure.
  A search that returns no mapped locations within roughly 12 miles retries
  out to roughly 28 miles. Real empty results (`no_results`) are distinguished
  from provider outages (`unavailable`). Public map facilities may still be
  missing; this is not a guaranteed nationwide business directory.
- A new `reuse_projects` field is returned in the **same Gemini photo-analysis
  call**, with 3–5 specific practical ideas *when safe and appropriate*. Each
  project contains a title, useful outcome, materials, instructions, difficulty,
  approximate minutes and an optional safety caveat. The page displays projects
  as expandable, mobile-friendly cards under the scanned item.
- Unidentified objects omit structured projects, and previous saved scans
  without `reuse_projects` still display their older `reuse_ideas` summaries.
  All content is AI-generated, not guaranteed accurate. Check material,
  safety and applicability before attempting a project.

No new API keys, payment methods, provider subscriptions, or database migrations.
For updated code on Windows, switch to the new branch, install backend
requirements, restart Uvicorn, then run `npm run dev` under frontend.
Automated tests use mocked provider data and do not verify production Overpass
availability or a real Gemini image response.


## Friendly visual refresh (October 2026)

The independent `feat/friendly-visual-refresh` branch changes actual React
copy, the global layout, and the typography. It is **not** a cosmetic
rearrangement of existing cards.

- New rounded **Fredoka** for brand, hero and section headings; **Nunito**
  for readable body text and controls. Fonts are served by Google Fonts with
  system font fallbacks.
- Larger navigation, buttons and explanatory text; simpler camera instructions
  and more conversational names across the identifier, chat, map and accounts.
- One warm green visual system, accessible focus treatment, mobile adjustments,
  subtle transitions with reduced-motion support.
- Optional model settings and secondary explanations use disclosure controls.
  The important Google Gemini free-tier photo data notice remains **visible**
  before identifying an item.
- Removed repeated technical map paragraphs from the primary workflow;
  the attribution and the reminder to confirm acceptance remain visible.
- No changes to Gemini integration, map APIs, account security or saved data.
  Back end chat/vision writing instructions were also adjusted to avoid
  filler text and em dash punctuation.

Automated CI confirms TypeScript builds and mock backend tests. **No visual
browser screenshot or real Gemini analysis was verified by CI**; test the
appearance and browser behavior locally on desktop and mobile before merging.


## Verified city listing fallback for ZIP 75033

The free recycling finder now supplements community OSM listings with **two
actual local recycling facilities published on city government websites**.
Unlike map-only data, these remain available in the sidebar during an Overpass
outage. They are only offered when geographically near the requested ZIP; there
is no fabricated nationwide list.

* Frisco Environmental Collection Center, 6616 Walnut Street. Official
  city source: https://www.friscotexas.gov/1144/Environmental-Collection-Center
  Approximate pin: https://junkscout.io/facility/f_manual_5bd8288de838/
* Plano Republic Services Recycling Drop Off, 4200 E. 14th Street. Official
  city source: https://www.plano.gov/recycling-drop-off-locations
  Approximate pin: https://recyclefind.com/listings/republic-services-plano-recycling-facility-plano-tx-4219

Source labels, specific access notes, official source links and approximate
pin notes are displayed with the results. In normal searches, results from
live OSM are combined with official entries and physically overlapping pins
are removed. If OSM fails, the status is `partial` if there are official
entries and `unavailable` if none exist. An empty OSM result is not proof
the city has no facilities. The curated list is a **small starting set, not
nationwide coverage**. Real production nationwide coverage requires a more
reliable licensed points of interest source or regularly updated offline data.

The backend uses a logging warning for external provider request errors
to help diagnose firewalls, timeouts and HTTP error codes in the terminal.
No Google Maps billing or additional API key is used.


## XP, badges and Leaderboard

Feature branch `feat/leaderboard-xp-badges` provides:

* XP for a newly recognized photo on a signed-in account (20 XP when the
  item is confidently identified, at most 10 rewarded scans per UTC day).
  Duplicate photo uploads, unidentified objects and guest scans earn no XP.
  A user-scoped image digest prevents repeat rewards without storing photos.
* Persistent progress and level every 100 XP, with badges earned after
  1, 5, 10, 25 and 50 rewarded scans.
* Leaderboard privacy **off by default**. Users must opt in to publish only
  their chosen display name, level, XP, scan counts, and self-reported action
  count. Email, ZIP codes, scan results and photos are never published.
* A single self-reported outcome per scan: recycled, reused, composted or
  donated. Revising the outcome updates the one activity record and awards
  **no extra XP**. It is an honor-system record, not verification.
* No false carbon-impact estimates. CO₂ saved is explicitly shown as
  **Not measured** until defensible material, weight and processing data
  are available. Scanning is not assumed to mean recycling.
* Safe database upgrade on restart, preserving historical scans and users.
  Historical scans remain visible, but scans made before XP was added do
  not retroactively earn points because no photo hashes existed for de-duplication.

The homepage intro and repeated instruction text were shortened. A concise
photo privacy notice remains visible because the Gemini free tier may use
submitted image content for service improvement.


## Community focused features (2026 redesign branch)

WasteLens offers a route from *recognition* to a practical next step:

1. **Three language flows**: choose English, Spanish or Hindi using the top bar.
   The primary interface translates immediately. New Gemini scans and chat replies
   are requested in the chosen language. Previously saved scans are not
   retrospectively translated. Additional secondary UI/error text may remain in
   English; this is not a certified professional translation.
2. **Sort plan for every identified item**: an item specific preparation
   checklist, copyable instructions and print output. A browser speech feature
   can read it aloud using the user's selected language when the device has an
   appropriate voice installed. Instructions are AI assisted and local rules
   must still be confirmed before using a facility.
3. **Private waste activity, not fictional impact**: your last seven calendar
   days of scans and self reported actions. Optional CSV export can support
   a school cafeteria audit or family waste review. An action is a personal
   record, **not proof** the material was collected or processed.
4. **Different visual identity**: responsive horizontal navigation, lively
   teal, coral, yellow and lilac accent colors, Poppins interface text,
   editorial display typography, small transitions and reduced motion support.
   Confetti and XP remain available, but are secondary to useful actions.
5. **Community waste audit**: a separate page for schools, families and
   cleanups. Count items as recycling, compost, trash, reuse or unsure,
   use Undo, export the observation log as CSV or print the summary.
   Nothing is sent to WasteLens accounts or its backend; the audit is kept
   in this browser's local storage until cleared. After the page is
   loaded, the tally itself works without calling external services.
   Manual observations are not verified waste diversion.
6. **Free collection map**: unchanged existing community and city sourced
   finder. A map listing does not establish material acceptance or opening
   hours. Confirm by contacting the facility before traveling.

### Manual checks before publication

* Switch to Spanish or Hindi, scan a new photo, and verify real Gemini advice
  and chat replies. Automated tests cover language routing, not live model
  translation quality.
* Test mobile navigation, screen reader labels, keyboard skip link, copying,
  printing and text-to-speech across the actual demo devices.
* Sign in, scan and record an item, then confirm the seven-day activity report
  updates and the CSV contains only date/count rows.
* Check real drop off search coverage and local acceptance against official
  recycling pages. Do not assert nationwide acceptance without verification.
* Keep personal image data and API keys out of the public repo.


## Bottle Returns and Bottle Journey (October 2026)

**10 US states**, each with linked official program information: CA, CT,
HI, IA, ME, MA, MI, NY, OR, and VT. No other states are represented as
having a statewide deposit. This is a reference tool, not a payment service.

### Bottle Returns tab

Choose purchase state, beverage, packaging type, size in fluid ounces,
count and whether the deposit was actually paid there. A state-specific
backend rule engine computes eligible refund value in integer cents.
For ambiguous products or unknown deposits it returns **check**, not a
confirmed refund. If the deposit was not paid there, the estimate is $0.
The **official government source URL** is included in each result. The
checker deliberately does not attempt to identify every brand or distributor
or make claims about refund locations' real-time acceptance. Some states
also have retailer-specific limits or product exemptions that cannot be
inferred from these fields. Consult the linked state page before traveling.

### A Bottle's Journey tab

An original **long-form illustrated scroll experience** uses real
photos and source links to tell a seven-chapter story. At the very bottom is a five-question
quiz about reuse, litter, recycling symbols, and deposit returns. Correct
answers are validated by the backend. Four out of five earns the Bottle
Explorer badge and **30 XP exactly once** for each signed-in user. Anonymous visitors can learn and submit but cannot earn account XP.
Badge progress contributes to the existing XP and opt-in leaderboard.
The 2026 source and language translations should be reviewed regularly as
laws can change.

### Official rules consulted

* California https://calrecycle.ca.gov/bevcontainer/
* Connecticut https://portal.ct.gov/DEEP/Reduce-Reuse-Recycle/Bottles/Connecticut-Bottle-Bill
* Hawaii https://health.hawaii.gov/hi5/consumers/
* Iowa https://www.iowadnr.gov/environmental-protection/land-quality/recycling/bottle-deposit-law
* Maine https://www1.maine.gov/dep/sustainability/bottlebill/index.html
* Massachusetts https://www.mass.gov/deposit-bottle-can-recycling
* Michigan https://www.michigan.gov/egle/faqs/recycling/bottle-deposit-law
* New York https://dec.ny.gov/environmental-protection/recycling-composting/bottle-bill
* Oregon https://www.oregon.gov/olcc/pages/bottle-bill-redeemable.aspx
* Vermont https://dec.vermont.gov/waste-management/solid/product-stewardship/vermonts-bottle-bill

Validation covers ten-state baseline rates, selected exceptions and size
boundaries, user paid-deposit conditions, signed-in quiz reward uniqueness,
and quiz reward checks. The former bottle photo-reader feature and
`/api/deposit/inspect` endpoint were removed during interface cleanup. Tests
do **not** prove redemption location operations, accessibility audits, or
visual appearance on all browser sizes. Review those manually before
the Congressional App Challenge demonstration.


### Nationwide official-guidance discovery (Stage 3)

The municipal item-by-item policy catalog still contains **only four** source-reviewed
residential programs: Frisco, McKinney, San Francisco (Recology), and Los Angeles.
It is **not** a national database of accepted curbside materials.

For a ZIP without a supported program, or for a household with another provider,
open **Check local recycling rules**, select the collection setting and item,
then choose **Find guidance and contacts**. The new
`GET /api/local-rules/discovery?zip_code=10001&category=plastic_clamshell`
endpoint returns a postal-area hint, item-specific EPA references, a state
environmental-agency homepage where curated from EPA's directory, and a clearly
labeled external search for the user's actual city/county/hauler. The endpoint
does not scrape Google, determine municipal boundaries, validate service
contracts, or infer curbside eligibility. The query link opens search results,
**not** a verified official government page. Schools and businesses receive
contract-specific warnings. Lithium-ion batteries always receive EPA-based
safety instructions before any local provider is confirmed.

All discovery responses are marked `unverified`,
`local_acceptance_verified=false` and
`documented_program_rule=false`. The existing four-city API and rules
remain unchanged. A state website is a reference, not a promise that an item
or facility is accepted. The bundled ZIP postal dataset can be incomplete;
unknown ZIPs return an explicit lookup error rather than guessing.


### Point-of-disposal presentation (Stage 4)

**Better recycling starts at the bin.** WasteLens is an interactive web prototype
intended to help people make an informed decision *before* choosing a bin. The
homepage keeps **“Before you toss it, scan it.”** After a scan, the prominent
next-action panel shows the **AI's suggested route, not a verified local
acceptance rule**. If the item is uncertain, it asks for confirmation instead.
The checklist, official-program checker (including Stage 3 discovery), map,
chat, reuse, and self-reported action recording remain available.

The panel's **Check local rules** button opens the existing ZIP/program
checker rather than inventing or automating a recycling decision. The
**Waste audit** tab lets a school or office tally manually observed items by
destination and review sorting patterns. Audit observations cannot establish
actual recycling or measured environmental savings.

**Proposed use case:** A school could eventually run the web interface beside
waste bins on a tablet or kiosk to prompt decisions at the point of disposal.
This repo is **not** a deployed physical kiosk; no school deployment,
on-site pilot, measured diversion improvement, or school-partner approval is
claimed. Before public deployment, a school would need to validate site-
specific hauler rules, access and privacy, hardware, connectivity, and any
necessary permissions.

To review Stage 4, scan a recognizable item, confirm the action panel appears
before the checklist, open **Check local rules**, and verify that unknown
ZIPs still display unverified discovery references rather than fabricated
local acceptance. Then check the **About** and **Waste audit** pages in all
six themes and on a mobile viewport. CI checks structural invariants and
builds but does not replace visual or live AI tests.


### Waste Audit guided workflow (Final Refinement Stage 1)

The **Waste Audit** page is an observation workflow for a proposed bin-side
kiosk and organizational waste review, not a claim of an installed physical
kiosk. It now has three stages within one page:

1. **Set up:** specify the observed location and optionally the session
   (e.g. cafeteria / lunch period) and audit title.
2. **Count:** select an actual observed item, then tap the bin or destination
   where it went. Each tap records exactly one observation; Undo fixes errors.
   The optional site-policy check records a *human's* assessment and requires
   explicit site-rule acknowledgment. It is reset after every observation.
3. **Review:** show total observations, the distribution of observed
   destinations, common items, and actionable steps. A possible-wrong-bin
   percentage uses only observations individually marked against on-site
   rules; unassessed entries are excluded. CSV exports and printing work
   without an AI call or account sign-in.

Account users can save, load and delete audits and compare the current draft
with one prior saved audit. Comparisons identify when location or session
doesn't match or lacks metadata; even matched snapshots cannot establish
actual diversion, causation or environmental savings. The optional Gemini
ideas remain collapsed below the default evidence-based recommendations.

The backend preserves the existing entry schema and adds optional location
and session fields to the save payload. Existing SQLite audit tables are
migrated in place with a default-empty JSON context column; older rows
retain their original entries and return empty/absent context. Existing
browser drafts under wastelens-community-audit-v1 remain valid. Counts,
photos, users, scans and gamification storage are otherwise unaffected.

Test the three-step workflow in all themes and sizes and confirm that opening
an old audit still works. GitHub CI covers backwards compatibility, the DB
migration, and the React source-flow contracts, but cannot establish live
touchscreen ergonomics without browser review.

### Personal activity dashboard (Final Refinement Stage 2)

The signed-in **My Activity** page separates three genuinely different
statistics: all-time scans (attempts at identifying items), actions explicitly
self-reported in the last seven days, and independently tracked gamification
XP/levels/badges. It queries the existing `/api/habits` and
`/api/leaderboard` endpoints without creating or estimating impact numbers.
The weekly chart shows scanning and logged actions as **separate** series.
XP is for engagement, not validated recycling or CO2. The dashboard shows
earned badges only; the separate Leaderboard page retains community rankings.

Recent saved classifications are compact cards with an AI-suggested route and
expandable disposal/reuse details. Show the most recent six first, with a
button to show all saved items fetched from the account history endpoint.
The existing stored scans and feedback remain intact, as do the scanner,
Waste Audit, and all six appearance themes. Buttons jump directly from My
Activity to scanning or starting an organizational Waste Audit. Signed-out
visitors continue to see the existing login form.

The server's `seven_day_actions` is limited to the past seven UTC days,
whereas `total_scans` and XP are all-time. The action breakdown is also
seven-day-only. A recorded action is not proof of municipal acceptance,
diversion, or environmental impact. Account sync applies only within the
same configured WasteLens backend/database. Smoke-test mobile/desktop and
alternate themes before recording the demo video.
