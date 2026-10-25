# WasteLens

### Before you toss it, scan it.

**An AI-powered, kiosk-first web application that helps people understand what they're throwing away—and what to do with it instead.**

WasteLens makes waste sorting more approachable through a simple, visual experience: take a picture of an item, learn what it is made of, explore safer reuse or disposal options, and check local collection guidance. It brings together practical tools, interactive learning, and a little gamification so people can make better-informed decisions at school, at work, or at a community event.

**Built for the 2026 Congressional App Challenge.**

---

## Why WasteLens?

Every day, schools, cafeterias, offices, and public spaces throw away plastic containers, paper products, electronics, food packaging, and other materials. Even people who want to recycle can find the process confusing:

- An item may look recyclable but not be accepted by the nearby collection program.
- Batteries and electronics may need special drop-off rather than an ordinary bin.
- Reuse, recycling, composting, and trash are not interchangeable.
- Long instructions and complicated sorting websites are difficult to use when someone has an item in their hand.

**The idea behind WasteLens is to make the next step obvious.** Instead of expecting someone to read a lengthy waste-management guide, the interface starts with an object and uses large text, clear buttons, pictures, and concise explanations.

WasteLens is designed to feel like a **self-service kiosk**: something a student or visitor could walk up to, understand quickly, and use without special training. It is a browser-based application, so it can also run on an ordinary laptop, desktop, or tablet—no dedicated kiosk hardware is required.

## How it works

1. **Scan an item.** Use the camera or upload a JPG, PNG, or WebP photo.
2. **Understand the result.** WasteLens uses Google Gemini to identify the likely object and material, then explains practical reuse and disposal options.
3. **Check the relevant rules.** Compare the item against available source-linked collection guidance, including selected Texas school, office, and business programs. When a precise rule cannot be confirmed, WasteLens says so rather than guessing.
4. **Find a place to take it.** Search nearby potential recycling and drop-off facilities by US ZIP code using an interactive map.
5. **Take the next step.** Save a scan, log what you actually did, learn through the Bottle Journey, or count items in a community waste audit.

**WasteLens does not assume that scanning an item means it was recycled.** Identification, collection-program eligibility, and a person's actual disposal action are different things.

## What you can do in the app

| Area | What it does |
| --- | --- |
| **Scan** | Camera/upload-based AI item identification, material insights, reuse ideas, safety notes, and suggested next steps. The landing experience includes an interactive 3D bottle. |
| **Ask WasteLens** | Ask follow-up questions about waste, recycling, and a scanned item. Suggested questions help users get started. |
| **Check local recycling rules** | Choose among selected school, workplace, and customer drop-off programs; see item-specific, source-linked guidance when available, and correct an incorrectly identified item. |
| **Find a Place** | Look up potential nearby collection locations by ZIP code on a large interactive map. Google Maps/Places is supported when configured, with a community OpenStreetMap/Leaflet option. |
| **Bottle Returns** | Estimate container-deposit refunds using beverage, container, size, quantity, and purchase-state information for the ten US bottle-bill states covered in the app. |
| **Bottle Journey** | Explore a long, visual story of a plastic bottle, make interactive choices, and take a five-question quiz to earn the **Bottle Explorer** badge. |
| **Waste Audit** | Count observed items by waste category, inspect charts and patterns, record optional sorting details, save audits to an account, and export results as CSV. |
| **My Activity** | Review saved scans, suggested disposal steps, feedback, and self-reported actions. |
| **Leaderboard** | View scanning progress, levels, XP, and all earned/locked badges. Public leaderboard participation is opt-in. |
| **Personalization & accessibility** | Choose English, Spanish, or Hindi; select a visual theme; switch navigation between a left sidebar and a top bar; and use available natural read-aloud voices. |

The interface offers **Light, Dark, Ocean, Beach, Forest, and Sunset** themes. It is designed around readable kiosk-scale typography, straightforward navigation, and touch-friendly controls.

## The kiosk experience

WasteLens is not just an AI classifier with a text response. Its interface is intentionally designed for an everyday visitor:

- **Visual first:** large type, item-focused results, clear actions, and interactive educational content.
- **Short path to an answer:** the main experience starts with a photo, not an account-creation form.
- **Read only what you need:** essential results appear first, while deeper tips and calculations can be expanded.
- **Works for different settings:** scan an item at a school or office, search for a drop-off location, or conduct a cafeteria waste audit.
- **Motivation to return:** badges, XP, and a quiz reward continued learning, while recorded waste actions remain self-reported rather than claimed as verified environmental impact.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS, Lucide icons |
| Interactive 3D experience | Three.js and GSAP |
| Backend API | Python, FastAPI, Uvicorn |
| AI identification and chat | Google Gemini API (configured on the backend) |
| Natural-language speech | Gemini-powered text-to-speech where available |
| Maps and nearby places | Google Maps JavaScript / Places (optional); Leaflet, OpenStreetMap, and Overpass for community mapping |
| Saved data | SQLite for accounts, scans, actions, badges, and saved audits |
| Authentication | Argon2 password hashing and HttpOnly session cookies |
| Testing | Python pytest, TypeScript checks, Vite production build, GitHub Actions |

The Vite development server proxies `/api` requests to the local FastAPI backend.

## Run WasteLens locally

### Requirements

