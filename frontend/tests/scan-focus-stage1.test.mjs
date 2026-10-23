import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const app=src("App.tsx");
const css=src("scan-focus.css");

test("Scan now presents a short disposal answer before optional details",()=>{
  const begin=app.indexOf('{analysis && <section id="scan-results"');
  const end=app.indexOf('</> : view === "finder"',begin);
  assert.ok(begin>=0&&end>begin);
  const scan=app.slice(begin,end);
  const position=(s)=>scan.indexOf(s);
  assert.ok(position('className="scan-decision"')<position('className="scan-quick-steps"'));
  assert.ok(position('className="scan-quick-steps"')<position('<LocalRulesGuide'));
  assert.ok(position('<LocalRulesGuide')<position('className="scan-more-details"'));
  assert.ok(position('className="scan-more-details"')<position('<SortPlan'));
  assert.match(scan,/analysis\.disposal_steps\.slice\(0,3\)/);
  assert.match(scan,/analysis\.cautions\[0\]/);
  assert.match(scan,/className="scan-more-details"/);
  assert.match(scan,/t\("More details"\)/);
});

test("Local rules and next actions stay directly available without expanding More",()=>{
  const essential=app.slice(app.indexOf('className="scan-essential"'),
    app.indexOf('className="scan-more-details"'));
  assert.match(essential,/<LocalRulesGuide/);
  assert.match(essential,/openRequest=\{rulesOpenRequest\}/);
  assert.match(essential,/onClick=\{\(\) => openPage\("finder"\)\}/);
  assert.match(essential,/onClick=\{\(\) => setView\("chat"\)\}/);
  assert.match(app,/function showLocalRules\(\)/);
  assert.match(app,/setRulesOpenRequest\(current => current \+ 1\)/);
  assert.match(app,/onClick=\{showLocalRules\}/);
});

test("No existing detailed Scan features are deleted",()=>{
  const detail=app.slice(app.indexOf('className="scan-more-details"'),app.indexOf('</> : view === "finder"'));
  for(const fragment of [
    '<SortPlan','reuse_projects.map','materials_needed.map','project.steps.map',
    'analysis.cautions.map','id="nearby"','<RecyclingResults',
    'onClick={recordObservedItem}','submitFeedback(true)','submitFeedback(false)',
    'onClick={() => void markAction(choice)}','result?.scan_id',
    'analysis.reuse_ideas'
  ])assert.ok(detail.includes(fragment),fragment);
  assert.match(app,/key=\{result\?\.scan_id \?\? preview\?\.src \?\? "details"\}/);
});

test("New Scan-only styling has all themes and small screens covered",()=>{
  const main=src("main.tsx");
  assert.ok(main.indexOf('import "./scan-focus.css";')>main.indexOf('import "./deposit-station.css";'));
  assert.match(css,/\.site \.scan-essential/);
  assert.match(css,/\.site \.scan-quick-steps/);
  assert.match(css,/\.site \.scan-more-details > summary:focus-visible/);
  assert.match(css,/:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.doesNotMatch(css,/#nearby\s*\{\s*display:\s*none/);
});

test("More details is translated into Spanish and Hindi",()=>{
  const dictionary=src("i18n.tsx");
  assert.match(dictionary,/"More details": \{ es: "Más detalles", hi: "अधिक जानकारी" \}/);
});

test("React/TSX syntax remains parseable",()=>{
  const source=ts.createSourceFile("App.tsx",app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(source.parseDiagnostics.length,0,
    source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,"\n")).join("\n"));
});
