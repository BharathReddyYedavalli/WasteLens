import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import rulesData from "./data/texas-demo-rules.json";
import { useLanguage } from "./i18n";

type Context = "residential" | "school" | "commercial";
type RuleStatus = "recycle" | "trash" | "compost" | "special_dropoff" | "not_accepted_here";
type DemoRule = {status:RuleStatus;instruction:string;source_url:string;item_key:string;condition?:string};
type DemoProfile = {
  id:string;name:string;context:"home"|"school"|"business";scope:string;
  default_message:string;sources:string[];rules:Record<string,DemoRule>;
};
const profiles:DemoProfile[]=rulesData.profiles as unknown as DemoProfile[];
const itemNames:Record<string,string>={
  aluminum_can:"Aluminum can",bread_bag:"Bread bag",bubble_wrap:"Bubble wrap",
  candy_wrapper:"Candy wrapper",cell_phone:"Mobile phone",clean_cardboard:"Clean cardboard",
  compostable_bag:"Compostable plastic bag",computer_keyboard:"Computer keyboard",
  computer_mouse:"Computer mouse",electrical_cable:"Electrical cable",foam_packaging:"Foam packaging",
  foam_takeout_tray:"Foam takeout tray",food_scraps:"Food scraps",food_wrapper:"Food wrapper",
  frozen_food_bag:"Frozen food bag",glass_bottle:"Glass bottle",household_battery:"Household battery",
  laptop:"Laptop",metal_can:"Metal food can",milk_jug:"Milk jug",newspaper:"Newspaper",
  newspaper_bag:"Plastic newspaper sleeve",paper:"Paper",paper_coffee_cup:"Paper coffee cup",
  pet_food_bag:"Pet food bag",plastic_bottle:"Plastic bottle",plastic_clamshell:"Plastic clamshell",
  plastic_food_storage_bag:"Plastic food storage bag",plastic_grocery_bag:"Plastic grocery bag",
  plastic_wrap:"Plastic film wrap",printer_cartridge:"Printer ink/toner cartridge",
  produce_bag:"Plastic produce bag",shipping_envelope_plastic:"Plastic shipping envelope",
  soft_plastic_overwrap:"Multipack plastic overwrap",standalone_battery:"Loose battery",
};
// Keep the demonstration focused: a short list of meaningful examples for each location.
// The full source-backed rule data remains available, and a scanned item is added
// to this list when the recognizer identifies one outside the common examples.
const highlightedItems:Record<string,string[]>={
  home_frisco_tx:[
    "plastic_bottle","aluminum_can","glass_bottle","clean_cardboard",
    "plastic_clamshell","paper_coffee_cup","plastic_grocery_bag","household_battery",
  ],
  school_ut_dallas_tx:[
    "plastic_bottle","aluminum_can","clean_cardboard","food_scraps",
    "food_wrapper","plastic_wrap","household_battery","cell_phone",
  ],
  business_heb_frisco_tx:[
    "plastic_grocery_bag","bread_bag","produce_bag","bubble_wrap",
    "plastic_bottle","candy_wrapper","compostable_bag",
  ],
  business_bestbuy_frisco_tx:[
    "cell_phone","laptop","computer_keyboard","electrical_cable","standalone_battery",
  ],
};
const profileNames:Record<string,string>={
  home_frisco_tx:"City of Frisco",
  school_ut_dallas_tx:"UT Dallas",
  business_heb_frisco_tx:"H-E-B",
  business_bestbuy_frisco_tx:"Best Buy",
};
const profileNotes:Record<string,string>={
  home_frisco_tx:"For homes served by Frisco's city recycling service only.",
  school_ut_dallas_tx:"For designated collection bins and drop-offs at UT Dallas.",
  business_heb_frisco_tx:"H-E-B Frisco customer drop-off for eligible plastic bags and film only.",
  business_bestbuy_frisco_tx:"Best Buy Frisco consumer electronics drop-off only. Store and item restrictions apply.",
};
const statuses:Record<RuleStatus,string>={
  recycle:"Use designated recycling",
  trash:"Use ordinary trash",
  compost:"Compost only at a designated site",
  special_dropoff:"Use designated drop-off",
  not_accepted_here:"Not accepted by this program",
};

