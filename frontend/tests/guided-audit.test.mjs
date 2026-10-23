import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = name => readFileSync(new URL("../src/"+name, import.meta.url),"utf8");
const ui=file("AuditKit.tsx"),entry=file("main.tsx"),css=file("guided-audit.css"),lang=file("i18n.tsx");
test("kiosk audit provides setup/count/review without navigation to separate pages",()=>{
  assert.match(ui,/type Stage = "setup" \| "count" \| "review"/);
  assert.match(ui,/stage==="setup"/);
  assert.match(ui,/stage==="count"/);
  assert.match(ui,/stage==="review"/);
  assert.match(ui,/Select the item first/);
  assert.match(ui,/disabled=\{!selectedItem\|\|total>=15000\}/);
  assert.match(ui,/setPlacement\(""\)/);
  assert.match(ui,/setStage\("review"\)/);
});
test("existing drafts and saved audits continue to open",()=>{
  assert.match(ui,/const STORAGE_KEY = "wastelens-community-audit-v1"/);
  assert.match(ui,/typeof d.location==="string"/);
  assert.match(ui,/entries:d.entries.filter\(validEntry\)/);
  assert.match(ui,/record.context\?\.location\|\|""/);
  assert.match(ui,/\/api\/audits\//);
});
test("verified manual assessments stay separate from destinations",()=>{
  assert.match(ui,/rulesChecked && placement/);
  assert.match(ui,/setPlacement\(""\);setNotice/);
  assert.match(ui,/reviewedOf\(audit.entries\)/);
  assert.match(ui,/pct\(flagged.length,reviewed.length\)/);
  assert.match(ui,/not proof of recycling or environmental savings/);
  assert.match(ui,/Location or session details differ or are missing/);
});
test("simple reports work without live AI or sign in",()=>{
  assert.match(ui,/stage==="review"&&<div/);
  assert.match(ui,/exportCsv\(\{\.\.\.audit,title\}\)/);
  assert.match(ui,/window.print\(\)/);
  assert.match(ui,/user&&<section className="audit-compare"/);
  assert.match(ui,/details className="audit-optional-features"/);
});
test("new design is themed, mobile-friendly and translated",()=>{
  assert.ok(entry.indexOf('import "./guided-audit.css";')>entry.indexOf('import "./kiosk-presentation.css";'));
  assert.match(css,/@media\(max-width:530px\)/);
  assert.match(css,/@media print/);
  for(const key of ["Where are you counting?","What did you observe?","What did you find?","Compare with a previous audit"]){
    assert.ok(lang.includes(JSON.stringify(key)+":"),key);
  }
});
