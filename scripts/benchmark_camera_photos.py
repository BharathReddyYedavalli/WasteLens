"""Benchmark all saved MobileNetV3 models against *new real-world labeled photos*.

Example:
  python scripts/benchmark_camera_photos.py --photos benchmark_photos --output benchmark_results/results.csv

Organize images:
  benchmark_photos/plastic/first.jpg
  benchmark_photos/metal/second.jpg

Optional per-image crop sidecar for an independently determined bounding box:
  benchmark_photos/plastic/first.jpg.crop.json
  {"box": [0.05, 0.1, 0.95, 0.9]}

One model prediction is made per photo/checkpoint. This reports test-set metrics;
it does NOT retrain the model. Keep test images private and avoid using them for training.
"""
import argparse
import csv
import json
from pathlib import Path
import sys
import time
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.inference import LABELS, MODEL_OPTIONS, ModelRunner, parse_crop_box  # noqa: E402

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def collect_photos(folder: Path):
    for label in LABELS:
        path = folder / label
        if not path.is_dir():
            continue
        for candidate in sorted(path.iterdir()):
            if candidate.is_file() and candidate.suffix.lower() in EXTENSIONS:
                yield label, candidate


def read_box(path: Path):
    sidecar = path.with_name(path.name + ".crop.json")
    if not sidecar.exists():
        return None
    data = json.loads(sidecar.read_text(encoding="utf-8"))
    return parse_crop_box(json.dumps(data["box"]))


def evaluate(photos: Path, output: Path, runner=None):
    photos = photos.resolve()
    if not photos.is_dir():
        raise ValueError(f"Photo folder not found: {photos}")
    examples = list(collect_photos(photos))
    if not examples:
        raise ValueError("No labeled photos found. Create one folder for each material class with JPG/PNG/WebP files.")
    runner = runner or ModelRunner()
    models = [key for key, _, _, _ in MODEL_OPTIONS if any(item.id == key and item.available for item in runner.options())]
    if not models:
        raise ValueError("No installed MobileNetV3 weights found. Download models first.")
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for correct, path in examples:
        payload = path.read_bytes()
        box = read_box(path)
        for model_id in models:
            started = time.perf_counter()
            predicted = runner.predict(payload, model_id, box)[0]
            rows.append({
                "photo": str(path.relative_to(photos)), "true_label": correct,
                "model_id": model_id, "region": "selected_crop" if box else "whole_photo",
                "prediction": str(predicted["label"]),
                "raw_score": float(predicted["score"]),
                "correct": int(predicted["label"] == correct),
                "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            })
    with output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    grouped = defaultdict(list)
    for row in rows:
        grouped[row["model_id"]].append(row)
    summary = [{"model_id": k, "accuracy": round(sum(x["correct"] for x in v)/len(v),4),
                "images":len(v),
                "avg_latency_ms":round(sum(x["latency_ms"] for x in v)/len(v),2)}
               for k,v in sorted(grouped.items())]
    print(json.dumps({"test_images": len(examples), "summary": summary, "results_csv": str(output)}, indent=2))
    return summary


def main():
    parser = argparse.ArgumentParser(description="Evaluate original checkpoints on real camera images")
    parser.add_argument("--photos", type=Path, default=ROOT / "benchmark_photos")
    parser.add_argument("--output", type=Path, default=ROOT / "benchmark_results" / "results.csv")
    args = parser.parse_args()
    evaluate(args.photos, args.output)


if __name__ == "__main__":
    main()
