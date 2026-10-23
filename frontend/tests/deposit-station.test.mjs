import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src=(name)=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const entry=src("main.tsx");
const css=src("deposit-station.css");
const bottle=src("BottleReturns.tsx");

test("Bottle Returns refinement loads last and is presentation only",()=>{
  assert.ok(entry.indexOf('import "./deposit-station.css";')>entry.indexOf('import "./station-polish.css";'));
  assert.match(css,/Presentation only\. No changes to fields, state rules, math, warnings, or links/);
  assert.doesNotMatch(css,/display:\s*none!important[^}]*deposit-layout/s);
});

test("short header and disclaimer reveal the calculator earlier",()=>{
  assert.match(css,/\.site \.deposit-page \.deposit-top\s*\{[^}]*min-height:128px/s);
  assert.match(css,/\.site \.deposit-page \.deposit-callout\s*\{[^}]*margin:11px 0 15px/s);
  assert.match(css,/\.site \.deposit-page \.deposit-layout\s*\{[^}]*grid-template-columns:minmax\(0,1\.12fr\) minmax\(320px,\.88fr\)/s);
  assert.match(css,/\.site \.deposit-page \.deposit-result\s*\{[^}]*position:sticky/s);
  assert.match(css,/calc\(var\(--wl-topbar-height,76px\) \+ 16px\)/);
});

test("calculations, eligibility warnings and official state sources remain visible",()=>{
  for(const name of ["Where was it purchased?","What's inside?","Container type",
    "Size in fluid ounces","Number of containers","Was the deposit paid in that state?",
    "Read the official state rules","Calculation & state details"]) {
    assert.ok(bottle.includes(name),name);
  }
  assert.match(bottle,/fetch\("\/api\/deposit\/calculate"/);
  assert.match(bottle,/result\.reason/);
  assert.match(bottle,/result\.state_tip/);
  assert.match(bottle,/result\.source_url/);
  assert.match(bottle,/Refund eligibility depends on where the deposit was paid/);
});

test("touch controls, alternate themes and natural small-screen scrolling remain",()=>{
  assert.match(css,/min-height:50px/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:580px\)/);
  assert.match(css,/@media\(max-width:375px\)/);
  assert.match(css,/@media print/);
  assert.match(css,/position:static/);
  assert.doesNotMatch(css,/\.deposit-result\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(css,/\.deposit-fields\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(css,/background(?:-color)?:\s*#[a-f0-9]{3,8}!important/i);
});
