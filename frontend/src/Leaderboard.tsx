import { useEffect, useState } from "react";
import { Award, CheckCircle2, Leaf, LockKeyhole, ScanLine, Sparkles, Trophy, Users } from "lucide-react";
import type { LeaderboardResponse, SessionUser, WasteLensBadge } from "./types";
import { actionHeaders, readJson } from "./AccountArea";
import { useLanguage } from "./i18n";

function Badge({ badge }: { badge: WasteLensBadge }) {
  const { t } = useLanguage();
  return <div className={"reward-badge " + (badge.unlocked ? "unlocked" : "locked")}>
    <span className="reward-badge-icon">{badge.unlocked ? <Award size={24}/> : <LockKeyhole size={22}/>}</span>
    <strong>{t(badge.name)}</strong>
    <small>{badge.unlocked ? t("Unlocked") : badge.id === "bottle-explorer" ? t("Pass the bottle quiz") : badge.threshold + " " + t("Scans")}</small>
  </div>;
}

export default function Leaderboard({ user, onSignIn }: {user: SessionUser | null;onSignIn:()=>void}) {
  const { t } = useLanguage();
  const [data, setData] = useState<LeaderboardResponse|null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(()=>{
    let active = true;
    fetch("/api/leaderboard", { credentials:"same-origin" })
      .then(r=>readJson<LeaderboardResponse>(r))
      .then(r=>{if(active)setData(r);})
      .catch(e=>{if(active)setError(e instanceof Error ? e.message : "Could not load leaderboard.");});
    return ()=>{active=false;};
  },[user]);
  async function toggle() {
    if (!data?.me || busy) return;
    setBusy(true);setError("");
    try {
      await readJson(await fetch("/api/leaderboard/visibility",{
        method:"POST",headers:actionHeaders,credentials:"same-origin",
        body:JSON.stringify({visible:!data.me.visible})
      }));
      setData(await readJson<LeaderboardResponse>(await fetch("/api/leaderboard",{credentials:"same-origin"})));
    } catch(e) {setError(e instanceof Error ? e.message : "Couldn't update your setting.");}
    finally {setBusy(false);}
  }
  return <section className="league-page">
    <div className="league-title"><span className="league-icon"><Trophy size={29}/></span>
      <div><h1>{t("Leaderboard")}</h1></div></div>
    {data?.me ? <>
      <div className="level-panel">
        <div className="level-top"><div><h2>{t("Level")} {data.me.level}</h2></div>
          <strong><Sparkles size={22}/>{data.me.xp.toLocaleString()} XP</strong>
        </div>
        <div className="level-track" role="progressbar" aria-label="Progress to next level"
          aria-valuenow={data.me.level_progress} aria-valuemin={0} aria-valuemax={data.me.level_goal}>
          <span style={{width: (data.me.level_progress/data.me.level_goal*100)+"%"}}/>
        </div>
        <small className="level-next">{data.me.level_goal-data.me.level_progress} XP to level {data.me.level+1}</small>
      </div>
      <div className="league-stats">
        <div><ScanLine size={21}/><strong>{data.me.scans}</strong><span>{t("Scans")}</span></div>
        <div><CheckCircle2 size={21}/><strong>{data.me.actions}</strong><span>{t("Actions logged")}</span></div>
        <div><Award size={21}/><strong>{data.me.badges.filter(b => b.unlocked).length}</strong><span>{t("Badges")}</span></div>
      </div>
      <section className="badge-panel"><h2>{t("Your badges")}</h2><div className="badge-grid">
        {data.me.badges.map(b=><Badge key={b.id} badge={b}/>)}
      </div></section>
    </> : <div className="league-guest"><Leaf size={32}/><h2>{t("Save your progress")}</h2>
      <p>{t("Sign in to save scans and earn badges.")}</p>
      <button className="button primary" type="button" onClick={onSignIn}>{t("Sign in")}</button></div>}
    <section className="league-ranking">
      <div className="league-ranking-heading"><div><h2>{t("Top scanners")}</h2></div><Users size={25}/></div>
      {data?.leaders.length ? <div className="rank-list">{data.leaders.map(person=>
        <div key={person.rank} className={"rank-entry "+(person.is_you?"its-you":"")}>
          <span className="rank-number">{person.rank===1?"🏆":"#"+person.rank}</span>
          <div className="rank-user"><strong>{person.name}{person.is_you?" (you)":""}</strong>
          <span>{person.scans} scans · {person.actions} actions</span></div>
          <strong className="rank-xp">{person.xp.toLocaleString()} XP</strong>
        </div>)}</div> : <div className="rank-empty">{t("The board is empty. You can be the first!")}</div>}
      {data?.me && <div className="privacy-toggle"><div><strong>{t("Show me on the leaderboard")}</strong>
        <p>{data.me.visible ? t("Your display name and scores are visible to visitors.") : t("Your progress is private until you join.")}</p></div>
        <button className={"button "+(data.me.visible?"outline":"primary")} type="button"
          disabled={busy} onClick={()=>void toggle()}>{busy?"Saving…":data.me.visible?t("Leave leaderboard"):t("Join leaderboard")}</button>
      </div>}
    </section>
    <details className="league-rules">
      <summary>{t("How XP works")}</summary>
      <p>You earn {data?.rules.xp_per_scan ?? 20} XP for a new photo when the item is identified confidently.
      Up to {data?.rules.daily_limit ?? 10} rewarded scans a day. Scanning the same photo again earns nothing.
      Recycling actions are self reported. CO₂ savings cannot be measured from photos.</p>
    </details>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
