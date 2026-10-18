# WasteLens — AI Waste Identifier

WasteLens is a **camera-first, experimental** web app for recognizing household objects and offering **item-specific** reuse and disposal suggestions. It uses the **Google Gemini API's free tier** for a first prototype rather than the original Garbage-Crew MobileNet/YOLO models. Those experiments are preserved in earlier branches.

The app has Poppins typography, a minimal green/white camera interface, and four possible stages: **photo → AI object identification → tailored reuse/disposal guidance → optional search for potential collection facilities**.

> **Current status:** Backend/frontend and mocked automated tests are implemented. Actual Google Gemini image calls require a personal API key, and have **not yet been end-to-end tested** against live images on this branch. This is not a certified recycling decision system.

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
3. Start backend:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
   ```
   Keep this terminal running; verify http://127.0.0.1:8000/api/ai/status returns `"configured": true`.
4. In a **second PowerShell window**, start frontend:
   ```powershell
   cd C:\Users\bhara\WasteLens\frontend
   npm install
   npm run dev
   ```
5. Open the exact local URL displayed by Vite. Take or upload a photo, optionally describe the target object, and click **Identify with AI**.

## API endpoints

- `GET /api/health` — backend readiness
- `GET /api/ai/status` — public supported model list and key-present flag (never the actual key)
- `POST /api/ai/analyze` — photo JPG/PNG/WebP <= 8 MB, `model_id` and optional `object_hint`, returns structured item assessment.

Current free-tier model options: `gemini-3.8-flash` (default) and `gemini-3.5-flash-lite` (comparison). Google's account-specific free tier limits change; check https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/rate-limits before relying on free usage.

## User privacy / limits

- Photos are transmitted to Google only when the user explicitly requests AI analysis; no app-side photo history or account storage is implemented.
- **Google's free API tier may use prompts and uploaded images to improve its products.** Do not submit faces, addresses, identification documents or sensitive photos during testing.
- The API key stays **server-side** in `.env`; `.env` is git-ignored. Do not publicly deploy this proxy without authentication, rate limiting, and quota/abuse controls.
- This prototype does **not** identify recycling symbols or hidden materials with certainty, and it may misidentify objects. The app asks clarifying questions when needed.
- Generated reuse/disposal text is **AI-suggested, not independently verified**, so confirm anything involving batteries, chemicals, sharp items, compost, or electrical components against local official guidance.
- Collection search links open Google Maps for **potential** facilities, not verified locations accepting that item. There is no live local acceptance integration yet.
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
