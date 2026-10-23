import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, ClipboardList, Download, FilePlus2, Lightbulb, LoaderCircle, LockKeyhole, Printer, Save, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useLanguage } from "./i18n";
import type { SessionUser } from "./types";
import { actionHeaders, readJson } from "./AccountArea";
import { ReadAloudButton } from "./Speech";

type Kind = "recycle" | "compost" | "trash" | "reuse" | "unsure";
type ItemType = "plastic_cutlery" | "paper_plate" | "food_container" | "drink_bottle" |
  "drink_can" | "paper_cardboard" | "food_scraps" | "cup" | "other";
type SortingCheck = "matches" | "mismatch";
type Entry = {kind:Kind; at:string; item_type?:ItemType; sorting_check?:SortingCheck; rules_checked?:true};
type Draft = {title:string; location:string; session:string; entries:Entry[]};
type Counts = Record<Kind,number>;
type Context = {location?:string; session?:string};
type SavedAudit = {id:number;title:string;counts:Counts;item_count:number;created_at:string;context?:Context};
type AuditDetail = {id:number;title:string;entries:Entry[];created_at:string;context?:Context};
type Advice = {source:"gemini"|"practical";suggestions:string[];note:string};
type Stage = "setup" | "count" | "review";
const STORAGE_KEY = "wastelens-community-audit-v1";
const categories:{id:ItemType;label:string;emoji:string}[] = [
  {id:"plastic_cutlery",label:"Plastic cutlery",emoji:"🍴"},
  {id:"paper_plate",label:"Paper plate",emoji:"🍽️"},
  {id:"food_container",label:"Takeout container",emoji:"🥡"},
  {id:"drink_bottle",label:"Drink bottle",emoji:"🧴"},
  {id:"drink_can",label:"Drink can",emoji:"🥫"},
  {id:"paper_cardboard",label:"Paper or cardboard",emoji:"📦"},
  {id:"food_scraps",label:"Food scraps",emoji:"🍎"},
  {id:"cup",label:"Drink cup",emoji:"🥤"},
  {id:"other",label:"Other item",emoji:"➕"}
];
const destinations:{id:Kind;label:string;emoji:string;color:string}[] = [
  {id:"recycle",label:"Recycling",emoji:"♻️",color:"#167d81"},
  {id:"trash",label:"Trash",emoji:"🗑️",color:"#d7704d"},
  {id:"compost",label:"Compost",emoji:"🌱",color:"#78a959"},
  {id:"reuse",label:"Reuse",emoji:"💛",color:"#9778cf"},
  {id:"unsure",label:"Not sure",emoji:"❓",color:"#bd9029"}
];
const blank:Draft = {title:"",location:"",session:"",entries:[]};
function validEntry(item:unknown):item is Entry{
  if(!item || typeof item!=="object")return false;
  const x = item as Partial<Entry>;
  if(!destinations.some(d=>d.id===x.kind)||typeof x.at!=="string"||!Number.isFinite(Date.parse(x.at)))return false;
  if(x.item_type!==undefined && !categories.some(c=>c.id===x.item_type))return false;
  if(x.sorting_check!==undefined){
    return (x.sorting_check==="matches"||x.sorting_check==="mismatch") &&
      x.rules_checked===true && Boolean(x.item_type) &&
      (x.kind==="recycle"||x.kind==="trash"||x.kind==="compost");
  }
  return x.rules_checked===undefined;
}
function readDraft():Draft {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return blank;
    const d=JSON.parse(raw) as Partial<Draft>;
    if(typeof d.title!=="string"||!Array.isArray(d.entries))return blank;
    return {
      title:d.title.slice(0,60),
      location:typeof d.location==="string"?d.location.slice(0,80):"",
      session:typeof d.session==="string"?d.session.slice(0,60):"",
      entries:d.entries.filter(validEntry).slice(-15000)
    };
  }catch{return blank;}
}
function countsOf(entries:Entry[]):Counts{
  const n:Counts={recycle:0,compost:0,trash:0,reuse:0,unsure:0};
  for(const e of entries)n[e.kind]++;
  return n;
}
function topItems(entries:Entry[]):[ItemType,number][]{
  const n=new Map<ItemType,number>();
  for(const e of entries)if(e.item_type)n.set(e.item_type,(n.get(e.item_type)||0)+1);
  return [...n.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
}
function reviewedOf(entries:Entry[]):Entry[]{
  return entries.filter(e=>e.rules_checked===true && (e.sorting_check==="matches"||e.sorting_check==="mismatch"));
}
function pct(n:number,total:number){return total?Math.round(n/total*100):0;}
function escapeCsv(value:string){
  const safe=/^[=+@\-\t\r]/.test(value)?"'"+value:value;
  return '"' + safe.replaceAll('"','""') + '"';
}
function exportCsv(d:Draft){
  const head=["audit","location","session","timestamp_utc","item_type","observed_destination","site_rules_checked","placement_review"];
  const rows=[head,...d.entries.map(e=>[d.title,d.location,d.session,e.at,e.item_type||"",e.kind,e.rules_checked?"yes":"",e.sorting_check||""])];
  const blob=new Blob([rows.map(r=>r.map(escapeCsv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="wastelens-audit.csv";document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function AuditKit({user,onSignIn,scannedItem,onBackToScan}:{
  user:SessionUser|null;onSignIn:()=>void;scannedItem?:string|null;onBackToScan?:()=>void;
}){
  const {t,language}=useLanguage();
  const [audit,setAudit]=useState<Draft>(readDraft);
  const [stage,setStage]=useState<Stage>(()=>readDraft().entries.length?"count":"setup");
  const [selectedItem,setSelectedItem]=useState<ItemType|"">("");
  const [rulesChecked,setRulesChecked]=useState(false);
  const [placement,setPlacement]=useState<SortingCheck|"">("");
  const [saved,setSaved]=useState<SavedAudit[]>([]);
  const [comparisonId,setComparisonId]=useState("");
  const [comparison,setComparison]=useState<AuditDetail|null>(null);
  const [loadingComparison,setLoadingComparison]=useState(false);
  const [saving,setSaving]=useState(false);
  const [opening,setOpening]=useState(false);
  const [loadingSaved,setLoadingSaved]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [advice,setAdvice]=useState<Advice|null>(null);
  const [adviceBusy,setAdviceBusy]=useState(false);
  const [adviceError,setAdviceError]=useState("");
  const [activeSavedId,setActiveSavedId]=useState<number|null>(null);

  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(audit));}catch{/* storage might be blocked */}},[audit]);
  useEffect(()=>{
    setSaved([]);if(!user)return;
    let active=true;setLoadingSaved(true);
    fetch("/api/audits",{credentials:"same-origin"})
      .then(r=>readJson<{audits:SavedAudit[]}>(r))
      .then(data=>{if(active)setSaved(data.audits);})
      .catch(()=>{if(active)setError(t("Could not load saved audits."));})
      .finally(()=>{if(active)setLoadingSaved(false);});
    return()=>{active=false;};
  },[user?.id]);

  const total=audit.entries.length;
  const counts=useMemo(()=>countsOf(audit.entries),[audit.entries]);
  const frequent=useMemo(()=>topItems(audit.entries),[audit.entries]);
  const reviewed=useMemo(()=>reviewedOf(audit.entries),[audit.entries]);
  const flagged=reviewed.filter(e=>e.sorting_check==="mismatch");
  const reviewedPct=pct(flagged.length,reviewed.length);
  const title=audit.title.trim() || ((audit.location.trim()||t("Waste audit")) + " · " + new Date().toLocaleDateString());

  function startCounting(){
    if(!audit.location.trim()){setError(t("Choose a location before starting."));return;}
    setError("");setStage("count");
  }
  function log(kind:Kind){
    if(!selectedItem || total>=15000)return;
    const entry:Entry={kind,at:new Date().toISOString(),item_type:selectedItem};
    if((kind==="recycle"||kind==="trash"||kind==="compost") && rulesChecked && placement){
      entry.rules_checked=true;entry.sorting_check=placement;
    }
    setAudit(prev=>({...prev,entries:[...prev.entries,entry]}));
    // Require each assessed item to be reviewed separately; never auto-apply a past decision.
    setPlacement("");setNotice("");setAdvice(null);setComparison(null);setComparisonId("");
  }
  function undo(){
    setAudit(prev=>({...prev,entries:prev.entries.slice(0,-1)}));
    setAdvice(null);setComparison(null);setComparisonId("");
  }
  function fresh(){
    if(total&&!window.confirm(t("Start a new audit? Your unsaved counts will be cleared.")))return;
    setAudit(blank);setStage("setup");setSelectedItem("");setRulesChecked(false);setPlacement("");
    setNotice("");setError("");setAdvice(null);setComparison(null);setComparisonId("");setActiveSavedId(null);
  }
  async function reload(){
    const data=await readJson<{audits:SavedAudit[]}>(await fetch("/api/audits",{credentials:"same-origin"}));
    setSaved(data.audits);
  }
  async function save(){
    if(!total||saving)return;
    if(!user){onSignIn();return;}
    setSaving(true);setError("");setNotice("");
    try{
      const result=await readJson<{id:number}>(await fetch("/api/audits",{
        method:"POST",credentials:"same-origin",headers:actionHeaders,
        body:JSON.stringify({title,location:audit.location.trim(),session:audit.session.trim(),entries:audit.entries})
      }));
      await reload();setActiveSavedId(result.id);
      setNotice(t("Audit saved to your account."));
    }catch(e){setError(e instanceof Error?e.message:t("Could not save audit."));}
    finally{setSaving(false);}
  }
  async function open(id:number){
    if(opening)return;
    if(total&&!window.confirm(t("Open a saved audit? This replaces your current draft.")))return;
    setOpening(true);setError("");setNotice("");
    try{
      const data=await readJson<{audit:AuditDetail}>(await fetch("/api/audits/"+id,{credentials:"same-origin"}));
      const record=data.audit;
      setAudit({title:record.title,location:record.context?.location||"",session:record.context?.session||"",entries:record.entries});
      setStage("review");setActiveSavedId(id);setSelectedItem("");setRulesChecked(false);setPlacement("");
      setAdvice(null);setComparison(null);setComparisonId("");
      setNotice(t("Saved audit loaded. Changes are a new draft until saved again."));
    }catch(e){setError(e instanceof Error?e.message:t("Could not open this audit."));}
    finally{setOpening(false);}
  }
  async function remove(id:number){
    if(!window.confirm(t("Delete this saved audit permanently?")))return;
    setError("");setNotice("");
    try{
      await readJson(await fetch("/api/audits/"+id,{
        method:"DELETE",credentials:"same-origin",headers:actionHeaders
      }));
      await reload();setNotice(t("Saved audit deleted."));
      if(activeSavedId===id)setActiveSavedId(null);
      if(comparisonId===String(id)){setComparison(null);setComparisonId("");}
    }catch(e){setError(e instanceof Error?e.message:t("Could not delete audit."));}
  }
  async function chooseComparison(id:string){
    setComparisonId(id);setComparison(null);setError("");
    if(!id)return;
    setLoadingComparison(true);
    try{
      const data=await readJson<{audit:AuditDetail}>(await fetch("/api/audits/"+id,{credentials:"same-origin"}));
      setComparison(data.audit);
    }catch(e){setError(e instanceof Error?e.message:t("Could not open this audit."));}
    finally{setLoadingComparison(false);}
  }
  async function suggest(){
    if(adviceBusy||!total)return;
    if(!user){onSignIn();return;}
    setAdvice(null);setAdviceError("");setAdviceBusy(true);
    try{
      const result=await readJson<Advice>(await fetch("/api/audits/suggestions",{
        method:"POST",credentials:"same-origin",headers:actionHeaders,
        body:JSON.stringify({title,counts,language})
      }));
      setAdvice(result);
    }catch(e){setAdviceError(e instanceof Error?e.message:t("Could not generate suggestions."));}
    finally{setAdviceBusy(false);}
  }
  const previousCounts=comparison?countsOf(comparison.entries):null;
  const previousReviewed=comparison?reviewedOf(comparison.entries):[];
  const previousFlagged=previousReviewed.filter(e=>e.sorting_check==="mismatch");
  const comparable=comparison && Boolean(audit.location.trim()&&audit.session.trim()&&comparison.context?.location?.trim()&&comparison.context?.session?.trim()) &&
    audit.location.trim().toLocaleLowerCase()===comparison.context?.location?.trim().toLocaleLowerCase() &&
    audit.session.trim().toLocaleLowerCase()===comparison.context?.session?.trim().toLocaleLowerCase();

  return <section className="audit-kit community-audit kiosk-audit" aria-label={t("Community waste audit")}>
    <header className="audit-hero">
      <span className="audit-icon"><ClipboardList size={30}/></span>
      <div><h1>{t("Community waste audit")}</h1>
        <p className="audit-purpose">{t("Observe what enters each bin. Find patterns. Make one change, then measure again.")}</p>
      </div>
    </header>
    <nav className="audit-stage-tabs" aria-label={t("Audit steps")}>
      {(["setup","count","review"] as const).map((s,i)=><button type="button" key={s}
        aria-current={stage===s?"step":undefined}
        className={stage===s?"current":""}
        disabled={(s==="count"&&!audit.location.trim())||(s==="review"&&!total)}
        onClick={()=>setStage(s)}>
        <span>{i+1}</span>{t(s==="setup"?"Set up":s==="count"?"Count":"Review")}
      </button>)}
    </nav>
    {scannedItem&&stage!=="review"&&<div className="scan-audit-handoff" role="note">
      <div><strong>{t("From your scan")}: {scannedItem}</strong>
        <p>{t("Not counted. Confirm the actual item and observed bin below.")}</p></div>
      {onBackToScan&&<button type="button" onClick={onBackToScan}>{t("Back to scan")}</button>}
    </div>}
    {notice&&<p className="community-success" role="status"><Check size={17}/>{notice}</p>}
    {error&&<p className="community-error" role="alert">{error}</p>}

    {stage==="setup"&&<div className="audit-stage-panel">
      <div className="audit-stage-heading"><h2>{t("Where are you counting?")}</h2>
        <p>{t("Set up one observation session. No photos or AI needed.")}</p></div>
      <div className="audit-setup-fields">
        <label>{t("Location")}
          <input maxLength={80} required value={audit.location} placeholder={t("Example: School cafeteria")}
            onChange={e=>{setAudit(a=>({...a,location:e.target.value}));setComparison(null);setComparisonId("");}}/>
        </label>
        <label>{t("Session")}
          <input maxLength={60} value={audit.session} placeholder={t("Example: Lunch period")}
            onChange={e=>{setAudit(a=>({...a,session:e.target.value}));setComparison(null);setComparisonId("");}}/>
        </label>
        <label>{t("Audit name")} <small>{t("Optional")}</small>
          <input maxLength={60} value={audit.title} placeholder={t("Example: Cafeteria lunch")}
            onChange={e=>setAudit(a=>({...a,title:e.target.value}))}/>
        </label>
      </div>
      {total>0&&<p className="audit-resume-note">{total} {t("items already recorded in this draft")}</p>}
      <button className="audit-next-button" type="button" disabled={!audit.location.trim()} onClick={startCounting}>
        {t(total?"Continue counting":"Start counting")}<ArrowRight size={19}/>
      </button>
    </div>}

    {stage==="count"&&<div className="audit-stage-panel">
      <div className="audit-count-top">
        <div><h2>{t("What did you observe?")}</h2><p>{audit.location}{audit.session?" · "+audit.session:""}</p></div>
        <div className="audit-total"><strong>{total}</strong><span>{t("Items counted")}</span></div>
      </div>
      <div className="audit-capture-label">{t("1. Select an item")}</div>
      <div className="audit-item-grid" role="group" aria-label={t("Choose an item")}>
        {categories.map(item=><button type="button" key={item.id}
          aria-pressed={selectedItem===item.id} className={selectedItem===item.id?"picked":""}
          onClick={()=>{setSelectedItem(item.id);setPlacement("");}}>
          <span aria-hidden="true">{item.emoji}</span><strong>{t(item.label)}</strong>
        </button>)}
      </div>
      <div className="audit-capture-label">{t("2. Tap the observed destination")}</div>
      <div className="audit-bin-grid" role="group" aria-label={t("Observed destination")}>
        {destinations.map(bin=><button type="button" key={bin.id} disabled={!selectedItem||total>=15000}
          style={{["--audit-accent" as string]:bin.color}} onClick={()=>log(bin.id)}>
          <span aria-hidden="true">{bin.emoji}</span><strong>{t(bin.label)}</strong><small>{counts[bin.id]}</small>
        </button>)}
      </div>
      {!selectedItem&&<p className="audit-item-hint">{t("Select the item first. Each bin tap adds one observation.")}</p>}
      <details className="audit-verification">
        <summary>{t("Optional: Check placement against site rules")} <ChevronDown size={16}/></summary>
        <p>{t("Only assess a placement after checking the actual organization's collection rules. Leave unassessed items unchecked.")}</p>
        <label><input type="checkbox" checked={rulesChecked} onChange={e=>{setRulesChecked(e.target.checked);setPlacement("");}}/>
          {t("I checked the collection rules for this specific site.")}</label>
        {rulesChecked&&<label>{t("For the next eligible observation")}
          <select value={placement} onChange={e=>setPlacement(e.target.value as SortingCheck|"")}>
            <option value="">{t("No placement assessment")}</option>
            <option value="matches">{t("Placement matches the rules")}</option>
            <option value="mismatch">{t("Possible wrong-bin placement")}</option>
          </select>
        </label>}
      </details>
      <div className="audit-count-footer">
        <button type="button" className="audit-secondary" onClick={undo} disabled={!total}><Undo2 size={17}/>{t("Undo last")}</button>
        <button type="button" className="audit-next-button" onClick={()=>setStage("review")} disabled={!total}>
          {t("Review results")}<ArrowRight size={18}/>
        </button>
      </div>
    </div>}

    {stage==="review"&&<div className="audit-stage-panel">
      <div className="audit-review-head">
        <div><h2>{t("What did you find?")}</h2><p>{audit.location||t("Location not recorded")}{audit.session?" · "+audit.session:""}</p></div>
        <button type="button" className="audit-secondary" onClick={()=>setStage("count")}><ArrowLeft size={17}/>{t("Add more items")}</button>
      </div>
      <div className="audit-kpis">
        <div><strong>{total}</strong><span>{t("Items observed")}</span></div>
        <div><strong>{audit.entries.filter(e=>e.item_type).length}</strong><span>{t("Items identified")}</span></div>
        <div><strong>{reviewed.length?"": "—"}{reviewed.length?reviewedPct+"%":""}</strong><span>{t("Possible wrong-bin rate among checked items")}</span></div>
      </div>
      <div className="audit-results-grid">
        <section className="audit-insight-card"><h3><BarChart3 size={19}/>{t("Where items went")}</h3>
          {destinations.map(k=><div className="audit-report-row" key={k.id}>
            <div><span>{t(k.label)}</span><strong>{counts[k.id]}</strong></div>
            <div className="audit-report-track"><span style={{width:pct(counts[k.id],total)+"%",background:k.color}}/></div>
          </div>)}
        </section>
        <section className="audit-insight-card"><h3>{t("Most observed items")}</h3>
          {frequent.length?frequent.map(([item,count])=><div className="audit-frequent" key={item}>
            <span>{t(categories.find(c=>c.id===item)?.label||item)}</span>
            <strong>{count}</strong>
          </div>):<p>{t("Older counts did not include item types.")}</p>}
          <p className="audit-evidence-line">{reviewed.length
            ?t("Possible wrong-bin placements")+": "+flagged.length+" / "+reviewed.length+" "+t("checked items")
            :t("No placements have been checked against site rules.")}</p>
        </section>
      </div>
      <div className="audit-next-steps">
        <h3><Lightbulb size={20}/>{t("What to improve next")}</h3>
        <ol>
          <li>{flagged.length
            ?t("Review the items flagged during site-rule checks and improve guidance at those bins.")
            :t("Confirm the site's collection rules before judging bin placement.")}</li>
          <li>{frequent.length
            ?t("Start with the most common item and test a clearer sign or reusable alternative.")
            :t("Record item types during the next audit to spot recurring materials.")}</li>
          <li>{t("Repeat the count in the same place and session to evaluate the change.")}</li>
        </ol>
      </div>
      <p className="audit-evidence-note">{t("These are observed destinations, not proof of recycling or environmental savings. The wrong-bin rate includes only items explicitly checked against site rules.")}</p>
      <div className="audit-review-actions">
        <button type="button" className="audit-next-button" onClick={()=>void save()} disabled={!total||saving}>
          {saving?<LoaderCircle size={18}/>:<Save size={18}/>}
          {saving?t("Saving…"):t("Save audit")}
        </button>
        <button type="button" className="audit-secondary" onClick={()=>exportCsv({...audit,title})} disabled={!total}><Download size={17}/>{t("Export CSV")}</button>
        <button type="button" className="audit-secondary" onClick={()=>window.print()}><Printer size={17}/>{t("Print results")}</button>
        <button type="button" className="audit-secondary" onClick={fresh}><FilePlus2 size={17}/>{t("New audit")}</button>
      </div>
      {!user&&<p className="audit-signin-note"><LockKeyhole size={15}/>{t("Sign in to save audits. You can review or export this draft without signing in.")}
        <button type="button" onClick={onSignIn}>{t("Sign in")}</button></p>}
      <details className="audit-optional-features">
        <summary>{t("AI suggestions")} <ChevronDown size={16}/></summary>
        <button className="audit-secondary" type="button" onClick={()=>void suggest()} disabled={!total||adviceBusy}>
          <Sparkles size={16}/>{adviceBusy?t("Thinking…"):t("Generate AI suggestions")}
        </button>
        {adviceError&&<p role="alert">{adviceError}</p>}
        {advice&&<div className="audit-ai-output">
          <ol>{advice.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ol>
          <ReadAloudButton id="community-audit-advice" category="steps" text={advice.suggestions.join(". ")}/>
        </div>}
      </details>
      {user&&<section className="audit-compare">
        <h3>{t("Compare with a previous audit")}</h3>
        <label>{t("Choose saved audit")}
          <select disabled={loadingComparison} value={comparisonId} onChange={e=>void chooseComparison(e.target.value)}>
            <option value="">{t("Choose saved audit")}</option>
            {saved.filter(s=>s.id!==activeSavedId).map(item=>
              <option key={item.id} value={String(item.id)}>{item.title} · {item.item_count} {t("items")}</option>)}
          </select>
        </label>
        {loadingComparison&&<p role="status">{t("Loading saved audits…")}</p>}
        {comparison&&previousCounts&&<div className="audit-comparison-results">
          <p>{comparable?t("Same location and session; compare carefully."):t("Location or session details differ or are missing. This is a side-by-side view, not evidence of improvement.")}</p>
          <div className="audit-compare-table">
            <div><strong>{t("Metric")}</strong><strong>{t("Current")}</strong><strong>{t("Previous")}</strong></div>
            <div><span>{t("Items observed")}</span><b>{total}</b><b>{comparison.entries.length}</b></div>
            <div><span>{t("Trash")}</span><b>{counts.trash}</b><b>{previousCounts.trash}</b></div>
            <div><span>{t("Recycling")}</span><b>{counts.recycle}</b><b>{previousCounts.recycle}</b></div>
            <div><span>{t("Possible wrong-bin rate among checked items")}</span>
              <b>{reviewed.length?reviewedPct+"%":"—"}</b>
              <b>{previousReviewed.length?pct(previousFlagged.length,previousReviewed.length)+"%":"—"}</b>
            </div>
          </div>
          <p>{t("Different audit sizes, item mixes, or unchecked material rules can distort comparisons.")}</p>
        </div>}
      </section>}
    </div>}

    {(stage==="setup"||stage==="review")&&<details className="audit-saved-section">
      <summary>{t("Saved audits")} <span>{user?saved.length:""}</span><ChevronDown size={16}/></summary>
      {!user?<p>{t("Sign in to view saved audits on this server.")}</p>:
        loadingSaved?<p>{t("Loading saved audits…")}</p>:
        !saved.length?<p>{t("No saved audits yet. Count some items above and choose Save audit.")}</p>:
        <div className="audit-saved-list">{saved.map(record=><div key={record.id} className="audit-saved-record">
          <div><strong>{record.title}</strong><span>{record.context?.location||t("Location not recorded")} · {record.item_count} {t("items")}</span></div>
          <div><button type="button" disabled={opening} onClick={()=>void open(record.id)}>{t("Open")}</button>
            <button type="button" aria-label={t("Delete")+" "+record.title} onClick={()=>void remove(record.id)}><Trash2 size={17}/></button>
          </div>
        </div>)}</div>}
    </details>}
  </section>;
}
