import { useEffect, useState } from "react";
import { Check, History, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import type { SessionUser, SavedScan, AdminOverview, AdminUser, AdminFeedback } from "./types";

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
};

export default function AccountArea({ user, mode, onLogin, onLogout }: Props) {
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);

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

  if (!user) {
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><UserPlus/></div>
        <div><h2>{signup ? "Create your account" : "Sign in to WasteLens"}</h2>
          </div></div>
      <form className="auth-form" onSubmit={event => void authenticate(event)}>
        {signup && <label>Display name<input value={name} required minLength={2} maxLength={80}
          onChange={event => setName(event.target.value)} autoComplete="name"/></label>}
        <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email"/></label>
        <label>Password<input type="password" required minLength={signup ? 10 : 1} maxLength={256}
          value={password} onChange={event => setPassword(event.target.value)}
          autoComplete={signup ? "new-password" : "current-password"}/></label>
        <button className="button primary" disabled={busy}>{busy ? "Please wait…" : (signup ? "Sign up" : "Sign in")}</button>
      </form>
      <button className="link-button" onClick={() => { setSignup(!signup); setError(""); }}>
        {signup ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
      <details className="account-privacy"><summary><LockKeyhole size={16}/> Your account and privacy</summary><p>Your password is securely hashed. Saved scans contain item results, not photos.</p></details>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section>;
  }

  if (mode === "history") {
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><History/></div>
        <div><h2>My scans</h2><p>{scans.length} saved {scans.length === 1 ? "item" : "items"}</p></div></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {scans.length === 0 && <p>Nothing here yet. Scan your first item to save it.</p>}
      <div className="history-grid">{scans.map(scan => <article className="history-card" key={scan.id}>
        <div className="history-head"><h3>{scan.item_name}</h3><time>{new Date(scan.created_at).toLocaleString()}</time></div>
        <p><strong>Material:</strong> {scan.analysis.material_guess}</p>
        <p><strong>What to do:</strong> {scan.analysis.route_title}</p>
        
        {scan.feedback && <p><strong>Your feedback:</strong> {scan.feedback === "yes" ? "Correct" : "Needs correction"}</p>}
        {scan.correction && <p><strong>Correction:</strong> {scan.correction}</p>}
        <details><summary>See the tips for this item</summary>
          <h4>Disposal</h4><ul>{scan.analysis.disposal_steps.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <h4>Reuse</h4><ul>{scan.analysis.reuse_ideas.map((text, i) => <li key={i}>{text}</li>)}</ul>
        </details>
      </article>)}</div>
    </section>;
  }

  if (mode === "admin") {
    if (user.role !== "admin") return <section className="account-card"><h2>Administrator access required</h2></section>;
    return <section className="account-card">
      <div className="head-with-icon"><div className="round-icon"><ShieldCheck/></div>
        <div><h2>Admin dashboard</h2></div></div>
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
    <h2>My account</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    {user.role === "admin" && <p><strong>Role:</strong> Admin</p>}
    <details className="account-privacy"><summary><LockKeyhole size={16}/> Privacy</summary><p>Your results are saved to your account. We do not save photos.</p></details>
    <button className="button outline" onClick={() => void logout()}>Sign out</button>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
