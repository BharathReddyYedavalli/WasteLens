import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = file => readFileSync(new URL("../src/"+file,import.meta.url),"utf8");
const data = JSON.parse(read("data/texas-demo-rules.json"));
const panel=read("TexasDemoRules.tsx");
const local=read("LocalRulesGuide.tsx");
const app=read("App.tsx");
const translated=read("i18n-more.ts");
const css=read("texas-demo-rules.css");

test("Exactly four Texas programs with public source links and specific statuses",()=>{
  assert.equal(data.texas_only,true);
  assert.equal(data.profiles.length,4);
  assert.deepEqual(data.profiles.map(p=>p.context),["home","school","business","business"]);
  assert.equal(data.profiles.reduce((n,p)=>n+Object.keys(p.rules).length,0),45);
  for (const profile of data.profiles) {
    assert.equal(profile.location.state,"TX");
    assert.ok(profile.scope.length>40);
    assert.ok(profile.sources.every(url=>url.startsWith("https://")));
    for (const [key,rule] of Object.entries(profile.rules)) {
      assert.equal(key,rule.item_key);
      assert.ok(["recycle","trash","compost","special_dropoff","not_accepted_here"].includes(rule.status));
      assert.ok(rule.source_url.startsWith("https://"));
      assert.ok(rule.instruction.length>=20);
    }
  }
});
test("The same material can lead to different choices, without inventing general bin rules",()=>{
  const home=data.profiles.find(p=>p.id==="home_frisco_tx");
  const heb=data.profiles.find(p=>p.id==="business_heb_frisco_tx");
  const bestbuy=data.profiles.find(p=>p.id==="business_bestbuy_frisco_tx");
  const utd=data.profiles.find(p=>p.id==="school_ut_dallas_tx");
  assert.equal(home.rules.plastic_bottle.status,"recycle");
  assert.equal(home.rules.plastic_grocery_bag.status,"special_dropoff");
  assert.equal(heb.rules.plastic_grocery_bag.status,"special_dropoff");
  assert.equal(heb.rules.plastic_bottle.status,"not_accepted_here");
  assert.equal(bestbuy.rules.cell_phone.status,"special_dropoff");
  assert.equal(bestbuy.rules.standalone_battery.status,"not_accepted_here");
  assert.equal(utd.rules.household_battery.status,"special_dropoff");
  for (const profile of [heb,bestbuy]) assert.match(profile.scope,/CUSTOMER|Consumer/);
  assert.doesNotMatch(panel,/not_accepted_here:\s*"Use ordinary trash"/);
});
test("Scan passes identification and material information into an optional, explicit profile selector",()=>{
  assert.match(app,/scanItemName=\{analysis\.item_name\}/);
  assert.match(app,/scanMaterial=\{analysis\.material_guess\}/);
  assert.match(app,/scanIdentified=\{analysis\.identification==="likely"\}/);
  assert.match(local,/<TexasDemoRules collectionType=\{collectionType\}/);
  assert.match(local,/scanItemName=\s*""/);
  assert.match(panel,/const \[profileId,setProfileId\] = useState\(""/);
  assert.match(panel,/collectionType==="residential"\?"home"/);
  assert.match(panel,/profile\.rules\[chosenKey\]/);
  assert.match(panel,/rule\?\.instruction\|\|profile\.default_message/);
  assert.match(panel,/profile\.context==="business"/);
  assert.match(panel,/!isIdentified&&itemName/);
  assert.match(panel,/if\(!n\.trim\(\)\)return ""/);
  assert.match(panel,/manualItem\|\|inferred/);
});
test("Texas demo UI preserves visible provenance, constraints and theme",()=>{
  assert.match(panel,/href=\{rule\?\.source_url\|\|profile\.sources\[0\]\}/);
  assert.match(panel,/rule\?\.condition/);
  assert.match(panel,/scan identification/i);
  assert.match(panel,/customer drop-off/i);
  assert.match(css,/var\(--wl-paper/);
  assert.match(css,/@media\(max-width:600px\)/);
  for (const key of ["Texas demo recycling rules","No confirmed rule for this item",
    "Customer drop-off program, not the business's employee bin policy.",
    "Choose the exact collection program","Published rule examples • Not live verification"]) {
    assert.ok(translated.includes(JSON.stringify(key)+":"),key);
  }
});
