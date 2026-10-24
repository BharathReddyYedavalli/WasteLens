import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
const app = read("App.tsx");
const rules = read("LocalRulesGuide.tsx");
const institution = read("TexasDemoRules.tsx");
const styles = read("scan-focus.css");
const result = app.slice(app.indexOf('{analysis && <section id="scan-results"'), app.indexOf('</> : view === "finder"'));

test("One guidance card replaces repeated banners and a second instruction card", () => {
  assert.match(result, /scan-decision-unified/);
  assert.match(result, /scan-action-steps/);
  assert.doesNotMatch(result, /className="uncertain"|className="question"|className="scan-quick-steps"|className="scan-primary-caution"/);
  assert.doesNotMatch(result, /onClick=\{showLocalRules\}/);
  assert.match(result, /<LocalRulesGuide/);
  assert.match(result, /scan-next-actions/);
});

test("Uncertain result asks for clearer identification rather than falsely suggesting a disposal bin", () => {
  assert.match(result, /needsConfirmation \? \(/);
  assert.match(result, /analysis\.follow_up_question \|\| t\("The item or material needs confirmation/);
  assert.match(result, /!needsConfirmation \? analysis\.disposal_steps : \[\]/);
  assert.match(result, /needsConfirmation \? <div className="scan-decision-actions">/);
  assert.match(result, /reset\(\)/);
  assert.match(result, /Try another photo/);
  assert.match(app, /the photo alone is not enough to confirm safe disposal/);
  assert.match(result, /scanCautions\[0\]/);
});

test("Known item retains disposal guidance, copy and print, and unique hazards", () => {
  assert.match(result, /analysis\.disposal_steps\.slice\(0,3\)/);
  assert.match(result, /<ScanStepTools/);
  assert.match(result, /scanCautions\.slice\(1\)/);
  assert.match(result, /scan-reuse-details/);
  assert.match(result, /scan-feedback-inline/);
});

test("Local rules are lean without removing proof-of-service or source checks", () => {
  for(const removed of ["A ZIP code does not prove which city or collection service covers your address.",
    "ZIP codes do not confirm your collection service.",
    "School and business waste services use site-specific contracts.",
    "Guidance is for this selected residential service"]) {
    assert.ok(!rules.includes(removed),removed);
  }
  assert.match(rules,/<TexasDemoRules/);
  assert.doesNotMatch(rules,/local-rule-zip/);
  assert.match(institution,/const selectedItem=correcting\?correction:inferred/);
  assert.match(institution,/Wrong item\? Change it/);
  assert.match(institution,/rule\?\.source_url\|\|profile\.sources\[0\]/);
  assert.match(institution,/Other location/);
  assert.match(styles,/scan-decision-unified/);
  assert.match(styles,/data-wl-theme/);
  assert.match(styles,/@media\(max-width:620px\)/);
});
