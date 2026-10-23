import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = file => readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
const app = source("App.tsx");
const rules = source("LocalRulesGuide.tsx");
const about = source("AboutWasteLens.tsx");
const audit = source("AuditKit.tsx");
const lang = source("i18n.tsx");
const css = source("kiosk-presentation.css");
const entry = source("main.tsx");

test("homepage keeps its established heading and an actionable message", () => {
  assert.match(app, /t\("Before you toss it, scan it\."\)/);
  assert.match(app, /t\("Scan an item, then check how your local program handles it\."\)/);
  assert.match(app, /t\("Find a place"\)/);
  assert.match(app, /t\("Run an audit"\)/);
});

test("the scan result prioritizes a cautious action and opens real local rules", () => {
  const decision = app.indexOf('className="scan-decision"');
  const checklist = app.indexOf("<ScanStepTools ");
  const localChecker = app.indexOf("<LocalRulesGuide ");
  // Local rules are intentionally ahead of the long optional checklist.
  assert.ok(decision > 0 && localChecker > decision && checklist > localChecker);
  assert.ok(app.indexOf('className="scan-more-details"') > localChecker);
  assert.match(app, /needsConfirmation \? t\("Confirm the item before sorting"\) : analysis\.route_title/);
  assert.match(app, /AI suggestion, not a confirmed local bin rule/);
  assert.match(app, /function showLocalRules\(\) \{\s*setRulesOpenRequest\(current => current \+ 1\)/);
  assert.match(app, /onClick=\{showLocalRules\}/);
  assert.match(app, /openRequest=\{rulesOpenRequest\}/);
  assert.match(rules, /if \(openRequest <= 0\) return;\s*setOpen\(true\)/);
  assert.match(rules, /id="scan-local-rules"/);
});

test("kiosk purpose is honest and local rules remain essential", () => {
  assert.match(about, /Better recycling starts at the bin\./);
  assert.match(about, /future use we are exploring, not a device already installed/);
  assert.match(about, /Confirm your actual service before choosing a bin or drop-off/);
  assert.match(about, /Schools and offices can tally observed waste/);
  assert.match(audit, /Count where items end up at school or work/);
});

test("existing scanner, checklist, local rules, map, audits, and rewards stay wired", () => {
  for (const component of ["ScanStepTools", "LocalRulesGuide", "RecyclingResults", "AuditKit", "BadgeCelebration"]) {
    assert.ok(app.includes(component), component);
  }
  assert.match(app, /onClick=\{recordObservedItem\}/);
  assert.match(app, /onClick=\{\(\) => openPage\("finder"\)\}/);
  assert.match(app, /openPage\("finder"\)/);
});

test("presentation CSS is last, responsive, and alternate-theme aware", () => {
  assert.ok(entry.indexOf('import "./kiosk-presentation.css";') >
    entry.indexOf('import "./theme-readability.css";'));
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(css, /#scan-local-rules \{scroll-margin-top/);
});

test("new text has Spanish and Hindi equivalents", () => {
  for (const key of [
    "Scan an item, then check how your local program handles it.",
    "Suggested next action",
    "Confirm the item before sorting",
    "AI suggestion, not a confirmed local bin rule.",
    "Count where items end up at school or work. Find patterns to improve sorting.",
  ]) {
    assert.ok(lang.includes(JSON.stringify(key) + ":"), key);
  }
});
