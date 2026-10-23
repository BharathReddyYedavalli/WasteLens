import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src = name => readFileSync(new URL("../src/"+name, import.meta.url), "utf8");
const audit = src("AuditKit.tsx");
const account = src("AccountArea.tsx");
const css = src("friendly.css");
const translations = src("i18n.tsx");
const backend = readFileSync(new URL("../../backend/app/accounts.py",import.meta.url),"utf8");

test("Audit title requests no personal-name autofill while remaining editable",()=>{
  assert.match(audit, /id="audit-title" name="wastelens-audit-project-title" type="text"/);
  assert.match(audit, /autoComplete="new-password"/);
  assert.match(audit, /data-1p-ignore="true" data-lpignore="true"/);
  assert.match(audit, /value=\{audit\.title\}/);
  assert.match(audit, /title:e\.target\.value/);
});
test("Switching item types keeps the location rules confirmation but resets stale placement assessments",()=>{
  const onChange = audit.slice(audit.indexOf('<select value={itemType} onChange='),audit.indexOf('</select>',audit.indexOf('<select value={itemType} onChange=')));
  assert.match(onChange, /setItemType\(e\.target\.value as ItemType\|""\)/);
  assert.match(onChange, /setSortingCheck\(""(?:\)|;)/);
  assert.doesNotMatch(onChange, /setRulesAcknowledged\(false\)/);
  assert.match(audit, /checked=\{rulesAcknowledged\}/);
  assert.match(audit, /setRulesAcknowledged\(false\)/); // new audit and loaded audits still reset
  assert.match(audit, /entry\.rules_checked=true/);
});
test("Six badges fit on one desktop row while tablet and mobile layouts remain responsive",()=>{
  assert.match(css, /\.badge-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:900px\).*?\.badge-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:600px\).*?\.badge-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test("Admin explains scan identification answers accurately without changing the API",()=>{
  assert.match(account, /fetch\("\/api\/admin\/overview"\)/);
  assert.match(account, /fetch\("\/api\/admin\/feedback"\)/);
  assert.match(account, /reviewOnly \? feedback\.filter\(entry=>entry\.feedback === "no"\) : feedback/);
  assert.match(account, /aria-pressed=\{reviewOnly\}/);
  assert.match(account, /setReviewOnly\(current=>!current\)/);
  assert.match(account, /t\("Reported correct"\)/);
  assert.match(account, /t\("Reported incorrect"\)/);
  assert.match(account, /entry\.feedback === "yes"/);
  assert.match(account, /t\("Looks correct"\)/);
  assert.match(account, /t\("Needs correction"\)/);
  assert.match(account, /t\("Suggested correction"\)/);
  assert.match(backend, /SELECT COUNT\(\*\) FROM scans WHERE feedback='yes'/);
  assert.match(backend, /SELECT COUNT\(\*\) FROM scans WHERE feedback='no'/);
});
test("Admin explanations are present in Spanish and Hindi",()=>{
  for(const key of ["Reported correct","Reported incorrect","Scan identification feedback","Show all feedback",
    "Show reported mistakes only","Identified item","User response","Suggested correction",
    "Looks correct","Needs correction","Not provided","No reported mistakes in these feedback entries."]){
    assert.ok(translations.includes(JSON.stringify(key)+":"),key);
  }
});