- **Python 3.11+**
- **Node.js 22+** and npm
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)
- A modern browser (camera use requires `localhost` or HTTPS and permission from the browser)
- Internet access for Gemini and online map services

### 1. Clone the repository

```bash
git clone https://github.com/BharathReddyYedavalli/WasteLens.git
cd WasteLens
```

### 2. Configure the AI key

Create a local `.env` file at the **repository root**, using the provided template.

**macOS / Linux:**

```bash
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

```dotenv
GEMINI_API_KEY=YOUR_OWN_GEMINI_API_KEY
```

The key is used by the Python backend, not embedded in frontend code. Keep it private and **never commit `.env`**.

To create an administrator account when the backend first starts, you may also add:

```dotenv
WASTELENS_ADMIN_EMAIL=you@example.com
WASTELENS_ADMIN_PASSWORD=your-own-strong-password
```

These administrator settings are optional. Ordinary users can create accounts in the app; public signup does not grant administrator privileges.

### 3. Start the backend

Open a terminal in the repository root.

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

**Windows PowerShell:**

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Keep this terminal running. The backend health check is available at [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health), and the API documentation is available at [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs).

### 4. Start the frontend

Open **another terminal** at the repository root (the `WasteLens` folder):

```bash
cd frontend
npm install
npm run dev
```

If opening a terminal in a different folder, first navigate to your local `WasteLens` repository.

Open the local URL printed by Vite—normally **[http://localhost:5173](http://localhost:5173)**.

The backend and frontend must both remain running for the full experience.

### 5. Optional: enable Google Maps / Places

WasteLens can use the community map without a Google Maps key. To use the Google Maps / Places experience, create `frontend/.env.local`:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY
```

Restart Vite after saving the file. The relevant Google Maps JavaScript and Places APIs must be enabled for your key. Because `VITE_` values are exposed to browser requests, **restrict this key to the appropriate origins and APIs** and use suitable quotas/billing controls.

If Google Maps isn't configured or a provider fails, the app offers its community mapping option. See the [Google Maps setup guide](docs/GOOGLE_MAPS_DEMO_SETUP.md).

## A quick walkthrough

For a short demonstration of the finished app:

1. **Scan:** upload a photo of a bottle, can, phone, cardboard item, or another everyday object. Review the identified item and suggested next step.
2. **Local rules:** choose an available school or business profile to see whether that item has source-backed collection guidance. If recognition is wrong, use the correction control.
3. **Find a Place:** search a five-digit ZIP code to explore nearby possible drop-off sites on the map.
4. **Bottle Returns:** enter the state, container details, and quantity to see an estimated return value and its official rule source.
5. **Bottle Journey:** scroll through the interactive story and take the quiz.
6. **Waste Audit:** count several real items, inspect the breakdown chart, and export or save an audit.
7. **Progress:** sign in to revisit scans, record what you did with an item, and see your badges and XP on the Leaderboard.

For kiosk demonstrations, use **full-screen browser mode** and a comfortable screen or browser zoom level. The app does not require a separate kiosk mode.

## Privacy, accuracy, and responsible use

WasteLens is an **educational decision-support tool**, not a guarantee that a specific item will be accepted or recycled.

- **AI results are suggestions.** Photo identification can be mistaken; disposal instructions should be checked against the actual collection program, especially for batteries, electronics, chemicals, or other potentially hazardous items.
- **Local rules are program-specific.** A school, store, or city being listed does not prove that its bins accept every item or that a particular drop-off service is operating today. If the application cannot confirm an item-level rule, it should not present one as certain.
- **Maps show potential locations.** Listing a facility does not verify material acceptance, opening hours, or access conditions. Confirm details before visiting.
- **Photos and saved records are treated differently.** Photos are sent to Gemini when analysis is requested; the backend does not save raw uploaded photos. Signed-in users' text analyses, feedback, and activity are stored in a local SQLite database.
- **Gamification is not an impact measurement.** Scan counts, XP, and self-reported actions do not constitute verified waste diversion or measured CO₂ savings.
- **Local setup is not a production deployment.** Public hosting requires additional operational safeguards such as HTTPS, rate limiting, quota management, backups, and appropriate account/privacy policies.

Do not upload photos containing sensitive personal information. Third-party APIs are subject to their own service terms and usage limits.

## Project documentation

More detailed explanations and references are available in the repository:

- [Texas school, office, and business collection guidance](docs/TEXAS_DEMO_RULES.md)
- [Local recycling policy coverage](docs/NATIONAL_LOCAL_RULES.md)
- [Bottle Journey research and photo sources](docs/BOTTLE_DOCUMENTARY_SOURCES.md)
- [Waste Audit measurement approach](docs/WASTE_AUDIT_MEASUREMENT.md)
- [Scanner safety and evaluation](docs/SCANNER_SAFETY.md)
- [Google Maps setup](docs/GOOGLE_MAPS_DEMO_SETUP.md)

## Run the tests

From the repository root, with the Python environment and frontend dependencies installed:

```bash
python -m pytest -q backend/tests
cd frontend
npm run build
```

Automated tests check application behavior with controlled provider responses. A real end-to-end demonstration still requires valid external API access and browser permissions.

---

**WasteLens — Before you toss it, scan it.**

*The goal is not just to recognize waste. It is to help someone make a more informed choice about what happens next.*

## License

This project is licensed under the [MIT License](LICENSE). Third-party datasets, maps, images, fonts, and services are subject to their respective licenses and terms.
