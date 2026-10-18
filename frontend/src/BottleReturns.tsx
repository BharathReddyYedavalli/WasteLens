import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Banknote, Camera, Check, ChevronRight, Info, MapPin, Plus, RotateCcw, Trash2, Upload, Wallet } from "lucide-react";
import { useLanguage } from "./i18n";

type Material = "plastic"|"glass"|"metal"|"carton_pouch"|"other"|"unknown";
type Beverage = "water"|"soda"|"beer"|"juice"|"tea_coffee"|"sports"|"wine"|"spirits"|"milk"|"other"|"unknown";
type Deposit = { purchased_state:string; material:Material; beverage:Beverage; size_oz:number|null; label_visible:"yes"|"no"|"unknown"; quantity:number };
type Result = { status:string; reason:string; per_container_cents:number|null; estimated_total_cents:number|null; source_title:string;source_url:string|null };
type Scan = {item_name:string;material:Material;beverage:Beverage;size_oz:number|null;visible_refund_text:string};
type Saved = {id:string;title:string;state:string;count:number;estimate:number;returned:boolean;actual:number|null};
const initial:Deposit={purchased_state:"",material:"unknown",beverage:"unknown",size_oz:null,label_visible:"unknown",quantity:1};
const states="AL:Alabama,AK:Alaska,AZ:Arizona,AR:Arkansas,CA:California,CO:Colorado,CT:Connecticut,DE:Delaware,FL:Florida,GA:Georgia,HI:Hawaii,ID:Idaho,IL:Illinois,IN:Indiana,IA:Iowa,KS:Kansas,KY:Kentucky,LA:Louisiana,ME:Maine,MD:Maryland,MA:Massachusetts,MI:Michigan,MN:Minnesota,MS:Mississippi,MO:Missouri,MT:Montana,NE:Nebraska,NV:Nevada,NH:New Hampshire,NJ:New Jersey,NM:New Mexico,NY:New York,NC:North Carolina,ND:North Dakota,OH:Ohio,OK:Oklahoma,OR:Oregon,PA:Pennsylvania,RI:Rhode Island,SC:South Carolina,SD:South Dakota,TN:Tennessee,TX:Texas,UT:Utah,VT:Vermont,VA:Virginia,WA:Washington,WV:West Virginia,WI:Wisconsin,WY:Wyoming".split(",").map(x=>x.split(":"));
const drinks:[Beverage,string][]=[["unknown","Not sure"],["water","Water"],["soda","Soda"],["beer","Beer or malt beverage"],["juice","Juice"],["tea_coffee","Tea or coffee"],["sports","Sports drink"],["wine","Wine"],["spirits","Spirits"],["milk","Milk"],["other","Other drink"]];
const materials:[Material,string][]=[["unknown","Not sure"],["plastic","Plastic"],["glass","Glass"],["metal","Metal can or bottle"],["carton_pouch","Box or pouch"],["other","Other material"]];
const storageKey="wastelens-bottle-returns-v1";
const dollars=(c:number)=> (c/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
function load():Saved[]{try{const v=JSON.parse(localStorage.getItem(storageKey)||"[]");return Array.isArray(v)?v.filter(x=>typeof x?.id==="string"&&typeof x?.estimate==="number"&&typeof x?.title==="string").slice(-200):[];}catch{return [];}}

export default function BottleReturns({model,configured,onFind}:{model:string;configured:boolean;onFind:()=>void}){
  const {t}=useLanguage();
  const [form,setForm]=useState<Deposit>(initial);
  const [result,setResult]=useState<Result|null>(null);
  const [photo,setPhoto]=useState<File|null>(null);
  const [imageUrl,setImageUrl]=useState("");
  const [camera,setCamera]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null), stream=useRef<MediaStream|null>(null),fileRef=useRef<HTMLInputElement>(null);
  const [reading,setReading]=useState(false),[checking,setChecking]=useState(false);
  const [error,setError]=useState(""),[scanInfo,setScanInfo]=useState("");
  const [itemName,setItemName]=useState("Bottle or can");
  const [bag,setBag]=useState<Saved[]>(load);
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState("");
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(bag));}catch{/* browser storage unavailable */}},[bag]);
  useEffect(()=>{if(camera&&videoRef.current&&stream.current)videoRef.current.srcObject=stream.current;},[camera]);
  useEffect(()=>()=>{stream.current?.getTracks().forEach(x=>x.stop());},[]);
  useEffect(()=>()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);},[imageUrl]);
  function closeCamera(){stream.current?.getTracks().forEach(x=>x.stop());stream.current=null;setCamera(false);}
  function putPhoto(file?:File){
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024){
      setError(t("Choose a JPG, PNG or WebP file under 8 MB."));return;
    }
    closeCamera();setPhoto(file);setImageUrl(URL.createObjectURL(file));setScanInfo("");setError("");
  }
  function picked(e:ChangeEvent<HTMLInputElement>){putPhoto(e.target.files?.[0]);e.target.value="";}
  async function openCamera(){
    setError("");
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw Error();
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      closeCamera();stream.current=s;setCamera(true);
    }catch{setError(t("Camera unavailable. Upload a photo instead."));}
  }
  function takePhoto(){
    const video=videoRef.current;
    if(!video||!video.videoWidth){setError(t("Camera is loading. Try again."));return;}
    const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    canvas.getContext("2d")?.drawImage(video,0,0);
    canvas.toBlob(blob=>{if(blob)putPhoto(new File([blob],"bottle-label.jpg",{type:"image/jpeg"}));},"image/jpeg",.86);
  }
  function setField<K extends keyof Deposit>(name:K,value:Deposit[K]){
    setForm(prev=>({...prev,[name]:value}));setResult(null);setError("");
  }
  async function scan(){
    if(!photo)return;
    setReading(true);setError("");setScanInfo("");
    try{
      const body=new FormData();body.append("image",photo);body.append("model_id",model);
      const response=await fetch("/api/deposits/scan",{method:"POST",body});
      const data=await response.json();
      if(!response.ok)throw Error(typeof data.detail==="string"?data.detail:t("Could not read the label."));
      const found=data as Scan;
      setItemName(found.item_name||"Bottle or can");
      const seen=found.visible_refund_text.toUpperCase();
      const sameCA=form.purchased_state==="CA"&&/CA\s*(?:CRV|REDEMPTION|CASH REFUND)|CALIFORNIA\s*(?:REDEMPTION|CASH REFUND)/.test(seen);
      const sameOR=form.purchased_state==="OR"&&/OR\s*10/.test(seen);
      setForm(previous=>({...previous,material:found.material!=="unknown"?found.material:previous.material,
        beverage:found.beverage!=="unknown"?found.beverage:previous.beverage,
        size_oz:found.size_oz??previous.size_oz,
        label_visible:sameCA||sameOR?"yes":previous.label_visible}));
      setScanInfo(seen?t("Visible marking")+": "+found.visible_refund_text:t("No readable refund marking in the photo."));
      setResult(null);
    }catch(e){setError(e instanceof Error?e.message:t("Could not read the label."));}
    finally{setReading(false);}
  }
  async function check(){
    if(!form.purchased_state){setError(t("Choose the state of purchase first."));return;}
    setChecking(true);setError("");setResult(null);
    try{
      const response=await fetch("/api/deposits/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const body=await response.json();
      if(!response.ok)throw Error(typeof body.detail==="string"?body.detail:t("The refund check failed."));
      setResult(body as Result);
    }catch(e){setError(e instanceof Error?e.message:t("The refund check failed."));}
    finally{setChecking(false);}
  }
  function save(){
    if(!result||result.estimated_total_cents===null)return;
    setBag(prev=>[...prev,{id:crypto.randomUUID(),title:itemName,state:form.purchased_state,
      count:form.quantity,estimate:result.estimated_total_cents!,returned:false,actual:null}].slice(-200));
    setNotice(t("Added to your return bag."));
  }
  function finish(id:string){
    const value=amounts[id]?.trim()??"";
    if(!/^\d{1,4}(\.\d{1,2})?$/.test(value)){setNotice(t("Enter what you actually received, including $0 if none."));return;}
    setBag(prev=>prev.map(x=>x.id===id?{...x,returned:true,actual:Math.round(Number(value)*100)}:x));
    setNotice(t("Return recorded from your report."));
  }
  const pending=bag.filter(x=>!x.returned).reduce((a,b)=>a+b.estimate,0);
  const paid=bag.filter(x=>x.returned).reduce((a,b)=>a+(b.actual??0),0);
  return <section className="bottle-page">
    <header className="bottle-hero"><div className="bottle-hero-icon"><Wallet size={36}/></div>
      <div><small>{t("BOTTLE RETURN GUIDE")}</small><h1>{t("Could that bottle be worth money?")}</h1>
        <p>{t("Read the label. Check the state. Make your return count.")}</p></div></header>
    <div className="bottle-grid">
      <article className="bottle-card">
        <h2><span className="bottle-number">1</span>{t("Where did you buy it?")}</h2>
        <label htmlFor="bottle-state">{t("State where you purchased it")}</label>
        <select id="bottle-state" value={form.purchased_state} onChange={e=>setField("purchased_state",e.target.value)}>
          <option value="">{t("Select state")}</option>
          {states.map(([code,name])=><option key={code} value={code}>{name}</option>)}
        </select>
        <p className="bottle-help">{t("Refunds depend on the purchase state, not just a logo printed on the bottle.")}</p>
      </article>
      <article className="bottle-card">
        <h2><span className="bottle-number orange">2</span>{t("Scan the label")}</h2>
        <p className="bottle-help">{t("Point at the deposit marking and size. Or enter the details below.")}</p>
        <div className="bottle-camera">
          {camera?<video ref={videoRef} playsInline muted autoPlay aria-label={t("Live camera")}/>:
            imageUrl?<img src={imageUrl} alt={t("Selected bottle label")}/>:
            <div className="bottle-camera-placeholder"><Camera size={36}/><span>{t("Show the bottle or its label")}</span></div>}
        </div>
        <input type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp" onChange={picked} hidden/>
        <div className="bottle-controls">
          {camera?<><button type="button" onClick={takePhoto}><Camera size={16}/>{t("Take photo")}</button>
            <button type="button" onClick={closeCamera}>{t("Cancel")}</button></>:
            <><button type="button" onClick={()=>void openCamera()}><Camera size={16}/>{t("Use camera")}</button>
            <button type="button" onClick={()=>fileRef.current?.click()}><Upload size={16}/>{t("Upload photo")}</button></>}
          {photo&&!camera&&<button type="button" onClick={()=>{setPhoto(null);setImageUrl("");setScanInfo("");}}><RotateCcw size={16}/>{t("Clear")}</button>}
        </div>
        {photo&&!camera&&<button type="button" className="bottle-ai" disabled={reading||!configured} onClick={()=>void scan()}>
          {reading?t("Reading…"):t("Read label with AI")}</button>}
        {!configured&&photo&&<p className="bottle-help">{t("Gemini is not configured. You can still check the rules manually.")}</p>}
        {scanInfo&&<p className="bottle-info" role="status">{scanInfo}</p>}
        <div className="bottle-fields">
          <label>{t("Drink inside")}
            <select value={form.beverage} onChange={e=>setField("beverage",e.target.value as Beverage)}>
              {drinks.map(([value,name])=><option key={value} value={value}>{t(name)}</option>)}
            </select>
          </label>
          <label>{t("Container material")}
            <select value={form.material} onChange={e=>setField("material",e.target.value as Material)}>
              {materials.map(([value,name])=><option key={value} value={value}>{t(name)}</option>)}
            </select>
          </label>
          <label>{t("Size (fluid oz)")}
            <input type="number" inputMode="decimal" min=".1" max="256" step="any" placeholder="16.9"
              value={form.size_oz??""} onChange={e=>setField("size_oz",e.target.value?Number(e.target.value):null)}/>
          </label>
          <label>{t("Refund marking for that state")}
            <select value={form.label_visible} onChange={e=>setField("label_visible",e.target.value as Deposit["label_visible"])}>
              <option value="unknown">{t("Not sure")}</option><option value="yes">{t("Yes")}</option><option value="no">{t("No")}</option>
            </select>
          </label>
          <label>{t("Number of matching containers")}
            <input type="number" min="1" max="1000" value={form.quantity}
              onChange={e=>setField("quantity",Math.max(1,Math.min(1000,Number(e.target.value)||1)))}/>
          </label>
        </div>
        <button type="button" className="bottle-check" disabled={checking} onClick={()=>void check()}>
          {checking?t("Checking…"):t("Check refund")}<ChevronRight size={18}/></button>
        {error&&<p className="bottle-error" role="alert">{error}</p>}
      </article>
    </div>
    {result&&<article className={"bottle-answer bottle-"+result.status} aria-live="polite">
      <div className="bottle-answer-head"><div><small>{t("YOUR RESULT")}</small><h2>{
        result.estimated_total_cents!==null?t("Possible refund"):result.status==="no_program"?
        t("No statewide bottle deposit"):result.status==="not_covered"?t("Not covered"):t("Needs a closer look")}</h2></div>
        {result.estimated_total_cents!==null&&<div className="bottle-price"><strong>{dollars(result.estimated_total_cents)}</strong>
          <span>{t("Estimated only")}</span></div>}
      </div>
      <p>{result.reason}</p>
      {result.per_container_cents!==null&&<span className="bottle-formula">{result.per_container_cents}¢ × {form.quantity} {t("containers")}</span>}
      <div className="bottle-actions">
        {result.source_url&&<a href={result.source_url} target="_blank" rel="noopener noreferrer"><MapPin size={17}/>{t("Official redemption locator")}</a>}
        {result.estimated_total_cents!==null&&<button type="button" onClick={save}><Plus size={17}/>{t("Add to return bag")}</button>}
        {result.status==="no_program"&&<button type="button" onClick={onFind}><MapPin size={17}/>{t("Find regular recycling")}</button>}
      </div>
      <p className="bottle-caution"><Info size={15}/>{t("Photo recognition is not proof of a refund. A center decides what qualifies.")}</p>
    </article>}
    <article className="bottle-bag">
      <div className="bottle-bag-heading"><div><small>{t("YOUR RETURN BAG")}</small><h2>{t("Your bottle return tracker")}</h2></div><Banknote size={30}/></div>
      <div className="bottle-totals"><div><span>{t("Potential refund, not yet returned")}</span><strong>{dollars(pending)}</strong></div>
        <div><span>{t("Cash you reported receiving")}</span><strong>{dollars(paid)}</strong></div></div>
      {bag.length===0?<p className="bottle-help">{t("Check a container to start your return bag.")}</p>:bag.slice().reverse().map(entry=>
        <div key={entry.id} className="bottle-entry"><div className="bottle-entry-info"><strong>{entry.title}</strong>
          <span>{entry.count} × {entry.state} · {dollars(entry.estimate)} {t("estimated")}</span>
          {entry.returned?<span className="bottle-complete"><Check size={15}/>{t("Returned, self reported")} · {dollars(entry.actual??0)} {t("received")}</span>:
            <div className="bottle-return-action"><label>{t("Actual refund received ($)")}
              <input type="number" min="0" max="9999" step=".01" placeholder="0.00"
                value={amounts[entry.id]??""} onChange={e=>setAmounts(p=>({...p,[entry.id]:e.target.value}))}/></label>
              <button type="button" onClick={()=>finish(entry.id)}>{t("Mark returned")}</button></div>}
          </div><button type="button" className="bottle-trash" title={t("Remove")} aria-label={t("Remove")}
            onClick={()=>setBag(p=>p.filter(x=>x.id!==entry.id))}><Trash2 size={17}/></button></div>)}
      {notice&&<p className="bottle-info" role="status">{notice}</p>}
      <p className="bottle-help">{t("Saved only in this browser. No refund is counted as received until you report an actual amount.")}</p>
    </article>
  </section>;
}