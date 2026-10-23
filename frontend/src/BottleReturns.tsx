import { useEffect, useState } from "react";
import { CircleHelp, GlassWater, Link2, ShieldCheck } from "lucide-react";
import { useLanguage } from "./i18n";

export type DepositStateCode = "CA"|"CT"|"HI"|"IA"|"ME"|"MA"|"MI"|"NY"|"OR"|"VT";
type Drink = "soda"|"water"|"sparkling_water"|"beer"|"cider"|"juice"|"sports_energy"|"coffee_tea"|"wine"|"liquor"|"mixed_alcohol"|"milk"|"other";
type Material = "aluminum"|"glass"|"plastic"|"carton"|"pouch"|"other";
type Resin = "pet1"|"hdpe2"|"other"|"unknown";
type DepositResult = { state:string;state_code:DepositStateCode;status:"yes"|"no"|"check";per_container_cents:number;
 total_cents:number;count:number;ounces:number;reason:string;source_url:string;state_tip:string;amount_is_confirmed:boolean;label:string;note:string };
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
const suffix=" Confirm the deposit was paid in this state.";
function localizedDepositReason(reason:string,t:(value:string)=>string):string {
  return reason.endsWith(suffix)
    ? t(reason.slice(0,-suffix.length))+" "+t(suffix.trim())
    : t(reason);
}

export default function BottleReturns() {
  const {t,language} = useLanguage();
  const [state,setState] = useState<DepositStateCode>("CA");
  const [drink,setDrink] = useState<Drink>("soda");
  const [material,setMaterial] = useState<Material>("aluminum");
  const [resin,setResin] = useState<Resin>("unknown");
  const [ounces,setOunces] = useState("12");
  const [count,setCount] = useState("12");
  const [paid,setPaid] = useState<"yes"|"no"|"unsure">("unsure");
  const [result,setResult] = useState<DepositResult|null>(null);
  const [error,setError] = useState("");
  const [calculating,setCalculating] = useState(false);
  useEffect(()=>{
    const size=Number(ounces),amount=Number(count);
    // Never display a result calculated for the previous input.
    setResult(null);
    setError("");
    if(!Number.isFinite(size)||size<=0||size>512||!Number.isInteger(amount)||amount<1||amount>5000){
      setCalculating(false);return;
    }
    setCalculating(true);
    const ctrl=new AbortController();
    // A brief debounce avoids unnecessary requests while entering a number.
    const timer=window.setTimeout(()=>{
      fetch("/api/deposit/calculate",{
        method:"POST",headers:{"Content-Type":"application/json"},signal:ctrl.signal,
        body:JSON.stringify({state,drink,material,ounces:size,count:amount,paid_in_state:paid,resin})
      }).then(async response=>{
        if(!response.ok)throw new Error("Check bottle details.");
        return response.json() as Promise<DepositResult>;
      }).then(data=>{
        if(!ctrl.signal.aborted){setResult({...data,ounces:size});setCalculating(false);}
      }).catch(e=>{
        if(!ctrl.signal.aborted){setCalculating(false);setError(e.message||"Can't calculate right now.");}
      });
    },180);
    return ()=>{window.clearTimeout(timer);ctrl.abort();};
  },[state,drink,material,resin,ounces,count,paid]);
  return <section className="deposit-page">
    <div className="deposit-top">
      <div className="deposit-top-copy"><h1>{t("Check bottle returns")}</h1>
</div>
      <div className="deposit-top-art" aria-hidden="true"><span>5¢</span><span>10¢</span><span>25¢</span><GlassWater size={100}/></div>
    </div>
    <div className="deposit-callout" role="note"><CircleHelp size={22}/><p>
      {t("Bottle deposits exist in 10 states. Eligibility depends on the drink, container and place of purchase.")}
    </p></div>
    <div className="deposit-layout">
      <div className="deposit-form-card">
        <div className="deposit-form-head"><h2>{t("Container details")}</h2></div>
        <div className="deposit-fields">
          <label className="wide">{t("Where was it purchased?")}
            <select value={state} onChange={e=>setState(e.target.value as DepositStateCode)}>
              {STATES.map(s=><option key={s.code} value={s.code}>{t(s.name)}</option>)}
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
              <option value="other">{t("Something else")}</option>
            </select>
          </label>}
          <label>{t("Size in fluid ounces")}
            <input type="number" min=".1" max="512" step="any" value={ounces}
              onChange={e=>setOunces(e.target.value)} inputMode="decimal"/>
            {state==="CA"&&["aluminum","glass","plastic"].includes(material)&&
              <small className="deposit-size-hint">
                {language==="es"?"California: menos de 24 oz = 5¢; desde 24 oz = 10¢ por envase elegible.":
                language==="hi"?"कैलिफ़ोर्निया: 24 औंस से कम = 5¢, 24 औंस या अधिक = 10¢ प्रति पात्र कंटेनर।":
                "California: under 24 fl oz = 5¢; 24 fl oz or more = 10¢ per eligible container."}
              </small>}
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
        <details className="deposit-examples"><summary>{t("Try an example")}</summary><div>
          <button type="button" onClick={()=>{setDrink("soda");setMaterial("aluminum");setOunces("12");setCount("12");setPaid("unsure");}}>{t("12 soda cans")}</button>
          <button type="button" onClick={()=>{setDrink("water");setMaterial("plastic");setResin("pet1");setOunces("16.9");setCount("24");setPaid("unsure");}}>{t("24 water bottles")}</button>
        </div></details>
      </div>
      <div className={"deposit-result "+(result?.status??"empty")} aria-live="polite">
        {result ? <>
          <strong className="deposit-amount">{dollars(result.total_cents)}</strong>
          <p className="deposit-size-used">
            {language==="es"?`Calculado para ${result.ounces} onzas líquidas por envase.`:
            language==="hi"?`प्रति कंटेनर ${result.ounces} फ़्लूइड औंस के लिए गणना।`:
            `Calculated for ${result.ounces} fl oz per container.`}
          </p>
          <h2>{t(result.status==="yes"?"Possible refund for eligible returns":result.status==="check"?"Check before counting on it":"No deposit expected")}</h2>
          <p>{localizedDepositReason(result.reason,t)}</p>
          <a href={result.source_url} target="_blank" rel="noreferrer" className="deposit-official">
            <Link2 size={16}/> {t("Read the official state rules")} · {result.state}
          </a>
          <details className="deposit-state-tip">
            <summary>{t("Calculation & state details")}</summary>
            <div className="deposit-mini-math"><span>{result.count.toLocaleString(language==="hi"?"hi-IN":language==="es"?"es-ES":"en-US")} {t("containers")}</span><b>×</b><span>{result.per_container_cents}¢ {t("each")}</span></div>
            <p>{t(result.state_tip)}</p>
          </details>
        </>:<><strong className="deposit-amount">{calculating?"…":"?"}</strong><p>
          {calculating?(language==="es"?"Calculando…":language==="hi"?"गणना हो रही है…":"Calculating…"):
            t("Choose a valid size and amount to check.")}
        </p></>}
        <div className="deposit-result-note"><ShieldCheck size={18}/> {t("Refund eligibility depends on where the deposit was paid and the return program.")}</div>
      </div>
    </div>
    {error&&<p className="deposit-error" role="alert">{error}</p>}
  </section>;
}
