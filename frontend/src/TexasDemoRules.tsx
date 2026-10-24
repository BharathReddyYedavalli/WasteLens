import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, ShieldAlert } from "lucide-react";
import rulesData from "./data/texas-demo-rules.json";
import { useLanguage } from "./i18n";

type RuleStatus = "recycle" | "trash" | "compost" | "special_dropoff" | "not_accepted_here";
type Rule = {status:RuleStatus;instruction:string;source_url:string;item_key:string;condition?:string};
type Profile = {
 id:string;name:string;context:"school"|"office"|"business";scope:string;
 default_message:string;sources:string[];rules:Record<string,Rule>;
};
const profiles = rulesData.profiles as unknown as Profile[];
const labelById:Record<string,string>={
  school_purefoy_elementary_tx:"Purefoy Elementary",
  school_spears_elementary_tx:"Spears Elementary",
  school_scoggins_middle_tx:"Scoggins Middle School",
  school_maus_middle_tx:"Maus Middle School",
  school_panther_creek_high_tx:"Panther Creek High School",
  school_wakeland_high_tx:"Wakeland High School",
  school_ut_dallas_tx:"UT Dallas (University)",
  office_ut_dallas_tx:"UT Dallas Campus Offices",
  business_heb_frisco_tx:"H-E-B",
  business_bestbuy_frisco_tx:"Best Buy",
  business_home_depot_frisco_tx:"Home Depot",
  business_staples_frisco_tx:"Staples",
};
const shortScope:Record<string,string>={
  school_purefoy_elementary_tx:"Frisco ISD school. District recycling drives are documented; exact campus bin rules are not.",
  school_spears_elementary_tx:"Frisco ISD school. District recycling drives are documented; exact campus bin rules are not.",
  school_scoggins_middle_tx:"Frisco ISD school. District recycling drives are documented; exact campus bin rules are not.",
  school_maus_middle_tx:"Frisco ISD school. District recycling drives are documented; exact campus bin rules are not.",
  school_panther_creek_high_tx:"Frisco ISD school. District recycling drives are documented; exact campus bin rules are not.",
  school_wakeland_high_tx:"Frisco ISD school. District recycling drives are documented; exact campus bin rules are not.",
  school_ut_dallas_tx:"University campus recycling and designated special-collection sites.",
  office_ut_dallas_tx:"UT Dallas campus office bins and designated special-collection sites only.",
  business_heb_frisco_tx:"Customer plastic-film drop-off, not employee sorting bins.",
  business_bestbuy_frisco_tx:"Consumer electronics drop-off, not employee sorting bins.",
  business_home_depot_frisco_tx:"Customer film, CFL and rechargeable-battery drop-off, not employee bins.",
  business_staples_frisco_tx:"Customer electronics and office-supplies drop-off, not employee bins.",
};
const itemNames:Record<string,string>={
 plastic_bottle:"Plastic bottle",aluminum_can:"Aluminum can",glass_bottle:"Glass bottle",
 clean_cardboard:"Cardboard",paper:"Paper",paper_coffee_cup:"Paper coffee cup",
 plastic_clamshell:"Plastic food container",plastic_grocery_bag:"Plastic grocery bag",
 household_battery:"Household battery",rechargeable_battery:"Rechargeable battery",
 cfl_bulb:"CFL light bulb",food_scraps:"Food scraps",food_wrapper:"Food wrapper",
 plastic_wrap:"Plastic film",soft_plastic_overwrap:"Plastic overwrap",
 cell_phone:"Cell phone",laptop:"Laptop",printer_cartridge:"Ink/toner cartridge",
 bread_bag:"Bread bag",produce_bag:"Produce bag",bubble_wrap:"Bubble wrap",
 computer_keyboard:"Computer keyboard",electrical_cable:"Electrical cable",
 standalone_battery:"Loose battery",pen_marker:"Pen or marker",binder:"Binder",
 compostable_bag:"Compostable bag",candy_wrapper:"Candy wrapper",
 metal_can:"Food can",newspaper:"Newspaper",
};
const popular:Record<string,string[]>={
 school_purefoy_elementary_tx:["plastic_grocery_bag","household_battery","plastic_bottle","paper","food_scraps"],
 school_spears_elementary_tx:["plastic_grocery_bag","household_battery","plastic_bottle","paper","food_scraps"],
 school_scoggins_middle_tx:["plastic_grocery_bag","household_battery","plastic_bottle","paper","food_wrapper"],
 school_maus_middle_tx:["plastic_grocery_bag","household_battery","plastic_bottle","paper","food_wrapper"],
 school_panther_creek_high_tx:["plastic_grocery_bag","household_battery","plastic_bottle","paper","food_scraps"],
 school_wakeland_high_tx:["plastic_grocery_bag","household_battery","plastic_bottle","paper","food_scraps"],
 school_ut_dallas_tx:["plastic_bottle","aluminum_can","clean_cardboard","plastic_wrap","household_battery","cell_phone"],
 office_ut_dallas_tx:["paper","clean_cardboard","plastic_bottle","printer_cartridge","household_battery"],
 business_heb_frisco_tx:["plastic_grocery_bag","bread_bag","bubble_wrap","plastic_bottle","compostable_bag"],
 business_bestbuy_frisco_tx:["cell_phone","laptop","computer_keyboard","standalone_battery"],
 business_home_depot_frisco_tx:["plastic_grocery_bag","plastic_wrap","cfl_bulb","rechargeable_battery","household_battery"],
 business_staples_frisco_tx:["printer_cartridge","cell_phone","laptop","pen_marker","rechargeable_battery"],
};
const statuses:Record<RuleStatus,string>={
 recycle:"Use recycling",
 trash:"Use trash",
 compost:"Use designated compost",
 special_dropoff:"Use special collection",
 not_accepted_here:"Not accepted by this program",
};

