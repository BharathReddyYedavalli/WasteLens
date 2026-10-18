import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle, Camera, Check, ChevronDown, ExternalLink, Leaf, Lightbulb,
  MapPin, Recycle, RotateCcw, Search, ShieldAlert, Sparkles, Upload
} from "lucide-react";
import type { StatusResponse, VisionResponse } from "./types";

type PhotoPreview = { file: File; src: string };
const initialModel = "gemini-2.5-flash";

const MAPS_SEARCH = (term: string, location: string) =>
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(term + " near " + location);

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
      const response = await fetch("/api/ai/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Analysis failed");
      setResult(data as VisionResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not analyze this photograph.");
    } finally {
      setBusy(false);
    }
  }

  const analysis = result?.analysis;
  return <div className="site">
    <header className="topbar">
      <a className="brand" href="#home"><Leaf size={26} strokeWidth={2.5}/><strong>WasteLens</strong></a>
      <span className="brand-desc">See it. Sort it. Sustain it.</span>
    </header>
    <main id="home" className="shell">
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
              {(status?.models ?? [{id: initialModel, name: "Gemini 2.5 Flash"}]).map(option =>
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
        <p className="privacy-line"><ShieldAlert size={15}/> Your photo is sent to Google's Gemini API only when you click Identify. On the free tier, Google may use submitted content to improve its products. Don't include faces or private details.</p>
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
          {analysis.location_helpful && <article className="result-card green">
            <h3><MapPin size={20}/> Find collection options</h3>
            <p>Search potential nearby facilities. WasteLens has not checked whether they accept your exact item. Contact the facility before visiting.</p>
            <div className="finder-row">
              <input aria-label="Your city or ZIP code" placeholder="Enter city or ZIP" value={location} onChange={event => setLocation(event.target.value)}/>
              <a className={`button primary ${location.trim() ? "" : "disabled"}`}
                 target="_blank" rel="noreferrer" href={location.trim() ? MAPS_SEARCH(analysis.collection_search_term || "recycling collection",location.trim()) : undefined}>
                <Search size={15}/> Search on Maps <ExternalLink size={14}/>
              </a>
            </div>
            <p className="finder-note">Google Maps results are search suggestions, not verified acceptance data.</p>
          </article>}
          <article className="result-card muted">
            <h3><Check size={20}/> Does this look right?</h3>
            <p>AI can mistake the item or its material. If it's wrong, describe the object more precisely and analyze the photo again. Never use an AI answer alone for hazardous materials.</p>
          </article>
        </div>
      </section>}
      <footer>
        <span>WasteLens · Experimental vision AI prototype</span>
        <span>Disposal advice is provisional; local rules and item condition matter.</span>
      </footer>
    </main>
  </div>;
}
