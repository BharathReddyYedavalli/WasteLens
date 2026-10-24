import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (name) => readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
const app = read("App.tsx");
const admin = read("AccountArea.tsx");
const legacyNav = read("shell/LegacyNavigation.tsx");
const legacyCss = read("legacy-ui.css");
const main = read("main.tsx");
const bundled = readFileSync(new URL("../public/claude-theme.css", import.meta.url), "utf8");

test("visual style persists and never replaces the app's live backend", () => {
  assert.match(app, /window\.localStorage\.getItem\("wastelens-visual-style"\)/);
  assert.match(app, /window\.localStorage\.setItem\("wastelens-visual-style", visualStyle\)/);
  assert.match(app, /fetch\("\/api\/ai\/analyze"/);
  assert.match(app, /fetch\("\/api\/auth\/me"/);
  assert.match(app, /<RecyclingResults/);
  assert.match(app, /<LocalRulesGuide/);
  assert.match(app, /<AskWasteLens/);
  assert.match(app, /<AuditKit/);
  assert.match(app, /<BottleReturns/);
  assert.match(app, /<BottleJourney/);
});
test("only admins can reach interface switch", () => {
  assert.match(admin, /if \(user\.role !== "admin"\) return/);
  assert.match(admin, /visualStyle === "legacy"/);
  assert.match(admin, /onVisualStyleChange\("legacy"\)/);
  assert.match(admin, /onVisualStyleChange\("claude"\)/);
});
test("original layout is a distinct presentation, not a rollback", () => {
  assert.match(app, /visualStyle === "legacy" \? <div className="legacy-scan"/);
  assert.match(app, /className=\{visualStyle === "legacy" \? "results legacy-results" : "results res-layout"\}/);
  assert.match(legacyNav, /className="topbar legacy-topbar"/);
  assert.match(legacyNav, /community-navigation/);
  assert.match(legacyCss, /\.legacy-layout/);
  assert.match(main, /import "\.\/legacy-ui\.css";/);
  assert.match(main, /import "\.\/google-map-polish\.css";/);
  assert.match(bundled, /\.site\.is-sidebar-experiment/);
  assert.match(app, /link\.media = visualStyle === "claude" \? "all" : "not all"/);
});