export function inferDemoItem(itemName:string, material:string, profileId:string):string {
  const n=itemName.toLowerCase().trim();
  void material; // Material alone is too uncertain to identify an item.
  // Material labels alone cannot reliably establish the item.
  if(!n.trim())return "";
  if(/phone case|phone charger|phone holder/.test(n))return "";
  if(/cell ?phone|smartphone|mobile phone|iphone|android phone/.test(n))return "cell_phone";
  if(/\blaptop\b|notebook computer/.test(n))return "laptop";
  if(/keyboard/.test(n))return "computer_keyboard";
  if(/computer mouse|wireless mouse/.test(n))return "computer_mouse";
  if(/printer ink|toner cartridge/.test(n))return "printer_cartridge";
  if(/bubble wrap/.test(n))return "bubble_wrap";
  if(/plastic (grocery|shopping) bag|grocery bag|shopping bag/.test(n))return "plastic_grocery_bag";
  if(/produce bag/.test(n))return "produce_bag";
  if(/bread bag/.test(n))return "bread_bag";
  if(/plastic wrap|flexible plastic film/.test(n))return profileId==="business_heb_frisco_tx"?"soft_plastic_overwrap":"plastic_wrap";
  if(/compostable bag/.test(n))return "compostable_bag";
  if(/frozen (food|vegetable) bag/.test(n))return "frozen_food_bag";
  if(/candy wrapper/.test(n))return "candy_wrapper";
  if(/chip bag|food wrapper/.test(n))return "food_wrapper";
  if(/plastic (clamshell|takeout container)|clamshell/.test(n))return "plastic_clamshell";
  if(/compact fluorescent|cfl bulb|cfl light/.test(n))return "cfl_bulb";
  if(/pen\b|marker\b|highlighter\b/.test(n))return "pen_marker";
  if(/\bbinder\b/.test(n))return "binder";
  if(/foam (takeout|food) (tray|container)/.test(n))return "foam_takeout_tray";
  if(/styrofoam|foam packaging/.test(n))return "foam_packaging";
  if(/paper (coffee |drink |hot )?cup|coffee cup/.test(n))return "paper_coffee_cup";
  if(/cardboard/.test(n))return "clean_cardboard";
  if(/newspaper/.test(n))return "newspaper";
  if(/food scraps|leftover food/.test(n))return "food_scraps";
  if(/rechargeable battery|lithium[- ]ion battery|power tool battery/.test(n))return "rechargeable_battery";
  if(/battery|batteries/.test(n))return profileId==="business_bestbuy_frisco_tx"?"standalone_battery":"household_battery";
  if(/glass bottle|glass jar/.test(n))return "glass_bottle";
  if(/milk jug/.test(n))return "milk_jug";
  if(/reusable|stainless|metal bottle|steel bottle/.test(n))return "";
  if(/plastic (water |drink |soda )?bottle|pet bottle|water bottle/.test(n) &&
    !/glass bottle/.test(n)) return "plastic_bottle";
  if(/(aluminum|aluminium|soda|beverage) can/.test(n))return "aluminum_can";
  if(/(steel|tin) (food )?can/.test(n))return "metal_can";
  if(/\bpaper\b/.test(n) && !/towel|cup|plate/.test(n))return "paper";
  return "";
}


type Props={ itemName?:string; materialGuess?:string; isIdentified?:boolean };
const storageKey="wastelens-selected-institution";

