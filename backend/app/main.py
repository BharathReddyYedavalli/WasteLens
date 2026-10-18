"""WasteLens local API. No model is loaded until first classification request."""
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from .inference import DEFAULT_MODEL_ID, InvalidImage, ModelUnavailable, runner
from .guidance import CATEGORIES, guidance_for

app = FastAPI(title="WasteLens AI API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

@app.get("/api/health")
def health():
    return {"ok": True, "service": "WasteLens local inference API"}

@app.get("/api/models")
def models():
    return {"default_model_id": DEFAULT_MODEL_ID, "models": [vars(m) for m in runner.options()],
            "notice": "Only checkpoint 2 has a reported notebook evaluation; no comparative benchmarking completed."}

@app.post("/api/classify")
async def classify(image: UploadFile = File(...), model_id: str = Form(DEFAULT_MODEL_ID)):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Please upload a JPEG, PNG, or WebP image")
    content = await image.read(8 * 1024 * 1024 + 1)
    try:
        candidates = runner.predict(content, model_id)
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
        "material": label,
        "category": CATEGORIES[label],
        "review_required": uncertain,
        "top_predictions": candidates,
        "guidance": guidance_for(label),
        "notice": "Model scores are uncalibrated. Item identity and local disposal acceptance require human confirmation.",
    }
