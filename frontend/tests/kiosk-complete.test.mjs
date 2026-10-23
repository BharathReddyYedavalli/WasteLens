import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL("../src/"+file,import.meta.url),"utf8");
const kiosk=read("KioskScreen.tsx");
const idle=read("useKioskIdleReset.ts");
const copy=read("kioskCopy.ts");
const app=read("App.tsx");
const css=read("kiosk-mode.css");

test("kiosk supports photo scan or a complete on-device item search",()=>{
  assert.match(kiosk,/role="tablist"/);
  assert.match(kiosk,/onClick=\{\(\)=>switchMode\("scan"\)\}/);
  assert.match(kiosk,/onClick=\{\(\)=>switchMode\("search"\)\}/);
  assert.match(kiosk,/type="search"/);
  assert.match(kiosk,/ITEM_SYNONYMS\[item.id\]/);
  assert.match(kiosk,/matchingItems\.map\(item=>/);
  assert.match(kiosk,/setSelectedType\(item.id\)/);
  assert.match(kiosk,/KIOSK_ITEMS\.map\(item=>/);
  assert.match(copy,/food_scraps:/);
  assert.match(copy,/plastic_cutlery:/);
  assert.doesNotMatch(copy,/fetch\(|google\.generativeai/i);
});
test("actual site bins come from staff rules, with safe unmatched and unavailable states",()=>{
  assert.match(kiosk,/fetch\("\/api\/kiosk\/profile"/);
  assert.match(kiosk,/profile\?\.rules\.find\(rule=>rule\.item_type===selectedType\)/);
  assert.match(kiosk,/profile\?\.bins\.find\(bin=>bin\.id===selection\?\.bin_id\)/);
  assert.match(kiosk,/selectedType&&selectedBin/);
  assert.match(kiosk,/selectedType&&!selectedBin/);
  assert.match(kiosk,/No confirmed bin for this item/);
  assert.match(kiosk,/!profile\?\.configured\|\|profileError/);
  assert.match(kiosk,/setProfileReload\(n=>n\+1\)/);
});
test("shared kiosk clears old search and scanner data; never adds a saved-scan button",()=>{
  assert.match(kiosk,/function clearSession\(\)\s*\{[\s\S]*?setMode\("scan"\);[\s\S]*?setQuery\(""\);/);
  assert.match(kiosk,/onNextItem\(\)/);
  assert.match(kiosk,/function switchMode/);
  assert.match(kiosk,/onStopCamera\(\)/);
  assert.match(app,/function reset\(\)\s*\{\s*scanRequestRef\.current\?\.abort\(\)/);
  assert.match(app,/URL\.revokeObjectURL\(/);
  assert.match(app,/kioskMode\) scanForm\.append\("kiosk_mode", "true"\)/);
  assert.doesNotMatch(kiosk,/\/api\/scans\//);
});
test("idle warning and automatic reset work only inside the kiosk lifecycle",()=>{
  assert.match(kiosk,/useKioskIdleReset\(clearSession\)/);
  assert.match(idle,/KIOSK_IDLE_MS=120_000/);
  assert.match(idle,/KIOSK_WARNING_MS=20_000/);
  assert.match(idle,/setTimeout\(\(\)=>setWarning\(true\),KIOSK_IDLE_MS-KIOSK_WARNING_MS\)/);
  assert.match(idle,/reset\.current\(\)/);
  assert.match(idle,/visibilitychange/);
  assert.match(idle,/clearTimeout\(warningTimer\)/);
  assert.match(idle,/clearTimeout\(resetTimer\)/);
  assert.match(kiosk,/onClick=\{extendSession\}/);
  assert.match(kiosk,/onClick=\{clearSession\}/);
  assert.doesNotMatch(idle,/localStorage|sessionStorage/);
});
test("new CSS stays scoped to kiosk; all usual website routes remain present",()=>{
  assert.match(css,/\.site\.wl-kiosk-active \.wl-kiosk-tabs/);
  assert.match(css,/\.site\.wl-kiosk-active \.wl-kiosk-finder/);
  assert.match(css,/\.site\.wl-kiosk-active \.wl-kiosk-timeout/);
  assert.match(css,/@media\(max-width:460px\)/);
  for(const item of ["AuditKit","AccountArea","Leaderboard","BottleJourney","BottleReturns","RecyclingResults","AskWasteLens"])
    assert.ok(app.includes(item),item);
});
test("new kiosk text is translated independently of the website language table",()=>{
  assert.match(copy,/import type \{ Language \} from "\.\/i18n"/);
  for(const label of ["Scan with camera","Find an item","No matching items","Done — next person","Stay here"])
    assert.ok(copy.includes(JSON.stringify(label)),label);
  assert.match(kiosk,/kioskCopy\(language,text\)/);
});
