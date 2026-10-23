import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const app=src("App.tsx");
const kiosk=src("KioskScreen.tsx");
const entry=src("main.tsx");
const styles=src("kiosk-mode.css");
const translations=src("i18n.tsx");

test("kiosk is optional and the original site pages stay available",()=>{
  assert.match(app,/kioskMode \?[\s\S]*?<KioskScreen/);
  for(const component of ["AuditKit","AccountArea","Leaderboard","BottleJourney","BottleReturns","RecyclingResults","AskWasteLens"])
    assert.ok(app.includes(component),component);
  assert.match(app,/t\("Exit kiosk"\)/);
  assert.match(app,/t\("Kiosk Mode"\)/);
});
test("shared device mode signs out before entering and hides account UI",()=>{
  assert.match(app,/if \(user\) \{/);
  assert.match(app,/\/api\/auth\/logout/);
  assert.match(app,/setUser\(null\)/);
  assert.match(app,/!kioskMode&&<AccountMenu/);
  assert.match(app,/!kioskMode && <aside/);
  assert.match(app,/kioskMode\) scanForm\.append\("kiosk_mode", "true"\)/);
});
test("kiosk uses same camera and analysis flow with a clear manual screen reset",()=>{
  assert.match(kiosk,/onStartCamera/);
  assert.match(kiosk,/onCapture/);
  assert.match(kiosk,/onUpload/);
  assert.match(kiosk,/onAnalyze/);
  assert.match(kiosk,/onNextItem/);
  assert.match(app,/function nextKioskItem\(\) \{\s*reset\(\);\s*setLocation\(""\)/);
  assert.match(app,/function reset\(\) \{\s*scanRequestRef\.current\?\.abort\(\)/);
  assert.match(app,/URL\.revokeObjectURL/);
});
test("kiosk doesn't falsely claim verified bin sorting",()=>{
  assert.match(kiosk,/needs_identification/);
  assert.match(kiosk,/AI suggestion, not a confirmed local bin rule/);
  assert.match(kiosk,/This kiosk does not yet have verified rules for your school or office/);
  assert.match(kiosk,/<LocalRulesGuide /);
  assert.match(kiosk,/ReadAloudButton/);
  assert.match(kiosk,/Photos are sent to Google Gemini/);
});
test("kiosk styling is isolated and alternative themes remain supported",()=>{
  assert.ok(entry.indexOf('import "./kiosk-mode.css";')>entry.indexOf('import "./kiosk-presentation.css";'));
  assert.match(styles,/\.site\.wl-kiosk-active/);
  assert.match(styles,/@media\(max-width:650px\)/);
  assert.match(styles,/:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(styles,/focus-visible/);
});
test("kiosk alone overrides legacy forced sidebar grid and full-width shell",()=>{
  const legacy=src("layout-cleanup.css");
  assert.match(legacy,/grid-template-columns:256px minmax\(0,1fr\)!important/);
  assert.match(legacy,/\.site-layout main\.shell\{width:min\(1160px,calc\(100% - 56px\)\)!important/);
  assert.match(styles,/\.site\.wl-kiosk-active \.site-layout\s*\{[^}]*display:block!important;[^}]*grid-template-columns:none!important/s);
  assert.match(styles,/\.site\.wl-kiosk-active \.site-layout>\.page-content\s*\{[^}]*width:100%!important/s);
  assert.match(styles,/\.site\.wl-kiosk-active \.site-layout main\.wl-kiosk-shell\s*\{[^}]*width:min\(900px,calc\(100% - 28px\)\)!important/s);
  assert.doesNotMatch(styles,/(^|\n)\.site-layout\s*\{/);
});
test("major new labels have Spanish and Hindi versions",()=>{
  for(const key of ["Kiosk Mode","Exit kiosk","Where does this go?","Next item — clear screen",
    "This kiosk does not yet have verified rules for your school or office. Confirm the correct bin with staff."])
    assert.ok(translations.includes(JSON.stringify(key)+":"),key);
});
