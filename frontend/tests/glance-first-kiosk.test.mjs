import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../src/" + path, import.meta.url), "utf8");
const css = readFileSync(new URL("../public/kiosk-experiment.css",import.meta.url),"utf8");
const app = read("App.tsx");
const audit = read("AuditKit.tsx");
const account = read("AccountArea.tsx");
const league = read("Leaderboard.tsx");
const about = read("AboutWasteLens.tsx");

test("The experiment is visually isolated from the animated Scan stage and Legacy UI", () => {
  assert.match(app,/kiosk.href = "\/kiosk-experiment.css"/);
  assert.match(app,/kiosk.media = visualStyle === "claude" \? "all" : "not all"/);
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g,"");
  for(const selector of [".site.is-stage",".stage-wrap",".es-canvas",".es-type",".es-foot"]){
    assert.ok(!cssWithoutComments.includes(selector),"must not touch "+selector);
  }
  assert.match(cssWithoutComments,/\.site\.is-classic-page/);
  assert.match(app,/visualStyle === "claude" && view === "identifier"/);
});

test("The audit keeps original logging handlers and makes advanced setup optional",()=>{
  assert.ok(audit.indexOf('className="audit-options"') < audit.indexOf('className="audit-kiosk-options"'));
  assert.match(audit,/className="audit-kiosk-options" open=\{detailMode\}/);
  assert.match(audit,/onToggle=\{event=>setDetailMode\(event.currentTarget.open\)\}/);
  assert.match(audit,/onClick=\{\(\)=>log\(kind.id\)\}/);
  assert.match(audit,/entry.item_type=itemType/);
  assert.match(audit,/entry.sorting_check=sortingCheck/);
  assert.match(audit,/entry.rules_checked=true/);
  assert.match(audit,/onClick=\{save\}/);
});

test("Users can still find the complete supporting information and admin controls",()=>{
  assert.match(account,/className="admin-kiosk-data"/);
  assert.match(account,/onVisualStyleChange\("legacy"\)/);
  assert.match(account,/onVisualStyleChange\("claude"\)/);
  assert.match(account,/shownFeedback.map/);
  assert.match(account,/users.map/);
  assert.match(league,/<details className="badge-panel">/);
  assert.match(league,/reconcileScanBadges\(data.me.badges, data.me.scans\)/);
  assert.match(league,/visibleBadges.map/);
  assert.match(about,/className="community-about-more"/);
  assert.match(about,/future use we are exploring, not a device already installed/);
  assert.match(about,/Confirm your actual service before choosing a bin or drop-off/);
});

test("Experimental design uses readable touch targets with mobile and reduced motion support",()=>{
  assert.match(css,/min-height:58px!important/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/var\(--e-surface\)/);
  assert.match(css,/var\(--e-ink\)/);
});
