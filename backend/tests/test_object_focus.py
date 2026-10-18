import io
import json

import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.inference import InvalidImage, apply_crop, decode_image, parse_crop_box
from app.object_focus import normalize_box
from app.main import app


client = TestClient(app)


def test_crop_validation():
    assert parse_crop_box("[0.1,0.2,0.9,0.8]") == (.1,.2,.9,.8)
    for invalid in ['invalid', 'null', '["0",0,1,1]', '[0.5,0.5,0.4,0.9]',
                    '[0,0,1,2]', '[0,0,0.01,0.99]', '[true,0,1,1]',
                    '[0,0,NaN,1]', '{"box":[0,0,1,1]}']:
        with pytest.raises(InvalidImage):
            parse_crop_box(invalid)


def test_image_crop_size():
    image = Image.new("RGB", (200, 100))
    result = apply_crop(image, (.2, .2, .8, .9))
    assert result.size == (120, 70)
    with pytest.raises(InvalidImage):
        apply_crop(image, (0,0,.05,.05))


def test_clipping_detection():
    assert normalize_box((-10,10,120,140), 100, 100) == [0., .1, 1., 1.]
    assert normalize_box((2,2,3,3), 100,100) is None


def test_detect_api_uses_actual_uploaded_pixels(monkeypatch):
    import app.main as api
    monkeypatch.setattr(api, "detect_objects", lambda image: [{
        "id": "candidate-1", "label": "bottle", "confidence": .92,
        "box": [.1, .1, .8, .8]
    }] if image.size == (200, 100) else [])
    image = Image.new("RGB", (200, 100), "white")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    resp = client.post("/api/detect", files={"image": ("photo.png", buf.getvalue(), "image/png")})
    assert resp.status_code == 200
    assert resp.json()["width"] == 200
    assert resp.json()["detections"][0]["label"] == "bottle"


def test_selected_crop_reaches_classifier(monkeypatch):
    import app.main as api
    received = {}
    def predict(payload, name, box):
        received["box"] = box
        return [{"label": "plastic", "score": .9}]
    monkeypatch.setattr(api.runner, "predict", predict)
    image = Image.new("RGB", (200, 100), "white")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    resp = client.post("/api/classify", data={"model_id": "mobilenetv3-v2",
                            "crop_box": json.dumps([.1,.2,.8,.9])},
                       files={"image": ("photo.png", buf.getvalue(), "image/png")})
    assert resp.status_code == 200
    assert received["box"] == (.1,.2,.8,.9)
    assert resp.json()["image_region"] == "selected_object"


def test_bad_crop_rejected_without_running_model():
    resp = client.post("/api/classify",
                       data={"crop_box": json.dumps([.9,.9,.1,.1])},
                       files={"image": ("photo.png", b"any", "image/png")})
    assert resp.status_code == 400


def test_missing_detector_returns_helpful_error(monkeypatch):
    import app.main as api
    from app.object_focus import DetectorUnavailable
    def unavailable(image):
        raise DetectorUnavailable("Download detector weights")
    monkeypatch.setattr(api, "detect_objects", unavailable)
    image = Image.new("RGB", (100, 100), "white")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    resp = client.post("/api/detect", files={"image": ("photo.png", buf.getvalue(), "image/png")})
    assert resp.status_code == 503
    assert "Download detector" in resp.json()["detail"]
