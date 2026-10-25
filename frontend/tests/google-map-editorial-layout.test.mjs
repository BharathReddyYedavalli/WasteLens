import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = path => readFileSync(new URL("../src/" + path, import.meta.url), "utf8");
const finder = src("GooglePlacesFinder.tsx");
const css = src("google-map-polish.css");
const entry = readFileSync(new URL("../public/claude-theme.css",import.meta.url),"utf8");

test("Google finder selection uses the results list, not obscuring map popups", () => {
  assert.match(finder, /marker\.addListener\("click"/);
  assert.match(finder, /setSelected\(place\.id\)/);
  assert.match(finder, /mapRef\.current\.panTo\(place\.location\)/);
  assert.match(finder, /entriesRef\.current\.get\(selected\)/);
  assert.doesNotMatch(finder, /new InfoWindow\(/);
  assert.doesNotMatch(finder, /infoRef\.current\.open\(/);
});

test("safety guidance and community fallback remain separate accessible actions", () => {
  assert.match(finder, /className="google-map-footer"/);
  assert.match(finder, /className="google-map-caution"/);
  assert.match(finder, /className="google-map-fallback"/);
  assert.match(finder, /onClick=\{onFallback\}/);
  assert.match(finder, /These places may not accept your specific item/);
  assert.match(finder, /role="region" tabIndex=\{0\}/);
  assert.match(finder, /View on Google Maps/);
});

test("Google-only CSS overrides legacy fixed-height map while preserving responsive layout", () => {
  assert.match(css, /\.google-places-shell \.map-explorer/);
  assert.match(css, /height:auto!important/);
  assert.match(css, /\.google-places-shell \.facility-side-panel/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /\.google-places-shell \.google-map-footer/);
  assert.match(css, /position:static!important/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.ok(entry.indexOf('/* --- frontend/src/google-map-polish.css --- */') >
    entry.indexOf('/* --- frontend/src/editorial.css --- */'));
});
