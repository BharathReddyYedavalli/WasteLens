import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, RotateCcw, Undo2, Printer } from "lucide-react";
import { useLanguage } from "./i18n";

type Kind = "recycle" | "compost" | "trash" | "reuse" | "unsure";
type Entry = { kind: Kind; at: string };
type Audit = { title: string; entries: Entry[] };
const STORAGE_KEY = "wastelens-community-audit-v1";
const kinds: { id: Kind; label: string; emoji: string }[] = [
  {id:"recycle",label:"Recycling",emoji:"♻️"},
  {id:"compost",label:"Compost",emoji:"🌱"},
  {id:"trash",label:"Trash",emoji:"🗑️"},
  {id:"reuse",label:"Reuse",emoji:"💛"},
  {id:"unsure",label:"Not sure",emoji:"❓"},
];
const palette = ["#238b7a","#78ae55","#ea8259","#9880d2","#f4bc50"];
function loadAudit(): Audit {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return {title:"",entries:[]};
    const parsed = JSON.parse(saved);
    if (typeof parsed?.title !== "string" || !Array.isArray(parsed?.entries)) throw new Error("Invalid audit");
    const entries = parsed.entries.filter((item: unknown): item is Entry =>
      typeof item === "object" && item !== null &&
      "kind" in item && kinds.some(k => k.id === (item as Entry).kind) &&
      "at" in item && typeof (item as Entry).at === "string"
    ).slice(-15000);
    return {title:parsed.title.slice(0,60),entries};
  } catch { return {title:"",entries:[]}; }
}
function csvCell(value: string): string {
  const safe = /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"','""') + '"';
}
export default function AuditKit() {
  const { language, t } = useLanguage();
  const [audit,setAudit] = useState<Audit>(loadAudit);
  useEffect(() => {
    try {window.localStorage.setItem(STORAGE_KEY,JSON.stringify(audit));} catch { /* full or blocked */ }
  },[audit]);
  const counts = useMemo(() => Object.fromEntries(kinds.map(kind =>
    [kind.id,audit.entries.filter(entry=>entry.kind === kind.id).length]
  )) as Record<Kind,number>,[audit.entries]);
  const total = audit.entries.length;
  function log(kind: Kind) {
    if (total >= 15000) return;
    setAudit(previous => ({...previous,entries:[...previous.entries,{kind,at:new Date().toISOString()}]}));
  }
  function reset() {
    if (!window.confirm(t("Clear this audit?"))) return;
    setAudit({title:"",entries:[]});
  }
  function exportCSV() {
    const rows = [
      ["audit","timestamp_utc","observed_category"],
      ...audit.entries.map(entry => [audit.title,entry.at,entry.kind]),
    ];
    const csv = rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url;a.download="wastelens-waste-audit.csv";
    document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="audit-kit" aria-label={t("Waste audit")}>
    <header className="audit-hero">
      <span className="audit-icon"><ClipboardList size={31}/></span>
      <div><h1>{t("Waste audit")}</h1>
      <p>{t("Count what you see during a cleanup or lunch period. No photos needed.")}</p></div>
    </header>
    <div className="audit-session">
      <label htmlFor="audit-title">{t("Audit name")} <span>{t("Optional")}</span></label>
      <input id="audit-title" maxLength={60} autoComplete="off"
        placeholder={t("Example: Cafeteria lunch")} value={audit.title}
        onChange={e=>setAudit(previous=>({...previous,title:e.target.value}))}/>
    </div>
    <div className="audit-count-row">
      <div><span>{t("Items counted")}</span><strong>{total}</strong></div>
      <p>{t("Tap a category for each item you observe.")}</p>
    </div>
    <div className="audit-options">
      {kinds.map((kind,index)=><button type="button" key={kind.id} onClick={()=>log(kind.id)}
        className={"audit-option audit-"+kind.id} style={{["--audit-accent" as string]:palette[index]}}>
        <span className="audit-option-emoji" aria-hidden="true">{kind.emoji}</span>
        <strong>{t(kind.label)}</strong>
        <span className="audit-option-count">{counts[kind.id]}</span>
      </button>)}
    </div>
    <div className="audit-actions">
      <button type="button" disabled={!total} onClick={()=>setAudit(previous=>({...previous,entries:previous.entries.slice(0,-1)}))}>
        <Undo2 size={17}/>{t("Undo last")}
      </button>
      <button type="button" disabled={!total} onClick={exportCSV}><Download size={17}/>{t("Export CSV")}</button>
      <button type="button" disabled={!total} onClick={()=>window.print()}><Printer size={17}/>{t("Print results")}</button>
      <button type="button" disabled={!total && !audit.title} className="audit-reset" onClick={reset}><RotateCcw size={17}/>{t("Clear audit")}</button>
    </div>
    <div className="audit-results">
      <h2>{t("What you counted")}</h2>
      {total === 0 ? <p className="audit-empty">{t("Tap a category above to start.")}</p>
        : <div className="audit-bars">{kinds.map((kind,index) =>
          <div key={kind.id} className="audit-bar-row">
            <span>{t(kind.label)}</span>
            <div className="audit-bar-track" role="progressbar" aria-label={t(kind.label)}
              aria-valuemin={0} aria-valuemax={total} aria-valuenow={counts[kind.id]}>
              <span style={{width:(counts[kind.id]/total*100)+"%",backgroundColor:palette[index]}}/>
            </div>
            <strong>{Math.round(counts[kind.id]/total*100)}%</strong>
          </div>)}</div>}
      <details className="audit-note"><summary>{t("About these numbers")}</summary>
        <p>{t("Counts are entered by people, not checked by AI. They do not prove recycling or carbon savings. This audit stays in this browser until cleared.")}</p>
      </details>
    </div>
  </section>;
}
