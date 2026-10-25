import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../public/kiosk-readability-fixes.css",import.meta.url),"utf8");
test("The contrast repair is loaded last for Current UI, never for Legacy",()=>{
 const order=["/claude-theme.css","/kiosk-experiment.css","/kiosk-readability-fixes.css"].map(s=>app.indexOf(s));
 assert.ok(order.every(i=>i>=0));
 assert.ok(order[0]<order[1]&&order[1]<order[2]);
 assert.match(app,/readable\.media = visualStyle === "claude" \? "all" : "not all"/);
});
test("All repair selectors are limited to secondary screens, protecting pinned 3D Scan",()=>{
 const withoutComments=styles.replace(/\/\*[\s\S]*?\*\//g,"");
 const selectors=[...withoutComments.matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim());
 for(const selector of selectors){
  if(selector.startsWith("@"))continue;
  for(const part of selector.split(/,\s*(?=html|\.site)/)){
    if(part.trim().startsWith("@"))continue;
    assert.ok(part.includes(".site.is-classic-page")||part.includes("main .")||part.includes("html ."),"unexpected unscoped: "+part.slice(0,130));
  }
 }
 assert.doesNotMatch(withoutComments,/\.site\.is-stage|\.stage-wrap|\.es-canvas|\.es-type/);
});
test("Essential kiosk fixes have direct coverage",()=>{
 for(const marker of [".documentary-opening h1",".documentary-chapter h2",".deposit-result .deposit-amount",".deposit-result h2",".location-info strong",".location-info small",".location-meta",".audit-count-row>div span",".audit-count-row>div strong",".community-about-hero",".chat-suggestions button",".community-saved-item"]){
   assert.ok(styles.includes(marker),marker);
 }
 assert.match(styles,/color:var\(--k-ink\)!important/);
 assert.match(styles,/@media\(max-width:730px\)/);
});
