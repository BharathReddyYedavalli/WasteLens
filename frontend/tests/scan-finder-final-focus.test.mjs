import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = name => readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
const app = read("App.tsx");
const guide = read("LocalRulesGuide.tsx");
const styles = read("scan-focus.css");
const strings = read("i18n.tsx");

test("Scan prioritizes camera and hides unrelated quick links after a result", () => {
  assert.ok(app.indexOf('<div className="workspace">') < app.indexOf('{!analysis && <div className="community-mission-path"'));
  assert.ok(app.indexOf('{!analysis && <div className="community-mission-path"') < app.indexOf('{analysis && <section id="scan-results"'));
  assert.match(app, /<h1>\{t\("Before you toss it, scan it\."\)\}<\/h1>/);
});
test("Scan-to-Finder remembers the item and reuses existing ZIP without extra AI requests", () => {
  assert.match(app, /openPage\("finder", true\)/);
  assert.match(app, /setFinderScan\(fromScan && analysis \? analysis\.item_name : null\)/);
  assert.match(app, /fromScan && \/\^\\d\{5\}\$\/\.test\(location\.trim\(\)\)/);
  assert.match(app, /void lookupFacilities\(location\)/);
  assert.match(app, /finderScan && <div className="finder-scan-context"/);
  assert.match(app, /not confirmed to accept this item/);
  assert.match(app, /\/api\/facilities\?zip_code=/);
  assert.doesNotMatch(app, /verified_acceptance: true/);
});
test("Local rules retain critical safeguards with much smaller postal note", () => {
  assert.match(guide, /useState\(false\)/);
  assert.doesNotMatch(guide, /local-rules-postal/);
  assert.doesNotMatch(guide, /School and business waste services use site-specific contracts/);
  assert.doesNotMatch(guide, /Guidance is for this selected residential service/);
  assert.match(guide, /selectedProgram, setSelectedProgram/);
  assert.match(guide, /selectedItem, setSelectedItem/);
  assert.match(guide, /confirmed, setConfirmed/);
  assert.match(guide, /service_confirmed: "true"/);
  assert.match(guide, /source_url/);
  assert.match(styles, /\.scan-decision-unified/);
  assert.match(styles, /\.finder-scan-context/);
});
test("Finder context includes Spanish and Hindi", () => {
  for (const key of ["From your scan",
    "These locations are not confirmed to accept this item. Contact them before visiting."]) {
    assert.ok(strings.includes(JSON.stringify(key) + ":") || strings.includes('"' + key + '":'),key);
  }
});
