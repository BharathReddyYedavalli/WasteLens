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

Current free-tier model options: `gemini-3.8-flash` (default) and `gemini-3.5-flash-lite` (comparison). Google's account-specific free tier limits change; check https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/rate-limits before relying on free usage.

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
