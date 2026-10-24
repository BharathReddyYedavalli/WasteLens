import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../src/"+path,import.meta.url),"utf8");
const entry=read("main.tsx");
const css=read("kiosk-first-refresh.css");
const app=read("App.tsx");
const stage=read("scan/ScanStage.tsx");
const bottleScene=read("proto/bottle.ts");
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

test("whole bottle stays in view with responsive 3D camera rather than CSS canvas scaling",()=>{
  assert.match(bottleScene,/stationCameraDistance = 7\.9/);
  assert.match(bottleScene,/stationCameraTargetY = 0\.95/);
  assert.match(bottleScene,/distanceForDock/);
  assert.match(bottleScene,/camera\.position\.z = Math\.max\(/);
  assert.match(bottleScene,/camera\.updateProjectionMatrix\(\)/);
  assert.doesNotMatch(css,/\.es-canvas\s*\{[^}]*transform:\s*scale/i);
  assert.match(stage,/v\.copy\(a\.point\)\.applyMatrix4\(S\.group\.matrixWorld\)\.project\(S\.camera\)/);
  assert.match(stage,/S\.clip\.constant = sweepY/);
  assert.match(stage,/onClick=\{onScan\}/);
  assert.match(stage,/onClick=\{onChoosePhoto\}/);
  // The cap and base should not sit under the fixed bottom dock at the
  // reviewer's Safari-sized kiosk viewport.
  const height=868, width=1294, halfFov=Math.PI*24/360;
  const zoom=Math.max(7.9,7.9*(0.9/(width/height)),
    2.3*height/(2*Math.tan(halfFov)*Math.max(230,height-255)));
  const viewHeight=2*zoom*Math.tan(halfFov);
  const top=height/2-(2.22-0.95)*height/viewHeight;
  const bottom=height/2+(0.95+0.05)*height/viewHeight;
  assert.ok(top>80,`cap clears the station topbar: ${top}`);
  assert.ok(bottom<height-145,`base clears the slimmer Scan action panel: ${bottom}`);
  assert.ok((bottom-top)>520,`bottle should fill the hero, height: ${bottom-top}`);
});

test("large centered hero stays behind the real 3D bottle with accessible Scan dock",()=>{
  assert.match(css,/Restore the large, centered bottle/i);
  assert.match(css,/\.site\.is-sidebar-experiment\.is-stage \.es-type\{/);
  assert.match(css,/justify-items:center!important/);
  assert.match(css,/text-align:center!important/);
  assert.match(css,/font-size:clamp\(75px,10\.3vw,174px\)!important/);
  assert.match(css,/\.site\.is-sidebar-experiment\.is-stage \.es-canvas\{/);
  assert.match(css,/z-index:2/);
  assert.match(css,/\.site\.is-sidebar-experiment\.is-stage \.es-foot\{/);
  assert.match(css,/min-height:72px!important/);
  assert.match(stage,/className="es-type"/);
  assert.match(stage,/className="es-canvas"/);
});
test("sidebar distributes larger navigation affordances into available vertical space",()=>{
  assert.match(css,/\.fl-side-scroll\{[\s\S]*?justify-content:space-between/);
  assert.match(css,/min-height:clamp\(57px,6\.55vh,69px\)!important/);
  assert.match(css,/font-size:17px!important/);
  assert.match(css,/height:23px!important/);
  assert.match(css,/@media\(max-height:760px\)/);
  assert.match(nav,/aria-current=\{view===id\?"page":undefined\}/);
});
test("Ask user message alignment is fixed without changing assistant message behavior",()=>{
  assert.match(css,/\.assistant-messages \.chat-turn\.from-user\{/);
  assert.match(css,/align-self:flex-end/);
  assert.match(css,/width:max-content/);
  assert.match(css,/max-width:min\(88%,780px\)!important/);
  assert.match(css,/\.chat-turn\.from-user \.chat-turn-content/);
  assert.match(css,/overflow-wrap:break-word!important/);
  assert.match(css,/word-break:normal!important/);
});
test("only the account-menu voice picker has normalized typography for three languages",()=>{
  assert.match(css,/#wl-speech-voice\.wl-speech-select/);
  assert.match(css,/font-size:14px!important/);
  assert.match(css,/:is\(option,optgroup\)/);
  assert.match(css,/"Noto Sans Devanagari"/);
  assert.match(css,/text-overflow:ellipsis/);
  assert.doesNotMatch(css,/\.site :is\(select,option\)/);
});
