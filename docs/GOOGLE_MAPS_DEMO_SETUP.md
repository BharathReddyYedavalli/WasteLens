# Google Maps (demo key) — optional WasteLens Finder

WasteLens defaults to its original Leaflet/OpenStreetMap Finder. The Google Maps
upgrade is optional and requires **no change to the existing Gemini key**.

## Enable on your Mac or Windows desktop

1. Obtain a Google Maps Demo Key at https://developers.google.com/maps/documentation/javascript/demo-key
2. Create **frontend/.env.local** in the root of the `frontend` folder:

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=YOUR_OWN_DEMO_KEY
   ```

3. Start/restart the backend (FastAPI) and frontend (Vite). Vite only picks up
   changes to `.env.local` after a restart.
4. Open **Find a Place**, enter a five-digit US ZIP such as `75033`, and
   search. Google Maps and Google Places (New) should display up to 20 nearby
   recycling-related listings with clickable pins and links to Google Maps.
5. Test a different ZIP, clicking a place card and then its marker. Click
   **Use community map instead** to switch to the existing Leaflet/OSM Finder.

## What happens when the Google demo quota is exhausted?

The Google demo key supports Maps JavaScript and limited Places API (New)
features, with usage caps. When Google cannot load, search fails, or returns
no results, WasteLens switches back to its existing Leaflet/OpenStreetMap map,
still using the same ZIP center and collection-location discovery.

Google's key is **never checked in**. The repository ignores `.env.*` files,
including `frontend/.env.local`.

## Safety and limitations

- Google Places results describe potential recycling locations. A result does
  **not** establish that a location takes the scanned item, is open now, or
  accepts a student/visitor. Check the provider's current rules.
- Google Maps is loaded **only** for the Finder when you provide a key; no key
  preserves the existing community Finder.
- The browser downloads the public Google Maps JavaScript API. A Vite `VITE_`
  variable is **visible in browser requests**. Use the Google Cloud Console
  to restrict the key to intended site origins and Maps JavaScript / Places
  APIs where available. This is not a server secret.
- The demo key is for testing and prototyping, **not production hosting**.
  Google Maps/Places use is subject to Google's Maps terms and usage limits.
- When moving to production, set up standard billing, quotas, and API key
  restrictions first. Billing alerts alone are not a guaranteed hard cap.

Official documentation:
- https://developers.google.com/maps/documentation/javascript/demo-key
- https://developers.google.com/maps/documentation/javascript/place-search
- https://developers.google.com/maps/documentation/javascript/advanced-markers/migration
