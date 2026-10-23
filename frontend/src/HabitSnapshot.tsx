import { useEffect, useState } from "react";
import { Award, BarChart3, CheckCircle2, Download, ScanLine, Sparkles } from "lucide-react";
import { useLanguage } from "./i18n";
import type { LeaderboardResponse } from "./types";

async function readJson<T>(response:Response):Promise<T>{
  const data=await response.json();
  if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Could not load activity.");
  return data as T;
}
type Day = {day:string;scans:number;actions:number};
type Habits = {
  days:Day[];seven_day_scans:number;seven_day_actions:number;total_scans:number;
  reuse_and_donation:number;recorded_actions:Record<string,number>;verified_impact:false;
};
export default function HabitSnapshot({userId}:{userId:number}) {
  const {t,language}=useLanguage();
  const [data,setData]=useState<Habits|null>(null);
  const [progress,setProgress]=useState<LeaderboardResponse["me"]>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    setLoading(true);setError("");setData(null);setProgress(null);
    Promise.allSettled([
      fetch("/api/habits",{credentials:"same-origin"}).then(r=>readJson<Habits>(r)),
      fetch("/api/leaderboard",{credentials:"same-origin"}).then(r=>readJson<LeaderboardResponse>(r))
    ]).then(([activity,rewards])=>{
      if(!active)return;
      if(activity.status==="fulfilled")setData(activity.value);
      else setError(t("Could not load activity."));
      if(rewards.status==="fulfilled")setProgress(rewards.value.me);
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[userId]);

  function exportCSV(){
    if(!data)return;
    const rows=[["date","scans","self_reported_actions"],
      ...data.days.map(day=>[day.day,String(day.scans),String(day.actions)])];
    const blob=new Blob([rows.map(row=>row.join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="wastelens-activity.csv";document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  if(loading)return <div className="activity-loading" role="status">{t("Loading activity…")}</div>;
  if(error)return <p role="alert" className="inline-error">{error}</p>;
  if(!data)return null;
  const maximum=Math.max(1,...data.days.flatMap(day=>[day.scans,day.actions]));
  const badges=progress?.badges.filter(b=>b.unlocked)??[];
  const locale=language==="hi"?"hi-IN":language==="es"?"es-ES":"en-US";
  const kinds=[["recycled",t("Recycled")],["reused",t("Reused")],["composted",t("Composted")],["donated",t("Donated")]] as const;
  return <section className="activity-snapshot" aria-label={t("Your activity summary")}>
    <div className="activity-kpis">
      <div className="activity-kpi">
        <ScanLine size={21}/><strong>{data.total_scans}</strong>
        <span>{t("Items scanned")}</span><small>{t("All time")}</small>
      </div>
      <div className="activity-kpi">
        <CheckCircle2 size={21}/><strong>{data.seven_day_actions}</strong>
        <span>{t("Actions you logged")}</span><small>{t("Past 7 days")}</small>
      </div>
      <div className="activity-kpi">
        <Sparkles size={21}/><strong>{progress?.xp.toLocaleString()??"—"}</strong>
        <span>XP</span><small>{progress?t("Level")+" "+progress.level:t("Rewards unavailable")}</small>
      </div>
    </div>
    <div className="activity-sections">
      <section className="activity-panel activity-week">
        <div className="activity-section-heading">
          <h3><BarChart3 size={18}/>{t("Your last 7 days")}</h3>
          <button className="activity-csv" type="button" onClick={exportCSV} aria-label={t("Export activity CSV")}>
            <Download size={16}/> CSV
          </button>
        </div>
        <div className="activity-week-key">
          <span><i className="activity-key-scan"/>{t("Scans")}</span>
          <span><i className="activity-key-action"/>{t("Self-reported actions")}</span>
        </div>
        <div className="activity-week-chart" role="list" aria-label={t("Your last 7 days")}>
          {data.days.map(day=><div key={day.day} className="activity-chart-day" role="listitem"
            aria-label={day.day+": "+day.scans+" "+t("Scans")+", "+day.actions+" "+t("Self-reported actions")}>
            <div className="activity-bar-pair">
              <span className="activity-bar-scans" style={{height:day.scans?Math.max(7,day.scans/maximum*100)+"%":"0%"}}
                title={t("Scans")+": "+day.scans}/>
              <span className="activity-bar-actions" style={{height:day.actions?Math.max(7,day.actions/maximum*100)+"%":"0%"}}
                title={t("Self-reported actions")+": "+day.actions}/>
            </div>
            <time dateTime={day.day}>{new Date(day.day+"T12:00:00").toLocaleDateString(locale,{weekday:"short"})}</time>
          </div>)}
        </div>
        <p className="activity-accuracy">{t("A scan is an identification attempt, not proof that an item was recycled. Actions are self-reported.")}</p>
      </section>
      <section className="activity-panel activity-progress">
        <div className="activity-section-heading"><h3><Award size={18}/>{t("Your progress")}</h3></div>
        {progress?<div className="activity-level">
          <div className="activity-level-head"><strong>{t("Level")} {progress.level}</strong>
            <span>{progress.xp.toLocaleString()} XP</span></div>
          <div className="activity-level-track" role="progressbar" aria-label={t("Progress to next level")}
            aria-valuemin={0} aria-valuenow={progress.level_progress} aria-valuemax={progress.level_goal}>
            <span style={{width:Math.min(100,progress.level_progress/Math.max(1,progress.level_goal)*100)+"%"}}/>
          </div>
          <p>{progress.level_goal-progress.level_progress} XP {t("until the next level")}</p>
        </div>:<p>{t("Rewards unavailable")}</p>}
        <div className="activity-badges">
          <h4>{t("Badges earned")} <span>{badges.length}</span></h4>
          {badges.length?<div className="activity-badge-list">
            {badges.map(b=><span key={b.id} className="activity-badge"><Award size={16}/>{t(b.name)}</span>)}
          </div>:<p>{t("No badges yet. Scan an item or complete the Bottle Journey quiz.")}</p>}
        </div>
      </section>
    </div>
    {data.seven_day_actions>0&&<section className="activity-action-breakdown" aria-label={t("Actions you logged")}>
      <h3>{t("Actions you logged")} <small>{t("Past 7 days")}</small></h3>
      <div>{kinds.filter(([key])=>(data.recorded_actions[key]??0)>0).map(([key,label])=>
        <span key={key}>{label}<strong>{data.recorded_actions[key]}</strong></span>)}</div>
    </section>}
  </section>;
}
