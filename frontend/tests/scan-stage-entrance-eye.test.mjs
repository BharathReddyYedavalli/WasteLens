import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stage = readFileSync(new URL("../src/scan/ScanStage.tsx", import.meta.url), "utf8");
const bottle = readFileSync(new URL("../src/proto/bottle.ts", import.meta.url), "utf8");

test("3D entrance starts with the back visible and completes a full revolution before front-facing reveal", () => {
  assert.match(stage, /const LABEL_FRONT_YAW = -Math.PI/);
  assert.match(stage, /BOTTLE_ENTRANCE_START = LABEL_FRONT_YAW \+ Math.PI/);
  assert.match(stage, /BOTTLE_ENTRANCE_END = LABEL_FRONT_YAW \+ Math.PI \* 4/);
  assert.match(stage, /THREE\.MathUtils\.lerp\(BOTTLE_ENTRANCE_START, BOTTLE_ENTRANCE_END, ease\(bottleEntrance\)\)/);
  assert.match(stage, /if \(!reduce && !introInterrupted && !scan && !dragging && bottleEntrance < 1\)/);
  assert.match(stage, /introInterrupted = true/);
  assert.match(stage, /yaw = reduce \? LABEL_FRONT_YAW/);
  assert.match(stage, /S\.group\.rotation\.set/);
  assert.match(bottle, /function labelTexture\(/);
});
test("Old bottom-right demo/index is removed, but both Scan actions and hero remain", () => {
  assert.doesNotMatch(stage, /className="es-index"/);
  assert.doesNotMatch(stage, /Demo bottle · drag to turn/);
  assert.match(stage, /className="es-cta"/);
  assert.match(stage, /className="es-ghost"/);
  assert.match(stage, /className="es-type"/);
  assert.match(stage, /className="es-canvas"/);
});
test("Eyeball outer shell stays fixed; pupil tracks cursor toward the eye with bounded smooth motion", () => {
  assert.match(stage, /const dx = e.clientX - \(bounds.left \+ bounds.width \/ 2\)/);
  assert.match(stage, /const dy = e.clientY - \(bounds.top \+ bounds.height \/ 2\)/);
  assert.match(stage, /Math\.min\(1, distance \/ 125\)/);
  assert.match(stage, /const EYE_TRAVEL_PX = 11/);
  assert.match(stage, /eyeX \+= \(eyeTargetX - eyeX\) \* 0\.16/);
  assert.match(stage, /style\.setProperty\("--px"/);
  assert.match(stage, /style\.setProperty\("--py"/);
  assert.match(stage, /document\.documentElement\.removeEventListener\("pointerleave", onPointerLeave\)/);
  assert.match(stage, /style=\{\{ pointerEvents: "none" \}\}/);
});
