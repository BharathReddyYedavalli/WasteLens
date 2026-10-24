import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Phase = "idle" | "scanning" | "camera";

export interface Anchor { id: string; point: THREE.Vector3 }

const GREEN = new THREE.Color("#1f9d63");

/** PET bottle profile, (radius, y) from base to neck finish. Units ~ metres x 10. */
function profile() {
  const p: THREE.Vector2[] = [];
  const add = (r: number, y: number) => p.push(new THREE.Vector2(r, y));
  add(0.0, 0.02); add(0.2, 0.02); add(0.34, 0.03); add(0.42, 0.07); add(0.455, 0.14);
  add(0.465, 0.22);
  for (let i = 0; i <= 14; i++) { const t = i / 14; add(0.465, 0.22 + t * 1.12); }   // body
  for (let i = 1; i <= 16; i++) {                                                 // shoulder
    const t = i / 16, e = t * t * (3 - 2 * t);
    add(0.465 - (0.465 - 0.185) * e, 1.34 + t * 0.5);
  }
  add(0.18, 1.88); add(0.178, 1.96); add(0.205, 1.975); add(0.205, 1.995); add(0.178, 2.01); add(0.178, 2.1);
  return p;
}

export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 1.05, 6.6);
  camera.lookAt(0, 1.05, 0);

  // key + rim lights give the plastic its edge highlights
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfeee6, 2.8); rim.position.set(-4, 2, -3); scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);
  const inner = new THREE.Group(); inner.scale.set(0.74, 1, 0.74); group.add(inner);

  // ---- body: thin transparent PET, two passes (back faces then front faces)
  const body = new THREE.LatheGeometry(profile(), 160);
  body.computeVertexNormals();
  const petBase = {
    color: new THREE.Color("#bcd6e0"), roughness: 0.04, metalness: 0, ior: 1.5, transparent: true,
    opacity: 0.11, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.25, depthWrite: false,
    specularIntensity: 1,
  } as const;
  const back = new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({ ...petBase, side: THREE.BackSide, opacity: 0.09 }));
  const front = new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({ ...petBase, side: THREE.FrontSide }));
  back.renderOrder = 1; front.renderOrder = 3;

  // horizontal ribs on the body for believable PET structure
  const ribs = new THREE.Group();
  const ribMat = new THREE.MeshPhysicalMaterial({ color: "#e8f1f4", roughness: 0.05, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 1.3, depthWrite: false });
  for (const y of [0.34, 0.4, 1.17, 1.23]) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.469, 0.007, 10, 160), ribMat);
    m.rotation.x = Math.PI / 2; m.position.y = y; ribs.add(m);
  }
  ribs.renderOrder = 4;

  // ---- label: matte paper wrap, printed with a canvas texture
  const tex = labelTexture();
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.474, 0.474, 0.62, 160, 1, true),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.8 })
  );
  label.position.y = 0.76; label.renderOrder = 2;

  // ---- cap: ribbed polypropylene
  const capGeo = new THREE.CylinderGeometry(0.21, 0.215, 0.14, 128, 1);
  const pos = capGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    if (r > 0.1) { const a = Math.atan2(z, x), k = 1 + 0.028 * Math.max(0, Math.cos(a * 40)) ** 0.6; pos.setX(i, x * k); pos.setZ(i, z * k); }
  }
  capGeo.computeVertexNormals();
  const cap = new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({ color: "#12312a", roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 1.1 }));
  cap.position.y = 2.15; cap.renderOrder = 5;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 96, 1, true), new THREE.MeshPhysicalMaterial({ color: "#12312a", roughness: 0.4 }));
  ring.position.y = 2.06;

  // ---- scan overlay: wireframe of the same silhouette, revealed by a sweeping clip plane
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const wireMat = new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true, transparent: true, opacity: 0.55, clippingPlanes: [clip], depthWrite: false });
  const wire = new THREE.Mesh(new THREE.LatheGeometry(profile(), 48), wireMat);
  wire.scale.setScalar(1.012); wire.renderOrder = 6; wire.visible = false;
  const wireCap = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.22, 0.145, 40, 4), wireMat);
  wireCap.position.y = 2.15; wireCap.renderOrder = 6; wireCap.visible = false;

  const sweep = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.006, 8, 160),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, depthTest: false })
  );
  sweep.rotation.x = Math.PI / 2; sweep.renderOrder = 8;
  const sweepGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.18, 96, 1, true),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  sweepGlow.renderOrder = 7;

  inner.add(back, ribs, label, front, cap, ring, wire, wireCap, sweep, sweepGlow);
  group.position.y = -0.05;

  // contact shadow
  const shadowTex = radial();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.38, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.04; scene.add(shadow);

  const anchors: Anchor[] = [
    { id: "cap", point: new THREE.Vector3(0.21*0.74, 2.15, 0) },
    { id: "label", point: new THREE.Vector3(0.47*0.74, 0.76, 0) },
    { id: "body", point: new THREE.Vector3(0.465*0.74, 0.34, 0) },
  ];

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole bottle in frame on narrow / portrait screens
    camera.position.z = Math.max(6.6, 6.6 * (0.9 / camera.aspect));
    camera.updateProjectionMatrix();
  }

  function dispose() {
    renderer.dispose(); pmrem.dispose(); env.dispose();
  }

  return { renderer, scene, camera, group, anchors, resize, dispose, shadow, wire, wireCap, sweep, sweepGlow, clip, front, back, label, cap, ring, ribs };
}

function labelTexture() {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 440;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f3f1ea"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#0e1512";
  g.font = "700 150px 'Inter Tight', 'Helvetica Neue', Arial, sans-serif";
  g.textBaseline = "alphabetic";
  g.fillText("AQUA", 560, 232);
  g.font = "500 34px 'JetBrains Mono', ui-monospace, monospace";
  g.fillStyle = "#5b6660";
  g.fillText("STILL SPRING WATER  ·  500 ML", 564, 296);
  g.fillStyle = "#1f9d63"; g.fillRect(564, 330, 190, 6);
  // recycling mark, drawn small
  g.strokeStyle = "#0e1512"; g.lineWidth = 7;
  const cx = 1330, cy = 215, r = 62;
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    g.beginPath(); g.arc(cx, cy, r, a + 0.15, a + 1.75); g.stroke();
    const ax = cx + Math.cos(a + 1.75) * r, ay = cy + Math.sin(a + 1.75) * r;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 18, ay - 14); g.moveTo(ax, ay); g.lineTo(ax + 22, ay + 12); g.stroke();
  }
  g.fillStyle = "#0e1512"; g.font = "600 40px 'JetBrains Mono', monospace"; g.textAlign = "center";
  g.fillText("1", cx, cy + 14);
  g.textAlign = "left";
  g.font = "500 28px 'JetBrains Mono', monospace"; g.fillStyle = "#5b6660";
  g.fillText("PET", cx - 28, cy + 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function radial() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  gr.addColorStop(0, "rgba(20,28,24,0.85)"); gr.addColorStop(0.35, "rgba(20,28,24,0.3)"); gr.addColorStop(1, "rgba(20,28,24,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
