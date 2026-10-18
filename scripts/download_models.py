"""Download only user's original Garbage-Crew checkpoints, verifying Git blob hashes.

Usage: python scripts/download_models.py [--all]
No model weights are committed to WasteLens. This is a public read-only download.
"""
import argparse
import hashlib
from pathlib import Path
import tempfile
import urllib.request

SOURCE = "https://raw.githubusercontent.com/BharathReddyYedavalli/Garbage-Crew/main/models/"
CHECKPOINTS = {
    "mobilenetv3_garbage_classifier_2.pt": "6d3d81c620df5a81fbe46fd5f731cdfa22613d64",
    "mobilenetv3_garbage_classifier.pt": "9a218f7a88a674b85abb14d225ede279a8e72264",
    "mobilenetv3_garbage_classifier_3.pt": "6a49c2c4071293a86c067abe4c9b1410119eae8e",
    "mobilenetv3_quantized_scripted.pt": "802cbdfc03c72ec13b3d65d8c0c5168dbd4a7cec",
}
DETECTORS = {"yolo11n.pt": "45b273b46165267f2d4c90df94468b547f43cf67"}
OUTPUT = Path(__file__).resolve().parents[1] / "models"

def git_blob_sha(content: bytes) -> str:
    return hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest()

def download(name: str, sha: str) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    dest = OUTPUT / name
    if dest.is_file() and git_blob_sha(dest.read_bytes()) == sha:
        print(f"Already verified: {name}")
        return
    print(f"Downloading {name} from read-only original repository...")
    req = urllib.request.Request(SOURCE + name, headers={"User-Agent": "WasteLens-model-setup/0.1"})
    with urllib.request.urlopen(req, timeout=90) as response:
        data = response.read(22 * 1024 * 1024)
    if git_blob_sha(data) != sha:
        raise RuntimeError(f"Integrity check failed for {name}; checkpoint not saved")
    with tempfile.NamedTemporaryFile(mode="wb", dir=OUTPUT, delete=False) as tmp:
        tmp.write(data)
        intermediate = Path(tmp.name)
    intermediate.replace(dest)
    print(f"Verified: {dest}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Download all classifier versions for dropdown comparison")
    parser.add_argument("--detector", action="store_true", help="Download optional YOLO11n object detector")
    args = parser.parse_args()
    names = (CHECKPOINTS if args.all else
             {} if args.detector else {next(iter(CHECKPOINTS)): next(iter(CHECKPOINTS.values()))})
    if args.detector:
        names = {**names, **DETECTORS}
    for filename, checksum in names.items():
        download(filename, checksum)
