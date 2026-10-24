import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createScene, type Phase } from "./bottle";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const NOTES = [
  { id: "cap", n: "01", title: "Cap", body: "PP 5 — leave on" },
  { id: "label", n: "02", title: "Label", body: "Paper — peel if loose" },
  { id: "body", n: "03", title: "Body", body: "PET 1 — empty, rinse" },
];

export default function ScanHome() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pipRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const phaseStart = useRef(0);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [cameraNote, setCameraNote] = useState("");
  const [flash, setFlash] = useState(false);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p; phaseStart.current = performance.now(); setPhaseState(p);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
  }, []);

  // Real camera, same constraints as the working app (environment-facing, no audio).
  const openCamera = useCallback(async () => {
    setCameraNote("");
    if (!navigator.mediaDevices?.getUserMedia) { setCameraNote("Camera needs HTTPS or localhost — choose a photo instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setCameraNote("Camera unavailable — enable permission or choose a photo."); }
  }, []);

  useEffect(() => {
    if (phase === "camera") void openCamera(); else stopCamera();
    return stopCamera;
  }, [phase, openCamera, stopCamera]);

  const begin = () => { if (phaseRef.current === "idle") setPhase("scanning"); };
  const back = () => setPhase("idle");
  const capture = () => { setFlash(true); setTimeout(() => setFlash(false), 220); };

  // ---------------- 3D scene + interaction ----------------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const S = createScene(canvas);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let yaw = -0.9, vel = reduce ? 0 : 0.32, tilt = 0, px = 0, py = 0, sx = 0, sy = 0;
    let dragging = false, lastX = 0, camBlend = 0, introT = 0;
    const tgt = new THREE.Vector3(), v = new THREE.Vector3();
    const idleVel = reduce ? 0 : 0.32; const freeze = location.search.includes("freeze");

    const onMove = (e: PointerEvent) => {
      px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1;
      if (dragging) { const d = e.clientX - lastX; lastX = e.clientX; yaw += d * 0.008; vel = d * 0.06; }
    };
    const onDown = (e: PointerEvent) => {
      if (phaseRef.current !== "idle" || (e.target as HTMLElement).closest("button,a")) return;
      dragging = true; lastX = e.clientX; canvas.setPointerCapture?.(e.pointerId);
    };
    const onUp = () => { dragging = false; };
    window.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    const ro = new ResizeObserver(S.resize); ro.observe(canvas); S.resize();

    let raf = 0, last = performance.now(); const t0 = last;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const phase = phaseRef.current, t = (now - phaseStart.current) / 1000;
      introT = clamp01((now - t0) / 1600);

      // pointer parallax + inertia spin
      sx += (px - sx) * 0.06; sy += (py - sy) * 0.06;
      if (!dragging) { vel += (idleVel - vel) * 0.02; yaw += vel * dt; }
      if (phase === "scanning") yaw += (Math.round(yaw / (Math.PI * 2)) * Math.PI * 2 + 0.35 - yaw) * 0.04;
      tilt += (sy * 0.09 - tilt) * 0.08;
      S.group.rotation.set(tilt + 0.04, yaw + sx * 0.18, -sx * 0.025);

      // phases: idle -> scanning (sweep) -> camera (bottle recedes into the viewfinder)
      let sweepY = -1, sweepOpacity = 0, wireOn = false, exit = 0;
      if (phase === "scanning") {
        const k = freeze ? 0.55 : clamp01(t / 1.9); sweepY = ease(k) * 2.2; sweepOpacity = Math.sin(k * Math.PI);
        wireOn = true;
        if (k >= 1) { phaseRef.current = "camera"; phaseStart.current = now; setPhaseState("camera"); }
      } else if (phase === "camera") { exit = ease(clamp01(t / 0.8)); wireOn = false; }
      camBlend += ((phase === "camera" ? 1 : 0) - camBlend) * 0.07;

      S.clip.constant = sweepY; S.wire.visible = S.wireCap.visible = wireOn;
      S.sweep.position.y = sweepY; S.sweepGlow.position.y = sweepY - 0.09;
      (S.sweep.material as THREE.MeshBasicMaterial).opacity = sweepOpacity;
      (S.sweepGlow.material as THREE.MeshBasicMaterial).opacity = sweepOpacity * 0.28;

      const enter = ease(introT);
      S.group.position.y = -0.05 + (1 - enter) * -0.6 + Math.sin(now / 1400) * 0.025 - exit * 0.4;
      const sc = (0.9 + enter * 0.1) * (1 - exit * 0.35) * (phase === "scanning" ? 1 + 0.03 * Math.sin(clamp01(t / 1.9) * Math.PI) : 1);
      S.group.scale.setScalar(sc);
      canvas.style.opacity = String(enter * (1 - exit));
      S.shadow.material.opacity = 0.38 * enter * (1 - exit);

      S.renderer.render(S.scene, S.camera);

      // project annotation anchors
      for (const a of S.anchors) {
        const el = noteRefs.current[a.id]; if (!el) continue;
        v.copy(a.point).applyMatrix4(S.group.matrixWorld).project(S.camera);
        const visible = phase === "idle" && introT > 0.9;
        const facing = tgt.copy(a.point).applyQuaternion(S.group.quaternion).z > -0.05;
        const x = (v.x * 0.5 + 0.5) * canvas.clientWidth, y = (-v.y * 0.5 + 0.5) * canvas.clientHeight;
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.style.opacity = visible && facing ? "1" : "0";
      }
      // Pip: a small lens companion whose pupil follows the pointer
      if (pipRef.current) pipRef.current.style.setProperty("--px", `${sx * 3.2}px`), pipRef.current.style.setProperty("--py", `${sy * 3.2}px`);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      S.dispose();
    };
  }, []);

  return (
    <div className={`pr pr-${phase}`}>
      <header className="pr-nav">
        <a className="pr-word" href="#" aria-label="WasteLens home"><span className="pr-dot" />WasteLens</a>
        <nav aria-label="Primary">
          <a className="on" href="#">Scan</a><a href="#">Find</a><a href="#">Audit</a><a href="#">About</a>
        </nav>
        <span className="pr-mono">EN</span>
      </header>

      <section className="pr-type" aria-hidden={phase === "camera"}>
        <h1>
          <span className="l1">Before you</span>
          <span className="l2">toss it<i>.</i></span>
        </h1>
      </section>

      <canvas ref={canvasRef} className="pr-canvas" aria-label="Interactive 3D water bottle. Drag to rotate." role="img" />

      <div className="pr-notes" aria-hidden="true">
        {NOTES.map(n => (
          <div key={n.id} className={`pr-note pr-note-${n.id}`} ref={el => { noteRefs.current[n.id] = el; }}>
            <span className="pr-pin" />
            <div className="pr-card"><em>{n.n}</em><b>{n.title}</b><span>{n.body}</span></div>
          </div>
        ))}
      </div>

      <footer className="pr-foot">
        <p className="pr-lede">Point at any item.<br />Know exactly where it goes.</p>
        <div className="pr-actions">
          <button className="pr-cta" type="button" onClick={begin} disabled={phase !== "idle"}>
            <span className="pr-ring" aria-hidden="true" />
            {phase === "scanning" ? "Reading item…" : "Scan an item"}
          </button>
          <button className="pr-ghost" type="button">Choose a photo</button>
        </div>
        <div className="pr-index pr-mono"><span>01</span> / Scan<br /><small>Drag the bottle to turn it</small></div>
      </footer>

      <div className="pr-pip" ref={pipRef} title="Pip" aria-hidden="true"><span /></div>

      <section className="pr-cam" aria-hidden={phase !== "camera"}>
        <div className="pr-view">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
          {cameraNote && <p className="pr-cam-note">{cameraNote}</p>}
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <span className="pr-reticle" />
          <span className={"pr-flash" + (flash ? " on" : "")} />
        </div>
        <div className="pr-cam-bar">
          <button className="pr-ghost" type="button" onClick={back}>Close</button>
          <button className="pr-shutter" type="button" onClick={capture} aria-label="Take picture"><span /></button>
          <span className="pr-mono">Frame one item</span>
        </div>
      </section>
    </div>
  );
}
