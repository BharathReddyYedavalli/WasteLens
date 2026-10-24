import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const file = name => readFileSync(new URL("../src/" + name,import.meta.url),"utf8");
const app = file("App.tsx");
const side = file("shell/SidebarNav.tsx");
const css = file("sidebar-editorial.css");
const editorial = file("editorial.css");
const entry = file("main.tsx");

test("the left sidebar directly exposes every original page without a More panel",()=>{
  for(const label of ["Scan","Ask","Bottle journey","Find a place","Bottle returns",
    "Waste audit","My activity","Leaderboard","About"]) {
    assert.ok(side.includes('label: "'+label+'"') || side.includes('t("'+label+'")'),label);
  }
  assert.doesNotMatch(side,/navigate\("admin"\)/);
  assert.doesNotMatch(side,/t\("Admin"\)/);
  assert.doesNotMatch(side,/tn-more|tn-panel|More menu/);
  assert.match(app,/<SidebarNav view=\{view\}/);
  assert.doesNotMatch(app,/<TopNav/);
});
test("original page components and Google Finder integrations are kept",()=>{
  for (const component of ["<ScanStage","<RecyclingResults","<AuditKit",
    "<BottleJourney","<BottleReturns","<AccountArea","<Leaderboard","<LocalRulesGuide"]) {
    assert.ok(app.includes(component),component);
  }
  assert.match(app,/hasGoogleMapsKey/);
  assert.match(app,/\/api\/facilities\/center/);
  assert.match(editorial,/approved prototype/i);
  assert.doesNotMatch(editorial,/kill decorative surfaces, heroes/);
});
test("sidebar scales down to a mobile drawer and keeps page grids untouched",()=>{
  assert.match(css,/\.fl-sidebar/);
  assert.match(css,/@media\(max-width:960px\)/);
  assert.match(css,/\.fl-side-backdrop/);
  assert.match(css,/\.is-classic-page/);
  assert.match(css,/\.google-places-shell/);
  assert.match(css,/prefers-reduced-motion/);
  assert.ok(entry.indexOf('import "./sidebar-editorial.css";')>
    entry.indexOf('import "./google-map-polish.css";'));
});
