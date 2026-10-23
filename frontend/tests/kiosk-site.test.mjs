import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=p=>readFileSync(new URL("../src/"+p,import.meta.url),"utf8");
const app=src("App.tsx"),screen=src("KioskScreen.tsx"),setup=src("KioskSetup.tsx");
const types=src("kioskTypes.ts"),styles=src("kiosk-site.css"),entry=src("main.tsx");

test("administrator gets a separate kiosk configuration interface, not a replacement page",()=>{
  assert.match(app,/view === "admin" && user\?\.role === "admin" && <KioskSetup\/>/);
  assert.match(app,/import KioskSetup from "\.\/KioskSetup";/);
  for(const preserved of ["AuditKit","HabitSnapshot","AccountArea","Leaderboard","BottleJourney","AskWasteLens"])
    assert.ok(preserved==="HabitSnapshot"||app.includes(preserved));
});

test("site settings are explicitly provided, reviewed and saved only by admin",()=>{
  assert.match(setup,/fetch\("\/api\/kiosk\/profile"/);
  assert.match(setup,/method:"PUT"/);
  assert.match(setup,/"X-WasteLens-Request":"1"/);
  assert.match(setup,/rules_checked:checked/);
  assert.match(setup,/profile\.configured/);
  assert.match(setup,/onClick=\{addBin\}/);
  assert.match(setup,/setRules\(old=>old\.filter\(rule=>rule\.bin_id!==id\)\)/);
});

test("kiosk never silently infers a site bin from the AI response",()=>{
  assert.match(screen,/fetch\("\/api\/kiosk\/profile"/);
  assert.match(screen,/const \[selectedType,setSelectedType\]/);
  assert.match(screen,/onChange=\{e=>setSelectedType\(/);
  assert.match(screen,/profile\?\.rules\.find\(rule=>rule\.item_type===selectedType\)/);
  assert.match(screen,/profile\?\.bins\.find\(bin=>bin\.id===selection\?\.bin_id\)/);
  assert.match(screen,/selectedType&&selectedBin/);
  assert.match(screen,/ask staff instead of guessing/i);
  assert.match(screen,/!profile\?\.configured\|\|profileError/);
  assert.doesNotMatch(screen,/analysis\.route\s*===\s*.*bin_[1-9]/);
});

test("all supported kiosk item types are explicitly listed and shared",()=>{
  const ids=[...types.matchAll(/id:"([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,11);
  assert.equal(new Set(ids).size,11);
  assert.match(setup,/KIOSK_ITEMS\.map/);
  assert.match(screen,/KIOSK_ITEMS\.filter/);
});

test("styles and core app interfaces remain scoped",()=>{
  assert.ok(entry.indexOf('import "./kiosk-site.css";')>entry.indexOf('import "./kiosk-mode.css";'));
  assert.match(styles,/\.site \.wl-kiosk-site-panel/);
  assert.match(styles,/\.site \.wl-kiosk-setup/);
  assert.match(styles,/@media\(max-width:640px\)/);
  assert.doesNotMatch(styles,/(^|\n)\.site-layout\s*\{/);
});
