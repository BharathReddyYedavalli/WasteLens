import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle, Check, ChevronDown, Lightbulb,
  Camera, Recycle, Upload, MapPin, RotateCcw, Search, ShieldAlert, Sparkles, MessageCircle, ScanLine
} from "lucide-react";
import { gsap } from "gsap";
import type { StatusResponse, VisionResponse, SessionUser, FacilitySearchResponse, WasteLensBadge } from "./types";
import RecyclingResults from "./RecyclingResults";
import AskWasteLens from "./AskWasteLens";
import AccountArea, { actionHeaders, readJson } from "./AccountArea";
import Leaderboard from "./Leaderboard";
import BadgeCelebration from "./BadgeCelebration";
import ScanStepTools from "./ScanStepTools";
import LocalRulesGuide from "./LocalRulesGuide";
import AuditKit from "./AuditKit";
import AboutWasteLens from "./AboutWasteLens";
import BottleReturns from "./BottleReturns";
import BottleJourney from "./BottleJourney";
import { useAppearanceTheme } from "./AccountMenu";
import SidebarNav from "./shell/SidebarNav";
import LegacyNavigation from "./shell/LegacyNavigation";
import type { View } from "./shell/TopNav";
import { ReadAloudButton, useSpeech } from "./Speech";
import { useLanguage } from "./i18n";

// Three.js only loads on the home screen; camera, maps and every other page never pay for it.
const ScanStage = lazy(() => import("./scan/ScanStage"));

type VisualStyle = "claude" | "legacy";
type PhotoPreview = { file: File; src: string };

function ErrorText({ message }: { message: string }) {
  return <div className="error-msg" role="alert"><AlertTriangle size={18}/>{message}</div>;
}

