import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, CircleHelp, Coins, GlassWater, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "./i18n";

export type DepositStateCode = "CA"|"CT"|"HI"|"IA"|"ME"|"MA"|"MI"|"NY"|"OR"|"VT";
type Drink = "soda"|"water"|"sparkling_water"|"beer"|"cider"|"juice"|"sports_energy"|"coffee_tea"|"wine"|"liquor"|"mixed_alcohol"|"milk"|"other";
type Material = "aluminum"|"glass"|"plastic"|"carton"|"pouch"|"other";
type Resin = "pet1"|"hdpe2"|"other"|"unknown";
type DepositResult = { state:string;state_code:DepositStateCode;status:"yes"|"no"|"check";per_container_cents:number;
 total_cents:number;count:number;reason:string;source_url:string;state_tip:string;amount_is_confirmed:boolean;label:string;note:string };
type LabelSuggestion = {drink:Drink;material:Material;resin:Resin;ounces:number|null;visible_mark:string;
  confidence:"clear"|"uncertain";guidance:string};
const STATES: {code:DepositStateCode; name:string}[] = [
  {code:"CA",name:"California"},{code:"CT",name:"Connecticut"},{code:"HI",name:"Hawaii"},
  {code:"IA",name:"Iowa"},{code:"ME",name:"Maine"},{code:"MA",name:"Massachusetts"},
  {code:"MI",name:"Michigan"},{code:"NY",name:"New York"},{code:"OR",name:"Oregon"},
  {code:"VT",name:"Vermont"},
];
const drinks: {value:Drink;name:string}[]=[
  {value:"soda",name:"Soda"},{value:"water",name:"Still water"},
  {value:"sparkling_water",name:"Sparkling water"},{value:"beer",name:"Beer or malt drink"},
  {value:"cider",name:"Hard cider"},{value:"juice",name:"Juice"},
  {value:"sports_energy",name:"Sports or energy drink"},
  {value:"coffee_tea",name:"Coffee or tea"},{value:"wine",name:"Wine"},
  {value:"liquor",name:"Liquor or spirits"},{value:"mixed_alcohol",name:"Mixed alcoholic drink"},
  {value:"milk",name:"Milk"},{value:"other",name:"Something else"}
];
const materials: {value:Material;name:string}[]=[
  {value:"aluminum",name:"Metal can"},{value:"plastic",name:"Plastic bottle"},
  {value:"glass",name:"Glass bottle"},{value:"carton",name:"Paper carton or box"},
  {value:"pouch",name:"Pouch"},{value:"other",name:"Not sure"}
];
const dollars=(cents:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);

