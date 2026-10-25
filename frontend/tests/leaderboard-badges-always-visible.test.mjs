import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const league=readFileSync(new URL("../src/Leaderboard.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../public/kiosk-type-system.css",import.meta.url),"utf8");
test("All earned and locked leaderboard badges display without a click",()=>{
  assert.match(league,/<section className="badge-panel" aria-labelledby="leaderboard-badges-heading">/);
  assert.match(league,/<h2 id="leaderboard-badges-heading" className="badge-panel-heading">/);
  assert.match(league,/visibleBadges\.map\(b=><Badge key=\{b\.id\} badge=\{b\}\/>\)/);
  assert.doesNotMatch(league,/<details className="badge-panel"/);
  assert.match(league,/reconcileScanBadges\(data\.me\.badges, data\.me\.scans\)/);
  assert.match(styles,/\.badge-panel \.badge-panel-heading/);
  assert.match(styles,/\.badge-panel \.badge-grid/);
  assert.match(league,/<details className="league-rules">/);
});
