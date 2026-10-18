import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, CheckCircle2, ChevronDown, CircleHelp, ExternalLink, ImagePlus, Leaf, MapPin, Recycle, RotateCcw, Search, ShieldAlert, X } from "lucide-react";
import type { Classification, ModelCatalog } from "./types";

const label = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase());
const defaultModel = "mobilenetv3-v2";
const searchable = (what: string, location: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(what + " near " + location)}`;

type Preview = { src: string; file: File };

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice"><CircleHelp size={16}/><span>{children}</span></div>;
}

export default function App() {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [catalogError, setCatalogError] = useState("");
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Classification | null>(null);
  const [inferenceError, setInferenceError] = useState("");
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState("");
  const [corrected, setCorrected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/models").then(async response => {
      if (!response.ok) throw new Error("Model service unavailable");
      return await response.json() as ModelCatalog;
    }).then(data => { if (mounted) { setCatalog(data); setSelectedModel(data.default_model_id); } })
      .catch(() => { if (mounted) setCatalogError("Start the Python API to load available AI models."); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [camera]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamera(false);
  }
  async function startCamera() {
    setCameraError(""); setInferenceError(""); setResult(null); setPreview(null); setCorrected(false);
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError("Camera is unavailable in this browser. Use HTTPS, localhost, or upload a photo."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCamera(true);
    } catch {
      setCameraError("Camera access was blocked or no camera was found. Allow camera permissions or upload a photo.");
    }
  }
  function useFile(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setInferenceError("Choose a JPEG, PNG, or WebP photo smaller than 8 MB."); return;
    }
    stopCamera();
    setResult(null); setInferenceError(""); setCorrected(false);
    setPreview(previous => { if (previous) URL.revokeObjectURL(previous.src); return { file, src: URL.createObjectURL(file) }; });
  }
  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    useFile(event.target.files?.[0]);
    event.target.value = "";
  }
  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setCameraError("Waiting for camera video. Try again in a moment."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (blob) useFile(new File([blob], "capture.jpg", {type: "image/jpeg"})); }, "image/jpeg", .88);
  }
  async function analyze() {
    if (!preview || busy) return;
    setBusy(true); setResult(null); setInferenceError("");
    try {
      const form = new FormData();
      form.append("image", preview.file); form.append("model_id", selectedModel);
      const response = await fetch("/api/classify", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Could not analyze the image");
      setResult(body as Classification);
    } catch (error) {
      setInferenceError(error instanceof Error ? error.message : "Could not analyze this photo");
    } finally { setBusy(false); }
  }
  function reset() {
    stopCamera();
    setPreview(prev => { if (prev) URL.revokeObjectURL(prev.src); return null; });
    setResult(null); setInferenceError(""); setCameraError(""); setCorrected(false);
  }
  const installed = catalog?.models.filter(m => m.available) ?? [];
  const activeModel = catalog?.models.find(m => m.id === selectedModel);

  return <div className="site">
    <header className="topbar">
      <a className="brand" href="#home"><Leaf size={26} strokeWidth={2.7}/><strong>WasteLens</strong></a>
      <span className="brand-desc">AI Waste Identifier</span>
    </header>
    <main className="shell" id="home">
      <div className="intro">
        <div><span className="eyebrow">SCAN · SORT · SUSTAIN</span><h1>Know where it goes.</h1><p>Snap a picture, identify the material, and learn how to handle it responsibly.</p></div>
        <div className="model-picker">
          <label htmlFor="model">AI Model</label>
          <div className="picker"><select id="model" value={selectedModel} onChange={e => { setSelectedModel(e.target.value); setResult(null); }} disabled={!catalog || busy}>
            {(catalog?.models ?? [{id: defaultModel, name: "MobileNetV3 · evaluated checkpoint 2", available: false, note: ""}]).map(m =>
              <option value={m.id} key={m.id}>{m.name}{m.available ? "" : " (not installed)"}</option>)}
          </select><ChevronDown size={15}/></div>
          <small>{activeModel?.note ?? "Checkpoint 2 is the best-documented model. Other checkpoints have not been compared."}</small>
        </div>
      </div>
      <div className="workspace">
        <div className="workspace-head"><div className="head-with-icon"><div className="round-icon"><Camera size={19}/></div><div><h2>Identifier</h2><p>Show one item clearly in the frame</p></div></div><span className="step-label">STEP 01 / IDENTIFY</span></div>
        <div className="camera-stage">
          {camera ? <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" /> :
           preview ? <img src={preview.src} alt="Waste item uploaded or captured for classification" /> :
           <div className="camera-empty"><div className="empty-camera"><Camera size={44} strokeWidth={1.4}/></div><h3>Your camera is ready</h3><p>Start your camera or upload an image of the item you want to sort.</p></div>}
        </div>
        <div className="camera-controls">
          <input hidden ref={uploadRef} accept="image/jpeg,image/png,image/webp" type="file" onChange={onUpload} aria-label="Upload waste photo" />
          {!preview && !camera && <><button className="button primary" onClick={() => void startCamera()}><Camera size={17}/> Open camera</button><button className="button outline" onClick={() => uploadRef.current?.click()}><ImagePlus size={17}/> Upload photo</button></>}
          {camera && <><button className="button primary" onClick={capture}><Camera size={17}/> Click picture</button><button className="button outline" onClick={stopCamera}><X size={17}/> Close camera</button></>}
          {preview && <><button className="button primary" disabled={busy || (catalog ? installed.length === 0 : true) || !activeModel?.available} onClick={() => void analyze()}>{busy ? "Analyzing photo..." : <><Search size={17}/> Identify item</>}</button><button className="button outline" onClick={reset} disabled={busy}><RotateCcw size={17}/> Take another photo</button></>}
        </div>
        {cameraError && <Notice>{cameraError}</Notice>}
        {catalogError && <Notice>{catalogError}</Notice>}
        {catalog && installed.length === 0 && <Notice>No checkpoint files found. Run <code>python scripts/download_models.py</code> in the project root, then restart the API and reload the page.</Notice>}
        {catalog && activeModel && !activeModel.available && installed.length > 0 && <Notice>Selected model isn't installed. Run <code>python scripts/download_models.py --all</code> to enable every option.</Notice>}
        {inferenceError && <div role="alert" className="error-msg"><ShieldAlert size={18}/>{inferenceError}</div>}
      </div>
      {result && <section className="results" aria-live="polite">
        <span className="eyebrow">YOUR RESULTS</span>
        <div className="result-title"><div><h2>{label(result.material)}</h2><p>AI material prediction · {result.top_predictions[0]?.score ? Math.round(result.top_predictions[0].score*100) : 0}% uncalibrated model score</p></div><span className="type-badge"><Recycle size={16}/>{result.category}</span></div>
        {result.review_required ? <div className="uncertain"><ShieldAlert size={18}/> Low model certainty — verify this item before following the suggestions.</div> : <p className="result-caution">The predicted material isn't proof of the exact item or that it can go in your curbside bin.</p>}
        <div className="stack">
          <article className="result-card orange"><h3><Recycle size={20}/> How to dispose properly</h3><strong>{result.guidance.headline}</strong><ul>{result.guidance.instructions.map(s=><li key={s}>{s}</li>)}</ul><p className="warning">{result.guidance.caution}</p><a target="_blank" rel="noreferrer" href={result.guidance.source_url}>Read U.S. EPA guidance <ExternalLink size={14}/></a></article>
          <article className="result-card blue"><h3><Leaf size={20}/> Creative reuse ideas</h3><ul>{result.guidance.reuse.map(s=><li key={s}>{s}</li>)}</ul></article>
          {result.guidance.finder ? <article className="result-card green"><h3><MapPin size={20}/> Find a recycling or collection site</h3><p>Enter a city or ZIP code to search for collection options. Confirm the location accepts your exact item before visiting.</p><div className="finder-row"><input aria-label="City or ZIP code" placeholder="City or ZIP code" value={location} onChange={e=>setLocation(e.target.value)} /><a className={`button primary ${!location.trim()?"disabled":""}`} href={location.trim()?searchable(result.guidance.finder,location.trim()):undefined} target="_blank" rel="noreferrer"><MapPin size={15}/> Search locations</a></div><p className="finder-note">Google Maps search results are not verified acceptance listings. Nearest verified material-specific finder is a future milestone.</p></article> : null}
          <article className="result-card muted"><h3><CheckCircle2 size={19}/> Was this correct?</h3><p>{corrected?"Thanks. This feedback is local to your current session and isn't used to train the model.":"The model recognizes broad materials, not exact object identities. If the result looks wrong, retake the photo or compare alternatives below."}</p><div className="alternative-row">{result.top_predictions.slice(1).map(p=><span className="candidate" key={p.label}>{label(p.label)} · {Math.round(p.score*100)}%</span>)}</div><button className="button outline" onClick={()=>setCorrected(true)} disabled={corrected}>This result needs review</button></article>
        </div>
      </section>}
      <footer><span>WasteLens · Research prototype</span><span>Always confirm local disposal rules; model estimates can be wrong.</span></footer>
    </main>
  </div>;
}
