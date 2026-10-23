import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle, Camera, Check, ChevronDown, Leaf, Lightbulb, History, ShieldCheck,
  MapPin, Recycle, RotateCcw, Search, ShieldAlert, Sparkles, Upload, MessageCircle, ScanLine, Trophy, ClipboardList, Coins, BookOpen, Info, Menu, X
} from "lucide-react";
import type { StatusResponse, VisionResponse, SessionUser, FacilitySearchResponse, WasteLensBadge } from "./types";
import RecyclingResults from "./RecyclingResults";
import AskWasteLens from "./AskWasteLens";
import AccountArea, { actionHeaders, readJson } from "./AccountArea";
import Leaderboard from "./Leaderboard";
import BadgeCelebration from "./BadgeCelebration";
import SortPlan from "./SortPlan";
import LocalRulesGuide from "./LocalRulesGuide";
import AuditKit from "./AuditKit";
import AboutWasteLens from "./AboutWasteLens";
import KioskScreen from "./KioskScreen";
import KioskSetup from "./KioskSetup";
import BottleReturns from "./BottleReturns";
import BottleJourney from "./BottleJourney";
import AccountMenu, { useAppearanceTheme } from "./AccountMenu";
import { ReadAloudButton, useSpeech } from "./Speech";
import { LANGUAGES, useLanguage } from "./i18n";

type PhotoPreview = { file: File; src: string };

