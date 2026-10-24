import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../src/"+path,import.meta.url),"utf8");
const entry=read("main.tsx");
const css=read("kiosk-first-refresh.css");
const app=read("App.tsx");
const stage=read("scan/ScanStage.tsx");
const nav=read("shell/SidebarNav.tsx");
const menu=read("AccountMenu.tsx");

test("kiosk presentation stylesheet is loaded after existing visual layers",()=>{
  assert.ok(entry.includes('import "./kiosk-first-refresh.css";'));
  assert.ok(entry.indexOf('import "./kiosk-first-refresh.css";') >
    entry.indexOf('import "./kiosk-visual-polish.css";'));
  assert.ok(entry.indexOf('import "./kiosk-first-refresh.css";') >
    entry.indexOf('import "./texas-demo-rules.css";'));
});

test("all existing pages, scan actions and account/admin entry points remain in source",()=>{
  for(const label of ['Scan','Ask','Bottle journey','Find a place','Bottle returns',
    'Waste audit','My activity','Leaderboard']){
    assert.ok(nav.includes('label: "'+label+'"'),label);
  }
  assert.match(nav,/t\("About"\)/);
  assert.doesNotMatch(nav,/navigate\("admin"\)/);
  assert.match(menu,/onClick=\{\(\) => navigate\("admin"\)\}/);
  assert.match(stage,/onClick=\{onScan\}/);
  assert.match(stage,/onClick=\{onChoosePhoto\}/);
  assert.match(stage,/ref=\{canvasRef\}/);
  assert.match(app,/onClick=\{capture\}/);
  assert.match(app,/onClick=\{\(\) => void analyze\(\)\}/);
  assert.match(app,/<LocalRulesGuide /);
  assert.match(app,/<RecyclingResults /);
  assert.match(app,/<AuditKit /);
});

test("station controls are bigger while their real click targets are untouched",()=>{
  assert.match(css,/\.site\.is-sidebar-experiment\.is-stage \.es-cta\{/);
  assert.match(css,/min-height:82px!important/);
  assert.match(css,/\.site\.is-sidebar-experiment \.fl-side-link\{/);
  assert.match(css,/min-height:56px!important/);
  assert.match(css,/\.site\.is-sidebar-experiment main #scan-local-rules>summary/);
  assert.match(css,/\.site\.is-classic-page main \.finder-form input/);
  assert.match(css,/\.site\.is-classic-page main \.audit-option/);
  assert.match(css,/\.site\.is-classic-page main \.assistant-composer textarea/);
  assert.match(css,/\.site\.is-classic-page main \.deposit-result \.deposit-amount/);
  assert.match(css,/\.site\.is-classic-page main \.location-card/);
  assert.match(css,/\.site\.is-classic-page main \.journey-quiz-card/);
});

test("styling does not hide pages, replace interactions or force kiosk-only behavior",()=>{
  assert.doesNotMatch(css,/display:\s*none\s*!important/i);
  assert.doesNotMatch(css,/pointer-events:\s*none/i);
  assert.doesNotMatch(css,/position:\s*fixed\s*!important/i);
  assert.match(css,/@media\(max-width:960px\)/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(max-height:790px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/:focus-visible/);
});
