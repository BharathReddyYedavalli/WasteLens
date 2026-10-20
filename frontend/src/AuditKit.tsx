import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Check, ChevronDown, ClipboardList, Download, FilePlus2, Lightbulb, LoaderCircle, LockKeyhole, PieChart, Printer, Save, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useLanguage } from "./i18n";
import type { SessionUser } from "./types";
import { actionHeaders, readJson } from "./AccountArea";
import { ReadAloudButton } from "./Speech";

type Kind = "recycle" | "compost" | "trash" | "reuse" | "unsure";
type ItemType = "plastic_cutlery" | "paper_plate" | "food_container" | "drink_bottle" |
  "drink_can" | "paper_cardboard" | "food_scraps" | "cup" | "other";
type SortingCheck = "matches" | "mismatch";
type Entry = {kind: Kind; at: string; item_type?: ItemType; sorting_check?: SortingCheck; rules_checked?: true};
type Draft = {title: string; entries: Entry[]};
type Counts = Record<Kind,number>;
type SavedAudit = {id:number;title:string;counts:Counts;item_count:number;created_at:string};
type AuditDetail = {id:number;title:string;entries:Entry[];created_at:string};
type Advice = {source:"gemini"|"practical";suggestions:string[];note:string};
const STORAGE_KEY="wastelens-community-audit-v1";
const kinds:{id:Kind;label:string;emoji:string;color:string}[]=[
  {id:"recycle",label:"Recycling",emoji:"♻️",color:"#167d81"},
  {id:"compost",label:"Compost",emoji:"🌱",color:"#78a959"},
  {id:"trash",label:"Trash",emoji:"🗑️",color:"#d7704d"},
  {id:"reuse",label:"Reuse",emoji:"💛",color:"#9778cf"},
  {id:"unsure",label:"Not sure",emoji:"❓",color:"#bd9029"},
];
const itemTypes:{id:ItemType;label:string}[]=[
  {id:"plastic_cutlery",label:"Plastic cutlery"},
  {id:"paper_plate",label:"Paper plate"},
  {id:"food_container",label:"Takeout container"},
  {id:"drink_bottle",label:"Drink bottle"},
  {id:"drink_can",label:"Drink can"},
  {id:"paper_cardboard",label:"Paper or cardboard"},
  {id:"food_scraps",label:"Food scraps"},
  {id:"cup",label:"Drink cup"},
  {id:"other",label:"Other item"},
];
const initial:Draft={title:"",entries:[]};
function validEntry(entry:Entry):boolean{
  if(!entry||typeof entry!=="object" || !kinds.some(k=>k.id===entry.kind) ||
      typeof entry.at!=="string" || Number.isNaN(Date.parse(entry.at)))return false;
  if(entry.item_type!==undefined&&!itemTypes.some(k=>k.id===entry.item_type))return false;
  if(entry.sorting_check!==undefined){
    if(!["matches","mismatch"].includes(entry.sorting_check) ||
       entry.rules_checked!==true || !entry.item_type || entry.kind==="unsure")return false;
  }else if(entry.rules_checked!==undefined)return false;
  return true;
}
function readDraft():Draft{
  try{
    const s=localStorage.getItem(STORAGE_KEY);if(!s)return initial;
    const data=JSON.parse(s) as Partial<Draft>;
    if(typeof data.title!=="string"||!Array.isArray(data.entries))return initial;
    return {title:data.title.slice(0,60),entries:data.entries.filter(
      (entry):entry is Entry=>validEntry(entry as Entry)
    ).slice(-15000)};
  }catch{return initial;}
}
function calculate(entries:Entry[]):Counts{
  const totals={recycle:0,compost:0,trash:0,reuse:0,unsure:0};
  for(const entry of entries)totals[entry.kind]++;
  return totals;
}
function escapeCSV(value:string){const safe=/^[=+@\-\t\r]/.test(value)?"'"+value:value;return '"'+safe.replaceAll('"','""')+'"';}
function saveCSV(draft:Draft){
  const rows=[["audit","timestamp_utc","recorded_destination","item_type","site_rules_checked","placement_review"],
    ...draft.entries.map(e=>[
      draft.title,e.at,e.kind,e.item_type??"",
      e.rules_checked?"yes":"",
      e.sorting_check??"",
    ])];
  const blob=new Blob([rows.map(r=>r.map(escapeCSV).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download="wastelens-community-audit.csv";document.body.append(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const dayStamp=(value:string)=>new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric"});
function DistributionChart({counts,total}:{counts:Counts;total:number}){
  const circumference=2*Math.PI*68;
  let offset=0;
  return <div className="community-chart-pair">
    <div className="community-chart-circle" role="img"
      aria-label={kinds.map(k=>k.label+": "+counts[k.id]+" items").join(", ")}>
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <circle cx="110" cy="110" r="68" fill="none" stroke="#d5e8df" strokeWidth="30"/>
        {kinds.map(kind=>{
          const fraction=total?counts[kind.id]/total:0;
          const dash=fraction*circumference;
          const circle=<circle key={kind.id} cx="110" cy="110" r="68" fill="none"
            stroke={kind.color} strokeWidth="30" strokeDasharray={dash+" "+(circumference-dash)}
            strokeDashoffset={-offset} transform="rotate(-90 110 110)"><title>{kind.label}: {counts[kind.id]}</title></circle>;
          offset+=dash;return circle;
        })}
        <text x="110" y="105" textAnchor="middle" className="community-chart-center">{total}</text>
        <text x="110" y="127" textAnchor="middle" className="community-chart-center-label">items</text>
      </svg>
    </div>
    <div className="community-chart-legend">{kinds.map(kind=><div className="community-legend-line" key={kind.id}>
      <span className="community-swatch" style={{background:kind.color}}/><span>{kind.label}</span>
      <strong>{counts[kind.id]}</strong><small>{total?Math.round(counts[kind.id]/total*100):0}%</small>
    </div>)}</div>
  </div>;
}
function Timeline({entries}:{entries:Entry[]}){
  const {t}=useLanguage();
  const groups=useMemo(()=>{
    const byDay=new Map<string,number>();
    for(const e of entries){
      const d=new Date(e.at);
      if(Number.isNaN(d.getTime()))continue;
      const key=d.toLocaleDateString("en-CA",{year:"numeric",month:"2-digit",day:"2-digit"});
      byDay.set(key,(byDay.get(key)||0)+1);
    }
    return [...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
  },[entries]);
  const maximum=Math.max(1,...groups.map(x=>x[1]));
  return <div className="community-timeline">
    <h3><CalendarDays size={19}/>{t("Items recorded by day")}</h3>
    <div className="community-timeline-bars" role="img"
      aria-label={groups.map(([day,count])=>day+": "+count+" items").join("; ")}>
      {groups.map(([day,count])=><div className="community-day" key={day}>
        <strong>{count}</strong><div className="community-day-rail"><span style={{height:Math.max(7,count/maximum*100)+"%"}}/></div>
        <time dateTime={day}>{dayStamp(day+"T12:00:00")}</time>
      </div>)}
    </div>
  </div>;
}

export default function AuditKit({user,onSignIn}:{user:SessionUser|null;onSignIn:()=>void}){
  const {t,language}=useLanguage();
  const [audit,setAudit]=useState<Draft>(readDraft);
  const [saved,setSaved]=useState<SavedAudit[]>([]);
  const [loadingSaved,setLoadingSaved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [openingId,setOpeningId]=useState<number|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [advice,setAdvice]=useState<Advice|null>(null);
  const [adviceBusy,setAdviceBusy]=useState(false);
  const [adviceError,setAdviceError]=useState("");
  const [aiModel,setAiModel]=useState("gemini-3.8-flash");
  const [detailMode,setDetailMode]=useState(false);
  const [itemType,setItemType]=useState<ItemType| "">("");
  const [rulesAcknowledged,setRulesAcknowledged]=useState(false);
  const [sortingCheck,setSortingCheck]=useState<SortingCheck| "">("");

  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(audit));}catch{/* Local storage might be blocked */}},[audit]);
  useEffect(()=>{
    setSaved([]);setError("");setNotice("");
    if(!user)return;
    let current=true;setLoadingSaved(true);
    fetch("/api/audits",{credentials:"same-origin"})
      .then(r=>readJson<{audits:SavedAudit[]}>(r))
      .then(data=>{if(current)setSaved(data.audits);})
      .catch(()=>{if(current)setError(t("Could not load saved audits."));})
      .finally(()=>{if(current)setLoadingSaved(false);});
    return()=>{current=false;};
  },[user?.id]);
  const counts=useMemo(()=>calculate(audit.entries),[audit.entries]);
  const total=audit.entries.length;
  const headline=total?Math.max(...Object.values(counts)):0;
  const top=kinds.filter(k=>counts[k.id]===headline&&headline>0);
  const share=total?Math.round((counts.trash+counts.unsure)/total*100):0;
  const labeled=useMemo(()=>audit.entries.filter(e=>Boolean(e.item_type)),[audit.entries]);
  const reviewed=useMemo(()=>audit.entries.filter(
    e=>e.rules_checked===true&&(e.sorting_check==="matches"||e.sorting_check==="mismatch")
  ),[audit.entries]);
  const flagged=useMemo(()=>reviewed.filter(e=>e.sorting_check==="mismatch"),[reviewed]);
  const frequentItems=useMemo(()=>{
    const grouped=new Map<ItemType,number>();
    for(const entry of labeled)if(entry.item_type)
      grouped.set(entry.item_type,(grouped.get(entry.item_type)||0)+1);
    return [...grouped.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
  },[labeled]);
  const flaggedItems=useMemo(()=>{
    const grouped=new Map<ItemType,number>();
    for(const entry of flagged)if(entry.item_type)
      grouped.set(entry.item_type,(grouped.get(entry.item_type)||0)+1);
    return [...grouped.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
  },[flagged]);
  function log(kind:Kind){
    if(total>=15000)return;
    const entry:Entry={kind,at:new Date().toISOString()};
    if(detailMode&&itemType){
      entry.item_type=itemType;
      if(kind!=="unsure"&&rulesAcknowledged&&sortingCheck){
        entry.sorting_check=sortingCheck;
        entry.rules_checked=true;
      }
    }
    setAudit(a=>({...a,entries:[...a.entries,entry]}));
    setAdvice(null);setNotice("");
  }
  function fresh(){
    if(total>0&&!window.confirm(t("Start a new audit? Your unsaved counts will be cleared.")))return;
    setAudit({title:"",entries:[]});setItemType("");setRulesAcknowledged(false);
    setSortingCheck("");setAdvice(null);setError("");setNotice("");
  }
  async function reload(){
    const r=await fetch("/api/audits",{credentials:"same-origin"});
    const data=await readJson<{audits:SavedAudit[]}>(r);setSaved(data.audits);
  }
  async function save(){
    if(!user){onSignIn();return;}
    if(!total||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const title=audit.title.trim()||"Community audit · "+new Date().toLocaleDateString();
      const result=await readJson<{id:number}>(await fetch("/api/audits",{
        method:"POST",credentials:"same-origin",headers:actionHeaders,
        body:JSON.stringify({title,entries:audit.entries}),
      }));
      await reload();
      setNotice(t("Audit saved to your account.")+" #"+result.id);
    }catch(e){setError(e instanceof Error?e.message:t("Could not save audit."));}
    finally{setBusy(false);}
  }
  async function open(id:number){
    if(openingId!==null)return;
    if(total>0&&!window.confirm(t("Open a saved audit? This replaces your current draft.")))return;
    setOpeningId(id);setError("");setNotice("");
    try{
      const {audit:record}=await readJson<{audit:AuditDetail}>(await fetch("/api/audits/"+id,{credentials:"same-origin"}));
      setAudit({title:record.title,entries:record.entries});
      setItemType("");setRulesAcknowledged(false);setSortingCheck("");setAdvice(null);
      setNotice(t("Saved audit loaded. Changes are a new draft until saved again."));
    }catch(e){setError(e instanceof Error?e.message:t("Could not open this audit."));}
    finally{setOpeningId(null);}
  }
  async function remove(id:number){
    if(!window.confirm(t("Delete this saved audit permanently?")))return;
    setError("");setNotice("");
    try{
      await readJson<{ok:boolean}>(await fetch("/api/audits/"+id,{method:"DELETE",credentials:"same-origin",headers:actionHeaders}));
      await reload();setNotice(t("Saved audit deleted."));
    }catch(e){setError(e instanceof Error?e.message:t("Could not delete this audit."));}
  }
  async function suggest(){
    if(adviceBusy||!total)return;
    if(!user){onSignIn();return;}
    setAdvice(null);setAdviceError("");setAdviceBusy(true);
    try{
      const result=await readJson<Advice>(await fetch("/api/audits/suggestions",{
        method:"POST",credentials:"same-origin",headers:actionHeaders,
        body:JSON.stringify({title:audit.title,counts,model_id:aiModel,language}),
      }));
      setAdvice(result);
    }catch(e){setAdviceError(e instanceof Error?e.message:t("Could not generate suggestions."));}
    finally{setAdviceBusy(false);}
  }
  return <section className="audit-kit community-audit" aria-label={t("Community waste audit")}>
    <header className="audit-hero">
      <span className="audit-icon"><ClipboardList size={30}/></span>
      <div>
        <h1>{t("Community waste audit")}</h1>
      </div>
    </header>
    <div className="audit-session">
      <label htmlFor="audit-title">{t("Audit name")} <span>{t("Optional")}</span></label>
      <input id="audit-title" maxLength={60} autoComplete="off" value={audit.title}
        placeholder={t("Example: Cafeteria lunch")} onChange={e=>setAudit(a=>({...a,title:e.target.value}))}/>
    </div>
    <details className="audit-observation-entry" onToggle={event=>setDetailMode(event.currentTarget.open)}>
      <summary>{t("Add item details")} <span>{t("Optional")}</span><ChevronDown size={17}/></summary>
      <div className="audit-observation-fields">
        <label>{t("What item did you see?")}
          <select value={itemType} onChange={e=>{
            setItemType(e.target.value as ItemType|"");
            setRulesAcknowledged(false);setSortingCheck("");
          }}>
            <option value="">{t("Choose an item")}</option>
            {itemTypes.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}
          </select>
        </label>
        <label className="audit-policy-confirmation">
          <input type="checkbox" checked={rulesAcknowledged} disabled={!itemType}
            onChange={e=>{setRulesAcknowledged(e.target.checked);setSortingCheck("");}}/>
          <span>{t("I checked the collection rules for this specific site.")}</span>
        </label>
        {rulesAcknowledged&&itemType&&<label>{t("Based on those rules")}
          <select value={sortingCheck} onChange={e=>setSortingCheck(e.target.value as SortingCheck|"")}>
            <option value="">{t("No placement assessment")}</option>
            <option value="matches">{t("Placement matches the rules")}</option>
            <option value="mismatch">{t("Possible wrong-bin placement")}</option>
          </select>
        </label>}
        <p>{t("Tap a destination below to record one item. School rules may differ from city residential rules; uncertain items are never graded.")}</p>
      </div>
    </details>
    <div className="audit-count-row">
      <div><span>{t("Items counted")}</span><strong>{total}</strong></div>
    </div>
    <div className="audit-options">{kinds.map(kind=><button type="button" key={kind.id} onClick={()=>log(kind.id)}
      className={"audit-option audit-"+kind.id} style={{["--audit-accent" as string]:kind.color}}>
      <span className="audit-option-emoji" aria-hidden="true">{kind.emoji}</span>
      <strong>{t(kind.label)}</strong><span className="audit-option-count">{counts[kind.id]}</span>
    </button>)}</div>

    <div className="audit-actions community-audit-toolbar">
      <button type="button" onClick={save} disabled={!total||busy}>
        {busy?<LoaderCircle size={17}/>:<Save size={17}/>} {busy?t("Saving…"):t("Save audit")}</button>
      <button type="button" disabled={!total} onClick={()=>{setAudit(a=>({...a,entries:a.entries.slice(0,-1)}));setAdvice(null);}}>
        <Undo2 size={17}/>{t("Undo last")}</button>
      <button type="button" className="audit-reset" onClick={fresh} disabled={!total&&!audit.title}><FilePlus2 size={17}/>{t("New audit")}</button>
      <details className="audit-more-actions">
        <summary>{t("Export & print")}<ChevronDown size={16}/></summary>
        <div>
          <button type="button" disabled={!total} onClick={()=>saveCSV(audit)}><Download size={17}/>{t("Export CSV")}</button>
          <button type="button" disabled={!total} onClick={()=>window.print()}><Printer size={17}/>{t("Print results")}</button>
        </div>
      </details>
    </div>
    {!user&&<p className="community-private-note"><LockKeyhole size={17}/>
      {t("Your draft stays in this browser. Sign in to save audits on this WasteLens server. Separate local installations do not automatically sync.")}
      <button type="button" onClick={onSignIn}>{t("Sign in")}</button></p>}
    {notice&&<p className="community-success" role="status"><Check size={17}/>{notice}</p>}
    {error&&<p className="community-error" role="alert">{error}</p>}

    {total>0&&<div className="community-dashboard">
      <div className="community-dashboard-heading"><BarChart3 size={22}/><div><h2>{t("Waste breakdown")}</h2></div></div>
      <>
        <div className="community-stats">
          <div><span>{t("Largest category")}</span><strong>{top.map(k=>t(k.label)).join(" / ")}</strong></div>
          <div><span>{t("Trash + uncertain")}</span><strong>{share}%</strong></div>
        </div>
        <div className="community-graphs">
          <div className="community-chart-card"><h3><PieChart size={19}/>{t("Waste categories")}</h3>
            <DistributionChart counts={counts} total={total}/></div>
          <div className="community-chart-card"><Timeline entries={audit.entries}/></div>
        </div>
        {labeled.length>0&&<div className="audit-sort-review">
          <h3>{t("Sorting observations")}</h3>
          <div className="audit-sort-metrics">
            <div><strong>{labeled.length}</strong><span>{t("Items identified")}</span></div>
            <div><strong>{reviewed.length}</strong><span>{t("Placements checked")}</span></div>
            <div><strong>{flagged.length}</strong><span>{t("Possible wrong-bin placements")}</span></div>
          </div>
          <p><strong>{t("Most observed")}:</strong> {frequentItems.map(([type,n])=>
            t(itemTypes.find(item=>item.id===type)?.label??type)+" ("+n+")").join(" · ")}</p>
          {flaggedItems.length>0&&<p><strong>{t("Flagged for follow-up")}:</strong> {flaggedItems.map(([type,n])=>
            t(itemTypes.find(item=>item.id===type)?.label??type)+" ("+n+")").join(" · ")}</p>}
          <p className="audit-review-caveat">{t("These are observer-reported checks against site rules, not independently verified recycling outcomes.")}</p>
        </div>}
      </>
    </div>}

    {total>0&&<div className="community-advice">
      <div className="community-advice-heading"><Lightbulb size={25}/><div>
        <h2>{t("Turn findings into community action")}</h2>
        <p>{t("Only the audit name and counts go to Gemini when you ask.")}</p>
      </div></div>
      <div className="community-advice-buttons">
        <details className="community-ai-model"><summary>{t("AI model")}</summary><label className="visually-hidden" htmlFor="audit-ai-model">{t("AI model")}</label>
          <select id="audit-ai-model" aria-label={t("AI model")} value={aiModel} onChange={e=>setAiModel(e.target.value)}>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option>
          </select>
        </details>
        <button type="button" disabled={!total||adviceBusy} onClick={()=>void suggest()}>
          {adviceBusy?<LoaderCircle size={17}/>:<Sparkles size={17}/>}
          {adviceBusy?t("Thinking…"):t("Generate AI suggestions")}
        </button>
      </div>
      {adviceError&&<p role="alert" className="community-error">{adviceError}</p>}
      {advice&&<div className="community-advice-result" aria-live="polite">
        <span className="community-recommendation-source">{advice.source==="gemini"?t("AI-generated ideas"):t("Practical recommendations")}</span>
        <ol>{advice.suggestions.map((item,i)=><li key={i}>{item}</li>)}</ol>
        <p>{advice.source==="gemini"
          ?t("AI-generated from manually observed counts. Verify materials and local acceptance before acting.")
          :t("Gemini was unavailable. These suggestions use category-based guidance instead.")}</p>
        <ReadAloudButton id="community-audit-advice" category="steps" text={advice.suggestions.join(". ")}/>
      </div>}
    </div>}
    <div className="community-saved">
      <div className="community-saved-heading"><Save size={23}/><div>
        <h2>{t("Saved audits")}</h2>
      </div></div>
      {loadingSaved?<p>{t("Loading saved audits…")}</p>:!user?
        <p>{t("Sign in to view saved audits on this server.")}</p>:saved.length===0?
        <p>{t("No saved audits yet. Count some items above and choose Save audit.")}</p>:<div className="community-saved-list">
          {saved.map(item=><div key={item.id} className="community-saved-item">
            <div><strong>{item.title}</strong><span>{dayStamp(item.created_at)} · {item.item_count} {t("items")}</span></div>
            <div><button type="button" onClick={()=>void open(item.id)} disabled={openingId!==null}>
              <ChevronDown size={17}/>{t("Open")}</button>
              <button type="button" className="community-delete" onClick={()=>void remove(item.id)} aria-label={t("Delete")+" "+item.title}>
                <Trash2 size={17}/>{t("Delete")}</button></div>
          </div>)}
        </div>}
      {user&&saved.length>1&&<details className="community-comparison"><summary><BarChart3 size={18}/>{t("Compare saved audits")}</summary>
        <p>{t("Compare similar activities and time periods.")}</p>
        {saved.slice(0,6).reverse().map(item=>{
          const problem=(item.counts.trash||0)+(item.counts.unsure||0);
          const percent=item.item_count?Math.round(100*problem/item.item_count):0;
          return <div className="community-comparison-row" key={item.id}>
            <span title={item.title}>{item.title}</span>
            <div className="community-comparison-track" role="progressbar"
              aria-label={item.title+" "+percent+"%"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <span style={{width:percent+"%"}}/>
            </div><strong>{percent}%</strong>
          </div>;
        })}
      </details>}
    </div>
    <details className="audit-note"><summary>{t("About these numbers")}</summary>
      <p>{t("These are human-entered observations, not proof of recycling, diversion or carbon savings. Saved audits belong to your account on this server. Drafts stay in this browser, and separate local servers do not synchronize.")}</p>
    </details>
  </section>;
}
