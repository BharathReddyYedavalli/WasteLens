import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Crop, ScanSearch, X } from "lucide-react";
import type { CropRegion, Detection, DetectionResponse, BoundingBox } from "./types";

type Props = {
  src: string;
  file: File;
  crop: CropRegion | null;
  onChange: (crop: CropRegion | null) => void;
  disabled: boolean;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function orderedBox(a: [number, number], b: [number, number]): BoundingBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

export default function ObjectFocus({ src, file, crop, onChange, disabled }: Props) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [detections, setDetections] = useState<Detection[]>([]);
  const [busy, setBusy] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<BoundingBox | null>(null);
  const [notice, setNotice] = useState("");
  const anchor = useRef<[number, number] | null>(null);

  async function findObjects() {
    setBusy(true); setNotice(""); setDetections([]); onChange(null);
    try {
      const data = new FormData();
      data.append("image", file);
      const response = await fetch("/api/detect", { method: "POST", body: data });
      const result = await response.json() as DetectionResponse & { detail?: string };
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Detection failed");
      setDetections(result.detections);
      if (!result.detections.length) setNotice("YOLO didn't locate a known object. Try manually selecting the item, or classify the full photograph.");
      else setNotice("Choose the intended object below or click its box. Nothing is selected automatically.");
    } catch (error) {
      setNotice((error instanceof Error ? error.message : "YOLO is unavailable") + " You can still draw a crop manually.");
    } finally { setBusy(false); }
  }

  function position(event: ReactPointerEvent<SVGSVGElement>): [number, number] | null {
    const svg = event.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm || dimensions.width <= 0 || dimensions.height <= 0) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const original = point.matrixTransform(ctm.inverse());
    return [clamp(original.x / dimensions.width), clamp(original.y / dimensions.height)];
  }

  function startDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing || disabled || busy) return;
    const xy = position(event);
    if (!xy) return;
    anchor.current = xy;
    setDraft([xy[0], xy[1], xy[0], xy[1]]);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing || !anchor.current) return;
    const xy = position(event);
    if (xy) setDraft(orderedBox(anchor.current, xy));
  }

  function finishDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (!anchor.current || !drawing) return;
    const xy = position(event);
    const box = xy ? orderedBox(anchor.current, xy) : null;
    anchor.current = null;
    setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (box && box[2] - box[0] >= .03 && box[3] - box[1] >= .03) {
      onChange({ source: "manual", label: "Manually selected area", box });
      setDrawing(false);
      setNotice("Manual crop selected. MobileNet will analyze only this region.");
    } else setNotice("Select a larger area by dragging across the object.");
  }

  const w = dimensions.width || 1, h = dimensions.height || 1;
  const selectedBox = draft ?? crop?.box;
  const stroke = Math.max(3, Math.min(w, h) * .005);

  return <>
    <div className="camera-stage object-focus-stage">
      <img src={src} alt="Waste photo ready for optional object cropping" onLoad={event => {
        setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
      }}/>
      {dimensions.width > 0 && <svg
        aria-label={drawing ? "Drag to select a crop region on the photo" : "YOLO detected objects"}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className={drawing ? "focus-overlay drawing" : "focus-overlay"}
        onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={finishDraw}
        onPointerCancel={() => { anchor.current = null; setDraft(null); }}>
        {detections.map((item, idx) => {
          const [x1,y1,x2,y2] = item.box;
          const selected = crop?.source === "yolo" && crop.id === item.id;
          return <g key={item.id} role="button" aria-label={`Select ${item.label}`} tabIndex={0}
            onClick={() => { if (drawing || disabled) return; onChange({ source:"yolo", id:item.id, label:item.label, box:item.box }); setNotice(`Selected ${item.label}; classification will use this region.`); }}
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onChange({ source:"yolo", id:item.id, label:item.label, box:item.box }); } }}>
            <rect x={x1*w} y={y1*h} width={(x2-x1)*w} height={(y2-y1)*h}
              className={selected ? "focus-box active" : "focus-box"} strokeWidth={stroke} />
            <text x={x1*w+stroke} y={Math.max(20, y1*h+stroke*3)} className="focus-box-number">{idx+1}</text>
          </g>;
        })}
        {selectedBox && <rect x={selectedBox[0]*w} y={selectedBox[1]*h}
          width={(selectedBox[2]-selectedBox[0])*w} height={(selectedBox[3]-selectedBox[1])*h}
          strokeWidth={stroke*1.2} className="focus-selected" pointerEvents="none"/>}
      </svg>}
    </div>
    <div className="focus-panel">
      <div className="focus-buttons">
        <button type="button" className="button outline" disabled={disabled || busy} onClick={() => void findObjects()}>
          <ScanSearch size={16}/> {busy ? "Locating objects…" : "Find objects (YOLO)"}
        </button>
        <button type="button" className={drawing ? "button primary" : "button outline"}
          disabled={disabled || busy} onClick={() => { setDrawing(x => !x); setNotice("Drag a rectangle over the item to remove surrounding background."); }}>
          <Crop size={16}/> {drawing ? "Drawing crop…" : "Select area manually"}
        </button>
        {crop && <button type="button" className="button outline" disabled={disabled || busy} onClick={() => { onChange(null); setDrawing(false); setNotice("Using the full photo."); }}><X size={16}/> Clear crop</button>}
      </div>
      {detections.length > 0 && <div className="focus-candidates" aria-label="Detected object choices">
        {detections.map((item,index) => <button key={item.id} type="button"
          disabled={disabled} className={crop?.id === item.id ? "focus-chip active" : "focus-chip"}
          onClick={() => {onChange({source:"yolo",id:item.id,label:item.label,box:item.box});setDrawing(false);setNotice(`Selected ${item.label}. Only the crop will be classified.`);}}>
          {index+1}. {item.label} · {Math.round(item.confidence * 100)}%
        </button>)}
      </div>}
      <p className="focus-note">{notice || (crop ? `Selected: ${crop.label}. Only the outlined area will be classified.` :
       "Optional: let YOLO locate objects, or manually crop the item. Without a selection, MobileNet analyzes the whole photo.")}</p>
      <small>YOLO's generic object names and scores are not waste-material classifications. It may miss wrappers, scraps or unusual packaging.</small>
    </div>
  </>;
}
