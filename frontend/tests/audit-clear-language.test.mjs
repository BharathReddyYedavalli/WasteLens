import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = path => readFileSync(new URL("../src/" + path, import.meta.url), "utf8");
const audit = read("AuditKit.tsx");
const i18n = read("i18n.tsx");

test("Audit optional form uses clearer user-facing labels", () => {
  for (const label of [
    "Item details", "What item did you see?",
    "I've checked this location's sorting rules",
    "Was the item placed in the correct bin?",
    "Yes, correct bin", "No, possibly incorrect",
    "Select the item, then tap the bin where you saw it go."
  ]) assert.ok(audit.includes('t("' + label + '")'), label);
  assert.match(audit, /<span>\{t\("Optional"\)\}<\/span>/);
  assert.doesNotMatch(audit, /t\("Add item details"\)|t\("Based on those rules"\)/);
});

test("Sorting review clearly attributes flags to the person auditing", () => {
  for (const label of ["Sorting review","Items categorized","Placements reviewed",
      "Flagged placements","Placement reviews are entered by you, not checked automatically."]) {
    assert.ok(audit.includes('t("' + label + '")'),label);
  }
  assert.match(audit, /const labeled=useMemo\(\(\)=>audit\.entries\.filter\(e=>Boolean\(e\.item_type\)\)/);
  assert.match(audit, /const reviewed=useMemo\(\(\)=>audit\.entries\.filter\(/);
  assert.match(audit, /const flagged=useMemo\(\(\)=>reviewed\.filter\(e=>e\.sorting_check==="mismatch"\)/);
});

test("Audit counts, validations, buttons, saved data and export fields stay the same", () => {
  assert.match(audit, /type SortingCheck = "matches" \| "mismatch"/);
  assert.match(audit, /entry\.sorting_check=sortingCheck/);
  assert.match(audit, /entry\.rules_checked=true/);
  assert.match(audit, /entry\.item_type=itemType/);
  assert.match(audit, /const total=audit\.entries\.length/);
  assert.match(audit, /for \(const entry of entries\) totals\[entry\.kind\]\+\+/);
  for (const kind of ['recycle','compost','trash','reuse','unsure']) {
    assert.match(audit, new RegExp('id:"' + kind + '"'));
  }
  assert.match(audit, /onClick=\{\(\)=>log\(kind\.id\)\}/);
  assert.match(audit, /body:JSON\.stringify\(\{title,entries:audit\.entries\}\)/);
  assert.match(audit, /"site_rules_checked","placement_review"/);
});

test("All new text has Spanish and Hindi entries", () => {
  const labels = [
    "Item details", "I've checked this location's sorting rules",
    "Was the item placed in the correct bin?", "Yes, correct bin",
    "No, possibly incorrect", "Select the item, then tap the bin where you saw it go.",
    "Sorting review", "Items categorized", "Placements reviewed", "Flagged placements",
    "Placement reviews are entered by you, not checked automatically."
  ];
  for (const label of labels) {
    assert.ok(i18n.includes(JSON.stringify(label) + ":"), label);
  }
});