export default function TexasDemoRules({itemName="",materialGuess="",isIdentified=false}:Props){
 const {t,language}=useLanguage();
 const [locationId,setLocationId]=useState(()=>{
   try{
     const value=window.localStorage.getItem(storageKey)||"";
     return profiles.some(p=>p.id===value)?value:"";
   }catch{return "";}
 });
 const [correcting,setCorrecting]=useState(false);
 const [correction,setCorrection]=useState("");
 useEffect(()=>{setCorrecting(false);setCorrection("");},[itemName,materialGuess]);
 const profile=profiles.find(p=>p.id===locationId);
 const inferred=profile&&isIdentified?inferDemoItem(itemName,materialGuess,profile.id):"";
 const selectedItem=correcting?correction:inferred;
 const rule=profile&&selectedItem?profile.rules[selectedItem]:undefined;
 const options=useMemo(()=>{
   if(!profile)return [];
   const list=[...(popular[profile.id]||[])];
   if(inferred&&!list.includes(inferred))list.unshift(inferred);
   return list;
 },[profile?.id,inferred]);
 function selectLocation(next:string){
   setLocationId(next);
   setCorrecting(false);
   setCorrection("");
   try{next==="other"?window.localStorage.removeItem(storageKey):window.localStorage.setItem(storageKey,next);}catch{/* Kiosks may disable localStorage. */}
 }
 return <div className="institution-rule-flow">
   <label htmlFor="institution-selector">{t("Where are you?")}
     <select id="institution-selector" value={locationId} onChange={e=>selectLocation(e.target.value)}>
       <option value="">{t("Select your school, office or business")}</option>
       <optgroup label={t("Schools")}>
         {profiles.filter(p=>p.context==="school").map(p=><option key={p.id} value={p.id}>{labelById[p.id]||p.name}</option>)}
       </optgroup>
       <optgroup label={t("Offices")}>
         {profiles.filter(p=>p.context==="office").map(p=><option key={p.id} value={p.id}>{labelById[p.id]||p.name}</option>)}
       </optgroup>
       <optgroup label={t("Businesses")}>
         {profiles.filter(p=>p.context==="business").map(p=><option key={p.id} value={p.id}>{labelById[p.id]||p.name}</option>)}
       </optgroup>
       <option value="other">{t("Other location")}</option>
     </select>
   </label>
   {locationId==="other"&&<div className="institution-other" role="status">
     <strong>{t("Rules for this location aren't available yet.")}</strong>
     <p>{t("Ask the school, office manager or waste collection provider which bins accept your item.")}</p>
     <a target="_blank" rel="noopener noreferrer" href="https://takecareoftexas.org/resources/school-recycling-guide">
       {t("Texas recycling resources")} <ExternalLink size={14}/>
     </a>
   </div>}
   {profile&&<>
     <p className="institution-scope">{shortScope[profile.id]||profile.scope}</p>
     <div className="institution-scanned">
       <div className="institution-scanned-row">
         <span><strong>{t("Scanned item")}:</strong> {itemName||t("Item not identified")}</span>
         {!correcting&&<button type="button" className="institution-change" onClick={()=>{setCorrecting(true);setCorrection(inferred);}}>
           {t("Wrong item? Change it")}
         </button>}
       </div>
       {correcting&&<label htmlFor="institution-correction">
         {t("Correct the item")}
         <select id="institution-correction" value={correction} onChange={e=>setCorrection(e.target.value)}>
           <option value="">{t("Choose the correct item")}</option>
           {options.map(key=><option key={key} value={key}>{itemNames[key]||key.replace(/_/g," ")}</option>)}
           <option value="__other__">{t("Other item")}</option>
         </select>
         <button type="button" className="institution-cancel" onClick={()=>{setCorrecting(false);setCorrection("");}}>
           {t("Cancel correction")}
         </button>
       </label>}
     </div>
     <div className={"texas-demo-result"+(rule?.status==="recycle"?" texas-demo-recycle":"")} role="status">
       <div className="texas-demo-result-title">
         {rule?.status==="recycle"?<CheckCircle2 size={20}/>:<ShieldAlert size={20}/>}
         <strong>{!isIdentified&&!correcting
           ?t("Confirm the scanned item first")
           :rule?t(statuses[rule.status]):t("No confirmed rule for this item")}</strong>
       </div>
       {!isIdentified&&!correcting?<p>{t("The scan was uncertain. Use Change item to confirm what you scanned.")}</p>:
         rule?<><p>{rule.instruction}</p>{rule.condition&&<p>{t("Conditions")}: {rule.condition}</p>}</>:
         <p>{profile.default_message}</p>}
       {language!=="en"&&<p className="texas-demo-caption">
         {t("Official rules are written in English; check the source for exact requirements.")}
       </p>}
       <a target="_blank" rel="noopener noreferrer" href={rule?.source_url||profile.sources[0]}>
         {t("View official rules")} <ExternalLink size={14}/>
       </a>
     </div>
   </>}
 </div>;
}
