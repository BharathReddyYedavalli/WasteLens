import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const css = read("kiosk-visual-polish.css");
const entry = readFileSync(new URL("../public/claude-theme.css",import.meta.url),"utf8");
const app = read("App.tsx");

test("high-priority polish loads after the original-page and Google Finder fixes",()=>{
  assert.ok(entry.indexOf('/* --- frontend/src/kiosk-visual-polish.css --- */') >
    entry.indexOf('/* --- frontend/src/sidebar-editorial.css --- */'));
  assert.ok(entry.indexOf('/* --- frontend/src/kiosk-visual-polish.css --- */') >
    entry.indexOf('/* --- frontend/src/google-map-polish.css --- */'));
});
test("solid dark cards receive independently legible headings, body, and links",()=>{
  assert.match(css,/\.deposit-result h2\s*\{/);
  assert.match(css,/\.deposit-result>p\s*\{/);
  assert.match(css,/\.deposit-result \.deposit-official\s*\{/);
  assert.match(css,/\.deposit-result \.deposit-amount\s*\{/);
  assert.match(css,/\.community-about-hero h1\s*\{/);
  assert.match(css,/\.community-about-hero>p\s*\{/);
  assert.match(css,/color:\s*#fff!important/);
  assert.match(css,/color:\s*#e6f1ed!important/);
});
test("original route components and the real 3D Scan remain present",()=>{
  for(const view of ["<ScanStage","<AuditKit","<BottleReturns","<BottleJourney",
    "<RecyclingResults","<AskWasteLens","<AccountArea","<Leaderboard"]) {
    assert.ok(app.includes(view),view);
  }
  assert.match(css,/\.community-about-grid\s*\{/);
  assert.match(css,/\.assistant-composer\s*\{/);
  assert.match(css,/\.audit-options\s*\{/);
  assert.match(css,/\.google-places-shell\s*\{/);
  assert.match(css,/\.account-card:has\(\.auth-form\)/);
});
test("responsive layout, touch targets and reduced motion remain supported",()=>{
  assert.match(css,/@media\(max-width:1200px\)/);
  assert.match(css,/@media\(max-width:960px\)/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /:focus-visible/);
});
