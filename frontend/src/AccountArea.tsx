import { useEffect, useState } from "react";
import { ArrowRight, Check, ClipboardList, History, LockKeyhole, ScanLine, ShieldCheck, UserPlus } from "lucide-react";
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
  onLogin: (user: SessionUser) => void;
  onLogout: () => void;
  onScan: () => void;
  onAudit: () => void;
};

export default function AccountArea({ user, mode, onLogin, onLogout, onScan, onAudit }: Props) {
  const { t } = useLanguage();
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [showAllScans, setShowAllScans] = useState(false);
  const [loadingScans, setLoadingScans] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);

  useEffect(() => {
    if (!user || mode !== "history") return;
    let active = true;
    setScans([]);setShowAllScans(false);setLoadingScans(true);setError("");
    fetch("/api/scans", { credentials:"same-origin" })
      .then(response => readJson<{ scans: SavedScan[] }>(response))
      .then(data => { if (active) setScans(data.scans); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoadingScans(false); });
    return () => { active = false; };
  }, [user?.id, mode]);

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
        <button className="button primary" disabled={busy}>{busy ? "Please wait…" : (signup ? t("Sign up") : t("Sign in"))}</button>
      </form>
      <button className="link-button" onClick={() => { setSignup(!signup); setError(""); }}>
        {signup ? t("Already have an account? Sign in") : t("New here? Create an account")}
      </button>
      <details className="account-privacy"><summary><LockKeyhole size={16}/> {t("Your account and privacy")}</summary><p>Your password is securely hashed. Saved scans contain item results, not photos.</p></details>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section>;
  }

  if (mode === "history") {
    const visibleScans=showAllScans?scans:scans.slice(0,6);
    return <section className="account-card my-activity-page">
      <div className="activity-hero">
        <div className="activity-hero-copy">
          <div className="activity-hero-eyebrow"><History size={17}/>{t("Your WasteLens journey")}</div>
          <h1>{t("My activity")}</h1>
          <p>{t("See what you've scanned, the actions you've recorded and the progress you've earned.")}</p>
        </div>
        <div className="activity-hero-actions">
          <button type="button" onClick={onScan}><ScanLine size={17}/>{t("Scan an item")}<ArrowRight size={16}/></button>
          <button type="button" onClick={onAudit}><ClipboardList size={17}/>{t("Run a waste audit")}</button>
        </div>
      </div>
      {error&&<p className="inline-error" role="alert">{error}</p>}
      <HabitSnapshot userId={user.id}/>
      <section className="activity-recent">
        <div className="activity-recent-heading">
          <div><h2>{t("Recent scans")}</h2>
            <p>{t("Saved identification results. Check local rules before deciding where an item goes.")}</p></div>
          <span>{scans.length} {t("saved items")}</span>
        </div>
        {loadingScans?<p role="status">{t("Loading scans…")}</p>:
          scans.length===0?<div className="activity-empty">
            <ScanLine size={28}/>
            <strong>{t("No saved scans yet")}</strong>
            <p>{t("Scan your first item to start building your history.")}</p>
            <button type="button" onClick={onScan}>{t("Scan an item")}<ArrowRight size={16}/></button>
          </div>:
          <div className="history-grid activity-scan-grid">{visibleScans.map(scan=>
            <article className="history-card activity-scan-card" key={scan.id}>
              <div className="history-head"><h3>{scan.item_name}</h3>
                <time dateTime={scan.created_at}>{new Date(scan.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</time></div>
              <p className="activity-material">{t("Material")}: {scan.analysis.material_guess}</p>
              <div className="activity-item-route"><span>{t("AI-suggested next step")}</span><strong>{scan.analysis.route_title}</strong></div>
              {scan.feedback&&<p className="activity-feedback">{t("Your feedback")}: {t(scan.feedback==="yes"?"Correct":"Needs correction")}</p>}
              {scan.correction&&<p className="activity-feedback">{t("Correction")}: {scan.correction}</p>}
              <details><summary>{t("See the tips for this item")}</summary>
                <h4>{t("Disposal")}</h4><ul>{scan.analysis.disposal_steps.map((tip,k)=><li key={k}>{tip}</li>)}</ul>
                <h4>{t("Reuse")}</h4><ul>{scan.analysis.reuse_ideas.map((tip,k)=><li key={k}>{tip}</li>)}</ul>
              </details>
            </article>)}</div>}
        {scans.length>6&&<button type="button" className="activity-see-all" onClick={()=>setShowAllScans(current=>!current)}>
          {t(showAllScans?"Show fewer scans":"Show all saved scans")} <ArrowRight size={17}/>
        </button>}
      </section>
    </section>;
  }

  if (mode === "admin") {
    if (user.role !== "admin") return <section className="account-card"><h2>Administrator access required</h2></section>;
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><ShieldCheck/></div>
        <div><h2>{t("Admin dashboard")}</h2></div></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="admin-stats">
        <div><strong>{overview?.users ?? "…"}</strong><span>Accounts</span></div>
        <div><strong>{overview?.scans ?? "…"}</strong><span>Saved scans</span></div>
        <div><strong>{overview?.yes ?? "…"}</strong><span>Yes responses</span></div>
        <div><strong>{overview?.no ?? "…"}</strong><span>No responses</span></div>
      </div>
      <h3>Users</h3>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Scans</th></tr></thead>
        <tbody>{users.map(member => <tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td>{member.role}</td><td>{member.scan_count}</td></tr>)}</tbody>
      </table></div>
      <h3>Classification feedback</h3>
      <div className="table-wrap"><table><thead><tr><th>Account</th><th>Item</th><th>Answer</th><th>Correction</th><th>Date</th></tr></thead>
        <tbody>{feedback.map(entry => <tr key={entry.id}>
          <td>{entry.user_name}</td><td>{entry.item_name}</td>
          <td>{entry.feedback === "yes" ? <span className="yes-answer"><Check size={14}/> Yes</span> : "No"}</td>
          <td>{entry.correction || "None"}</td><td>{new Date(entry.created_at).toLocaleDateString()}</td>
        </tr>)}</tbody>
      </table></div>
      {!feedback.length && <p>No classification feedback has been submitted yet.</p>}
    </section>;
  }

  return <section className="account-card">
    <h2>{t("My account")}</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    {user.role === "admin" && <p><strong>Role:</strong> Admin</p>}
    <button className="button outline" onClick={() => void logout()}>{t("Sign out")}</button>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
