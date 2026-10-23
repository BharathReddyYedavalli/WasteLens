import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=n=>readFileSync(new URL("../src/"+n,import.meta.url),"utf8");
const app=read("App.tsx");
const start=app.indexOf('{analysis && <section id="scan-results"');
const end=app.indexOf('</> : view === "finder"',start);
const scan=app.slice(start,end);

test("one main sorting checklist, no second tall checklist or progress counter",()=>{
  assert.ok(start>=0 && end>start);
  assert.equal((scan.match(/t\("What to do with it"\)/g)||[]).length,2); // heading + aria label
  assert.match(scan,/disposal_steps\.slice\(0,3\)/);
  assert.doesNotMatch(scan,/<SortPlan/);
  assert.match(scan,/<ScanStepTools/);
  const tools=read("ScanStepTools.tsx");
  assert.match(tools,/navigator\.clipboard\.writeText\(fullText\)/);
  assert.match(tools,/window\.print\(\)/);
  assert.match(tools,/ReadAloudButton/);
  assert.doesNotMatch(tools,/completedSteps|sort-plan-progress/);
});

test("first caution stays visible, remaining warnings are not repeated",()=>{
  const essential=scan.slice(0,scan.indexOf('className="scan-more-details"'));
  assert.match(essential,/analysis\.cautions\[0\]/);
  const detail=scan.slice(scan.indexOf('className="scan-more-details"'));
  assert.match(detail,/analysis\.cautions\.slice\(1\)/);
  assert.match(detail,/t\("Other precautions"\)/);
  assert.doesNotMatch(detail,/analysis\.cautions\.map/);
  assert.doesNotMatch(detail,/t\("A few things to check"\)/);
});

test("duplicate nearby search removed but real finder stays available",()=>{
  assert.doesNotMatch(scan,/id="nearby"|className="finder-row"|<RecyclingResults/);
  assert.match(scan,/openPage\("finder"\)/);
  assert.match(app,/view === "finder" \? <section className="finder-screen"/);
  assert.match(app,/<RecyclingResults results=\{facilities\}/);
});

test("reuse, feedback, activity and staff audits stay usable when expanded",()=>{
  const detail=scan.slice(scan.indexOf('className="scan-more-details"'));
  assert.match(detail,/className="scan-subdetails scan-reuse-details"/);
  assert.match(detail,/reuse_projects\.map/);
  assert.match(detail,/project\.steps\.map/);
  assert.match(detail,/className="scan-subdetails scan-feedback-details"/);
  assert.match(detail,/submitFeedback\(true\)/);
  assert.match(detail,/submitFeedback\(false\)/);
  assert.match(detail,/markAction\(choice\)/);
  assert.match(detail,/onClick=\{recordObservedItem\}/);
});

test("themes, mobile, keyboard and translations remain supported",()=>{
  const css=read("scan-focus.css");
  assert.match(css,/\.site \.scan-subdetails>summary:focus-visible/);
  assert.match(css,/:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  const i18n=read("i18n.tsx");
  assert.match(i18n,/"Other precautions": \{ es: "Otras precauciones", hi: "अन्य सावधानियाँ" \}/);
  assert.match(i18n,/"Feedback and activity": \{ es: "Comentarios y actividad", hi: "प्रतिक्रिया और गतिविधि" \}/);
});

test("all changed components parse as TSX",()=>{
  for(const file of ["App.tsx","ScanStepTools.tsx"]){
    const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    assert.equal(ast.parseDiagnostics.length,0,
      ast.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,"\n")).join("\n"));
  }
});
