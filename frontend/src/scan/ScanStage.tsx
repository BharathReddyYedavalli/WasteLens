import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { createScene } from "../proto/bottle";
import { useLanguage } from "../i18n";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const SWEEP_SECONDS = 1.7;

const NOTES = [
  { id: "cap", n: "01", title: "Cap", body: "Polypropylene" },
  { id: "label", n: "02", title: "Label", body: "Paper" },
  { id: "body", n: "03", title: "Body", body: "PET plastic" },
];

type Props = {
  /** True from the tap on Scan until the camera is open (or has failed). */
  scanning: boolean;
  /** Camera permission still pending: hold the sweep at its end instead of finishing. */
  waiting: boolean;
  onScan: () => void;
  onChoosePhoto: () => void;
  onSweepDone: () => void;
};

/**
 * The approved 3D homepage. The bottle is a visual demonstration only: it never
 * produces an identification. Real scanning happens in the camera and result views.
 */
export default function ScanStage({ scanning, waiting, onScan, onChoosePhoto, onSweepDone }: Props) {
  const { t } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pipRef = useRef<HTMLDivElement>(null);
  const live = useRef({ scanning, waiting, onSweepDone });
  live.current = { scanning, waiting, onSweepDone };

  // Editorial intro: type, notes and actions rise in, then stay out of the way.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".es-line", { yPercent: 18, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.12 });
      gsap.from(".es-rise", { y: 18, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.5 });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const S = createScene(canvas);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const idleVel = reduce ? 0 : 0.32;
    let yaw = -0.9, vel = idleVel, tilt = 0, px = 0, py = 0, sx = 0, sy = 0;
    let dragging = false, lastX = 0, scanStart = 0, wasScanning = false, doneFired = false;
    const v = new THREE.Vector3(), q = new THREE.Vector3();
    const t0 = performance.now();

    const onMove = (e: PointerEvent) => {
      px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1;
      if (dragging) { const d = e.clientX - lastX; lastX = e.clientX; yaw += d * 0.008; vel = d * 0.06; }
    };
    const onDown = (e: PointerEvent) => {
      if (live.current.scanning) return;
      dragging = true; lastX = e.clientX; canvas.setPointerCapture?.(e.pointerId);
    };
    const onUp = () => { dragging = false; };
    window.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    const ro = new ResizeObserver(S.resize); ro.observe(canvas); S.resize();

    let raf = 0, last = t0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const { scanning: scan, waiting: hold } = live.current;
      if (scan && !wasScanning) { scanStart = now; doneFired = false; }
      wasScanning = scan;
      const intro = ease(clamp01((now - t0) / 1600));

      sx += (px - sx) * 0.06; sy += (py - sy) * 0.06;
      if (!dragging) { vel += (idleVel - vel) * 0.02; yaw += vel * dt; }
      if (scan) yaw += (Math.round(yaw / (Math.PI * 2)) * Math.PI * 2 + 0.35 - yaw) * 0.04;
      tilt += (sy * 0.09 - tilt) * 0.08;
      S.group.rotation.set(tilt + 0.04, yaw + sx * 0.18, -sx * 0.025);

      let sweepY = -1, sweepOpacity = 0;
      if (scan) {
        const k = clamp01((now - scanStart) / 1000 / SWEEP_SECONDS);
        sweepY = ease(k) * 2.2; sweepOpacity = Math.sin(k * Math.PI);
        if (k >= 1 && !hold && !doneFired) { doneFired = true; live.current.onSweepDone(); }
      }
      S.clip.constant = sweepY; S.wire.visible = S.wireCap.visible = scan;
      S.sweep.position.y = sweepY; S.sweepGlow.position.y = sweepY - 0.09;
      (S.sweep.material as THREE.MeshBasicMaterial).opacity = sweepOpacity;
      (S.sweepGlow.material as THREE.MeshBasicMaterial).opacity = sweepOpacity * 0.28;

      S.group.position.y = -0.05 + (1 - intro) * -0.6 + Math.sin(now / 1400) * 0.025;
      S.group.scale.setScalar(0.9 + intro * 0.1);
      canvas.style.opacity = String(intro);
      (S.shadow.material as THREE.MeshBasicMaterial).opacity = 0.38 * intro;
      S.renderer.render(S.scene, S.camera);

      for (const a of S.anchors) {
        const el = noteRefs.current[a.id]; if (!el) continue;
        v.copy(a.point).applyMatrix4(S.group.matrixWorld).project(S.camera);
        const facing = q.copy(a.point).applyQuaternion(S.group.quaternion).z > -0.05;
        el.style.transform = `translate(${(v.x * 0.5 + 0.5) * canvas.clientWidth}px, ${(-v.y * 0.5 + 0.5) * canvas.clientHeight}px)`;
        el.style.opacity = !scan && intro > 0.9 && facing ? "1" : "0";
      }
      pipRef.current?.style.setProperty("--px", `${sx * 3.2}px`);
      pipRef.current?.style.setProperty("--py", `${sy * 3.2}px`);
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
    <section ref={root} className={"es" + (scanning ? " is-scanning" : "")} aria-label={t("Scan")}>
      <div className="es-type" aria-hidden="true">
        <span className="es-line l1">{t("Before you")}</span>
        <span className="es-line l2">{t("toss it.").replace(/[.。।]$/, "")}<i>.</i></span>
      </div>
      <canvas ref={canvasRef} className="es-canvas" role="img" aria-label={t("Interactive 3D water bottle. Drag to rotate.")} />
      <div className="es-notes" aria-hidden="true">
        {NOTES.map(n => (
          <div key={n.id} className={`es-note es-note-${n.id}`} ref={el => { noteRefs.current[n.id] = el; }}>
            <span className="es-pin" />
            <div className="es-card"><em>{n.n}</em><b>{t(n.title)}</b><span>{t(n.body)}</span></div>
          </div>
        ))}
      </div>
      <div className="es-foot">
        <p className="es-lede es-rise">{t("Point at any item.")}<br />{t("Know exactly where it goes.")}</p>
        <div className="es-actions es-rise">
          <button className="es-cta" type="button" onClick={onScan} disabled={scanning}>
            <span className="es-ring" aria-hidden="true" />
            {scanning ? t("Opening camera…") : t("Scan an item")}
          </button>
          <button className="es-ghost" type="button" onClick={onChoosePhoto} disabled={scanning}>{t("Choose a photo")}</button>
        </div>
        <p className="es-index es-rise"><span>01</span> / {t("Scan")}<small>{t("Demo bottle · drag to turn")}</small></p>
      </div>
      <div className="es-pip" ref={pipRef} aria-hidden="true"><span /></div>
    </section>
  );
}
