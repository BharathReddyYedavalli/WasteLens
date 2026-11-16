# Deploy a public WasteLens demo on Render

WasteLens has a FastAPI backend, a Vite/React frontend, and local SQLite storage.
The root `Dockerfile` builds the React app and serves it **from the same origin**
as the API. This preserves relative `/api` requests and session cookies without
cross-origin proxy configuration.

## Before you deploy

- Make sure `main` passes GitHub Actions.
- Use your **own** Gemini API key. Never put it in a source file, README,
  issue, screenshot, or GitHub repository.
- Set a small Gemini usage budget/quotas. A public scanner allows visitors
  to trigger API calls and may incur charges.
- **Free Render is a temporary demo, not durable hosting.** Free instances
  can spin down and their filesystem is ephemeral. SQLite accounts, history,
  scans, badges, and audits can disappear after a restart/redeployment.
  Do not invite real users to depend on saved data in a free demo.
- Do not set up a real administrator account on a disposable demo unless
  needed. Never use a personal password as a demo credential.

## Deploy from GitHub

1. Go to https://dashboard.render.com and connect your GitHub account.
2. Choose **New > Blueprint**, select `BharathReddyYedavalli/WasteLens`,
   and let Render read the root `render.yaml`. Alternatively, choose
   **New > Web Service**, select the repo, set the language to **Docker**,
   use the root `Dockerfile`, and set the health check to `/api/health`.
3. In Render's environment-variable form, set `GEMINI_API_KEY` privately
   to your own key. `WASTELENS_COOKIE_SECURE=1` is already configured for HTTPS.
4. Review the selected plan and any estimated charges before starting.
   Choose the Free plan for short-lived demonstrations where ephemeral
   accounts/data are acceptable.
5. Start deployment. Wait for a successful build and health check.
   Render generates a unique HTTPS `onrender.com` URL; do not guess it.
6. Open your generated URL and confirm:
   - The WasteLens homepage and navigation load.
   - `/api/health` returns an `ok` response.
   - A test JPG/PNG/WebP upload produces an AI response.
   - Ask WasteLens, local rules, map, quiz, and Waste Audit load.
   - A temporary signup/sign-in works over HTTPS.
   - The browser console has no failed `/api` requests.
7. Capture a screenshot of the actual app with its final UI, and add it
   to the repository (for example, `docs/images/wastelens-home.png`).
   Add the real screenshot and verified live demo link to `README.md`.
8. Use the verified HTTPS demo URL when submitting to Hack Club and
   when adding the project to the `hackclub/capitol` gallery.

## Run the deployment container locally

From the repository root, if Docker is installed:

```bash
docker build -t wastelens-demo .
docker run --rm -p 10000:10000 --env-file /path/to/private/wastelens.env wastelens-demo
```

Visit http://localhost:10000 and http://localhost:10000/api/health.
Create the private env file with a `GEMINI_API_KEY=...` line, keep it outside
source control, and protect its permissions. Do not commit or share it.

## Longer-lived deployment

For real users, use persistent storage for SQLite (or migrate to a managed
database), HTTPS, API rate limiting, quotas, an appropriate privacy policy,
monitoring, and backups. Render Free instances cannot attach persistent disks.
The demo-oriented configuration does **not** make WasteLens production-ready.

Reference: https://render.com/docs/docker and https://render.com/docs/free
