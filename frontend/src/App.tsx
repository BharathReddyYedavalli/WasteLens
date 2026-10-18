import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle, Camera, Check, ChevronDown, Leaf, Lightbulb, UserRound, History, ShieldCheck,
  MapPin, Recycle, RotateCcw, Search, ShieldAlert, Sparkles, Upload, MessageCircle, ScanLine, Trophy
} from "lucide-react";
import type { StatusResponse, VisionResponse, SessionUser, FacilitySearchResponse, WasteLensBadge } from "./types";
import RecyclingResults from "./RecyclingResults";
import AskWasteLens from "./AskWasteLens";
import AccountArea, { actionHeaders, readJson } from "./AccountArea";
import Leaderboard from "./Leaderboard";
import BadgeCelebration from "./BadgeCelebration";

type PhotoPreview = { file: File; src: string };
const initialModel = "gemini-3.8-flash";

function ErrorText({ message }: { message: string }) {
  return <div className="error-msg" role="alert"><AlertTriangle size={18}/>{message}</div>;
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState("");
  const [model, setModel] = useState(initialModel);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [location, setLocation] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<"identifier" | "chat" | "finder" | "account" | "history" | "admin" | "leaderboard">("identifier");
  const [facilities, setFacilities] = useState<FacilitySearchResponse | null>(null);
  const [facilityBusy, setFacilityBusy] = useState(false);
  const [facilityError, setFacilityError] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<"yes" | "no" | null>(null);
  const [correctChoice, setCorrectChoice] = useState<"yes" | "no" | null>(null);
  const [correction, setCorrection] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [recordedAction, setRecordedAction] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [celebration, setCelebration] = useState<{ scan: number; badge: WasteLensBadge } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/status")
      .then(async response => {
        if (!response.ok) throw new Error("AI backend is not running.");
        return (await response.json()) as StatusResponse;
      })
      .then(data => {
        if (!active) return;
        setStatus(data);
        setModel(data.default_model);
      })
      .catch(() => { if (active) setStatusError("Start the WasteLens Python backend to use the AI identifier."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(response => readJson<{ user: SessionUser | null }>(response))
      .then(data => { if (active) setUser(data.user); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [camera]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCamera(false);
  }

  function clearPreview() {
    setPreview(previous => {
      if (previous) URL.revokeObjectURL(previous.src);
      return null;
    });
  }

  function reset() {
    stopCamera();
    clearPreview();
    setHint("");
    setResult(null);
    setError("");
    setCameraError("");
    setFacilities(null);
    setSelectedFacility(null);
    setFeedbackSent(null);
    setCorrectChoice(null);
    setFeedbackError("");
    setRecordedAction("");
    setActionError("");
    setCelebration(null);
  }

  async function startCamera() {
    setCameraError(""); setError(""); setResult(null); clearPreview();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires localhost or HTTPS. Try uploading a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stopCamera();
      streamRef.current = stream;
      setCamera(true);
    } catch {
      setCameraError("Camera access is blocked or unavailable. Enable browser permission or upload a photo.");
    }
  }

  function usePhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image no larger than 8 MB.");
      return;
    }
    stopCamera();
    setResult(null); setError(""); setCameraError("");
    setPreview(previous => {
      if (previous) URL.revokeObjectURL(previous.src);
      return { file, src: URL.createObjectURL(file) };
    });
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    usePhoto(event.target.files?.[0]);
    event.target.value = "";
  }

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is still loading. Wait a moment and retry.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setCameraError("Cannot capture the photo in this browser."); return; }
    context.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) usePhoto(new File([blob], "capture.jpg", {type: "image/jpeg"}));
      else setCameraError("Couldn't capture the image. Try uploading a photo.");
    }, "image/jpeg", 0.86);
  }

  async function analyze() {
    if (!preview || busy) return;
    setBusy(true); setResult(null); setError(""); setCelebration(null);
    try {
      const form = new FormData();
      form.append("image", preview.file);
      form.append("model_id", model);
      form.append("object_hint", hint.trim());
      if (/^\d{5}$/.test(location.trim())) form.append("zip_code", location.trim());
      const response = await fetch("/api/ai/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Analysis failed");
      const scanResult = data as VisionResponse;
      setResult(scanResult);
      const earned = scanResult.unlocked_badges?.[0];
      if (earned && scanResult.scan_id) {
        setCelebration({ scan: scanResult.scan_id, badge: earned });
      }
      setRecordedAction("");
      setActionError("");
      setFeedbackSent(null);
      setCorrectChoice(null);
      setFeedbackError("");
      setFacilities(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not analyze this photograph.");
    } finally {
      setBusy(false);
    }
  }


  async function searchFacilities(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{5}$/.test(location.trim())) {
      setFacilityError("Enter a valid five-digit US ZIP code.");
      return;
    }
    setFacilityBusy(true);
    setFacilityError("");
    // ZIPs are resolved from the locally bundled US postal coordinate data,
    // so the map does not depend on a paid geocoder.
    setFacilities(null);
    setSelectedFacility(null);
    try {
      const response = await fetch("/api/facilities?zip_code=" + encodeURIComponent(location.trim()));
      const data = await readJson<FacilitySearchResponse>(response);
      setFacilities(data);
      setSelectedFacility(data.facilities[0]?.id ?? null);
    } catch (e) {
      setFacilityError(e instanceof Error ? e.message : "Could not find collection locations.");
    } finally { setFacilityBusy(false); }
  }

  async function submitFeedback(correct: boolean) {
    if (!result?.scan_id || !user) {
      setFeedbackError("Sign in before scanning to save classification feedback.");
      return;
    }
    setFeedbackBusy(true);
    setFeedbackError("");
    try {
      await readJson(await fetch("/api/scans/" + result.scan_id + "/feedback", {
        method: "POST", headers: actionHeaders, credentials: "same-origin",
        body: JSON.stringify({ correct, correction: correct ? "" : correction.trim() }),
      }));
      setFeedbackSent(correct ? "yes" : "no");
      setCorrectChoice(correct ? "yes" : "no");
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Could not save feedback.");
    } finally { setFeedbackBusy(false); }
  }

  async function markAction(action: string) {
    if (!result?.scan_id || !user || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      await readJson(await fetch("/api/scans/" + result.scan_id + "/action", {
        method: "POST", headers: actionHeaders, credentials: "same-origin",
        body: JSON.stringify({action}),
      }));
      setRecordedAction(action);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not save that action.");
    } finally {setActionBusy(false);}
  }

  const analysis = result?.analysis;
  return <div className="site">
    {celebration && <BadgeCelebration key={celebration.scan} badge={celebration.badge} onClose={() => setCelebration(null)} />}
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setView("identifier")}><span className="brand-mark"><Leaf size={24} strokeWidth={2.5}/></span><strong>WasteLens</strong></button>
      <span className="brand-desc">Less waste starts here.</span>
    </header>
    <div className="site-layout">
      <aside className="side-nav" aria-label="WasteLens navigation">
        <div className="side-nav-title">Explore</div>
        <button type="button" className={view === "identifier" ? "nav-item active" : "nav-item"} aria-current={view === "identifier" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("identifier"); }}><ScanLine size={19}/> Scan an item</button>
        <button type="button" className={view === "chat" ? "nav-item active" : "nav-item"} aria-current={view === "chat" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("chat"); }}><MessageCircle size={18}/> Ask WasteLens</button>
        <button type="button" className={view === "finder" ? "nav-item active" : "nav-item"} aria-current={view === "finder" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("finder"); }}><MapPin size={19}/> Find a drop off</button>
        <button type="button" className={view === "history" ? "nav-item active" : "nav-item"} aria-current={view === "history" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("history"); }}><History size={19}/> My scans</button>
        <button type="button" className={view === "leaderboard" ? "nav-item active" : "nav-item"} aria-current={view === "leaderboard" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("leaderboard"); }}><Trophy size={19}/> Leaderboard</button>
        {user?.role === "admin" && <button type="button" className={view === "admin" ? "nav-item active" : "nav-item"}
          onClick={() => { stopCamera(); setView("admin"); }}><ShieldCheck size={19}/> Admin</button>}
        <div className="side-nav-bottom">
          <button type="button" className={view === "account" ? "nav-item active" : "nav-item"}
          onClick={() => { stopCamera(); setView("account"); }}><UserRound size={19}/> {user ? user.name : "Sign in"}</button>
        </div>
      </aside>
      <div className="page-content">
    <main id="home" className="shell">
      {view === "identifier" ? <>
      <div className="intro">
        <div className="intro-copy">
          <h1>Not sure where it goes?</h1>
          <p>Snap a photo. Find out what to do with it.</p>
        </div>
        <div className="intro-art" aria-hidden="true">
          <span className="intro-art-circle one"></span>
          <span className="intro-art-circle two"></span>
          <Recycle size={58} strokeWidth={1.8}/>
        </div>
      </div>

      <div className="workspace">
        <div className="workspace-head">
          <div className="head-with-icon">
            <div className="round-icon"><Camera size={19}/></div>
            <div><h2>Take a picture</h2></div>
          </div>
        </div>
        <div className="camera-stage">
          {camera ? <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview"/> :
            preview ? <img src={preview.src} alt="Your selected item photograph"/> :
            <div className="camera-empty">
              <div className="empty-camera"><Camera size={44} strokeWidth={1.4}/></div>
              <h3>What are we looking at?</h3>
              <p>Use your camera or upload a photo.</p>
            </div>}
        </div>

        <div className="camera-controls">
          <input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} aria-label="Upload item photo"/>
          {!camera && !preview && <>
            <button className="button primary" type="button" onClick={() => void startCamera()}><Camera size={18}/> Use camera</button>
            <button className="button outline" type="button" onClick={() => uploadRef.current?.click()}><Upload size={18}/> Choose a photo</button>
          </>}
          {camera && <>
            <button className="button primary" type="button" onClick={capture}><Camera size={18}/> Take picture</button>
            <button className="button outline" type="button" onClick={stopCamera}>Close camera</button>
          </>}
          {preview && <>
            <button className="button primary" type="button" onClick={() => void analyze()} disabled={busy || !status?.configured}>
              {busy ? "Taking a look…" : <><Sparkles size={18}/> Identify item</>}
            </button>
            <button className="button outline" type="button" onClick={reset} disabled={busy}><RotateCcw size={18}/> Try another photo</button>
          </>}
        </div>
        {preview && <div className="hint-area">
          <label htmlFor="hint">Which item should we look at? <span>Optional</span></label>
          <input id="hint" maxLength={160} value={hint} disabled={busy}
            onChange={event => {setHint(event.target.value); setResult(null);}}
            placeholder="Example: The blue bottle I'm holding"/>
        </div>}
        <details className="model-options">
          <summary><span>Change AI model</span><ChevronDown size={17}/></summary>
          <div className="model-picker">
            <label htmlFor="model">Choose a model</label>
            <div className="picker">
              <select id="model" value={model} disabled={!status || busy} onChange={event => {
                setModel(event.target.value); setResult(null);
              }}>
                {(status?.models ?? [{id: initialModel, name: "Gemini 3.8 Flash"}]).map(option =>
                  <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
              <ChevronDown size={16}/>
            </div>
          </div>
        </details>
        <div className="photo-privacy-summary"><ShieldAlert size={16}/> Photos go to Google Gemini when you scan. Free tier data may be used to improve Google's services.</div>
        <details className="privacy-details">
          <summary>More about photo privacy <ChevronDown size={15}/></summary>
          <p>Avoid faces and personal details in your photos. WasteLens does not save the photo. {user ? "Your item results are saved to your account." : "Sign in if you want to save your item results."}</p>
        </details>
        {status && !status.configured && <div className="notice"><AlertTriangle size={17}/><span>No API key configured. Add <code>GEMINI_API_KEY</code> to the root <code>.env</code> file and restart the Python backend.</span></div>}
        {statusError && <ErrorText message={statusError}/>}
        {cameraError && <ErrorText message={cameraError}/>}
        {error && <ErrorText message={error}/>}
      </div>

      {analysis && <section className="results" aria-live="polite">
        <div className="result-title">
          <div>
            <h2>{analysis.item_name}</h2>
            <p>{analysis.visual_description}</p>
          </div>
          <span className="type-badge"><Recycle size={16}/>{analysis.route_title}</span>
        </div>
        <div className="result-meta-line">
          <span className="material-line"><strong>Material:</strong> {analysis.material_guess}</span>
          {Boolean(result?.earned_xp) && <span className="earned-xp"><Sparkles size={17}/> +{result?.earned_xp} XP earned</span>}
        </div>
        <button className="button primary ask-item-button" type="button" onClick={() => setView("chat")}>
          <MessageCircle size={18}/> Ask a question about this item
        </button>
        {analysis.identification !== "likely" && <div className="uncertain"><AlertTriangle size={18}/> Identification is uncertain. Confirm what the item is before using this advice.</div>}
        {analysis.follow_up_question && <div className="question"><strong>One thing to check:</strong> {analysis.follow_up_question}</div>}
        <div className="stack">
          <article className="result-card orange">
            <h3><Recycle size={21}/> What to do with it</h3>
            <ul>{analysis.disposal_steps.map((step, i) => <li key={i}>{step}</li>)}</ul>
          </article>
          <article className="result-card blue reuse-section">
            <div className="reuse-heading">
              <div>
                <h3><Lightbulb size={21}/> Give it another life</h3>
                <p>Try something new with this item.</p>
              </div>
              {Boolean(analysis.reuse_projects?.length) && <span className="reuse-count">{analysis.reuse_projects!.length} ideas</span>}
            </div>
            {analysis.reuse_projects?.length ? <div className="reuse-projects">
              {analysis.reuse_projects.map((project, i) =>
                <details key={i} className="reuse-project" open={i === 0}>
                  <summary>
                    <span className="reuse-project-index">{String(i + 1).padStart(2, "0")}</span>
                    <span className="reuse-project-summary">
                      <strong>{project.title}</strong>
                      <span>{project.outcome}</span>
                    </span>
                    <span className="reuse-project-meta">{project.difficulty} · ~{project.minutes_estimate} min</span>
                    <ChevronDown size={17} className="reuse-chevron"/>
                  </summary>
                  <div className="reuse-project-body">
                    <div>
                      <h4>You'll need</h4>
                      {project.materials_needed.length ? <ul>{project.materials_needed.map((x,j) => <li key={j}>{x}</li>)}</ul>
                        : <p>No extra tools required.</p>}
                    </div>
                    <div>
                      <h4>How to make it</h4>
                      <ol>{project.steps.map((x,j) => <li key={j}>{x}</li>)}</ol>
                    </div>
                    {project.safety_note && <p className="reuse-safety"><ShieldAlert size={15}/>{project.safety_note}</p>}
                  </div>
                </details>)}
            </div> : <div className="reuse-legacy">
              {analysis.identification === "likely" && analysis.reuse_ideas.length > 0
                ? <><p>This analysis contains brief reuse suggestions:</p><ul>{analysis.reuse_ideas.map((x,i)=><li key={i}>{x}</li>)}</ul></>
                : <p>No safe, practical reuse project could be recommended for this item from the available information. Ask WasteLens for clarification if needed.</p>}
            </div>}
            <details className="reuse-fine-print"><summary>Before you try an idea</summary><p>These suggestions are generated by AI. Check the item's material and condition, and use caution with tools and anything sharp or electrical.</p></details>
          </article>
          {analysis.cautions.length > 0 && <article className="result-card muted">
            <h3><ShieldAlert size={21}/> A few things to check</h3>
            <ul>{analysis.cautions.map((caution, i) => <li key={i}>{caution}</li>)}</ul>
          </article>}
          <article className="result-card green" id="nearby">
            <h3><MapPin size={21}/> Find somewhere nearby</h3>
            <p>Enter your ZIP code.</p>
            <form className="finder-row" onSubmit={event => void searchFacilities(event)}>
              <input aria-label="US ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required
                placeholder="Enter 5-digit ZIP, e.g. 75033" value={location}
                onChange={event => setLocation(event.target.value)}/>
              <button type="submit" disabled={facilityBusy} className="button primary"><Search size={15}/>{facilityBusy ? "Looking…" : "Search"}</button>
            </form>
            {facilityError && <ErrorText message={facilityError}/>}
            <RecyclingResults results={facilities}
                selected={selectedFacility} onSelect={setSelectedFacility}/>
          </article>
          <article className="result-card muted">
            <h3><Check size={21}/> Did we get it right?</h3>
            <p>Does this match your photo?</p>
            <div className="feedback-actions">
              <button className={"button " + (correctChoice === "yes" ? "primary" : "outline")}
                disabled={feedbackBusy} onClick={() => { setCorrectChoice("yes"); void submitFeedback(true); }}>
                <Check size={17}/> Yes
              </button>
              <button className={"button " + (correctChoice === "no" ? "primary" : "outline")}
                disabled={feedbackBusy} onClick={() => { setCorrectChoice("no"); setFeedbackSent(null); }}>
                <AlertTriangle size={17}/> No
              </button>
            </div>
            {correctChoice === "no" && !feedbackSent && <div className="correction-form">
              <label htmlFor="feedbackCorrection">What was the item? (optional)</label>
              <input id="feedbackCorrection" maxLength={160} value={correction}
                placeholder="e.g. reusable insulated water bottle"
                onChange={event => setCorrection(event.target.value)}/>
              <button className="button primary" disabled={feedbackBusy}
                onClick={() => void submitFeedback(false)}>Submit feedback</button>
            </div>}
            {feedbackSent && <p className="feedback-confirmed" role="status">Thank you! Your {feedbackSent === "yes" ? "Yes" : "No"} feedback was saved to your account.</p>}
            {feedbackError && <p className="inline-error" role="alert">{feedbackError}</p>}
            {!user && <p className="finder-note">Sign in to save scans and earn XP.</p>}
          </article>
          {user && result?.scan_id && <article className="result-card action-card">
            <h3><Check size={21}/> What did you do with it?</h3>
            <div className="action-choices">
              {(["recycled", "reused", "composted", "donated"] as const).map(choice =>
                <button type="button" key={choice} className={"button " + (recordedAction === choice ? "primary" : "outline")}
                  disabled={actionBusy} onClick={() => void markAction(choice)}>
                  {choice[0].toUpperCase() + choice.slice(1)}
                </button>
              )}
            </div>
            {recordedAction && <p className="action-confirmed">Saved as {recordedAction}.</p>}
            {actionError && <p className="inline-error" role="alert">{actionError}</p>}
            <details className="action-info"><summary>About tracking</summary><p>Actions are self reported. Scanning alone does not mean the item was recycled.</p></details>
          </article>}
        </div>
      </section>}
      </> : view === "finder" ? <section className="finder-screen">
        <h1><MapPin size={30}/> Find a drop off</h1>
        <p>Type your ZIP code to find nearby recycling spots. Choose a place to see it on the map.</p>
        <div className="finder-card">
          <form className="finder-form" onSubmit={event => void searchFacilities(event)}>
            <label htmlFor="sidebar-zip">Your ZIP code</label>
            <input id="sidebar-zip" aria-label="US ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required
              placeholder="Enter 5-digit ZIP, e.g. 75033" value={location}
              onChange={event => setLocation(event.target.value)}/>
            <button type="submit" disabled={facilityBusy} className="button primary"><Search size={16}/>{facilityBusy ? "Looking…" : "Search"}</button>
          </form>
          {facilityError && <ErrorText message={facilityError}/>}
          <RecyclingResults results={facilities}
                selected={selectedFacility} onSelect={setSelectedFacility}/>
        </div>
      </section> : view === "leaderboard" ? <Leaderboard user={user} onSignIn={() => setView("account")}/> : view === "chat" ? null : <AccountArea user={user} mode={view}
        onLogin={account => { setUser(account); if (view === "account") setView("identifier"); }}
        onLogout={() => { setUser(null); setView("identifier"); }}/>}
      <div hidden={view !== "chat"}>
        <AskWasteLens scan={analysis ?? null} model={model} configured={Boolean(status?.configured)}
          onScan={() => setView("identifier")}/>
      </div>
      <footer>
        <span>WasteLens</span>
        <span>Every item deserves a better ending.</span>
      </footer>
    </main>
      </div>
    </div>
  </div>;
}
