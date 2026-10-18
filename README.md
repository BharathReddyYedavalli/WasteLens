# WasteLens — AI Waste Identifier

WasteLens is a **camera-first, experimental** web app for recognizing household objects and offering **item-specific** reuse and disposal suggestions. It uses the **Google Gemini API's free tier** for a first prototype rather than the original Garbage-Crew MobileNet/YOLO models. Those experiments are preserved in earlier branches.

The app has Poppins typography, a minimal green/white camera interface, a left sidebar with AI Identifier / Ask WasteLens / Recycling Finder, and four possible stages: **photo → AI object identification → tailored reuse/disposal guidance → optional search for potential collection facilities**.

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

## Ask WasteLens — Scan-aware AI chatbot (new feature branch)

The **Ask WasteLens** sidebar tab runs on the existing Gemini API key through `POST /api/ai/chat`. It works for general waste questions without scanning first, but after a scan it also receives the **latest unverified scan summary**, enabling follow-ups such as "Can I recycle the cap?" or "How do I reuse this bottle?".

- Chats maintain up to 12 recent messages in the browser during the current page session; there is **no backend chat database**.
- Chat requests send question, limited message history and optional scan **metadata** to Gemini. The camera photo is **not resent** by the chat endpoint.
- A new scan resets the prior object's chat history. Use the Clear chat button to clear the current conversation.
- Suggestions are not verified local collection rules or professional hazardous-waste instructions. The assistant must ask for uncertain material details instead of inventing them.
- The **Recycling Finder** sidebar supports ZIP/city input and a material-specific Google Maps search link. It does **not** validate centers or embed live locations; call each facility to confirm acceptance.
- Tests exercise backend validation, scan context, history bounds, errors, and mocked chat replies; browser-based Gemini responses must still be tested manually.

### Windows update instructions

While on `feat/free-vision-ai`, verify `git status` first; then:
```powershell
git fetch origin
git switch --track origin/feat/ask-wastelens-chat
```
If `git switch --track` reports an existing local branch, use `git switch feat/ask-wastelens-chat` and `git pull --ff-only`.

Stop/restart both local backend and Vite frontend after changing branches. Your existing ignored root `.env` and Gemini API key are reused; no new key is needed. Confirm `GET /api/ai/status` still reports `configured: true` before testing the chat.

Do **not** use this unauthenticated API endpoint on a publicly reachable server without a user identity, rate limiting, abuse protection and input logging/privacy policies appropriate to the product.
