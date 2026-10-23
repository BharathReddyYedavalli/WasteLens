import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const compiled=ts.transpileModule(src("scanSuggestions.ts"),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
}).outputText;
const {scanQuestionSuggestions}=await import("data:text/javascript;base64,"+
  Buffer.from(compiled).toString("base64"));

function scan(item_name,other={}){
  return {
    item_name,
    visual_description:"",
    identification:"likely",
    route:"check_recycling",
    ...other
  };
}
test("a used paper towel gets disposal, contamination and local compost questions",()=>{
  const prompts=scanQuestionSuggestions(scan("Used paper towel"),"en");
  assert.equal(prompts.length,3);
  assert.match(prompts[0],/used paper towel/i);
  assert.match(prompts[0],/recycling, compost, or trash/i);
  assert.match(prompts[1],/food, grease, or cleaning-product/i);
  assert.match(prompts[2],/local compost/i);
  assert.ok(prompts.every(q=>!/cap or lid/i.test(q)));
});

test("other named scans receive questions that mention the object",()=>{
  const prompts=scanQuestionSuggestions(scan("Disposable plastic spoon"),"en");
  assert.equal(prompts.length,3);
  assert.ok(prompts.every(q=>q.includes("Disposable plastic spoon")));
  assert.ok(prompts.every(q=>!q.includes("cap or lid")));
});

test("batteries and electronics offer safe collection questions",()=>{
  const battery=scanQuestionSuggestions(scan("Lithium-ion battery"),"en");
  assert.match(battery[0],/safely take/i);
  assert.match(battery[1],/terminals/i);
  const electronics=scanQuestionSuggestions(scan("Broken laptop"),"en");
  assert.match(electronics[1],/batteries or personal data/i);
});

test("Spanish and Hindi suggestions use their language and handle localized item names",()=>{
  const es=scanQuestionSuggestions(scan("Toalla de papel usada"),"es");
  assert.equal(es.length,3);
  assert.match(es[0],/reciclaje/i);
  const hi=scanQuestionSuggestions(scan("पेपर टॉवल इस्तेमाल किया हुआ"),"hi");
  assert.equal(hi.length,3);
  assert.match(hi[0],/पेपर टॉवल/);
});

test("uncertain scans ask for material confirmation rather than claiming bin acceptance",()=>{
  const prompts=scanQuestionSuggestions(scan("Unidentified packaging",{
    identification:"uncertain",route:"needs_identification"
  }),"en");
  assert.match(prompts[0],/confirm what material/i);
  assert.match(prompts[1],/before choosing a bin/i);
});

test("Ask uses current scan-specific prompts and keeps general prompts without scan",()=>{
  const srcAsk=src("AskWasteLens.tsx");
  assert.match(srcAsk,/scanQuestionSuggestions\(scan,language\)/);
  assert.match(srcAsk,/generalPrompts\.map\(prompt=>t\(prompt\)\)/);
  assert.match(srcAsk,/onClick=\{onScan\}/);
  assert.doesNotMatch(srcAsk,/Can I recycle this with its cap or lid\?/);
  assert.match(srcAsk,/setMessages\(\[\]\)/);
});

test("View scan reliably scrolls to the very top of the Scan page",()=>{
  const app=src("App.tsx");
  assert.match(app,/function returnToScannedItem\(\)/);
  assert.match(app,/onScan=\{returnToScannedItem\}/);
  assert.match(app,/setView\("identifier"\)/);
  assert.match(app,/window\.scrollTo\(\{top:0,left:0,behavior:"instant"\}\)/);
  assert.match(app,/document\.scrollingElement\.scrollTop = 0/);
  assert.match(app,/window\.requestAnimationFrame\(top\)/);
  assert.doesNotMatch(app,/scanResultsRef\.current\.scrollIntoView/);
  assert.doesNotMatch(app,/returnToScanResultRef/);
});