function ErrorText({ message }: { message: string }) {
  return <div className="error-msg" role="alert"><AlertTriangle size={18}/>{message}</div>;
}

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [theme, setTheme] = useAppearanceTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [kioskError, setKioskError] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { stop: stopReading } = useSpeech();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState("");
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [auditFromScan, setAuditFromScan] = useState<string | null>(null);
  const [rulesOpenRequest, setRulesOpenRequest] = useState(0);
  const [location, setLocation] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<"identifier" | "chat" | "finder" | "account" | "history" | "admin" | "leaderboard" | "audit" | "deposits" | "journey" | "about">("identifier");
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
  const scanRequestRef = useRef<AbortController | null>(null);

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
    stopReading();
    window.scrollTo(0,0);
  },[view,stopReading]);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [camera]);

  useEffect(() => () => {
    scanRequestRef.current?.abort();
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
    scanRequestRef.current?.abort();
    scanRequestRef.current = null;
    setBusy(false);
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
    setRulesOpenRequest(0);
  }

  async function startCamera() {
    setRulesOpenRequest(0);
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

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image no larger than 8 MB.");
      return;
    }
    stopCamera();
    setRulesOpenRequest(0);
    setResult(null); setError(""); setCameraError("");
    setPreview(previous => {
      if (previous) URL.revokeObjectURL(previous.src);
      return { file, src: URL.createObjectURL(file) };
    });
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    selectPhoto(event.target.files?.[0]);
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
      if (blob) selectPhoto(new File([blob], "capture.jpg", {type: "image/jpeg"}));
      else setCameraError("Couldn't capture the image. Try uploading a photo.");
    }, "image/jpeg", 0.86);
  }

  async function analyze() {
    if (!preview || busy) return;
    setRulesOpenRequest(0);
    const controller = new AbortController();
    scanRequestRef.current?.abort();
    scanRequestRef.current = controller;
    setBusy(true); setResult(null); setError(""); setCelebration(null);
    try {
      const scanForm = new FormData();
      scanForm.append("image", preview.file);
      if (kioskMode) scanForm.append("kiosk_mode", "true");
      scanForm.append("object_hint", hint.trim());
      scanForm.append("language", language);
      if (/^\d{5}$/.test(location.trim())) {
        scanForm.append("zip_code", location.trim());
      }

      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        body: scanForm,
        signal: controller.signal,
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(typeof responseBody.detail === "string"
          ? responseBody.detail : "Analysis failed");
      }

      if (controller.signal.aborted) return;
      const scanResult = responseBody as VisionResponse;
      setResult(scanResult);

      const newBadge = scanResult.unlocked_badges?.[0];
      if (newBadge && scanResult.scan_id) {
        setCelebration({ scan: scanResult.scan_id, badge: newBadge });
      }
      setRecordedAction("");
      setActionError("");
      setFeedbackSent(null);
      setCorrectChoice(null);
      setFeedbackError("");
      setFacilities(null);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not analyze this photograph.");
    } finally {
      if (scanRequestRef.current === controller) {
        scanRequestRef.current = null;
        setBusy(false);
      }
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
      const searchResults = await readJson<FacilitySearchResponse>(response);
      setFacilities(searchResults);
      setSelectedFacility(searchResults.facilities[0]?.id ?? null);
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
  const needsConfirmation = Boolean(analysis && (analysis.identification !== "likely" || analysis.route === "needs_identification"));
  async function enterKioskMode() {
    if (user) {
      if (!window.confirm(t("Starting a shared kiosk signs you out of your account. Continue?"))) return;
      try {
        await readJson<{ok:boolean}>(await fetch("/api/auth/logout",{
          method:"POST",headers:actionHeaders,credentials:"same-origin"
        }));
        setUser(null);
      } catch {
        setKioskError(t("Could not sign out. Try again before starting kiosk mode."));
        return;
      }
    }
    setKioskError("");
    reset();
    stopReading();
    setNavOpen(false);
    setView("identifier");
    setKioskMode(true);
  }

  function exitKioskMode() {
    reset();
    setLocation("");
    stopReading();
    setKioskMode(false);
    setView("identifier");
  }

  function nextKioskItem() {
    reset();
    setLocation("");
    stopReading();
  }

  function openPage(next: typeof view) {
    stopCamera();
    setNavOpen(false);
    setAuditFromScan(null);
    setView(next);
  }
  function recordObservedItem() {
    if (!analysis) return;
    stopCamera();
    setNavOpen(false);
    // This is a temporary navigation hint, not an audit entry or verification.
    setAuditFromScan(analysis.item_name);
    setView("audit");
  }
  function showNearbyOptions() {
    document.getElementById("nearby")?.scrollIntoView({ block: "start" });
  }
  function showLocalRules() {
    setRulesOpenRequest(current => current + 1);
  }

  useEffect(() => {
    if (!navOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const screenChanged = () => {
      if (window.innerWidth > 900) setNavOpen(false);
    };
    window.addEventListener("keydown", dismiss);
    window.addEventListener("resize", screenChanged);
    document.querySelector<HTMLButtonElement>(".community-navigation .nav-item")?.focus();
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("resize", screenChanged);
    };
  }, [navOpen]);

  return <div className={"site"+(kioskMode?" wl-kiosk-active":"")} data-theme={theme}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {celebration && !kioskMode && <BadgeCelebration key={celebration.scan} badge={celebration.badge} onClose={() => setCelebration(null)} />}
    <header className="topbar">
      {!kioskMode&&<button ref={menuButtonRef} type="button" className="community-menu-toggle"
        aria-label={navOpen ? t("Close menu") : t("Open menu")}
        aria-expanded={navOpen} aria-controls="wastelens-primary-navigation"
        onClick={() => setNavOpen(current => !current)}>
        {navOpen ? <X size={23}/> : <Menu size={23}/>}
      </button>}
      <button type="button" className="brand" onClick={() => kioskMode ? nextKioskItem() : openPage("identifier")}><span className="brand-mark"><Leaf size={24} strokeWidth={2.5}/></span><strong>WasteLens</strong></button>
      <div className="topbar-actions">
        <div className="language-picker">
          <label htmlFor="wastelens-lang" className="visually-hidden">{t("Choose language")}</label>
          <select id="wastelens-lang" aria-label={t("Choose language")} value={language} onChange={event => setLanguage(event.target.value as typeof language)}>
            {LANGUAGES.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
        </div>
        {!kioskMode&&<AccountMenu user={user} theme={theme} onThemeChange={setTheme}
          onNavigate={next => openPage(next)}/>}
        <button type="button" className="wl-kiosk-switch" onClick={kioskMode?exitKioskMode:()=>void enterKioskMode()}>
          {kioskMode?<><X size={18}/>{t("Exit kiosk")}</>:<><ScanLine size={18}/>{t("Kiosk Mode")}</>}
        </button>
      </div>
    </header>
    {!kioskMode && navOpen && <button type="button" className="community-nav-backdrop"
      aria-label={t("Close menu")} onClick={() => setNavOpen(false)}/>}
    {kioskError && !kioskMode && <p className="wl-kiosk-entry-error" role="alert">{kioskError}</p>}
    <div className="site-layout">
      {!kioskMode && <aside id="wastelens-primary-navigation"
        className={"side-nav community-navigation" + (navOpen ? " is-open" : "")}
        aria-label="WasteLens navigation">
        <div className="community-nav-scroll">
          <div className="community-nav-group" aria-label={t("Understand")}>
            <span className="community-nav-heading">{t("UNDERSTAND")}</span>
            <button type="button" className={view === "identifier" ? "nav-item active" : "nav-item"}
              aria-current={view === "identifier"?"page":undefined} onClick={() => openPage("identifier")}>
              <ScanLine size={18}/>{t("Scan")}</button>
            <button type="button" className={view === "chat" ? "nav-item active" : "nav-item"}
              aria-current={view === "chat"?"page":undefined} onClick={() => openPage("chat")}>
              <MessageCircle size={18}/>{t("Ask")}</button>
            <button type="button" className={view === "journey" ? "nav-item active" : "nav-item"}
              aria-current={view === "journey"?"page":undefined} onClick={() => openPage("journey")}>
              <BookOpen size={18}/>{t("Bottle journey")}</button>
          </div>
          <div className="community-nav-group" aria-label={t("Take action")}>
            <span className="community-nav-heading">{t("TAKE ACTION")}</span>
            <button type="button" className={view === "finder" ? "nav-item active" : "nav-item"}
              aria-current={view === "finder"?"page":undefined} onClick={() => openPage("finder")}>
              <MapPin size={18}/>{t("Find a place")}</button>
            <button type="button" className={view === "deposits" ? "nav-item active" : "nav-item"}
              aria-current={view === "deposits"?"page":undefined} onClick={() => openPage("deposits")}>
              <Coins size={18}/>{t("Bottle returns")}</button>
            <button type="button" className={view === "audit" ? "nav-item active" : "nav-item"}
              aria-current={view === "audit"?"page":undefined} onClick={() => openPage("audit")}>
              <ClipboardList size={18}/>{t("Waste audit")}</button>
          </div>
          <div className="community-nav-group" aria-label={t("Progress")}>
            <span className="community-nav-heading">{t("PROGRESS")}</span>
            <button type="button" className={view === "history" ? "nav-item active" : "nav-item"}
              aria-current={view === "history"?"page":undefined} onClick={() => openPage("history")}>
              <History size={18}/>{t("My activity")}</button>
            <button type="button" className={view === "leaderboard" ? "nav-item active" : "nav-item"}
              aria-current={view === "leaderboard"?"page":undefined} onClick={() => openPage("leaderboard")}>
              <Trophy size={18}/>{t("Leaderboard")}</button>
            {user?.role === "admin"&&<button type="button" className={view === "admin" ? "nav-item active" : "nav-item"}
              aria-current={view === "admin"?"page":undefined} onClick={() => openPage("admin")}>
              <ShieldCheck size={18}/>{t("Admin")}</button>}
          </div>
        </div>
        <button type="button" className={"nav-item community-about-nav "+(view === "about"?"active":"")}
          aria-current={view === "about"?"page":undefined}
          onClick={() => openPage("about")}><Info size={18}/>{t("About")}</button>
      </aside>}
      <div className="page-content">
    <main id="main-content" className={kioskMode?"shell wl-kiosk-shell":view === "journey" ? "shell story-shell" : "shell"} tabIndex={-1}>
      {view === "identifier" ? (kioskMode ?
        <KioskScreen
          videoRef={videoRef} uploadRef={uploadRef}
          camera={camera} preview={preview} busy={busy}
          aiReady={Boolean(status?.configured)}
          statusError={statusError} cameraError={cameraError} error={error}
          analysis={analysis??null} zipCode={location} onZipChange={setLocation}
          rulesOpenRequest={rulesOpenRequest} onShowLocalRules={showLocalRules}
          onStartCamera={()=>void startCamera()} onStopCamera={stopCamera}
          onCapture={capture} onUpload={onUpload} onAnalyze={()=>void analyze()}
          onNextItem={nextKioskItem}/>
        : <>
      <div className="intro">
        <div className="intro-copy">
          <h1>{t("Before you toss it, scan it.")}</h1>
          <p>{t("Scan an item, then check how your local program handles it.")}</p>
        </div>
        <div className="intro-art" aria-hidden="true">
          <span className="intro-art-circle one"></span>
          <span className="intro-art-circle two"></span>
          <Recycle size={58} strokeWidth={1.8}/>
        </div>
      </div>
      <div className="community-mission-path" aria-label={t("Quick links")}>
        <button type="button" onClick={() => openPage("finder")}><MapPin size={19}/>
          <strong>{t("Find a place")}</strong></button>
        <button type="button" onClick={() => openPage("audit")}><ClipboardList size={19}/>
          <strong>{t("Run an audit")}</strong></button>
      </div>

      <div className="workspace">
        <div className="workspace-head">
          <div className="head-with-icon">
            <div className="round-icon"><Camera size={19}/></div>
            <div><h2>{t("Take a picture")}</h2></div>
          </div>
        </div>
        <div className="camera-stage">
          {camera ? <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview"/> :
            preview ? <img src={preview.src} alt="Your selected item photograph"/> :
            <div className="camera-empty">
              <div className="empty-camera"><Camera size={44} strokeWidth={1.4}/></div>
              <p>{t("Use your camera or choose a photo.")}</p>
            </div>}
        </div>

        <div className="camera-controls">
          <input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} aria-label="Upload item photo"/>
          {!camera && !preview && <>
            <button className="button primary" type="button" onClick={() => void startCamera()}><Camera size={18}/> {t("Use camera")}</button>
            <button className="button outline" type="button" onClick={() => uploadRef.current?.click()}><Upload size={18}/> {t("Choose a photo")}</button>
          </>}
          {camera && <>
            <button className="button primary" type="button" onClick={capture}><Camera size={18}/> {t("Take picture")}</button>
            <button className="button outline" type="button" onClick={stopCamera}>{t("Close camera")}</button>
          </>}
          {preview && <>
            <button className="button primary" type="button" onClick={() => void analyze()} disabled={busy || !status?.configured}>
              {busy ? t("Looking at it…") : <><Sparkles size={18}/> {t("Identify item")}</>}
            </button>
            <button className="button outline" type="button" onClick={reset} disabled={busy}><RotateCcw size={18}/> {t("Try another photo")}</button>
          </>}
        </div>
        {preview && <div className="hint-area">
          <label htmlFor="hint">{t("Focus on one item")} <span>{t("Optional")}</span></label>
          <input id="hint" maxLength={160} value={hint} disabled={busy}
            onChange={event => {setHint(event.target.value); setResult(null);}}
            placeholder="Example: The blue bottle I'm holding"/>
        </div>}
        {status && !status.configured && <div className="notice"><AlertTriangle size={17}/><span>Add your Gemini API key in the <code>.env</code> file and restart the backend.</span></div>}
        {statusError && <ErrorText message={statusError}/>}
        {cameraError && <ErrorText message={cameraError}/>}
        {error && <ErrorText message={error}/>}
      </div>

      {analysis && <section className="results" aria-live="polite">
        <div className="result-title">
          <div>
            <h2>{analysis.item_name}</h2>
            {needsConfirmation && <p>{analysis.visual_description}</p>}
          </div>
        </div>
        <div className="result-meta-line">
          <span className="material-line"><strong>{t("Material")}:</strong> {analysis.material_guess}</span>
          {Boolean(result?.earned_xp) && <span className="earned-xp"><Sparkles size={17}/> +{result?.earned_xp} XP earned</span>}
        </div>
        <ReadAloudButton id="scan-summary" category="scan" className="wl-scan-read"
          text={[analysis.item_name,analysis.route_title,analysis.material_guess,
            analysis.visual_description,analysis.follow_up_question,...analysis.cautions].filter(Boolean).join(". ")}/>
        <div className="scan-decision" aria-label={t("Suggested next action")}>
          <div className="scan-decision-copy">
            <span className="scan-decision-label">{t("Suggested next action")}</span>
            <strong>{needsConfirmation ? t("Confirm the item before sorting") : analysis.route_title}</strong>
            <p>{t("AI suggestion, not a confirmed local bin rule.")}</p>
          </div>
          <button type="button" onClick={showLocalRules}>
            <MapPin size={17}/>{t("Check local rules")}
          </button>
        </div>
        {needsConfirmation && <div className="uncertain"><AlertTriangle size={18}/>{t("The item or material needs confirmation. Check before sorting.")}</div>}
        {analysis.follow_up_question && <div className="question"><strong>{t("One thing to check")}:</strong> {analysis.follow_up_question}</div>}
        <div className="stack">
          <SortPlan key={result?.scan_id ?? preview?.src ?? "plan"} analysis={analysis}/>
          <LocalRulesGuide key={result?.scan_id ?? preview?.src ?? "local-rules"}
            zipCode={location} onZipChange={setLocation} openRequest={rulesOpenRequest}/>
          <nav className="scan-next-actions" aria-label={t("Next steps")}>
            <button type="button" onClick={showNearbyOptions}>
              <MapPin size={18}/>{t("Find nearby options")}
            </button>
            <button type="button" onClick={() => setView("chat")}>
              <MessageCircle size={18}/>{t("Ask about this item")}
            </button>
            <button type="button" onClick={recordObservedItem}>
              <ClipboardList size={18}/>{t("Record an observation")}
            </button>
          </nav>
          <article className="result-card blue reuse-section">
            <div className="reuse-heading">
              <div>
                <h3><Lightbulb size={21}/> {t("Give it another life")}</h3>
                
              </div>
            </div>
            {analysis.reuse_projects?.length ? <div className="reuse-projects">
              {analysis.reuse_projects.map((project, i) =>
                <details key={i} className="reuse-project">
                  <summary>
                    <span className="reuse-project-index">{String(i + 1).padStart(2, "0")}</span>
                    <span className="reuse-project-summary">
                      <strong>{project.title}</strong>
                    </span>
                    <ChevronDown size={17} className="reuse-chevron"/>
                  </summary>
                  <div className="reuse-project-body">
                    <div>
                      <h4>{t("You'll need")}</h4>
                      {project.materials_needed.length ? <ul>{project.materials_needed.map((x,j) => <li key={j}>{x}</li>)}</ul>
                        : <p>{t("No extra tools required.")}</p>}
                    </div>
                    <div>
                      <h4>{t("How to make it")}</h4>
                      <ol>{project.steps.map((x,j) => <li key={j}>{x}</li>)}</ol>
                    </div>
                    {project.safety_note && <p className="reuse-safety"><ShieldAlert size={15}/>{project.safety_note}</p>}
                  </div>
                </details>)}
            </div> : <div className="reuse-legacy">
              {analysis.identification === "likely" && analysis.reuse_ideas.length > 0
                ? <><ul>{analysis.reuse_ideas.map((x,i)=><li key={i}>{x}</li>)}</ul></>
                : <p>{t("No safe reuse idea for this item yet.")}</p>}
            </div>}
            <details className="reuse-fine-print"><summary>{t("Before trying a project")}</summary><p>Check the item's material and condition. Take care with tools, sharp edges and electrical parts. These ideas come from AI.</p></details>
          </article>
          {analysis.cautions.length > 0 && <article className="result-card muted">
            <h3><ShieldAlert size={21}/> {t("A few things to check")}</h3>
            <ul>{analysis.cautions.map((caution, i) => <li key={i}>{caution}</li>)}</ul>
          </article>}
          <article className="result-card green" id="nearby">
            <h3><MapPin size={21}/> {t("Nearby places")}</h3>
            
            <form className="finder-row" onSubmit={event => void searchFacilities(event)}>
              <input aria-label="US ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required
                placeholder="ZIP code, like 75033" value={location}
                onChange={event => setLocation(event.target.value)}/>
              <button type="submit" disabled={facilityBusy} className="button primary"><Search size={15}/>{facilityBusy ? t("Searching…") : t("Search")}</button>
            </form>
            {facilityError && <ErrorText message={facilityError}/>}
            <RecyclingResults results={facilities}
                selected={selectedFacility} onSelect={setSelectedFacility}/>
          </article>
          <article className="result-card muted">
            <h3><Check size={21}/> {t("Was that right?")}</h3>
            
            <div className="feedback-actions">
              <button className={"button " + (correctChoice === "yes" ? "primary" : "outline")}
                disabled={feedbackBusy} onClick={() => { setCorrectChoice("yes"); void submitFeedback(true); }}>
                <Check size={17}/> {t("Yes")}
              </button>
              <button className={"button " + (correctChoice === "no" ? "primary" : "outline")}
                disabled={feedbackBusy} onClick={() => { setCorrectChoice("no"); setFeedbackSent(null); }}>
                <AlertTriangle size={17}/> {t("No")}
              </button>
            </div>
            {correctChoice === "no" && !feedbackSent && <div className="correction-form">
              <label htmlFor="feedbackCorrection">{t("What was the item? (optional)")}</label>
              <input id="feedbackCorrection" maxLength={160} value={correction}
                placeholder="Example: insulated water bottle"
                onChange={event => setCorrection(event.target.value)}/>
              <button className="button primary" disabled={feedbackBusy}
                onClick={() => void submitFeedback(false)}>{t("Submit feedback")}</button>
            </div>}
            {feedbackSent && <p className="feedback-confirmed" role="status">Thank you! Your {feedbackSent === "yes" ? "Yes" : "No"} feedback was saved to your account.</p>}
            {feedbackError && <p className="inline-error" role="alert">{feedbackError}</p>}
          </article>
          {user && result?.scan_id && <article className="result-card action-card">
            <h3><Check size={21}/> {t("What did you do with it?")}</h3>
            <div className="action-choices">
              {(["recycled", "reused", "composted", "donated"] as const).map(choice =>
                <button type="button" key={choice} className={"button " + (recordedAction === choice ? "primary" : "outline")}
                  disabled={actionBusy} onClick={() => void markAction(choice)}>
                  {t(choice[0].toUpperCase() + choice.slice(1))}
                </button>
              )}
            </div>
            {recordedAction && <p className="action-confirmed">Saved as {recordedAction}.</p>}
            {actionError && <p className="inline-error" role="alert">{actionError}</p>}
            
          </article>}
        </div>
      </section>}
      </>) : view === "finder" ? <section className="finder-screen">
        <h1><MapPin size={30}/> {t("Find a place")}</h1>
        
        <div className="finder-card">
          <form className="finder-form" onSubmit={event => void searchFacilities(event)}>
            <label htmlFor="sidebar-zip">{t("ZIP code")}</label>
            <input id="sidebar-zip" aria-label="US ZIP code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required
              placeholder="ZIP code, like 75033" value={location}
              onChange={event => setLocation(event.target.value)}/>
            <button type="submit" disabled={facilityBusy} className="button primary"><Search size={16}/>{facilityBusy ? t("Searching…") : t("Search")}</button>
          </form>
          {facilityError && <ErrorText message={facilityError}/>}
          <RecyclingResults results={facilities}
                selected={selectedFacility} onSelect={setSelectedFacility}/>
        </div>
      </section> : view === "deposits" ? <BottleReturns/> : view === "journey" ?
        <BottleJourney user={user}
          onUnlock={badge => setCelebration({scan: -Date.now(), badge})}
          onSignIn={() => setView("account")}
          onScan={() => setView("identifier")}
          onReturns={() => setView("deposits")}/> : view === "audit" ? <AuditKit user={user} onSignIn={() => openPage("account")}
          scannedItem={auditFromScan} onBackToScan={() => openPage("identifier")}/> : view === "leaderboard" ? <Leaderboard user={user} onSignIn={() => setView("account")}/> : view === "about" ?
        <AboutWasteLens onScan={()=>setView("identifier")} onAudit={()=>setView("audit")} onJourney={()=>setView("journey")}/> : view === "chat" ? null : <AccountArea user={user} mode={view}
        onLogin={account => { setUser(account); if (view === "account") setView("identifier"); }}
        onLogout={() => { setUser(null); setView("identifier"); }}/>}
      {!kioskMode && view === "admin" && user?.role === "admin" && <KioskSetup/>}
      {!kioskMode && <div hidden={view !== "chat"}>
        <AskWasteLens scan={analysis ?? null} configured={Boolean(status?.configured)}
          onScan={() => setView("identifier")}/>
      </div>}
      
    </main>
      </div>
    </div>
  </div>;
}
