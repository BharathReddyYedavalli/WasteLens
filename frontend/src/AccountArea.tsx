import { useEffect, useState } from "react";
import { AlertTriangle, Check, History, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import type { SessionUser, SavedScan, AdminOverview, AdminUser, AdminFeedback } from "./types";
import { useLanguage } from "./i18n";
import HabitSnapshot from "./HabitSnapshot";

export const actionHeaders = { "Content-Type": "application/json", "X-WasteLens-Request": "1" };

export async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed.");
  return data as T;
}

type Props = {
  user: SessionUser | null;
  mode: "account" | "history" | "admin";
  visualStyle: "claude" | "legacy";
  onVisualStyleChange: (style: "claude" | "legacy") => void;
  onLogin: (user: SessionUser) => void;
  onLogout: () => void;
};

export default function AccountArea({ user, mode, visualStyle, onVisualStyleChange, onLogin, onLogout }: Props) {
  const { t,language } = useLanguage();
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [showAllHistory,setShowAllHistory] = useState(false);
  const [actionSaving, setActionSaving] = useState<number | null>(null);
  const [actionError, setActionError] = useState<{id:number;message:string} | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [reviewOnly, setReviewOnly] = useState(false);
  const shownFeedback = reviewOnly ? feedback.filter(entry=>entry.feedback === "no") : feedback;

  useEffect(() => {
    if (!user || mode !== "history") return;
    let active = true;
    fetch("/api/scans")
      .then(response => readJson<{ scans: SavedScan[] }>(response))
      .then(data => { if (active) setScans(data.scans); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user, mode]);

  useEffect(() => {
    if (!user || user.role !== "admin" || mode !== "admin") return;
    let active = true;
    Promise.all([
      fetch("/api/admin/overview").then(response => readJson<AdminOverview>(response)),
      fetch("/api/admin/users").then(response => readJson<{ users: AdminUser[] }>(response)),
      fetch("/api/admin/feedback").then(response => readJson<{ feedback: AdminFeedback[] }>(response)),
    ]).then(([counts, members, answers]) => {
      if (active) { setOverview(counts); setUsers(members.users); setFeedback(answers.feedback); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user, mode]);

  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST", headers: actionHeaders, credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      });
      const account = await readJson<SessionUser>(response);
      setPassword("");
      onLogin(account);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally { setBusy(false); }
  }

  async function logout() {
    try {
      await readJson<{ ok: boolean }>(await fetch("/api/auth/logout", {
        method: "POST", headers: { "X-WasteLens-Request": "1" }, credentials: "same-origin",
      }));
      onLogout();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign out."); }
  }

  async function logAction(scanId:number, action:"recycled"|"reused"|"composted"|"donated") {
    if (actionSaving !== null) return;
    setActionError(null);
    setActionSaving(scanId);
    try {
      await readJson<{action:string}>(await fetch("/api/scans/" + scanId + "/action",{
        method:"POST",headers:actionHeaders,credentials:"same-origin",
        body:JSON.stringify({action}),
      }));
      setScans(items=>items.map(item=>item.id===scanId?{...item,action}:item));
    }catch(reason){
      setActionError({id:scanId,message:reason instanceof Error?reason.message:"Could not save that action."});
    }finally{
      setActionSaving(null);
    }
  }

  if (!user) {
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><UserPlus/></div>
        <div><h2>{signup ? t("Create your account") : t("Sign in to WasteLens")}</h2>
          </div></div>
      <form className="auth-form" onSubmit={event => void authenticate(event)}>
        {signup && <label>{t("Display name")}<input value={name} required minLength={2} maxLength={80}
          onChange={event => setName(event.target.value)} autoComplete="name"/></label>}
        <label>{t("Email")}<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email"/></label>
        <label>{t("Password")}<input type="password" required minLength={signup ? 10 : 1} maxLength={256}
          value={password} onChange={event => setPassword(event.target.value)}
          autoComplete={signup ? "new-password" : "current-password"}/></label>
        <button className="button primary" disabled={busy}>{busy ? t("Please wait…") : (signup ? t("Sign up") : t("Sign in"))}</button>
      </form>
      <button className="link-button" onClick={() => { setSignup(!signup); setError(""); }}>
        {signup ? t("Already have an account? Sign in") : t("New here? Create an account")}
      </button>
      <details className="account-privacy"><summary><LockKeyhole size={16}/> {t("Your account and privacy")}</summary><p>{t("Your password is securely hashed. Saved scans contain item results, not photos.")}</p></details>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section>;
  }

  if (mode === "history") {
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><History/></div>
        <div><h2>{t("My scans")}</h2><p>{scans.length} {t("saved")} {t(scans.length === 1 ? "item" : "items")}</p></div></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <HabitSnapshot/>
      {scans.length === 0 && <p>{t("Nothing here yet. Scan your first item to save it.")}</p>}
      <div className="history-grid">{scans.slice(0,showAllHistory?undefined:6).map(scan => <article className="history-card" key={scan.id}>
        <div className="history-head"><h3>{scan.item_name}</h3><time>{new Date(scan.created_at).toLocaleString()}</time></div>
        <p><strong>{t("Material:")}</strong> {scan.analysis.material_guess}</p>
        <p><strong>{t("What to do:")}</strong> {scan.analysis.route_title}</p>
        
        {scan.feedback && <p><strong>{t("Your feedback:")}</strong> {t(scan.feedback === "yes" ? "Correct" : "Needs correction")}</p>}
        {scan.correction && <p><strong>{t("Correction:")}</strong> {scan.correction}</p>}
        <details><summary>{t("See the tips for this item")}</summary>
          <h4>{t("Disposal")}</h4><ul>{scan.analysis.disposal_steps.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <h4>{t("Reuse")}</h4><ul>{scan.analysis.reuse_ideas.map((text, i) => <li key={i}>{text}</li>)}</ul>
        </details>
        <details className="history-action-log">
          <summary>{t("What did you do with it?")}</summary>
          <div className="action-choices">
            {(["recycled","reused","composted","donated"] as const).map(choice=>
              <button key={choice} type="button"
                className={"button "+(scan.action===choice?"primary":"outline")}
                disabled={actionSaving!==null}
                aria-pressed={scan.action===choice}
                onClick={()=>void logAction(scan.id,choice)}>
                {t(choice[0].toUpperCase()+choice.slice(1))}
              </button>
            )}
          </div>
          {scan.action&&<p className="action-confirmed">{t("Saved as")} {t(scan.action[0].toUpperCase()+scan.action.slice(1))}.</p>}
          {actionError?.id===scan.id&&<p role="alert" className="inline-error">{actionError.message}</p>}
        </details>
      </article>)}</div>
      {scans.length>6&&<button type="button" className="history-more-records"
        aria-expanded={showAllHistory} onClick={()=>setShowAllHistory(current=>!current)}>
        {language==="es"?(showAllHistory?"Mostrar menos":"Ver todos los registros"):
         language==="hi"?(showAllHistory?"कम दिखाएँ":"सभी स्कैन देखें"):
         showAllHistory?"Show fewer scans":"Show all scans"} ({scans.length})
      </button>}
    </section>;
  }

  if (mode === "admin") {
    if (user.role !== "admin") return <section className="account-card"><h2>{t("Administrator access required")}</h2></section>;
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><ShieldCheck/></div>
        <div><h2>{t("Admin dashboard")}</h2></div></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <section className="admin-ui-settings" aria-label={t("Interface style")}>
        <h3>{t("Interface appearance")}</h3>
        <p>{t("Switch the visual design without changing scans, maps, features, text, or saved data.")}</p>
        <div className="admin-ui-choices" role="group" aria-label={t("Interface style")}>
          <button type="button" className={visualStyle === "claude" ? "admin-ui-choice is-selected" : "admin-ui-choice"}
            aria-pressed={visualStyle === "claude"} onClick={() => onVisualStyleChange("claude")}>{t("Current UI")}</button>
          <button type="button" className={visualStyle === "legacy" ? "admin-ui-choice is-selected" : "admin-ui-choice"}
            aria-pressed={visualStyle === "legacy"} onClick={() => onVisualStyleChange("legacy")}>{t("Legacy UI")}</button>
        </div>
      </section>
      <div className="admin-stats">
        <div><strong>{overview?.users ?? "…"}</strong><span>{t("Accounts")}</span></div>
        <div><strong>{overview?.scans ?? "…"}</strong><span>{t("Saved scans")}</span></div>
        <div><strong>{overview?.yes ?? "…"}</strong><span>{t("Reported correct")}</span></div>
        <div><strong>{overview?.no ?? "…"}</strong><span>{t("Reported incorrect")}</span></div>
      </div>
      <details className="admin-kiosk-data"><summary>{t("Scan identification feedback")}</summary>
      <p className="admin-feedback-intro">{t('These answers come from "Was that right?" after a scan. Yes means the user agreed with the item name; No means they reported a mistake. They are user reports, not a measured accuracy score.')}</p>
      <div className="admin-feedback-tools">
        <p>{t("Showing the most recent 500 feedback entries.")}</p>
        <button type="button" className="admin-feedback-toggle" aria-pressed={reviewOnly}
          onClick={()=>setReviewOnly(current=>!current)}>
          {reviewOnly ? t("Show all feedback") : t("Show reported mistakes only")}
        </button>
      </div>
      <div className="table-wrap"><table><thead><tr>
        <th>{t("Account")}</th><th>{t("Identified item")}</th><th>{t("User response")}</th><th>{t("Suggested correction")}</th><th>{t("Date")}</th>
      </tr></thead>
        <tbody>{shownFeedback.map(entry => <tr key={entry.id}>
          <td>{entry.user_name}</td><td>{entry.item_name}</td>
          <td>{entry.feedback === "yes"
            ? <span className="admin-answer admin-answer-correct"><Check size={14}/>{t("Looks correct")}</span>
            : <span className="admin-answer admin-answer-incorrect"><AlertTriangle size={14}/>{t("Needs correction")}</span>}</td>
          <td>{entry.correction || t("Not provided")}</td>
          <td>{new Date(entry.created_at).toLocaleDateString()}</td>
        </tr>)}</tbody>
      </table></div>
      {shownFeedback.length===0 && <p className="admin-feedback-empty">
        {reviewOnly ? t("No reported mistakes in these feedback entries.") : t("No classification feedback has been submitted yet.")}
      </p>}
      </details>
      <details className="admin-kiosk-data"><summary>{t("Users")}</summary>
      <div className="table-wrap"><table><thead><tr><th>{t("Name")}</th><th>{t("Email")}</th><th>{t("Role")}</th><th>{t("Scans")}</th></tr></thead>
        <tbody>{users.map(member => <tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td>{member.role}</td><td>{member.scan_count}</td></tr>)}</tbody>
      </table></div>
      </details>
    </section>;
  }

  return <section className="account-card">
    <h2>{t("My account")}</h2>
    <p><strong>{t("Name:")}</strong> {user.name}</p>
    <p><strong>{t("Email:")}</strong> {user.email}</p>
    {user.role === "admin" && <p><strong>{t("Role:")}</strong> {t("Admin")}</p>}
    <button className="button outline" onClick={() => void logout()}>{t("Sign out")}</button>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
