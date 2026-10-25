import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=(file)=>readFileSync(new URL("../src/"+file,import.meta.url),"utf8");
const css=readFileSync(new URL("../public/kiosk-type-system.css",import.meta.url),"utf8");
const app=src("App.tsx");
const scan=src("scan/ScanStage.tsx");
const rules=src("TexasDemoRules.tsx");
const activity=src("AccountArea.tsx");
const audit=src("AuditKit.tsx");
const tokens=["--wl-kiosk-title","--wl-kiosk-section","--wl-kiosk-subhead","--wl-kiosk-body","--wl-kiosk-control","--wl-kiosk-meta"];
test("One coherent, legible typography scale appears on all functional pages",()=>{
 for(const token of tokens)assert.ok(css.includes(token),token);
 for(const section of ["institution-rule-flow","texas-demo-result","res-layout","audit-kit","finder-screen","deposit-page","assistant-screen","league-page","community-about","account-card","history-grid","documentary"])
   assert.ok(css.includes(section),section);
 assert.ok(app.indexOf("/kiosk-type-system.css") > app.indexOf("/navigation-layout.css"));
 assert.ok(app.includes("wastelens-kiosk-type-system"));
 assert.match(css,/font-size:var\(--wl-kiosk-body\)!important/);
 assert.match(css,/font-size:var\(--wl-kiosk-control\)!important/);
 assert.match(css,/@media\(max-width:720px\)/);
});
test("Institution headings outrank choices and descriptive text is readable",()=>{
 assert.match(rules,/Correct the item/);
 assert.match(rules,/Choose the correct item/);
 assert.match(css,/\.institution-scanned label\{/);
 assert.match(css,/font-size:clamp\(21px,1\.6vw,26px\)!important/);
 assert.match(css,/\.institution-rule-flow select\{/);
 assert.match(css,/font-size:clamp\(20px,1\.35vw,23px\)!important/);
 assert.match(css,/\.institution-scope,/);
 assert.match(css,/\.institution-examples\{/);
 assert.match(css,/font-size:clamp\(19px,1\.35vw,23px\)!important/);
 assert.match(css,/#scan-local-rules>summary/);
});
test("Activity cards emphasize an actual stored disposal suggestion, not invented scoring",()=>{
 for(const value of ["history-card-top","history-route-icon","history-outcome","history-facts","history-details","history-detail-body"])
   assert.ok(activity.includes(value),value);
 assert.match(activity,/scan\.analysis\.route_title/);
 assert.match(activity,/scan\.analysis\.material_guess/);
 assert.match(activity,/scan\.analysis\.disposal_steps\.map/);
 assert.match(activity,/scan\.analysis\.reuse_ideas\.map/);
 assert.match(activity,/onClick=\{\(\)=>void logAction\(scan\.id,choice\)\}/);
 assert.match(activity,/showAllHistory\?undefined:6/);
 assert.match(css,/\.history-route-icon/);
 assert.match(css,/\.history-details summary/);
 assert.match(css,/\.history-card-heading h3/);
 assert.match(css,/\.history-grid\{/);
 assert.match(css,/@media\(min-width:1360px\)/);
});
test("No 3D bottle or pinned Scan hero choreography is changed",()=>{
 assert.ok(scan.includes('className="es-canvas"'));
 const cleaned=css.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.doesNotMatch(cleaned,/\.es-canvas\{|\.es-type\{|\.es-pip\{|\.es-note\{|\.stage-wrap\{/);
 assert.ok(audit.includes('className={"audit-option audit-"+kind.id}'));
});