export function inferDemoItem(itemName:string, material:string, profileId:string):string {
  const n=(itemName+" "+material).toLowerCase();
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
  if(/plastic wrap|flexible plastic film/.test(n))return profileId==="school_ut_dallas_tx"?"plastic_wrap":"soft_plastic_overwrap";
  if(/compostable bag/.test(n))return "compostable_bag";
  if(/frozen (food|vegetable) bag/.test(n))return "frozen_food_bag";
  if(/candy wrapper/.test(n))return "candy_wrapper";
  if(/chip bag|food wrapper/.test(n))return "food_wrapper";
  if(/plastic (clamshell|takeout container)|clamshell/.test(n))return "plastic_clamshell";
  if(/foam (takeout|food) (tray|container)/.test(n))return "foam_takeout_tray";
  if(/styrofoam|foam packaging/.test(n))return "foam_packaging";
  if(/paper (coffee |drink |hot )?cup|coffee cup/.test(n))return "paper_coffee_cup";
  if(/cardboard/.test(n))return "clean_cardboard";
  if(/newspaper/.test(n))return "newspaper";
  if(/food scraps|leftover food/.test(n))return "food_scraps";
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

type Props = {
  collectionType:Context;
  itemName?:string;
  materialGuess?:string;
  isIdentified?:boolean;
};

/** Public, source-linked sample profiles; never use a ZIP alone to select a real service. */
export default function TexasDemoRules({
  collectionType,itemName="",materialGuess="",isIdentified=false,
}:Props) {
  const {t,language}=useLanguage();
  const eligible=useMemo(()=>profiles.filter(p=>p.context===(
    collectionType==="residential"?"home":collectionType==="school"?"school":"business"
  )),[collectionType]);
  const [profileId,setProfileId]=useState("");
  const [manualItem,setManualItem]=useState("");
  useEffect(()=>{setProfileId("");setManualItem("");},[collectionType]);
  useEffect(()=>setManualItem(""),[itemName,materialGuess]);
  const profile=eligible.find(p=>p.id===profileId);
  const inferred=profile&&isIdentified?inferDemoItem(itemName,materialGuess,profile.id):"";
  const chosenKey=manualItem||inferred;
  const visibleItems=profile?[
    ...new Set([
      ...(inferred?[inferred]:[]),
      ...(highlightedItems[profile.id]||Object.keys(profile.rules).slice(0,8)),
    ]),
  ]:[];
  const rule=profile&&chosenKey?profile.rules[chosenKey]:undefined;
  const status=rule?.status;
  return <section className="texas-demo-rules" aria-label={t("Rules for a selected location")}>
    <label htmlFor="texas-demo-profile">
      {t("Choose your location")}
      <select id="texas-demo-profile" value={profileId}
        onChange={e=>{setProfileId(e.target.value);setManualItem("");}}>
        <option value="">{t("Select a location")}</option>
        {eligible.map(p=><option value={p.id} key={p.id}>{profileNames[p.id]||p.name}</option>)}
      </select>
    </label>
    {profile&&<>
      <p className="texas-demo-scope">{profileNotes[profile.id]||profile.scope}</p>
      <label htmlFor="texas-demo-item">
        {t("What item is it?")}
        <select id="texas-demo-item" value={manualItem||inferred}
          onChange={e=>setManualItem(e.target.value)}>
          <option value="">{t("Choose an item")}</option>
          {visibleItems.map(key=><option value={key} key={key}>{itemNames[key]||key.replace(/_/g," ")}</option>)}
          <option value="__other__">{t("Other item")}</option>
        </select>
      </label>
      {inferred&&!manualItem&&<p className="texas-demo-caption">
        {t("Suggested from scan; confirm the item type above.")}
      </p>}
      {!isIdentified&&itemName&&<p className="texas-demo-caption">
        {t("Scan identification is uncertain; choose the item yourself before using a rule.")}
      </p>}
      {chosenKey&&<div className={"texas-demo-result "+(status==="recycle"?"texas-demo-recycle":"")} role="status">
        <div className="texas-demo-result-title">
          {status==="recycle"?<CheckCircle2 size={20}/>:<ShieldAlert size={20}/>}
          <strong>{rule?t(statuses[rule.status]):t("No confirmed rule for this item")}</strong>
        </div>
        <p>{rule?.instruction||profile.default_message}</p>
        {rule?.condition&&<p><strong>{t("Conditions")}:</strong> {rule.condition}</p>}
        {language!=="en"&&<p className="texas-demo-caption">
          {t("Official-source instructions are in English; consult the source for precise requirements.")}
        </p>}
        <a href={rule?.source_url||profile.sources[0]} rel="noopener noreferrer" target="_blank">
          {t("Official program source")} <ExternalLink size={15}/>
        </a>
      </div>}
      {!chosenKey&&<p className="texas-demo-caption">
        {t("Choose an item to see what this program says.")}
      </p>}

    </>}
  </section>;
}
