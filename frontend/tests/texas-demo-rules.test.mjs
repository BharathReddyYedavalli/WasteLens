import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as vmModule from "node:vm";

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
  assert.equal(all.length,16);
  assert.deepEqual([...new Set(all.map(p=>p.context))],["school","office","business"]);
  assert.ok(all.every(p=>p.location.state==="TX"));
  assert.equal(all.filter(p=>p.context==="school"&&["elementary","middle","high"].includes(p.school_type)).length,6);
  for(const level of ["elementary","middle","high"])assert.equal(all.filter(p=>p.school_type===level).length,2);
  assert.ok(all.some(p=>p.context==="office"));
  assert.equal(all.filter(p=>p.context==="business").length,8);
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

test("Two Texas food chains offer supported, appropriately qualified consumer guidance",()=>{
  const dominos=byId("business_dominos_frisco_tx");
  const starbucks=byId("business_starbucks_frisco_tx");
  assert.equal(dominos.context,"business");
  assert.equal(starbucks.context,"business");
  assert.equal(dominos.rules.pizza_box.status,"check_local_recycling");
  assert.match(dominos.rules.pizza_box.condition,/local programs differ/i);
  assert.match(dominos.scope,/not proof/i);
  assert.equal(starbucks.rules.reusable_cup.status,"reuse");
  assert.equal(starbucks.rules.reusable_mug.status,"reuse");
  assert.equal(starbucks.rules.plastic_cold_cup.status,"check_local_recycling");
  assert.match(starbucks.rules.plastic_cold_cup.condition,/not assume/i);
  assert.match(panel,/business_dominos_frisco_tx:"Domino’s Pizza"/);
  assert.match(panel,/business_starbucks_frisco_tx:"Starbucks"/);
});

test("Item name aliases match common scans without guessing from material alone",()=>{
  // Exercise the real TypeScript matcher through Node VM without running React.
  const vm = requireVm();
  const match=panel.match(/export function inferDemoItem\(itemName:string, material:string, profileId:string\):string \{[\s\S]*?\n\}/);
  assert.ok(match,"inferDemoItem function available");
  const javascript=match[0].replace(
    "export function inferDemoItem(itemName:string, material:string, profileId:string):string",
    "function inferDemoItem(itemName, material, profileId)"
  );
  const infer=vm.runInNewContext(javascript+"\ninferDemoItem");
  const id="school_ut_dallas_tx";
  for(const [item,want] of [
    ["Plastic bottle or jug","plastic_bottle"],
    ["Plastic water bottle","plastic_bottle"],
    ["Clear PET beverage bottle","plastic_bottle"],
    ["Soda can","aluminum_can"],
    ["Aluminum beverage can","aluminum_can"],
    ["Corrugated pizza box","pizza_box"],
    ["Greasy pizza cardboard box","pizza_box"],
    ["Reusable travel cup","reusable_cup"],
    ["Ceramic coffee mug","reusable_mug"],
    ["Plastic cold cup","plastic_cold_cup"],
    ["Cardboard shipping box","clean_cardboard"],
    ["Empty glass bottle","glass_bottle"],
    ["Old smartphone","cell_phone"],
    ["Printer ink cartridge","printer_cartridge"],
    ["Paper plate",""],
    ["Phone case",""],
    ["Raspberry Pi 4 Model B","raspberry_pi"],
    ["Raspberry Pi circuit board","raspberry_pi"],
    ["Single-board computer","raspberry_pi"],
    ["Printed circuit board","circuit_board"],
    ["Aluminum foil food tray","aluminum_tray"],
    ["Aluminum baking pan","aluminum_tray"],
    ["Foil food container","aluminum_tray"],
    ["Aluminum pie plate","aluminum_pie_plate"],
    ["Alkaline AA battery","alkaline_battery"],
    ["AAA battery","alkaline_battery"],
    ["Rechargeable lithium-ion battery","rechargeable_battery"],
    ["Power tool battery","rechargeable_battery"],
    ["Reusable metal bottle",""],
  ]){
    assert.equal(infer(item,"unrelated plastic",id),want,item);
  }
  assert.equal(infer("","plastic",id),"");
});
function requireVm(){return vmModule;}

test("Distinct specialist programs handle harder physical demo objects",()=>{
  const tds=byId("business_texas_disposal_systems_tx");
  const dfw=byId("business_dfw_electronics_plano_tx");
  const home=byId("business_home_depot_frisco_tx");
  const staples=byId("business_staples_frisco_tx");
  const best=byId("business_bestbuy_frisco_tx");
  assert.equal(tds.rules.aluminum_tray.status,"recycle");
  assert.match(tds.rules.aluminum_tray.condition,/TDS recycling/);
  assert.equal(tds.rules.alkaline_battery.status,"not_accepted_here");
  assert.equal(dfw.rules.cell_phone.status,"special_dropoff");
  assert.equal(dfw.rules.raspberry_pi.status,"verify_dropoff");
  assert.match(dfw.rules.raspberry_pi.instruction,/confirm/i);
  assert.equal(home.rules.rechargeable_battery.status,"special_dropoff");
  assert.equal(home.rules.alkaline_battery.status,"not_accepted_here");
  assert.equal(staples.rules.alkaline_battery.status,"special_dropoff");
  assert.match(staples.rules.alkaline_battery.condition,/fee|\$2\.99/i);
  assert.equal(best.rules.standalone_battery.status,"not_accepted_here");
  for(const p of [tds,dfw])assert.ok(p.sources.every(url=>url.startsWith("https://")));
  assert.match(panel,/business_dfw_electronics_plano_tx:"DFW Electronics Recycling"/);
  assert.match(panel,/business_texas_disposal_systems_tx:"Texas Disposal Systems"/);
  assert.match(panel,/verify_dropoff:"Confirm with recycling center"/);
});
