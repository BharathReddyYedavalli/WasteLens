import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
const entry = read("main.tsx");
const station = read("station-visual.css");
const app = read("App.tsx");

test("station appearance is a final, standalone stylesheet", () => {
  assert.ok(entry.indexOf('import "./station-visual.css";') >
    entry.indexOf('import "./kiosk-presentation.css";'));
  assert.match(station, /visual changes only, no behavior or route changes/);
  assert.match(station, /\.site \.site-layout main\.shell/);
  assert.match(station, /\.site \.site-layout main\.story-shell/);
});

test("station styling improves existing scanner without replacing it", () => {
  for (const cls of [".intro", ".workspace", ".camera-stage",
    ".camera-controls", ".scan-decision", ".community-mission-path"]) {
    assert.ok(station.includes(cls), cls);
  }
  for (const component of ["ScanStepTools", "LocalRulesGuide", "RecyclingResults",
    "AuditKit", "AccountArea", "BottleJourney", "BottleReturns", "AskWasteLens",
    "Leaderboard", "BadgeCelebration"]) {
    assert.ok(app.includes(component), component);
  }
  assert.match(app, /t\("Before you toss it, scan it\."\)/);
  assert.doesNotMatch(app, /KioskScreen|kioskMode|onEnterKioskMode/);
});

test("desktop nav and touch targets are larger, no feature is hidden", () => {
  assert.match(station, /grid-template-columns:272px minmax\(0,1fr\)!important/);
  assert.match(station, /\.community-navigation \.nav-item\s*\{[^}]*min-height:52px!important/s);
  assert.match(station, /\.camera-controls \.button\s*\{[^}]*min-height:57px!important/s);
  assert.doesNotMatch(station, /display:\s*none\s*!important\s*;?\s*\/\*\s*Hide (?:navigation|features)/i);
  assert.doesNotMatch(station, /\.community-nav-group[^\{]*\{[^}]*display:\s*none/s);
});

test("small screens, reduced motion, print and every existing theme remain supported", () => {
  assert.match(station, /@media\(max-width:900px\)/);
  assert.match(station, /@media\(max-width:620px\)/);
  assert.match(station, /@media\(max-width:385px\)/);
  assert.match(station, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(station, /@media print/);
  assert.match(station, /:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(station, /--wl-copy/);
  assert.match(station, /--wl-stroke/);
  assert.doesNotMatch(station, /\/themes\/|\.leaflet-/);
});
