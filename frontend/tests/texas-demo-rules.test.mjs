import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL("../src/"+file,import.meta.url),"utf8");
const data=JSON.parse(read("data/texas-demo-rules.json"));
const panel=read("TexasDemoRules.tsx");
const local=read("LocalRulesGuide.tsx");
const app=read("App.tsx");
const translations=read("i18n-more.ts");
const css=read("texas-demo-rules.css");
const all=data.profiles;
const byId=id=>all.find(p=>p.id===id);

test("Only Texas schools, campus offices and distinct businesses are shown",()=>{
  assert.equal(data.texas_only,true);
  assert.equal(all.length,12);
  assert.deepEqual([...new Set(all.map(p=>p.context))],["school","office","business"]);
  assert.ok(all.every(p=>p.location.state==="TX"));
  assert.equal(all.filter(p=>p.context==="school"&&["elementary","middle","high"].includes(p.school_type)).length,6);
  for(const level of ["elementary","middle","high"])assert.equal(all.filter(p=>p.school_type===level).length,2);
  assert.ok(all.some(p=>p.context==="office"));
  assert.equal(all.filter(p=>p.context==="business").length,4);
  assert.ok(all.every(p=>p.sources.every(u=>u.startsWith("https://"))));
  assert.ok(all.every(p=>Object.values(p.rules).every(r=>r.item_key&&r.source_url.startsWith("https://"))));
});

test("District school collection drives are explicitly conditional, not everyday campus bin rules",()=>{
  for(const school of all.filter(p=>["elementary","middle","high"].includes(p.school_type))){
    assert.match(school.scope,/does not confirm|does not verify/i);
    for(const type of ["household_battery","plastic_grocery_bag"]){
      const r=school.rules[type];
      assert.equal(r.status,"special_dropoff");
      assert.match(r.condition,/Only at an announced/i);
    }
    assert.equal(school.rules.plastic_bottle,undefined);
  }
});

test("Campus office and varied retailer programs are grounded in exact scopes",()=>{
  const office=byId("office_ut_dallas_tx");
  assert.equal(office.context,"office");
  assert.equal(office.rules.paper.status,"recycle");
  assert.equal(office.rules.household_battery.status,"special_dropoff");
  assert.match(byId("business_heb_frisco_tx").scope,/CUSTOMER/);
  assert.match(byId("business_bestbuy_frisco_tx").scope,/consumer/i);
  assert.equal(byId("business_home_depot_frisco_tx").rules.cfl_bulb.status,"special_dropoff");
  assert.equal(byId("business_staples_frisco_tx").rules.printer_cartridge.status,"special_dropoff");
  assert.equal(byId("business_staples_frisco_tx").rules.rechargeable_battery.status,"special_dropoff");
  assert.match(byId("business_staples_frisco_tx").rules.rechargeable_battery.condition,/fee/i);
  assert.equal(byId("business_heb_frisco_tx").rules.plastic_bottle.status,"not_accepted_here");
});

test("Scanned item is the automatic input, optional correction is separate",()=>{
  assert.match(app,/scanItemName=\{analysis\.item_name\}/);
  assert.match(app,/scanIdentified=\{analysis\.identification==="likely"\}/);
  assert.match(local,/<TexasDemoRules itemName=\{scanItemName\}/);
  assert.match(panel,/const inferred=profile&&isIdentified\?inferDemoItem\(itemName,materialGuess,profile\.id\):""/);
  assert.match(panel,/const selectedItem=correcting\?correction:inferred/);
  assert.match(panel,/!correcting&&<button/);
  assert.match(panel,/Wrong item\? Change it/);
  assert.match(panel,/correcting&&<label/);
  assert.match(panel,/profile\.rules\[selectedItem\]/);
  assert.match(panel,/no confirmed rule/i);
  assert.match(panel,/void material/);
  assert.match(panel,/!isIdentified&&!correcting/);
});

test("Single organization selector: Schools, Offices, Businesses, then Other location",()=>{
  assert.match(panel,/<optgroup label=\{t\("Schools"\)\}/);
  assert.match(panel,/<optgroup label=\{t\("Offices"\)\}/);
  assert.match(panel,/<optgroup label=\{t\("Businesses"\)\}/);
  assert.match(panel,/<option value="other">/);
  assert.doesNotMatch(panel,/context==="home"/);
  assert.doesNotMatch(local,/<input id="local-rule-zip"/);
  assert.doesNotMatch(local,/<select id="local-rule-context"/);
  assert.doesNotMatch(local,/local-discovery-item/);
  assert.match(local,/id="scan-local-rules"/);
  assert.match(panel,/wastelens-selected-institution/);
  assert.match(panel,/profile\.sources\[0\]/);
  assert.match(panel,/Rules for this location aren't available yet/);
});

test("Controls are readable on narrow screens and translated",()=>{
  assert.match(css,/\.institution-rule-flow/);
  assert.match(css,/@media\(max-width:640px\)/);
  for(const key of ["Select your school, office or business","Wrong item? Change it",
    "Other location","Schools","Offices","Businesses","View official rules",
    "Confirm the scanned item first"]){
    assert.ok(translations.includes(JSON.stringify(key)+":"),key);
  }
});
