import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src = f => readFileSync(new URL("../src/"+f, import.meta.url), "utf8");
const frontend = src("RecyclingResults.tsx");
const google = src("GooglePlacesFinder.tsx");
const loader = src("googleMapsLoader.ts");
const app = src("App.tsx");
const osm = src("MapPanel.tsx");
const i18n = src("i18n.tsx");
const python = readFileSync(new URL("../../backend/app/places.py",import.meta.url),"utf8");

test("Map key is optional; no key uses the existing Leaflet/OSM finder",()=>{
  assert.match(frontend,/VITE_GOOGLE_MAPS_API_KEY/);
  assert.match(frontend,/if \(googleKey && !googleFailed\)/);
  assert.match(frontend,/<GooglePlacesFinder /);
  assert.match(frontend,/<MapPanel data=\{viewData\}/);
  assert.match(osm,/tile\.openstreetmap\.org/);
});
test("Google Places search and Google Map render real matches, not invented facilities",()=>{
  assert.match(google,/Place\.searchByText\(\{/);
  assert.match(google,/textQuery:"recycling centers"/);
  assert.match(google,/locationRestriction:bounds/);
  assert.match(google,/fields:\["id","displayName","formattedAddress","location","googleMapsURI","businessStatus"\]/);
  assert.match(google,/mapId:"DEMO_MAP_ID"/);
  assert.match(google,/AdvancedMarkerElement\(\{/);
  assert.match(google,/map\.fitBounds\(/);
  assert.match(google,/googleMapsURI/);
  assert.match(google,/if\(!matched\.length\|\|!container\.current\)\{onFallback\(\);return;\}/);
});
test("ZIP resolves without Overpass on Google, fetches it on fallback only",()=>{
  assert.match(app,/const endpoint = hasGoogleMapsKey \? "\/api\/facilities\/center" : "\/api\/facilities"/);
  assert.match(frontend,/fetch\("\/api\/facilities\?zip_code="/);
  assert.match(frontend,/if \(!googleKey \|\| !googleFailed \|\| !results\) return/);
  assert.match(python,/@router\.get\("\/facilities\/center"\)/);
  assert.match(python,/latitude, longitude, label = resolve_zip\(zip_code\)/);
});
test("Google API key is loaded at runtime, never checked into repository",()=>{
  assert.match(loader,/encodeURIComponent\(apiKey\)/);
  assert.match(loader,/https:\/\/maps\.googleapis\.com\/maps\/api\/js\?/);
  assert.match(loader,/const timeout = window\.setTimeout/);
  assert.match(loader,/pending = null/);
  assert.doesNotMatch(app,/AIza[0-9A-Za-z_-]+/);
  assert.doesNotMatch(loader,/AIza[0-9A-Za-z_-]+/);
});
test("Fallback and safety text have Spanish/Hindi translations",()=>{
  for(const label of ["Google Maps nearby recycling locations",
    "Finding nearby places…", "View on Google Maps",
    "Use community map instead", "Loading community locations…",
    "These places may not accept your specific item. Check with each location before visiting.",
    "Google Maps unavailable. Showing community map instead."]) {
    assert.ok(i18n.includes(JSON.stringify(label)+":"),label);
  }
  assert.match(google,/Check with each location before visiting/);
  assert.match(google,/onFallback/);
});