export default function BottleReturns() {
  const {t} = useLanguage();
  const [state,setState] = useState<DepositStateCode>("CA");
  const [drink,setDrink] = useState<Drink>("soda");
  const [material,setMaterial] = useState<Material>("aluminum");
  const [resin,setResin] = useState<Resin>("unknown");
  const [ounces,setOunces] = useState("12");
  const [count,setCount] = useState("12");
  const [paid,setPaid] = useState<"yes"|"no"|"unsure">("unsure");
  const [result,setResult] = useState<DepositResult|null>(null);
  const [error,setError] = useState("");
  const [photo,setPhoto] = useState<File|null>(null);
  const [reading,setReading] = useState(false);
  const [suggestion,setSuggestion] = useState<LabelSuggestion|null>(null);
  useEffect(()=>{
    const size=Number(ounces),amount=Number(count);
    if(!Number.isFinite(size)||size<=0||size>512||!Number.isInteger(amount)||amount<1||amount>5000){
      setResult(null);return;
    }
    const ctrl=new AbortController();
    fetch("/api/deposit/calculate",{
      method:"POST",headers:{"Content-Type":"application/json"},signal:ctrl.signal,
      body:JSON.stringify({state,drink,material,ounces:size,count:amount,paid_in_state:paid,resin})
    }).then(async r=>{const data=await r.json();if(!r.ok)throw new Error("Check bottle details.");return data as DepositResult;})
      .then(setResult).catch(e=>{if(!ctrl.signal.aborted)setError(e.message||"Can't calculate right now.");});
    return ()=>ctrl.abort();
  },[state,drink,material,resin,ounces,count,paid]);
  function selectPhoto(e:ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]??null;
    if(f && (!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>8*1024*1024)){
      setError("Use a JPG, PNG or WebP photo under 8 MB.");setPhoto(null);return;
    }
    setPhoto(f);setSuggestion(null);setError("");
  }
  async function readLabel(){
    if(!photo||reading)return;
    setReading(true);setError("");setSuggestion(null);
    try{
      const form=new FormData();form.append("image",photo);
      const res=await fetch("/api/deposit/inspect",{method:"POST",body:form});
      const data=await res.json();
      if(!res.ok)throw new Error(typeof data.detail==="string"?data.detail:"Could not read the label.");
      const guess=data.suggestion as LabelSuggestion;
      setSuggestion(guess);
      // Prefill only readable metadata. Refund estimates still require manual confirmation.
      setDrink(guess.drink);setMaterial(guess.material);setResin(guess.resin);
      if(guess.ounces && guess.ounces>0)setOunces(String(guess.ounces));
      setPaid("unsure");
    }catch(e){setError(e instanceof Error?e.message:"Could not read the photo.");}
    finally{setReading(false);}
  }
  return <section className="deposit-page">
    <div className="deposit-top">
      <div className="deposit-top-copy"><span className="deposit-kicker"><Coins size={17}/> 10 STATE BOTTLE GUIDE</span>
        <h1>{t("Is that bottle worth something?")}</h1>
        <p>{t("Check what you might get back when you return a drink container.")}</p></div>
      <div className="deposit-top-art" aria-hidden="true"><span>5¢</span><span>10¢</span><span>25¢</span><GlassWater size={100}/></div>
    </div>
    <div className="deposit-callout" role="note"><CircleHelp size={22}/><p>
      <strong>{t("Not every state has bottle deposits.")}</strong> {t("Only 10 do. And even in those states, the drink, container and purchase location matter.")}
    </p></div>
    <div className="deposit-layout">
      <div className="deposit-form-card">
        <div className="deposit-form-head"><h2>{t("Check your container")}</h2><span>01</span></div>
        <div className="deposit-fields">
          <label className="wide">{t("Where was it purchased?")}
            <select value={state} onChange={e=>setState(e.target.value as DepositStateCode)}>
              {STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </label>
          <label>{t("What's inside?")}
            <select value={drink} onChange={e=>setDrink(e.target.value as Drink)}>
              {drinks.map(d=><option key={d.value} value={d.value}>{t(d.name)}</option>)}
            </select>
          </label>
          <label>{t("Container type")}
            <select value={material} onChange={e=>setMaterial(e.target.value as Material)}>
              {materials.map(d=><option key={d.value} value={d.value}>{t(d.name)}</option>)}
            </select>
          </label>
          {material==="plastic"&&<label className="wide">{t("Plastic type")}
            <select value={resin} onChange={e=>setResin(e.target.value as Resin)}>
              <option value="unknown">{t("I don't know")}</option>
              <option value="pet1">PET #1</option><option value="hdpe2">HDPE #2</option>
              <option value="other">Something else</option>
            </select>
          </label>}
          <label>{t("Size in fluid ounces")}
            <input type="number" min=".1" max="512" step="any" value={ounces}
              onChange={e=>setOunces(e.target.value)} inputMode="decimal"/>
          </label>
          <label>{t("Number of containers")}
            <input type="number" min="1" max="5000" step="1" value={count}
              onChange={e=>setCount(e.target.value)} inputMode="numeric"/>
          </label>
          <label className="wide">{t("Was the deposit paid in that state?")}
            <select value={paid} onChange={e=>setPaid(e.target.value as typeof paid)}>
              <option value="unsure">{t("Not sure")}</option><option value="yes">{t("Yes, a deposit was charged")}</option>
              <option value="no">{t("No, it wasn't")}</option>
            </select>
          </label>
        </div>
        <div className="deposit-examples"><span>{t("Try one:")}</span>
          <button type="button" onClick={()=>{setDrink("soda");setMaterial("aluminum");setOunces("12");setCount("12");setPaid("unsure");}}>12 soda cans</button>
          <button type="button" onClick={()=>{setDrink("water");setMaterial("plastic");setResin("pet1");setOunces("16.9");setCount("24");setPaid("unsure");}}>24 water bottles</button>
        </div>
      </div>
      <div className={"deposit-result "+(result?.status??"empty")} aria-live="polite">
        <div className="deposit-result-overline">{t("YOUR REFUND CHECK")}</div>
        {result ? <>
          <strong className="deposit-amount">{dollars(result.total_cents)}</strong>
          <h2>{t(result.status==="yes"?"Possible refund for eligible returns":result.status==="check"?"Check before counting on it":"No deposit expected")}</h2>
          <p>{result.reason}</p>
          <div className="deposit-mini-math"><span>{result.count.toLocaleString()} containers</span><b>×</b><span>{result.per_container_cents}¢ each</span></div>
          <a href={result.source_url} target="_blank" rel="noreferrer" className="deposit-official">
            <Link2 size={16}/> {t("Read the official state rules")} · {result.state}
          </a>
          <details className="deposit-state-tip">
            <summary>{t("One useful state tip")}</summary>
            <p>{result.state_tip}</p>
          </details>
        </>:<><strong className="deposit-amount">?</strong><p>Choose a valid size and amount to check.</p></>}
        <div className="deposit-result-note"><ShieldCheck size={18}/> A photo or label alone cannot confirm a refund. Your local return location makes the final decision.</div>
      </div>
    </div>
    <details className="deposit-photo-helper">
      <summary><Camera size={21}/> {t("Have the bottle with you?")} <span>{t("Read its label with your camera")}</span></summary>
      <div className="deposit-photo-inside">
        <p>Take a close picture of the drink name and size. Gemini can suggest the details, but you'll confirm them above.</p>
        <div className="deposit-photo-controls">
          <input aria-label="Bottle label photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={selectPhoto}/>
          <button type="button" disabled={!photo||reading} onClick={()=>void readLabel()}>
            <Sparkles size={17}/>{reading?t("Reading…"):t("Read label")}
          </button>
        </div>
        {suggestion&&<div className="deposit-ai-read" role="status">
          <strong>{t("Check these details above")}</strong>
          <p>{suggestion.visible_mark? "Visible print: "+suggestion.visible_mark:"No refund text could be read clearly."}</p>
          <p>{suggestion.guidance}</p>
        </div>}
        <small>Photos go to Google Gemini only when you choose Read label. Google's free tier may use submitted content to improve its services. WasteLens does not save this photo.</small>
      </div>
    </details>
    {error&&<p className="deposit-error" role="alert">{error}</p>}
    <div className="deposit-after">
      <div><h2>{t("Ready to return them?")}</h2><p>Find a bottle redemption center on your state's official site, or use WasteLens's nearby finder for possible locations. Call first to check what's accepted.</p></div>
      <a href={result?.source_url??"https://www.bottlebill.org/compare-all-states/"} target="_blank" rel="noreferrer">Check state return rules <Link2 size={16}/></a>
    </div>
  </section>;
}
