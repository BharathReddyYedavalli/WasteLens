import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const css=src("station-polish.css");
const main=src("main.tsx");
const app=src("App.tsx");

test("station polish loads last and does not introduce a separate mode",()=>{
  assert.ok(main.indexOf('import "./station-polish.css";')>main.indexOf('import "./station-home.css";'));
  assert.doesNotMatch(app,/KioskScreen|kioskMode|KioskSetup/);
  assert.match(css,/No new mode, no altered scan behavior/);
});
test("Scan decoration can no longer overlap the welcome copy",()=>{
  assert.match(css,/main\.shell:has\(> \.intro\)> \.intro \.intro-art\s*\{\s*display:none!important;/s);
  assert.match(css,/main\.shell:has\(> \.intro\)> \.intro h1\s*\{[^}]*max-width:100%!important/s);
  assert.match(css,/main\.shell:has\(> \.intro\)> \.intro p\s*\{[^}]*max-width:100%!important/s);
});
test("Camera gets more room on desktop without altering mobile stack",()=>{
  assert.match(css,/@media\(min-width:1101px\)/);
  assert.match(css,/min-height:clamp\(550px,calc\(100dvh - 270px\),710px\)/);
  assert.match(css,/grid-template-rows:minmax\(320px,1fr\) auto/);
  assert.match(css,/height:clamp\(335px,40vh,440px\)!important/);
  assert.match(css,/@media\(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
});
test("Other pages retain their components but share consistent card and controls styles",()=>{
  for(const feature of ["<AuditKit","<AccountArea","<BottleJourney","<BottleReturns",
    "<Leaderboard","<RecyclingResults","<ScanStepTools","<LocalRulesGuide","<AskWasteLens"]) {
    assert.ok(app.includes(feature),feature);
  }
  for(const c of [".assistant-card",".finder-card",".account-card",".history-card",
    ".deposit-form-card",".league-ranking",".audit-session",".community-chart-card"]) {
    assert.ok(css.includes(c),c);
  }
  assert.match(css,/\.assistant-composer textarea/);
  assert.match(css,/\.deposit-page \.deposit-fields/);
});
test("Themes, focus, reduced motion and printing are preserved",()=>{
  assert.match(css,/:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(css,/var\(--wl-stroke\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media print/);
  assert.doesNotMatch(css,/\.site \.community-navigation\s*\{[^}]*display:none/s);
});
