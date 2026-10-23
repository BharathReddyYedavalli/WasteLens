import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const compiled=ts.transpileModule(read("i18n-more.ts"),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
}).outputText;
const {moreTranslations}=await import("data:text/javascript;base64,"+
  Buffer.from(compiled).toString("base64"));

test("Bottle Journey removes only the full credits/research appendix, preserves attribution",()=>{
  const source=read("DocumentaryStory.tsx");
  assert.doesNotMatch(source,/className="documentary-sources"/);
  assert.doesNotMatch(source,/Photo credits and research/);
  assert.match(source,/documentary-photo-credits/);
  assert.match(source,/photo\.licenseUrl/);
  assert.match(source,/chapter\.statSource/);
  assert.match(source,/documentary-minimap/);
  assert.match(source,/documentary-explore/);
});

test("language selector looks up added translations in addition to original catalog",()=>{
  const source=read("i18n.tsx");
  assert.match(source,/import \{moreTranslations\} from "\.\/i18n-more";/);
  assert.match(source,/strings\[text\]\?\.\[language\] \?\? moreTranslations\[text\]\?\.\[language\]/);
  assert.ok(Object.keys(moreTranslations).length>=220);
  for(const [key,values] of Object.entries(moreTranslations)){
    assert.equal(typeof values.es,"string",key+" Spanish");
    assert.equal(typeof values.hi,"string",key+" Hindi");
    assert.ok(values.es.trim().length>0,key+" Spanish empty");
    assert.ok(values.hi.trim().length>0,key+" Hindi empty");
  }
});

test("main page headings and controls use translation on render, not only initial mount",()=>{
  const filenames=["App.tsx","AccountArea.tsx","AskWasteLens.tsx","Leaderboard.tsx",
    "RecyclingResults.tsx","MapPanel.tsx","BottleReturns.tsx","AuditKit.tsx",
    "HabitSnapshot.tsx","BottleJourney.tsx"];
  for(const file of filenames){
    assert.match(read(file),/useLanguage\(/,file);
  }
  assert.match(read("AccountArea.tsx"),/t\("Accounts"\)/);
  assert.match(read("Leaderboard.tsx"),/t\("Recycling actions are self reported/);
  assert.match(read("MapPanel.tsx"),/\[data, onSelect, t\]/);
  assert.match(read("RecyclingResults.tsx"),/t\("Within"\)/);
  assert.match(read("AskWasteLens.tsx"),/t\("Thinking…"\)/);
  assert.match(read("AuditKit.tsx"),/t\("items"\)/);
});

test("Bottle Returns translations include every state tip and all eligible-case reasons",()=>{
  const backend=readFileSync(new URL("../../backend/app/deposit_rules.py",import.meta.url),"utf8");
  const tips=backend.split("STATE_TIPS = {")[1].split("\n}")[0];
  const tipList=[...tips.matchAll(/:\s*"([^"]+)"/g)].map(match=>match[1]);
  for(const tip of tipList)assert.ok(moreTranslations[tip],tip);
  const cases=[...backend.matchAll(/return (?:no|yes|check)\([^,\n]+,\s*"([^"]+)"\)/g)]
    .map(match=>match[1]);
  for(const reason of cases)assert.ok(moreTranslations[reason],reason);
  assert.match(read("BottleReturns.tsx"),/localizedDepositReason\(result\.reason,t\)/);
  assert.match(read("BottleReturns.tsx"),/t\(result\.state_tip\)/);
  assert.match(read("BottleReturns.tsx"),/t\(s\.name\)/);
  assert.match(read("BottleReturns.tsx"),/t\("Refund eligibility depends/);
});
