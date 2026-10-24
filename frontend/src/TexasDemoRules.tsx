import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import rulesData from "./data/texas-demo-rules.json";
import { useLanguage } from "./i18n";

type RuleStatus = "recycle" | "trash" | "compost" | "special_dropoff" | "not_accepted_here" | "check_local_recycling" | "reuse";
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
  business_dominos_frisco_tx:"Domino’s Pizza",
  business_starbucks_frisco_tx:"Starbucks",
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
  business_dominos_frisco_tx:"Pizza-box recycling guidance; local bin acceptance must be checked.",
  business_starbucks_frisco_tx:"Bring-your-own-cup program; not a verified disposable-cup bin policy.",
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
 pizza_box:"Pizza box",reusable_cup:"Reusable travel cup",reusable_mug:"Reusable mug",
 plastic_cold_cup:"Plastic cold-drink cup",
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
 business_dominos_frisco_tx:["pizza_box"],
 business_starbucks_frisco_tx:["reusable_cup","reusable_mug","plastic_cold_cup"],
};
const statuses:Record<RuleStatus,string>={
 recycle:"Use recycling",
 trash:"Use trash",
 compost:"Use designated compost",
 special_dropoff:"Use special collection",
 not_accepted_here:"Not accepted by this program",
 check_local_recycling:"Check local recycling rules",
 reuse:"Reuse this item",
};

export function inferDemoItem(itemName:string, material:string, profileId:string):string {
  // Match the *identified object*, not a loose material guess. Material alone
  // is not enough to turn an uncertain photo into a firm disposal instruction.
  const n=itemName.toLowerCase().trim();
  void material;
  if(!n)return "";

  // A precise item type takes precedence over broad words such as cardboard or cup.
  if(/pizza[\s-]*(box|carton)|pizza cardboard box/.test(n))return "pizza_box";
  if(/ceramic mug|coffee mug|reusable mug|glass mug/.test(n))return "reusable_mug";
  if(/reusable (coffee |drink |travel |water )?(cup|tumbler|mug)|personal (coffee )?cup|travel mug|travel cup|thermos|stainless steel tumbler/.test(n))return "reusable_cup";
  if(/(plastic|clear|disposable) (cold|iced|takeaway|to-go) (drink |coffee )?cup|plastic cold cup|iced coffee cup/.test(n))return "plastic_cold_cup";
  if(/phone case|phone holder/.test(n))return "";
  if(/phone charger|usb charging cable|charging cord|electrical cable|power cord/.test(n))return "electrical_cable";
  if(/cell[\s-]?phone|smartphone|mobile phone|iphone|android phone/.test(n))return "cell_phone";
  if(/\blaptop\b|notebook computer|laptop computer/.test(n))return "laptop";
  if(/computer keyboard|\bkeyboard\b/.test(n))return "computer_keyboard";
  if(/computer mouse|wireless mouse/.test(n))return "computer_mouse";
  if(/ink (cartridge|toner)|printer cartridge|toner cartridge/.test(n))return "printer_cartridge";
  if(/bubble wrap|air pillow/.test(n))return "bubble_wrap";
  if(/paper (grocery |shopping )?bag/.test(n))return "";
  if(/plastic (grocery|shopping|carrier) bag|grocery bag|shopping bag/.test(n))return "plastic_grocery_bag";
  if(/produce bag/.test(n))return "produce_bag";
  if(/bread bag/.test(n))return "bread_bag";
  if(/compostable bag/.test(n))return "compostable_bag";
  if(/frozen (food|vegetable) bag/.test(n))return "frozen_food_bag";
  if(/candy wrapper/.test(n))return "candy_wrapper";
  if(/chip bag|snack wrapper|food wrapper|chips packet/.test(n))return "food_wrapper";
  if(/plastic wrap|flexible plastic film|film wrap|soft plastic overwrap/.test(n))return profileId==="business_heb_frisco_tx"?"soft_plastic_overwrap":"plastic_wrap";
  if(/plastic (clamshell|takeout container|food container)|clamshell|clear takeout container/.test(n))return "plastic_clamshell";
  if(/compact fluorescent|cfl bulb|cfl light/.test(n))return "cfl_bulb";
  if(/\bpen\b|marker\b|highlighter\b/.test(n))return "pen_marker";
  if(/\bbinder\b/.test(n))return "binder";
  if(/foam (takeout|food) (tray|container)|foam food tray/.test(n))return "foam_takeout_tray";
  if(/styrofoam|foam packaging/.test(n))return "foam_packaging";
  if(/paper (coffee |drink |hot )?cup|coffee cup|hot paper cup/.test(n))return "paper_coffee_cup";
  if(/cardboard|shipping box|corrugated box/.test(n))return "clean_cardboard";
  if(/newspaper/.test(n))return "newspaper";
  if(/food scraps|leftover food|food waste/.test(n))return "food_scraps";
  if(/rechargeable battery|lithium[\s-]?ion battery|power tool battery/.test(n))return "rechargeable_battery";
  if(/battery|batteries/.test(n))return profileId==="business_bestbuy_frisco_tx"?"standalone_battery":"household_battery";
  if(/glass bottle|glass jar/.test(n))return "glass_bottle";
  if(/milk jug|milk container/.test(n))return "milk_jug";
  if(/reusable bottle|stainless|metal bottle|steel bottle/.test(n))return "";
  if(/plastic bottles?(\s+or\s+(jugs?|containers?))?|plastic (water |drink |soda |beverage )?bottle|pet bottle|water bottle|beverage bottle|soft drink bottle|drink bottle|clear plastic bottle|pet plastic bottle/.test(n)
    && !/glass bottle/.test(n))return "plastic_bottle";
  if(/alumin(?:um|ium) (soda |drink |beverage )?can|soda can|beverage can|soft drink can|beer can/.test(n))return "aluminum_can";
  if(/(?:steel|tin|metal) (?:food )?can|tin can/.test(n))return "metal_can";
  if(/\bpaper\b/.test(n) && !/towel|cup|plate|bag/.test(n))return "paper";
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
 const examples=profile?(popular[profile.id]||[]).filter(key=>Boolean(profile.rules[key])).slice(0,3):[];
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
     {examples.length>0&&<p className="institution-examples">
       {t("Try scanning")}: {examples.map(key=>itemNames[key]||key.replace(/_/g," ")).join(" · ")}
     </p>}
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
         <p>{selectedItem?profile.default_message:t("The scanned name does not match a supported item. Use Change item to select the correct item.")}</p>}
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