export default function App() {
  const { language, t } = useLanguage();
  const [theme, setTheme] = useAppearanceTheme();
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(() => {
    try { return window.localStorage.getItem("wastelens-visual-style") === "legacy" ? "legacy" : "claude"; }
    catch { return "claude"; }
  });
  const [sweeping, setSweeping] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const { stop: stopReading } = useSpeech();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState("");
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [location, setLocation] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<View>("identifier");
  const [facilities, setFacilities] = useState<FacilitySearchResponse | null>(null);
  const [facilityBusy, setFacilityBusy] = useState(false);
  const [facilityError, setFacilityError] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [finderScan, setFinderScan] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<"yes" | "no" | null>(null);
  const [correctChoice, setCorrectChoice] = useState<"yes" | "no" | null>(null);
  const [correction, setCorrection] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [celebration, setCelebration] = useState<{ scan: number; badge: WasteLensBadge } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Visual appearance only: keep the same current handlers, routes, text and data.
  useEffect(() => {
    let link = document.getElementById("wastelens-claude-styles") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "wastelens-claude-styles";
      link.rel = "stylesheet";
      link.href = "/claude-theme.css";
      document.head.appendChild(link);
    }
    link.media = visualStyle === "claude" ? "all" : "not all";
    // Layer the kiosk experiment after the existing Claude theme without touching ScanStage.
    let kiosk = document.getElementById("wastelens-kiosk-experiment") as HTMLLinkElement | null;
    if (!kiosk) {
      kiosk = document.createElement("link");
      kiosk.id = "wastelens-kiosk-experiment";
      kiosk.rel = "stylesheet";
      kiosk.href = "/kiosk-experiment.css";
      document.head.appendChild(kiosk);
    }
    kiosk.media = visualStyle === "claude" ? "all" : "not all";
    // Last, semantic theme/contrast repairs for all non-Scan pages.
    let readable = document.getElementById("wastelens-kiosk-readable") as HTMLLinkElement | null;
    if (!readable) {
      readable = document.createElement("link");
      readable.id = "wastelens-kiosk-readable";
      readable.rel = "stylesheet";
      readable.href = "/kiosk-readability-fixes.css?v=20261024-kiosk-final";
      document.head.appendChild(readable);
    }
    readable.media = visualStyle === "claude" ? "all" : "not all";
    try { window.localStorage.setItem("wastelens-visual-style", visualStyle); } catch { /* private mode */ }
  }, [visualStyle]);

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

  useLayoutEffect(() => {
    stopReading();
    // Each navigation begins at the top. View scan must never jump to the
    // results section halfway down the Scan page.
    const top = () => {
      window.scrollTo({top:0,left:0,behavior:"instant"});
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    };
    top();
    // On Safari, restoring the previous scroll position can happen right after
    // a conditional view is mounted. Repeat after layout is committed.
    const frame = window.requestAnimationFrame(top);
    return () => window.cancelAnimationFrame(frame);
  },[view,stopReading]);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [camera]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  // The viewfinder mounts after the 3D sweep ends, so bind the stream when the element appears.
  function attachVideo(element: HTMLVideoElement | null) {
    videoRef.current = element;
    if (element && streamRef.current && element.srcObject !== streamRef.current) element.srcObject = streamRef.current;
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCamera(false);
  }

  function closeCamera() {
    stopCamera();
    setSweeping(false);
  }

  function clearPreview() {
    setPreview(previous => {
      if (previous) URL.revokeObjectURL(previous.src);
      return null;
    });
  }

  function reset() {
    closeCamera();
    clearPreview();
    setResult(null);
    setError("");
    setCameraError("");
    setFacilities(null);
    setSelectedFacility(null);
    setFeedbackSent(null);
    setCorrectChoice(null);
    setFeedbackError("");
    setCelebration(null);
    setFinderScan(null);
  }

  async function startCamera() {
    setCameraError(""); setError(""); setResult(null); clearPreview();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires localhost or HTTPS. Try uploading a photo instead.");
      setSweeping(false);
      return;
    }
    setCameraStarting(true);
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
      setSweeping(false);
    } finally {
      setCameraStarting(false);
    }
  }

  // Tap on the 3D bottle's Scan button: the sweep plays while the real camera permission resolves.
  function beginScan() {
    setSweeping(true);
    void startCamera();
  }

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image no larger than 8 MB.");
      return;
    }
    stopCamera();
    setSweeping(false);
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
    setBusy(true); setResult(null); setError(""); setCelebration(null);
    setFinderScan(null);
    try {
      const scanForm = new FormData();
      scanForm.append("image", preview.file);
      scanForm.append("language", language);
      if (/^\d{5}$/.test(location.trim())) {
        scanForm.append("zip_code", location.trim());
      }

      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        body: scanForm,
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(typeof responseBody.detail === "string"
          ? responseBody.detail : "Analysis failed");
      }

      const scanResult = responseBody as VisionResponse;
      setResult(scanResult);

      const newBadge = scanResult.unlocked_badges?.[0];
      if (newBadge && scanResult.scan_id) {
        setCelebration({ scan: scanResult.scan_id, badge: newBadge });
      }
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


  async function lookupFacilities(zipCode: string) {
    if (!/^\d{5}$/.test(zipCode.trim())) {
      setFacilityError("Enter a valid five-digit US ZIP code.");
      return;
    }
    setFacilityBusy(true);
    setFacilityError("");
    // ZIPs use bundled postal coordinates; material acceptance is NOT verified.
    setFacilities(null);
    setSelectedFacility(null);
    try {
      const hasGoogleMapsKey = Boolean((import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim());
      // Resolve ZIP offline for Google; query Overpass only for fallback.
      const endpoint = hasGoogleMapsKey ? "/api/facilities/center" : "/api/facilities";
      const response = await fetch(endpoint + "?zip_code=" + encodeURIComponent(zipCode.trim()));
      const searchResults = await readJson<FacilitySearchResponse>(response);
      setFacilities(searchResults);
      setSelectedFacility(searchResults.facilities[0]?.id ?? null);
    } catch (e) {
      setFacilityError(e instanceof Error ? e.message : "Could not find collection locations.");
    } finally { setFacilityBusy(false); }
  }

  function searchFacilities(event: React.FormEvent) {
    event.preventDefault();
    void lookupFacilities(location);
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
  const needsConfirmation = Boolean(analysis && (analysis.identification !== "likely" || analysis.route === "needs_identification"));
  // When identification is uncertain, do not repeat the same generic safety
  // statement in the decision, numbered instructions and warning banner.
  // Preserve distinct hazard cautions (batteries, sharps, chemicals, etc.).
  const scanCautions = analysis?.cautions.filter((c, index, all) => {
    const normalized = c.trim().toLowerCase();
    if (!normalized || all.findIndex(other => other.trim().toLowerCase() === normalized) !== index) return false;
    return !(needsConfirmation && /^the photo alone is not enough to confirm safe disposal\.?$/.test(normalized));
  }) ?? [];
  function openPage(next: typeof view, fromScan = false) {
    closeCamera();
    if (next === "finder") {
      setFinderScan(fromScan && analysis ? analysis.item_name : null);
      // A Scan-to-Finder transition uses the ZIP already entered in local rules.
      // Only location results are fetched; no facility is claimed to accept this item.
      if (fromScan && /^\d{5}$/.test(location.trim())) {
        void lookupFacilities(location);
      } else if (fromScan) {
        setFacilities(null);
        setSelectedFacility(null);
      }
    }
    setView(next);
  }
  function returnToScannedItem() {
    closeCamera();
    // Blur View scan before hiding Ask so Safari doesn't restore focus scroll.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setView("identifier");
  }

  const showStage = (!camera && !preview) || sweeping;
  const stageMode = visualStyle === "claude" && view === "identifier" && showStage && !analysis;

  // Page-level reveal: every view, including the camera and results, settles in the same way.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".reveal", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.07, clearProps: "transform,opacity" });
    }, pageRef);
    return () => ctx.revert();
  }, [view, camera, Boolean(preview), Boolean(analysis), stageMode]);

  return <div className={"site " + (visualStyle === "legacy" ? "is-legacy-ui" : "is-sidebar-experiment") + (stageMode ? " is-stage" : "") + (view !== "identifier" && visualStyle === "claude" ? " is-classic-page" : "")} data-theme={theme} data-lang={language} data-visual-style={visualStyle}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {celebration && <BadgeCelebration key={celebration.scan} badge={celebration.badge} onClose={() => setCelebration(null)} />}
    <div className={visualStyle === "legacy" ? "site-layout legacy-layout" : "modern-layout"}>
      {visualStyle === "legacy"
        ? <LegacyNavigation view={view} user={user} theme={theme} onThemeChange={setTheme} visualStyle={visualStyle} onVisualStyleChange={setVisualStyle} onNavigate={next => openPage(next)}/>
        : <SidebarNav view={view} user={user} theme={theme} onThemeChange={setTheme} visualStyle={visualStyle} onVisualStyleChange={setVisualStyle} onNavigate={next => openPage(next)}/>}
      <div className={visualStyle === "legacy" ? "page-content legacy-page-content" : "modern-page-content"}>
    <main id="main-content" ref={pageRef} className={view === "journey" ? "shell story-shell" : "shell"} tabIndex={-1}>
      {view === "identifier" ? <>
      <input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} aria-label={t("Upload item photo")}/>
      {visualStyle === "legacy" ? <div className="legacy-scan">
        <div className="intro">
          <div className="intro-copy">
            <h1>{t("Before you toss it, scan it.")}</h1>
            <p>{t("Scan an item, then check how your local program handles it.")}</p>
          </div>
          <div className="intro-art" aria-hidden="true">
            <span className="intro-art-circle one"/><span className="intro-art-circle two"/>
            <Recycle size={58} strokeWidth={1.8}/>
          </div>
        </div>
        <div className="workspace">
          <div className="workspace-head"><div className="head-with-icon">
            <div className="round-icon"><Camera size={19}/></div>
            <h2>{t("Take a picture")}</h2>
          </div></div>
          <div className="camera-stage">
            {camera ? <video ref={attachVideo} autoPlay muted playsInline aria-label="Live camera preview"/> :
             preview ? <img src={preview.src} alt="Your selected item photograph"/> :
             <div className="camera-empty"><div className="empty-camera"><Camera size={44} strokeWidth={1.4}/></div>
               <p>{t("Use your camera or choose a photo.")}</p>
             </div>}
          </div>
          <div className="camera-controls">
            {!camera && !preview && <>
              <button className="button primary" type="button" onClick={() => void startCamera()} disabled={cameraStarting}>
                <Camera size={18}/>{cameraStarting ? t("Opening camera…") : t("Scan an item")}
              </button>
              <button className="button outline" type="button" onClick={() => uploadRef.current?.click()}>
                <Upload size={18}/>{t("Choose a photo")}
              </button>
            </>}
            {camera && <>
              <button className="button primary" type="button" onClick={capture}><Camera size={18}/>{t("Take picture")}</button>
              <button className="button outline" type="button" onClick={closeCamera}>{t("Close camera")}</button>
            </>}
            {preview && <>
              <button className="button primary" type="button" onClick={() => void analyze()} disabled={busy || !status?.configured}>
                <Sparkles size={18}/>{busy ? t("Looking at it…") : t("Identify item")}
              </button>
              <button className="button outline" type="button" onClick={reset} disabled={busy}>
                <RotateCcw size={18}/>{t("Try another photo")}
              </button>
            </>}
          </div>
          {status && !status.configured && <div className="notice"><AlertTriangle size={17}/><span>{t("Add your Gemini API key in the")} <code>.env</code> {t("file and restart the backend.")}</span></div>}
          {statusError && <ErrorText message={statusError}/>}
          {cameraError && <ErrorText message={cameraError}/>}
          {error && <ErrorText message={error}/>}
        </div>
      </div> : stageMode ? <div className="stage-wrap">
        <h1 className="visually-hidden">{t("Before you toss it, scan it.")}</h1>
        <p className="visually-hidden">{t("Scan an item, then check how your local program handles it.")}</p>
        <Suspense fallback={<div className="es-fallback" aria-busy="true"/>}>
          <ScanStage scanning={sweeping} waiting={cameraStarting} onScan={beginScan}
            onChoosePhoto={() => uploadRef.current?.click()} onSweepDone={() => setSweeping(false)}/>
        </Suspense>
        <div className="stage-status">
          {status && !status.configured && <div className="notice"><AlertTriangle size={17}/><span>{t("Add your Gemini API key in the")} <code>.env</code> {t("file and restart the backend.")}</span></div>}
          {statusError && <ErrorText message={statusError}/>}
          {cameraError && <ErrorText message={cameraError}/>}
          {error && <ErrorText message={error}/>}
        </div>
      </div> : !analysis ? <section className="cap" aria-label={t("Take a picture")}>
        <div className="cap-view reveal">
          {camera ? <video ref={attachVideo} autoPlay muted playsInline aria-label="Live camera preview"/> :
            preview ? <img src={preview.src} alt="Your selected item photograph"/> : null}
          <i className="cap-c tl"/><i className="cap-c tr"/><i className="cap-c bl"/><i className="cap-c br"/>
          {camera && <span className="cap-reticle" aria-hidden="true"/>}
          {busy && <div className="cap-busy" role="status"><span className="cap-line" aria-hidden="true"/><b>{t("Looking at it…")}</b></div>}
        </div>
        <div className="cap-bar reveal">
          {camera && <>
            <button className="es-ghost" type="button" onClick={closeCamera}>{t("Close camera")}</button>
            <button className="cap-shutter" type="button" onClick={capture} aria-label={t("Take picture")}><span/></button>
            <span className="cap-hint">{t("Frame one item")}</span>
          </>}
          {preview && <>
            <button className="es-ghost" type="button" onClick={reset} disabled={busy}><RotateCcw size={18}/> {t("Try another photo")}</button>
            <button className="es-cta" type="button" onClick={() => void analyze()} disabled={busy || !status?.configured}>
              <span className="es-ring" aria-hidden="true"/>{busy ? t("Looking at it…") : t("Identify item")}
            </button>
          </>}
        </div>
        <div className="cap-alerts">
          {status && !status.configured && <div className="notice"><AlertTriangle size={17}/><span>{t("Add your Gemini API key in the")} <code>.env</code> {t("file and restart the backend.")}</span></div>}
          {statusError && <ErrorText message={statusError}/>}
          {cameraError && <ErrorText message={cameraError}/>}
          {error && <ErrorText message={error}/>}
        </div>
      </section> : null}
      {analysis && <section id="scan-results" className={visualStyle === "legacy" ? "results legacy-results" : "results res-layout"} aria-live="polite">
        {preview && <aside className={visualStyle === "legacy" ? "legacy-result-photo" : "res-photo reveal"}>
          <img src={preview.src} alt="Your selected item photograph"/>
          <button className="es-ghost" type="button" onClick={reset}><RotateCcw size={18}/> {t("Try another photo")}</button>
        </aside>}
        <div className="result-title">
          <div>
            <h2>{analysis.item_name}</h2>
            {needsConfirmation && <p>{analysis.visual_description}</p>}
          </div>
        </div>
        <div className="result-meta-line">
          <span className="material-line"><strong>{t("Material")}:</strong> {analysis.material_guess}</span>
          {Boolean(result?.earned_xp) && <span className="earned-xp"><Sparkles size={17}/> +{result?.earned_xp} {t("XP earned")}</span>}
        </div>
        <ReadAloudButton id="scan-summary" category="scan" className="wl-scan-read"
          text={[analysis.item_name,needsConfirmation ? t("Confirm the item before sorting") : analysis.route_title,
            analysis.material_guess,analysis.visual_description,analysis.follow_up_question,
            ...(!needsConfirmation ? analysis.disposal_steps : []),...scanCautions].filter(Boolean).join(". ")}/>
        <div className={"scan-decision scan-decision-unified" + (needsConfirmation ? " needs-confirmation" : "")}
          aria-label={t("Suggested next action")}>
          <div className="scan-decision-copy">
            <span className="scan-decision-label">{t("Suggested next action")}</span>
            <strong>{needsConfirmation ? t("Confirm the item before sorting") : analysis.route_title}</strong>
          </div>
          {needsConfirmation ? (
            <p className="scan-clarification"><AlertTriangle size={18}/>
              <span>{analysis.follow_up_question || t("The item or material needs confirmation. Check before sorting.")}</span>
            </p>
          ) : <>
            {analysis.disposal_steps.length > 0 && <ol className="scan-action-steps">
              {analysis.disposal_steps.slice(0,3).map((step,index)=><li key={index}>{step}</li>)}
            </ol>}
            {analysis.follow_up_question && <p className="scan-clarification">
              <span><strong>{t("One thing to check")}:</strong> {analysis.follow_up_question}</span>
            </p>}
          </>}
          {scanCautions.length > 0 && <p className="scan-inline-caution">
            <ShieldAlert size={18}/><span>{scanCautions[0]}</span>
          </p>}
          {needsConfirmation ? <div className="scan-decision-actions">
            <button type="button" className="button primary" onClick={() => {
              reset();
              window.scrollTo({top:0,left:0,behavior:"instant"});
            }}><RotateCcw size={17}/>{t("Try another photo")}</button>
          </div> : analysis.disposal_steps.length > 0 &&
            <ScanStepTools key={result?.scan_id ?? preview?.src ?? "tools"} analysis={analysis}/>}
        </div>
        <div className="scan-essential">
          <LocalRulesGuide key={result?.scan_id ?? preview?.src ?? "local-rules"}
            zipCode={location} onZipChange={setLocation}
            scanItemName={analysis.item_name} scanMaterial={analysis.material_guess}
            scanIdentified={analysis.identification==="likely"}/>
          <nav className="scan-next-actions" aria-label={t("Next steps")}>
            <button type="button" onClick={() => openPage("finder", true)}>
              <MapPin size={18}/>{t("Find nearby options")}
            </button>
            <button type="button" onClick={() => setView("chat")}>
              <MessageCircle size={18}/>{t("Ask about this item")}
            </button>
          </nav>
        </div>
            {(analysis.reuse_projects?.length || analysis.reuse_ideas.length>0) ? <details className="scan-subdetails scan-reuse-details">
              <summary><Lightbulb size={18}/>{t("Give it another life")}<ChevronDown size={17}/></summary>
          <article className="result-card blue reuse-section">
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
            <details className="reuse-fine-print"><summary>{t("Before trying a project")}</summary><p>{t("Check the item's material and condition. Take care with tools, sharp edges and electrical parts. These ideas come from AI.")}</p></details>
          </article>
            </details> : null}
            {scanCautions.length > 1 &&
              <details className="scan-subdetails">
                <summary><ShieldAlert size={18}/>{t("Other precautions")}<ChevronDown size={17}/></summary>
                <ul className="scan-other-cautions">
                  {scanCautions.slice(1).map((c,i)=><li key={i}>{c}</li>)}
                </ul>
              </details>}
            <section className="scan-feedback-inline" aria-label={t("Was that right?")}>
              <span className="scan-feedback-question"><Check size={17}/>{t("Was that right?")}</span>
              <div className="scan-feedback-controls">
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
            {feedbackSent && <p className="feedback-confirmed" role="status">{t("Thank you! Your")} {t(feedbackSent === "yes" ? "Yes" : "No")} {t("feedback was saved to your account.")}</p>}
            {feedbackError && <p className="inline-error" role="alert">{feedbackError}</p>}
              </div>
            </section>
      </section>}
      </> : view === "finder" ? <section className="finder-screen">
        <h1><MapPin size={30}/> {t("Find a place")}</h1>
        {finderScan && <div className="finder-scan-context" role="status">
          <ScanLine size={21}/>
          <div><strong>{t("From your scan")}: {finderScan}</strong>
            <p>{t("These locations are not confirmed to accept this item. Contact them before visiting.")}</p>
          </div>
        </div>}
        
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
          scannedItem={null} onBackToScan={() => openPage("identifier")}/> : view === "leaderboard" ? <Leaderboard user={user} onSignIn={() => setView("account")}/> : view === "about" ?
        <AboutWasteLens onScan={()=>setView("identifier")} onAudit={()=>setView("audit")} onJourney={()=>setView("journey")}/> : view === "chat" ? null : <AccountArea user={user} mode={view} visualStyle={visualStyle} onVisualStyleChange={setVisualStyle}
        onLogin={account => { setUser(account); if (view === "account") setView("identifier"); }}
        onLogout={() => { setUser(null); setView("identifier"); }}/>}
      <div hidden={view !== "chat"}>
        <AskWasteLens scan={analysis ?? null} configured={Boolean(status?.configured)}
          onScan={returnToScannedItem}/>
      </div>
    </main>
      </div>
    </div>
  </div>;
}
