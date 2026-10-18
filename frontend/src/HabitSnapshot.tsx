import { useEffect, useState } from "react";
import { BarChart3, Download, HeartHandshake, Recycle, ScanLine } from "lucide-react";
import { useLanguage } from "./i18n";
import { readJson } from "./AccountArea";

type Day = { day: string; scans: number; actions: number };
type Habits = {
  days: Day[]; seven_day_scans: number; seven_day_actions: number;
  total_scans: number; reuse_and_donation: number;
  recorded_actions: Record<string,number>; verified_impact: false;
};

export default function HabitSnapshot() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<Habits | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/habits", { credentials:"same-origin" })
      .then(r => readJson<Habits>(r))
      .then(r => { if (active) setData(r); })
      .catch(() => { if (active) setError("Could not load activity."); });
    return () => { active = false; };
  },[]);
  function exportCSV() {
    if (!data) return;
    const rows = [
      ["date","scans","self_reported_actions"],
      ...data.days.map(day => [day.day, String(day.scans), String(day.actions)]),
    ];
    const csv = rows.map(row => row.join(",")).join("\r\n");
    const file = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const link = document.createElement("a");
    const url = URL.createObjectURL(file);
    link.href = url; link.download = "wastelens-activity.csv";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <div className="habit-loading" role="status">…</div>;
  const max = Math.max(1, ...data.days.map(day => day.scans));
  return <section className="habit-snapshot" aria-label={t("Your habits")}>
    <div className="habit-head"><div><span className="eyebrow">YOUR ROUTINE</span>
      <h3>{t("Your habits")}</h3></div>
      <button type="button" className="habit-export" onClick={exportCSV}>
        <Download size={17}/> CSV
      </button>
    </div>
    <div className="habit-numbers">
      <div><ScanLine size={19}/><strong>{data.seven_day_scans}</strong><span>{t("Items scanned")}</span></div>
      <div><Recycle size={19}/><strong>{data.seven_day_actions}</strong><span>{t("Actions logged")}</span></div>
      <div><HeartHandshake size={19}/><strong>{data.reuse_and_donation}</strong><span>{t("Reused or donated")}</span></div>
    </div>
    <div className="habit-plot-head"><h4><BarChart3 size={18}/>{t("Past 7 days")}</h4></div>
    <div className="habit-week" role="list" aria-label={t("Items scanned")}>
      {data.days.map(day => <div className="habit-day" key={day.day} role="listitem"
        aria-label={day.day + ": " + day.scans + " scans, " + day.actions + " actions"}>
        <div className="habit-bar-rail"><span style={{height: Math.max(day.scans ? 10 : 0, day.scans/max*100) + "%"}}/></div>
        <span>{new Date(day.day + "T12:00:00").toLocaleDateString(
          language === "hi" ? "hi-IN" : language === "es" ? "es-US" : "en-US",
          {weekday:"short"})}</span>
      </div>)}
    </div>
    <p className="habit-caveat">{t("Your activity is based on scans and actions you reported.")}</p>
  </section>;
}
