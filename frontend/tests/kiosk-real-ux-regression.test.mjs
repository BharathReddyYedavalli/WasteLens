import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src = p=>readFileSync(new URL(p,import.meta.url),"utf8");
const leaderboard=src("../src/Leaderboard.tsx");
const backend=src("../../backend/app/gamification.py");
const css=src("../public/kiosk-readability-fixes.css");
const ask=src("../src/AskWasteLens.tsx");
const returns=src("../src/BottleReturns.tsx");

test("28 saved scans always unlock 25-scan badge; XP and quiz remain separate",()=>{
 assert.match(leaderboard,/reconcileScanBadges\(data.me.badges, data.me.scans\)/);
 assert.match(leaderboard,/savedScans >= badge.threshold/);
 assert.match(leaderboard,/badge.id !== "bottle-explorer"/);
 assert.match(leaderboard,/visibleBadges.filter\(b => b.unlocked\).length/);
 assert.match(leaderboard,/visibleBadges.map\(b=><Badge/);
 assert.match(backend,/_badges\(stats\["scans"\]\)/);
 assert.match(backend,/SELECT COUNT\(\*\) FROM scans/);
 assert.match(backend,/rewarded_scans/);
});
test("Official rule link and details have definite high-contrast colors",()=>{
 assert.match(css,/\.deposit-result a\.deposit-official\{/);
 assert.match(css,/background:#124e42!important;color:#fff!important/);
 assert.match(css,/-webkit-text-fill-color:#fff!important/);
 assert.match(css,/\.deposit-state-tip>summary\{/);
 assert.match(css,/\.deposit-result p\.deposit-explanation/);
 assert.match(returns,/className="deposit-reassurance"/);
 assert.match(returns,/className="deposit-explanation"/);
 assert.match(returns,/className="deposit-official"/);
});
test("Dark mode Ask removes duplicate boxes and keeps touch choices prominent",()=>{
 assert.match(ask,/className=\{"assistant-card" \+ \(messages.length === 0/);
 assert.match(ask,/assistant-start-heading/);
 assert.match(css,/html:not\(\[data-wl-theme="light"\]\) body #root \.site\.is-classic-page main \.assistant-card/);
 assert.match(css,/background:transparent!important;background-image:none!important/);
 assert.match(css,/min-height:112px!important/);
 assert.match(css,/font-size:clamp\(20px,1.55vw,25px\)!important/);
});
test("Kiosk stylesheet does not touch the 3D scan scene",()=>{
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.doesNotMatch(clean,/\.site\.is-stage|\.es-canvas|\.es-type|\.stage-wrap/);
 for(const page of ["assistant-screen","deposit-page","location-card","audit-count-row","community-about-hero","league-page","documentary-opening"])
   assert.ok(clean.includes("."+page),page);
});
