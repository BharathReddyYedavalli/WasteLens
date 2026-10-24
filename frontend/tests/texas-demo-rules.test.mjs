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
  assert.match(local,/scanItemName\s*=\s*""/);
  assert.match(panel,/const \[profileId,setProfileId\]\s*=\s*useState\(""/);
  assert.match(panel,/collectionType==="residential"\?"home"/);
  assert.match(panel,/profile\.rules\[chosenKey\]/);
  assert.match(panel,/rule\?\.instruction\|\|profile\.default_message/);
  assert.match(panel,/business_heb_frisco_tx:"H-E-B"/);
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
  assert.match(css,/@media\(max-width:640px\)/);
  for (const key of ["No confirmed rule for this item",
    "Choose your location","Where are you?","Select a location",
    "What item is it?","My location isn't listed"]) {
    assert.ok(translated.includes(JSON.stringify(key)+":"),key);
  }
});

test("Simple Scan rules avoid demo jargon and show one primary workflow",()=>{
  assert.doesNotMatch(panel,/Texas demo recycling rules|Published rule examples • Not live verification/);
  assert.doesNotMatch(panel,/Choose the exact collection program/);
  assert.match(panel,/t\("Choose your location"\)/);
  assert.match(panel,/t\("What item is it\?"\)/);
  assert.match(local,/t\("Where are you\?"\)/);
  assert.match(local,/showOtherServices&&<div id="local-other-services"/);
  assert.match(local,/!open \|\| !showOtherServices \|\| !validZip/);
  assert.match(panel,/profileNames\[p\.id\]\|\|p\.name/);
  assert.match(panel,/H-E-B"/);
  assert.match(panel,/Best Buy"/);
  assert.match(css,/\.local-location-row/);
  assert.match(css,/align-items:start/);
  assert.match(css,/height:52px!important/);
});
test("Item list is tailored to each location; source rules stay intact",()=>{
  const count = {
    home_frisco_tx:8,school_ut_dallas_tx:8,
    business_heb_frisco_tx:7,business_bestbuy_frisco_tx:5,
  };
  for(const [id,num] of Object.entries(count)) {
    const block=panel.split(id+":[")[1];
    assert.ok(block,id);
    assert.equal(block.split("]")[0].split('"').length/2|0,num,id);
  }
  assert.match(panel,/\.\.\.\(inferred\?\[inferred\]:\[\]\)/);
  assert.match(panel,/highlightedItems\[profile\.id\]/);
  assert.match(panel,/profile\.rules\[chosenKey\]/);
  assert.equal(data.profiles.reduce((n,p)=>n+Object.keys(p.rules).length,0),45);
});
