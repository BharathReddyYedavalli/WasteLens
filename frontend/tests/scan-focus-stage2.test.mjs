import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../src/"+n,import.meta.url),"utf8");
const app=read("App.tsx");
const area=read("AccountArea.tsx");
const snippet=app.slice(app.indexOf('{analysis && <section id="scan-results"'),app.indexOf('</> : view === "finder"'));

test("More details disappears entirely and optional reuse stays available",()=>{
  assert.doesNotMatch(snippet,/scan-more-details|t\("More details"\)/);
  assert.match(snippet,/scan-reuse-details/);
  assert.match(snippet,/reuse_projects\.map/);
  assert.match(snippet,/project\.steps\.map/);
  assert.match(snippet,/reuse_ideas\.map/);
});
test("Extra unique cautions available, first caution shown only once",()=>{
  assert.match(snippet,/scanCautions\[0\]/);
  assert.match(snippet,/scanCautions\.slice\(1\)/);
  assert.match(snippet,/t\("Other precautions"\)/);
  assert.doesNotMatch(snippet,/t\("A few things to check"\)/);
});
test("Scan feedback stays compact, functional and saveable",()=>{
  assert.match(snippet,/className="scan-feedback-inline"/);
  assert.match(snippet,/submitFeedback\(true\)/);
  assert.match(snippet,/submitFeedback\(false\)/);
  assert.match(snippet,/feedbackCorrection/);
  assert.doesNotMatch(snippet,/scan-feedback-details|action-card|recordObservedItem/);
});
test("Action logging is available in My Activity for saved scans",()=>{
  assert.match(area,/className="history-action-log"/);
  assert.match(area,/logAction\(scan\.id,choice\)/);
  assert.match(area,/\/api\/scans\/.*\/action/);
  assert.match(area,/setScans\(items=>items\.map/);
  assert.match(area,/scan\.action===choice/);
  const types=read("types.ts");
  assert.match(types,/action\?: "recycled"/);
});
test("Audit stays accessible through its real route",()=>{
  assert.match(app,/view === "audit" \? <AuditKit/);
});
