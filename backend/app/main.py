"""WasteLens local API. No model is loaded until first classification request."""
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from .inference import DEFAULT_MODEL_ID, InvalidImage, ModelUnavailable, decode_image, parse_crop_box, runner
from .object_focus import DetectorUnavailable, detector_info, detect_objects
from .guidance import CATEGORIES, guidance_for

app = FastAPI(title="WasteLens AI API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

@app.get("/api/health")
def health():
    return {"ok": True, "service": "WasteLens local inference API"}

@app.get("/api/models")
def models():
    return {"default_model_id": DEFAULT_MODEL_ID, "models": [vars(m) for m in runner.options()],
            "notice": "Only checkpoint 2 has a reported notebook evaluation; no comparative benchmarking completed."}

@app.get("/api/detectors")
def detectors():
    return {"detectors": [detector_info()],
            "notice": "Generic COCO object detector. May miss specific waste or return unrelated household objects."}


@app.post("/api/detect")
async def detect(image: UploadFile = File(...)):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Please upload a JPEG, PNG, or WebP image")
    content = await image.read(8 * 1024 * 1024 + 1)
    try:
        img = decode_image(content)
        found = detect_objects(img)
        return {"width": img.width, "height": img.height, "detections": found,
                "notice": "YOLO detects common objects, not all waste types. Select the intended item or draw a crop manually."}
    except InvalidImage as exc:
        raise HTTPException(400, str(exc)) from exc
    except DetectorUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc


@app.post("/api/classify")
async def classify(image: UploadFile = File(...), model_id: str = Form(DEFAULT_MODEL_ID), crop_box: str | None = Form(None)):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Please upload a JPEG, PNG, or WebP image")
    content = await image.read(8 * 1024 * 1024 + 1)
    try:
        selected_crop = parse_crop_box(crop_box)
        candidates = runner.predict(content, model_id, selected_crop)
    except InvalidImage as exc:
        raise HTTPException(400, str(exc)) from exc
    except ModelUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    top = candidates[0]
    label = str(top["label"])
    # 0.70 is a conservative demo heuristic, NOT a calibrated threshold.
    uncertain = float(top["score"]) < 0.70
    return {
        "model_id": model_id,
        "image_region": "selected_object" if selected_crop is not None else "whole_photo",
        "material": label,
        "category": CATEGORIES[label],
        "review_required": uncertain,
        "top_predictions": candidates,
        "guidance": guidance_for(label),
        "notice": "Model scores are uncalibrated. Item identity and local disposal acceptance require human confirmation.",
    }
