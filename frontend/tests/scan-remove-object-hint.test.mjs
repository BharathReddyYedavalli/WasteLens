import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../../backend/app/main.py", import.meta.url), "utf8");

test("Remove optional focus-on-one-item input from both Current and Legacy scan UIs", () => {
  for (const oldFragment of [
    "Focus on one item", "Example: The blue bottle I'm holding",
    'id="hint"', 'className="hint-area"', 'cap-focus hint-area',
    "setHint(", "const [hint, setHint]",
  ]) assert.ok(!app.includes(oldFragment), oldFragment);
  assert.match(app, /<ScanStage/);
  assert.match(app, /<div className="legacy-scan">/);
});
test("Gemini photo identification still receives the image and language, without a redundant prompt", () => {
  assert.match(app, /scanForm\.append\("image", preview\.file\)/);
  assert.match(app, /scanForm\.append\("language", language\)/);
  assert.doesNotMatch(app, /scanForm\.append\("object_hint"/);
  assert.match(app, /fetch\("\/api\/ai\/analyze"/);
  assert.match(api, /object_hint: str = Form\(""\)/);
});
