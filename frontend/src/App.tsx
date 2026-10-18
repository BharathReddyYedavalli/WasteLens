import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle, Camera, Check, ChevronDown, Leaf, Lightbulb, UserRound, History, ShieldCheck,
  MapPin, Recycle, RotateCcw, Search, ShieldAlert, Sparkles, Upload, MessageCircle, ScanLine
} from "lucide-react";
import type { StatusResponse, VisionResponse, SessionUser, FacilitySearchResponse } from "./types";
import RecyclingResults from "./RecyclingResults";
import AskWasteLens from "./AskWasteLens";
import AccountArea, { actionHeaders, readJson } from "./AccountArea";

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
  const [view, setView] = useState<"identifier" | "chat" | "finder" | "account" | "history" | "admin">("identifier");
  const [facilities, setFacilities] = useState<FacilitySearchResponse | null>(null);
  const [facilityBusy, setFacilityBusy] = useState(false);
  const [facilityError, setFacilityError] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<"yes" | "no" | null>(null);
  const [correctChoice, setCorrectChoice] = useState<"yes" | "no" | null>(null);
  const [correction, setCorrection] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
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
    setBusy(true); setResult(null); setError("");
    try {
      const form = new FormData();
      form.append("image", preview.file);
      form.append("model_id", model);
      form.append("object_hint", hint.trim());
      if (/^\d{5}$/.test(location.trim())) form.append("zip_code", location.trim());
      const response = await fetch("/api/ai/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Analysis failed");
      setResult(data as VisionResponse);
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

  const analysis = result?.analysis;
  return <div className="site">
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setView("identifier")}><Leaf size={26} strokeWidth={2.5}/><strong>WasteLens</strong></button>
      <span className="brand-desc">See it. Sort it. Sustain it.</span>
    </header>
    <div className="site-layout">
      <aside className="side-nav" aria-label="WasteLens navigation">
        <div className="side-nav-title">WASTELENS TOOLS</div>
        <button type="button" className={view === "identifier" ? "nav-item active" : "nav-item"} aria-current={view === "identifier" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("identifier"); }}><ScanLine size={18}/> AI Identifier</button>
        <button type="button" className={view === "chat" ? "nav-item active" : "nav-item"} aria-current={view === "chat" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("chat"); }}><MessageCircle size={18}/> Ask WasteLens</button>
        <button type="button" className={view === "finder" ? "nav-item active" : "nav-item"} aria-current={view === "finder" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("finder"); }}><MapPin size={18}/> Nearby Centers</button>
        <button type="button" className={view === "history" ? "nav-item active" : "nav-item"} aria-current={view === "history" ? "page" : undefined}
          onClick={() => { stopCamera(); setView("history"); }}><History size={18}/> My History</button>
        {user?.role === "admin" && <button type="button" className={view === "admin" ? "nav-item active" : "nav-item"}
          onClick={() => { stopCamera(); setView("admin"); }}><ShieldCheck size={18}/> Admin</button>}
        <div className="side-nav-bottom">
          <button type="button" className={view === "account" ? "nav-item active" : "nav-item"}
          onClick={() => { stopCamera(); setView("account"); }}><UserRound size={18}/> {user ? user.name : "Sign In / Sign Up"}</button>
        </div>
      </aside>
      <div className="page-content">
    <main id="home" className="shell">
      {view === "identifier" ? <>
      <div className="intro">
        <div>
          <span className="eyebrow">SMARTER WASTE SORTING</span>
          <h1>Know where it goes.</h1>
          <p>Take a photo of an everyday item. AI can help you recognize it, find creative ways to reuse it, and explore safer disposal options.</p>
        </div>
        <div className="model-picker">
          <label htmlFor="model">Vision AI</label>
          <div className="picker">
            <select id="model" value={model} disabled={!status || busy} onChange={event => {
              setModel(event.target.value); setResult(null);
            }}>
              {(status?.models ?? [{id: initialModel, name: "Gemini 3.8 Flash"}]).map(option =>
                <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            <ChevronDown size={15}/>
          </div>
          <small>Uses Google's free API tier while your project remains within its usage limits.</small>
        </div>
      </div>

      <div className="workspace">
        <div className="workspace-head">
          <div className="head-with-icon">
            <div className="round-icon"><Camera size={19}/></div>
            <div><h2>AI Identifier</h2><p>Show a single object clearly, or describe the one you mean.</p></div>
          </div>
          <span className="step-label">STEP 01 / IDENTIFY</span>
        </div>
        <div className="camera-stage">
          {camera ? <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview"/> :
            preview ? <img src={preview.src} alt="Your selected item photograph"/> :
            <div className="camera-empty">
              <div className="empty-camera"><Camera size={44} strokeWidth={1.4}/></div>
              <h3>Ready when you are</h3>
              <p>Open the camera or upload a clear photo of what you'd like to sort.</p>
            </div>}
        </div>

        <div className="camera-controls">
          <input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} aria-label="Upload item photo"/>
          {!camera && !preview && <>
            <button className="button primary" type="button" onClick={() => void startCamera()}><Camera size={17}/> Open camera</button>
            <button className="button outline" type="button" onClick={() => uploadRef.current?.click()}><Upload size={17}/> Upload photo</button>
          </>}
          {camera && <>
            <button className="button primary" type="button" onClick={capture}><Camera size={17}/> Click picture</button>
            <button className="button outline" type="button" onClick={stopCamera}>Close camera</button>
          </>}
          {preview && <>
            <button className="button primary" type="button" onClick={() => void analyze()} disabled={busy || !status?.configured}>
              {busy ? "Identifying object…" : <><Sparkles size={17}/> Identify with AI</>}
            </button>
            <button className="button outline" type="button" onClick={reset} disabled={busy}><RotateCcw size={17}/> Take another photo</button>
          </>}
        </div>
        {preview && <div className="hint-area">
          <label htmlFor="hint">Which object should AI focus on? <span>(optional)</span></label>
          <input id="hint" maxLength={160} value={hint} disabled={busy}
            onChange={event => {setHint(event.target.value); setResult(null);}}
            placeholder="e.g. the blue water bottle, not my shirt"/>
        </div>}
        <p className="privacy-line"><ShieldAlert size={15}/> Your photo is sent to Google's Gemini API only when you click Identify. On the free tier, Google may use submitted content to improve its products. Don't include faces or private details. {user ? "Your item analysis is saved to your account; the photo is not stored by WasteLens." : "Sign in before scanning to save your results."}</p>
        {status && !status.configured && <div className="notice"><AlertTriangle size={17}/><span>No API key configured. Add <code>GEMINI_API_KEY</code> to the root <code>.env</code> file and restart the Python backend.</span></div>}
        {statusError && <ErrorText message={statusError}/>}
        {cameraError && <ErrorText message={cameraError}/>}
        {error && <ErrorText message={error}/>}
      </div>

      {analysis && <section className="results" aria-live="polite">
        <span className="eyebrow">YOUR RESULTS</span>
        <div className="result-title">
          <div>
            <h2>{analysis.item_name}</h2>
            <p>{analysis.visual_description}</p>
          </div>
          <span className="type-badge"><Recycle size={16}/>{analysis.route_title}</span>
        </div>
        <div className="material-line"><strong>Likely material:</strong> {analysis.material_guess}</div>
        <button className="button primary ask-item-button" type="button" onClick={() => setView("chat")}>
          <MessageCircle size={17}/> Ask WasteLens about this item
        </button>
        {analysis.identification !== "likely" && <div className="uncertain"><AlertTriangle size={18}/> Identification is uncertain. Confirm what the item is before using this advice.</div>}
        {analysis.follow_up_question && <div className="question"><strong>One thing to check:</strong> {analysis.follow_up_question}</div>}
        <div className="stack">
          <article className="result-card orange">
            <h3><Recycle size={20}/> How to dispose properly</h3>
            <ul>{analysis.disposal_steps.map((step, i) => <li key={i}>{step}</li>)}</ul>
          </article>
          <article className="result-card blue">
            <h3><Lightbulb size={20}/> Creative reuse ideas</h3>
            <ul>{analysis.reuse_ideas.map((step, i) => <li key={i}>{step}</li>)}</ul>
          </article>
          {analysis.cautions.length > 0 && <article className="result-card muted">
            <h3><ShieldAlert size={20}/> Important to know</h3>
            <ul>{analysis.cautions.map((caution, i) => <li key={i}>{caution}</li>)}</ul>
          </article>}
          <article className="result-card green" id="nearby">
            <h3><MapPin size={20}/> Find nearby collection options</h3>
            <p>Enter a US ZIP code to open a full interactive map with nearby recycling locations and an in-page facility list. No payment method, redirects or location permission needed.</p>
            <form className="finder-row" onSubmit={event => void searchFacilities(event)}>
              <input aria-label="US ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required
                placeholder="Enter 5-digit ZIP, e.g. 75033" value={location}
                onChange={event => setLocation(event.target.value)}/>
              <button type="submit" disabled={facilityBusy} className="button primary"><Search size={15}/>{facilityBusy ? "Searching…" : "Find centers"}</button>
            </form>
            {facilityError && <ErrorText message={facilityError}/>}
            <RecyclingResults results={facilities}
                selected={selectedFacility} onSelect={setSelectedFacility}/>
            <p className="finder-note">Locations from OpenStreetMap community data. Distance is approximate, from the ZIP centroid. Actual acceptance and operating hours must be confirmed.</p>
          </article>
          <article className="result-card muted">
            <h3><Check size={20}/> Did we identify your item correctly?</h3>
            <p>Help us understand how often the AI recognizes items correctly. Your answer is visible to the WasteLens administrator if you're signed in.</p>
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
            {!user && <p className="finder-note">To record feedback and save future scans, use Sign In / Sign Up above before identifying an item.</p>}
          </article>
        </div>
      </section>}
      </> : view === "finder" ? <section className="finder-screen">
        <span className="eyebrow">NEARBY DROP-OFF OPTIONS</span>
        <h1><MapPin size={28}/> Find Recycling Locations</h1>
        <p>Explore nearby collection centers and drop-off points on an interactive map. Search by ZIP, select a card or pin, and review details without leaving WasteLens.</p>
        <div className="finder-card">
          <form className="finder-form" onSubmit={event => void searchFacilities(event)}>
            <label htmlFor="sidebar-zip">ZIP code</label>
            <input id="sidebar-zip" aria-label="US ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required
              placeholder="Enter 5-digit ZIP, e.g. 75033" value={location}
              onChange={event => setLocation(event.target.value)}/>
            <button type="submit" disabled={facilityBusy} className="button primary"><Search size={16}/>{facilityBusy ? "Searching…" : "Find centers"}</button>
          </form>
          {facilityError && <ErrorText message={facilityError}/>}
          <RecyclingResults results={facilities}
                selected={selectedFacility} onSelect={setSelectedFacility}/>
          <p className="finder-note">OpenStreetMap community data. ZIP-center distances are approximate. Listed facilities may not accept your particular item.</p>
        </div>
      </section> : view === "chat" ? null : <AccountArea user={user} mode={view}
        onLogin={account => { setUser(account); if (view === "account") setView("identifier"); }}
        onLogout={() => { setUser(null); setView("identifier"); }}/>}
      <div hidden={view !== "chat"}>
        <AskWasteLens scan={analysis ?? null} model={model} configured={Boolean(status?.configured)}
          onScan={() => setView("identifier")}/>
      </div>
      <footer>
        <span>WasteLens · Experimental vision AI prototype</span>
        <span>Disposal advice is provisional; local rules and item condition matter.</span>
      </footer>
    </main>
      </div>
    </div>
  </div>;
}
