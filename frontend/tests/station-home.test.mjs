import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const file=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const app=file("App.tsx");
const entry=file("main.tsx");
const css=file("station-home.css");

test("new scan layout is CSS-only and loads after existing styling",()=>{
  assert.ok(entry.indexOf('import "./station-home.css";')>entry.indexOf('import "./station-visual.css";'));
  assert.match(css,/visual-only Scan layout/);
  assert.match(css,/main\.shell:has\(> \.intro\)/);
  assert.match(css,/@media \(min-width:1101px\)/);
});

test("desktop hero and camera share the first row; existing links remain visible",()=>{
  assert.match(css,/grid-template-columns:minmax\(290px,\.82fr\) minmax\(0,1\.5fr\)/);
  assert.match(css,/>\s*\.intro\s*\{[^}]*grid-column:1;[^}]*grid-row:1;/s);
  assert.match(css,/>\s*\.community-mission-path\s*\{[^}]*grid-column:1;[^}]*grid-row:2;/s);
  assert.match(css,/>\s*\.workspace\s*\{[^}]*grid-column:2;[^}]*grid-row:1 \/ span 2;/s);
  assert.match(css,/\.workspace \.camera-stage\s*\{[^}]*height:clamp\(245px,25vw,312px\)!important/s);
  assert.match(css,/\.workspace \.camera-controls \.button\s*\{[^}]*min-height:60px!important/s);
});

test("full original site still owns scan and every other working tool",()=>{
  for(const source of ["<div className=\"intro\">","<div className=\"community-mission-path\"","<div className=\"workspace\">",
    "onClick={() => void startCamera()}","onClick={() => uploadRef.current?.click()}",
    "onClick={() => void analyze()}","<AuditKit","<AccountArea","<BottleJourney",
    "<BottleReturns","<Leaderboard","<RecyclingResults","<ScanStepTools","<LocalRulesGuide"]) {
    assert.ok(app.includes(source),source);
  }
  assert.doesNotMatch(app,/KioskScreen|KioskSetup|kioskMode/);
});

test("mobile, non-Scan pages and theme colors stay protected",()=>{
  assert.match(css,/@media\(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(css,/:root\[data-wl-theme="dark"\]/);
  assert.match(css,/@media print/);
  assert.doesNotMatch(css,/\.(?:audit-kit|habit-snapshot|documentary|bottle-journey)\s*\{/);
  assert.doesNotMatch(css,/\.camera-controls\s*\{[^}]*pointer-events:\s*none/s);
});
