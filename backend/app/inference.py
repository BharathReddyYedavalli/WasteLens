"""Loads trusted Garbage-Crew model weights to classify an uploaded photograph.

Checkpoint files are sourced only from the user's original Garbage-Crew repository.
Full-precision checkpoints require torch.load(weights_only=False), so **never** load
untrusted user-uploaded pickle weights. Uploads here are images, not models.
"""
from dataclasses import asdict, dataclass
from io import BytesIO
from pathlib import Path
from threading import Lock
import os

from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = Path(os.environ.get("WASTELENS_MODEL_DIR", str(ROOT / "models"))).expanduser()

LABELS = ["battery", "glass", "metal", "organic_waste", "paper_cardboard", "plastic", "textiles", "trash"]
MODEL_OPTIONS = (
    ("mobilenetv3-v2", "MobileNetV3 · evaluated checkpoint 2", "mobilenetv3_garbage_classifier_2.pt", "full"),
    ("mobilenetv3-v1", "MobileNetV3 · checkpoint 1", "mobilenetv3_garbage_classifier.pt", "full"),
    ("mobilenetv3-v3", "MobileNetV3 · checkpoint 3", "mobilenetv3_garbage_classifier_3.pt", "full"),
    ("mobilenetv3-quant", "MobileNetV3 · quantized TorchScript", "mobilenetv3_quantized_scripted.pt", "scripted"),
)
DEFAULT_MODEL_ID = "mobilenetv3-v2"

@dataclass
class ModelInfo:
    id: str
    name: str
    available: bool
    note: str

class ModelUnavailable(Exception):
    pass

class InvalidImage(Exception):
    pass

class ModelRunner:
    def __init__(self, model_dir: Path = MODEL_DIR):
        self.model_dir = model_dir
        self._loaded: dict[str, object] = {}
        self._lock = Lock()

    def options(self) -> list[ModelInfo]:
        return [ModelInfo(
            id=key, name=display, available=(self.model_dir / filename).is_file(),
            note=("Notebook-reported 98.6% on internal evaluation; not verified against other checkpoints or real-world phone photos."
                  if key == DEFAULT_MODEL_ID else
                  "Alternative checkpoint; comparative performance not yet benchmarked.")
        ) for key, display, filename, _ in MODEL_OPTIONS]

    def _load(self, model_id: str):
        spec = next((s for s in MODEL_OPTIONS if s[0] == model_id), None)
        if not spec:
            raise ModelUnavailable("Unknown model selection")
        _, _, filename, kind = spec
        path = self.model_dir / filename
        if not path.is_file():
            raise ModelUnavailable("Model file not installed. Run: python scripts/download_models.py")
        import torch  # heavy dependency stays optional until first prediction
        with self._lock:
            if model_id in self._loaded:
                return self._loaded[model_id]
            try:
                if kind == "scripted":
                    model = torch.jit.load(str(path), map_location="cpu")
                else:
                    # Trusted first-party checkpoint only: torch.load with weights_only=False is unsafe for untrusted files.
                    model = torch.load(str(path), map_location="cpu", weights_only=False)
                model.eval()
                self._loaded[model_id] = model
            except Exception as exc:
                raise ModelUnavailable(f"Could not load checkpoint {model_id}: {exc}") from exc
        return self._loaded[model_id]

    def predict(self, image_bytes: bytes, model_id: str) -> list[dict[str, object]]:
        if not image_bytes or len(image_bytes) > 8 * 1024 * 1024:
            raise InvalidImage("Upload an image no larger than 8 MB")
        try:
            img = Image.open(BytesIO(image_bytes))
            img.load()
            if img.width < 24 or img.height < 24 or img.width * img.height > 25_000_000:
                raise InvalidImage("Image size is unsupported. Use a clear photo under 25 megapixels.")
            img = ImageOps.exif_transpose(img).convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
            raise InvalidImage("Upload a valid JPG, PNG, or WebP photo") from exc
        model = self._load(model_id)
        import numpy as np
        import torch
        matrix = np.asarray(img, dtype=np.float32) / 255.0
        tensor = torch.from_numpy(matrix).permute(2, 0, 1)
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        tensor = ((tensor - mean) / std).unsqueeze(0)
        try:
            with torch.inference_mode():
                logits = model(tensor)
                if isinstance(logits, (tuple, list)):
                    logits = logits[0]
                if getattr(logits, "shape", None) != (1, len(LABELS)):
                    raise ModelUnavailable(f"Model output must have 8 classes, got {getattr(logits, 'shape', '?')}")
                probs = torch.softmax(logits[0], dim=0).tolist()
        except ModelUnavailable:
            raise
        except Exception as exc:
            raise ModelUnavailable(f"Inference failed for {model_id}: {exc}") from exc
        ranked = sorted(zip(LABELS, probs), key=lambda row: row[1], reverse=True)
        return [{"label": label, "score": round(float(score), 5)} for label, score in ranked[:3]]

runner = ModelRunner()
