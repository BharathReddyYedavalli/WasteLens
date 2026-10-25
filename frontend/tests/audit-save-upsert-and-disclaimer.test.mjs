import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = name => readFileSync(new URL("../src/"+name, import.meta.url),"utf8");
const audit = read("AuditKit.tsx");
const scan = read("App.tsx");
const strings = read("i18n.tsx");
const rules = read("TexasDemoRules.tsx");
const frontendCss=read("scan-focus.css");
const api = readFileSync(new URL("../../backend/app/community_audits.py", import.meta.url),"utf8");

test("Save chooses POST for new drafts and PUT for linked, owned records",()=>{
  assert.match(audit, /savedId\?: number; savedFor\?: number/);
  assert.match(audit, /const updating=Boolean\(audit\.savedId && audit\.savedFor===user\.id\)/);
  assert.match(audit, /const endpoint=updating\?"\/api\/audits\/"\+audit\.savedId:"\/api\/audits"/);
  assert.match(audit, /method:updating\?"PUT":"POST"/);
  assert.match(audit, /savedId:result\.id,savedFor:user\.id/);
  assert.match(audit, /t\("Audit saved successfully!"\)/);
  assert.doesNotMatch(audit, /"Audit saved to your account\."/);
  assert.match(api, /@router\.put\("\/audits\/\{audit_id\}"\)/);
  assert.match(api, /WHERE id=\? AND user_id=\?/);
});
test("Draft stores the linked ID and owner across refresh, but resets for new audits",()=>{
  assert.match(audit, /Number\.isSafeInteger\(draft\.savedId\)/);
  assert.match(audit, /Number\.isSafeInteger\(draft\.savedFor\)/);
  assert.match(audit, /setAudit\(\{title:"",entries:\[\]\}\)/);
  assert.match(audit, /setAudit\(\{title:record\.title,entries:record\.entries,savedId:id,savedFor:user!\.id\}\)/);
  assert.match(audit, /audit\.savedId && audit\.savedFor!==user\.id/);
  assert.match(audit, /if\(audit\.savedId===id && audit\.savedFor===user\?\.id\)/);
});
test("Save uses same entry data model, local validation and counters as before",()=>{
  assert.match(audit, /body:JSON\.stringify\(\{title,entries:audit\.entries\}\)/);
  assert.match(audit, /const total=audit\.entries\.length/);
  assert.match(audit, /for \(const entry of entries\) totals\[entry\.kind\]\+\+/);
  assert.match(api, /def _prepare_audit\(payload: SaveAudit\)/);
  assert.match(api, /entry\.at\.tzinfo is None or entry\.at > now/);
  assert.match(api, /if entry\.sorting_check is not None/);
  for (const label of ["Audit saved successfully!",
    "Saved audit opened. Your next save will update it.",
    "This draft is linked to another account. Sign in to that account or start a new audit.",
    "Saved, but could not refresh your saved audits."]) {
    assert.ok(strings.includes(JSON.stringify(label)+":"),label);
  }
});
test("Redundant generic Scan disclaimer removed while important safeguards remain",()=>{
  assert.doesNotMatch(scan,/AI suggestion, not a confirmed local bin rule/);
  assert.doesNotMatch(strings,/AI suggestion, not a confirmed local bin rule/);
  assert.doesNotMatch(frontendCss,/\.scan-decision-disclaimer/);
  assert.match(scan,/Confirm the item before sorting/);
  assert.match(scan,/scanCautions\[0\]/);
  assert.match(scan,/not confirmed to accept this item/);
  assert.match(rules,/No confirmed rule for this item/);
  assert.match(rules,/profile\.sources\[0\]/);
  assert.match(rules,/Rules for this location aren\x27t available yet/);
});
