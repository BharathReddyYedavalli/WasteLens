"""Optional YOLO11 object localization before MobileNetV3 classification.

Only trusted checkpoint from the owner's public Garbage-Crew repository is used.
Ultralytics is AGPL-3.0: treat this integration as experimental and resolve
application licensing before a public or commercial deployment.
"""
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
import os

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DETECTOR_PATH = Path(os.environ.get("WASTELENS_DETECTOR_PATH", str(ROOT / "models" / "yolo11n.pt"))).expanduser()
_loading_lock = Lock()
_detector = None


class DetectorUnavailable(Exception):
    pass


def detector_info() -> dict[str, object]:
    return {
        "id": "yolo11n",
        "name": "YOLO11n · common objects",
        "available": DETECTOR_PATH.is_file(),
        "note": "Experimental COCO object localization, not a waste-specific segmentation model.",
    }


def _load_detector():
    global _detector
    if _detector is not None:
        return _detector
    with _loading_lock:
        if _detector is not None:
            return _detector
        if not DETECTOR_PATH.is_file():
            raise DetectorUnavailable("YOLO checkpoint is missing. Run: python scripts/download_models.py --detector")
        try:
            from ultralytics import YOLO  # optional, heavy dependency
            _detector = YOLO(str(DETECTOR_PATH), task="detect")
        except Exception as exc:
            raise DetectorUnavailable(
                "Could not load YOLO. Install the optional dependencies using "
                "pip install -r backend/requirements-detection.txt. Details: " + str(exc)
            ) from exc
    return _detector


def normalize_box(box: tuple[float, float, float, float], width: int, height: int) -> list[float] | None:
    """Coordinates are fractions of the correctly oriented image."""
    if width <= 0 or height <= 0:
        return None
    x1, y1, x2, y2 = box
    values = [max(0., min(1., x1 / width)), max(0., min(1., y1 / height)),
              max(0., min(1., x2 / width)), max(0., min(1., y2 / height))]
    if values[2] - values[0] < .03 or values[3] - values[1] < .03:
        return None
    return [round(value, 6) for value in values]


def detect_objects(image: Image.Image) -> list[dict[str, object]]:
    model = _load_detector()
    try:
        # PIL input preserves RGB orientation; no global registry or model downloading.
        output = model.predict(source=image, device="cpu", imgsz=640,
                               conf=.25, max_det=20, verbose=False)
        if not output:
            return []
        result = output[0]
        if result.boxes is None:
            return []
        candidates: list[dict[str, object]] = []
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            object_name = str(result.names[cls_id])
            # A person often fills most of the photo; it is never the waste item.
            if object_name == "person":
                continue
            coords = tuple(float(n) for n in box.xyxy[0].tolist())
            normalized = normalize_box(coords, image.width, image.height)
            if normalized is None:
                continue
            score = float(box.conf[0].item())
            cx = (normalized[0] + normalized[2]) / 2
            cy = (normalized[1] + normalized[3]) / 2
            center_distance = ((cx - .5) ** 2 + (cy - .5) ** 2) ** .5
            candidates.append({
                "id": f"candidate-{len(candidates) + 1}",
                "label": object_name,
                "confidence": round(score, 4),
                "box": normalized,
                "_rank": score - .2 * center_distance,
            })
        candidates.sort(key=lambda item: float(item["_rank"]), reverse=True)
        return [{k: v for k, v in obj.items() if k != "_rank"} for obj in candidates[:8]]
    except Exception as exc:
        raise DetectorUnavailable(f"Object detection failed: {exc}") from exc
