import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const source=read("i18n-more.ts");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {moreTranslations}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));

test("the built-in Administrator label changes with Spanish and Hindi",()=>{
  assert.equal(moreTranslations.Administrator.es,"Administrador");
  assert.equal(moreTranslations.Administrator.hi,"व्यवस्थापक");
  const account=read("AccountMenu.tsx");
  assert.match(account,/user\?\.role==="admin"/);
  assert.match(account,/user\.name\.trim\(\)\.toLowerCase\(\)==="administrator"/);
  assert.match(account,/t\("Administrator"\)/);
  assert.match(account,/\(user\?\.name \|\| t\("Sign in"\)\)/);
});

test("existing account dropdown content and personalization remain unchanged",()=>{
  const account=read("AccountMenu.tsx");
  assert.match(account,/SpeechSettingsPanel/);
  assert.match(account,/showAccessibility/);
  assert.match(account,/showThemes/);
});
