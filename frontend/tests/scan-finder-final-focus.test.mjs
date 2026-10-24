import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = name => readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
const app = read("App.tsx");
const guide = read("LocalRulesGuide.tsx");
const institution = read("TexasDemoRules.tsx");
const styles = read("scan-focus.css");
const strings = read("i18n.tsx");

test("Scan prioritizes camera and the 3D start screen, and shows no quick links around a result", () => {
  assert.ok(app.indexOf("<ScanStage") < app.indexOf('<section className="cap"'));
  assert.ok(app.indexOf('<section className="cap"') < app.indexOf('{analysis && <section id="scan-results"'));
  assert.doesNotMatch(app, /community-mission-path/);
  assert.match(app, /<h1 className="visually-hidden">\{t\("Before you toss it, scan it\."\)\}<\/h1>/);
});
test("Scan-to-Finder remembers the item and reuses existing ZIP without extra AI requests", () => {
  assert.match(app, /openPage\("finder", true\)/);
  assert.match(app, /setFinderScan\(fromScan && analysis \? analysis\.item_name : null\)/);
  assert.match(app, /fromScan && \/\^\\d\{5\}\$\/\.test\(location\.trim\(\)\)/);
  assert.match(app, /void lookupFacilities\(location\)/);
  assert.match(app, /finderScan && <div className="finder-scan-context"/);
  assert.match(app, /not confirmed to accept this item/);
  assert.match(app, /const endpoint = hasGoogleMapsKey \? "\/api\/facilities\/center" : "\/api\/facilities"/);
  assert.doesNotMatch(app, /verified_acceptance: true/);
});
test("Local rules retain critical safeguards with much smaller postal note", () => {
  assert.match(guide, /useState\(false\)/);
  assert.doesNotMatch(guide, /local-rules-postal/);
  assert.doesNotMatch(guide, /School and business waste services use site-specific contracts/);
  assert.doesNotMatch(guide, /Guidance is for this selected residential service/);
  assert.match(guide, /<TexasDemoRules itemName=\{scanItemName\}/);
  assert.doesNotMatch(guide, /local-rule-zip/);
  assert.match(institution, /wastelens-selected-institution/);
  assert.match(institution, /const selectedItem=correcting\?correction:inferred/);
  assert.match(institution, /rule\?\.source_url\|\|profile\.sources\[0\]/);
  assert.match(styles, /\.scan-decision-unified/);
  assert.match(styles, /\.finder-scan-context/);
});
test("Finder context includes Spanish and Hindi", () => {
  for (const key of ["From your scan",
    "These locations are not confirmed to accept this item. Contact them before visiting."]) {
    assert.ok(strings.includes(JSON.stringify(key) + ":") || strings.includes('"' + key + '":'),key);
  }
});
