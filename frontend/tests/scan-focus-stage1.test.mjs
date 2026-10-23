import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const app=read("App.tsx");
const result=app.slice(app.indexOf('{analysis && <section id="scan-results"'),app.indexOf('</> : view === "finder"'));

test("One focused Scan result, no More details container",()=>{
  for(const item of ['scan-decision','scan-quick-steps','<ScanStepTools','<LocalRulesGuide','scan-next-actions','scan-feedback-inline']){
    assert.ok(result.includes(item),item);
  }
  assert.doesNotMatch(result,/scan-more-details|scan-extra-content|t\("More details"\)/);
  assert.match(result,/analysis\.disposal_steps\.slice\(0,3\)/);
  assert.match(result,/analysis\.cautions\[0\]/);
});
test("Sorting remains safe and local rules accessible",()=>{
  assert.match(result,/needsConfirmation/);
  assert.match(result,/AI suggestion, not a confirmed local bin rule/);
  assert.match(result,/onClick=\{showLocalRules\}/);
  assert.match(result,/openRequest=\{rulesOpenRequest\}/);
  assert.match(result,/openPage\("finder"\)/);
  assert.match(result,/setView\("chat"\)/);
});
test("Actions beside instructions work without a second Listen",()=>{
  const tools=read("ScanStepTools.tsx");
  assert.match(tools,/navigator\.clipboard\.writeText\(fullText\)/);
  assert.match(tools,/window\.print\(\)/);
  assert.doesNotMatch(tools,/ReadAloudButton/);
  assert.match(result,/id="scan-summary"/);
  assert.match(result,/\.\.\.analysis\.disposal_steps/);
});
test("No repeated checklist or nearby form",()=>{
  assert.doesNotMatch(result,/<SortPlan|id="nearby"|className="finder-row"/);
  assert.match(app,/view === "finder"/);
  assert.match(app,/<RecyclingResults results=\{facilities\}/);
});
test("CSS theme and small screens stay supported",()=>{
  const css=read("scan-focus.css");
  assert.doesNotMatch(css,/\.scan-more-details/);
  assert.match(css,/scan-feedback-inline/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/data-wl-theme/);
});
test("Scan, activity and history changes parse as TSX",()=>{
  for(const file of ["App.tsx","AccountArea.tsx","ScanStepTools.tsx"]){
    const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    assert.equal(ast.parseDiagnostics.length,0,
      ast.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")).join("\n"));
  }
});
