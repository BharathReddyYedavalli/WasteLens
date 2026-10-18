# WasteLens

**Early prototype — photo-based waste classification for the Congressional App Challenge 2026.**

WasteLens is a camera-first website that helps people answer **what material is this?**, **how should I handle it?**, and **where can I find a suitable collection option?** It reuses the trained MobileNetV3 research models from [Garbage-Crew](https://github.com/BharathReddyYedavalli/Garbage-Crew) without modifying that original repository.

The user experience is inspired by GreenByte: a large camera panel, clear sorting results, disposal tips, creative reuse ideas and optional nearby collection search. The interface uses **Poppins**.

## Current implementation

- Live browser camera with permission request, capture button and upload fallback; responsive mobile/desktop layout.
- Model dropdown with four original model variants: MobileNetV3 checkpoints 1, 2, 3, and quantized TorchScript.
- A Python FastAPI endpoint actually runs the selected **trusted** model on uploaded images. No fake inference results.
- Shows one of eight **material classes** (battery, glass, metal, organic waste, paper/cardboard, plastic, textiles, trash), uncalibrated model score and alternate material possibilities.
- Conditional disposal/reuse guidelines with U.S. EPA links and conservative hazardous-material handling.
- Optional Google Maps location **search** (not a verified nearest-site or confirmed acceptance finder); not shown for normal trash or home-compost suggestions.
- No accounts, saved history, local-recycling eligibility database, exact object detector, or actual real-time YOLO processing yet.

## Get started (Windows/macOS/Linux)

Requires: Node.js 22+, Python 3.11+; Python packages below. CUDA is **not** required; initial model runs on CPU.

**1. Clone the new repo**

```bash
git clone https://github.com/BharathReddyYedavalli/WasteLens.git
cd WasteLens
```

If you are reviewing a pull request, check out the relevant feature branch first.

**2. Download your best-documented model**

```bash
python scripts/download_models.py
```

This downloads **checkpoint 2** (~17 MB) from the public Garbage-Crew repository and checks its Git blob SHA-1 against the original committed file. To enable all four dropdown choices:

```bash
python scripts/download_models.py --all
```

These downloads are **read-only**: the Garbage-Crew repository is never edited, and checkpoint files are ignored by git in WasteLens. If direct downloads are blocked, clone Garbage-Crew next to WasteLens and set the environment variable `WASTELENS_MODEL_DIR` to its `models` folder before starting the API. Only use weights you trust.

**3. Start the Python AI server** (terminal 1)

```bash
python -m venv .venv
```

Activate the environment:

- **Windows PowerShell:** `.\.venv\Scripts\Activate.ps1`
- **macOS/Linux:** `source .venv/bin/activate`

Then:

```bash
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Verify at `http://127.0.0.1:8000/api/health` or `http://127.0.0.1:8000/api/docs`.

**4. Start the React frontend** (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open the exact `Local:` URL Vite prints (typically `http://localhost:5173`). Do not close either terminal. Vite proxies `/api` requests to the Python server at port 8000.

**5. Test**

1. Open the camera or upload a real image.
2. Select "MobileNetV3 · evaluated checkpoint 2" (default).
3. Click **Identify item** and observe an actual model result.
4. Check the disposal guidance and, if relevant, enter a ZIP code for a maps search.
5. Test a few different waste photos and an unfamiliar/non-waste photo. Report misclassifications — don't assume the model is always correct.

```bash
cd backend
python -m pytest -q
cd ../frontend
npm run build
```

## Checkpoint accuracy and model selection

The original training notebook reports approximately **98.6%** on an internal evaluation set of **1,600 images**, corresponding to checkpoint **2**. This is **not** verified out-of-distribution accuracy and does **not** prove that checkpoint 2 outperforms checkpoint 1, checkpoint 3, or the quantized checkpoint. Checkpoint 2 is the **best-documented** option, not yet the scientifically confirmed highest-performing option. We will compare all four on the *same independent, real-world* photo set before assigning a 'best' label.

YOLO weights in Garbage-Crew are generic detection checkpoints; they aren't a substitute for the eight-class waste image classifier and are intentionally excluded from this model-selection dropdown for now.

## Technical design and limitations

- Preprocessing matches the original classifier's **224×224 RGB resize and ImageNet normalization**. Photos are sent to the locally running API for inference, not saved to a database.
- The backend loads full-precision checkpoints using `torch.load(..., weights_only=False)`. This can execute code from pickled model files, so it is restricted to trusted first-party weights downloaded with integrity checks. **Never load user-uploaded model weights.**
- Images over 8 MB or with invalid/corrupt formats are rejected. The model predicts **material**, not specific item identity, recycling acceptance, battery chemistry, or hazardous ingredients.
- Softmax is an **uncalibrated** score, not a validated probability. The demo warns at a raw score below 70%; this is a heuristic, not a proven safety threshold.
- Recycler searches open Google Maps with the user-supplied city/ZIP and material keywords. **No facility is presented as verified**, and users must confirm material acceptance before visiting.
- Home composting and ordinary trash do not automatically trigger location requests.
- Location policies, take-back offerings, model behavior, usage limits and real-world camera support must be tested before public claims.

## Roadmap

1. Verify every model with cross-platform real photos, benchmark confidence and latency, choose highest-performing default **based on evidence**.
2. Improve exact-object identification using explicitly trained classes or human-confirmed labels.
3. Integrate a verified, material-specific U.S. recycling-location dataset/API and local curbside rules.
4. Add account-optional disposal tracking and badges based on user-confirmed actions.
5. Deploy API/frontend over HTTPS and test mobile cameras on iOS/Android.

## Attributions

- Original ML + robotics: [Garbage-Crew](https://github.com/BharathReddyYedavalli/Garbage-Crew) (MIT, separate project).
- U.S. EPA reference guidance: [How Do I Recycle Common Recyclables?](https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables), [Used Household Batteries](https://www.epa.gov/recycle/used-household-batteries), [Composting at Home](https://www.epa.gov/recycle/composting-home).
- Poppins typography is loaded via Google Fonts and subject to its font license; no font binaries are redistributed by this repository.
- This application uses AI coding assistance. Disclose assistance accurately in competition materials.

Licensed under MIT (see `LICENSE`).
## Optional: isolate the photographed object with YOLO11n

The `feat/yolo-object-focus` branch adds **optional** object localization before the existing eight-material MobileNetV3 classifier. Nothing is auto-selected; the user can choose a YOLO-detected bounding box or draw a manual crop. If the detector misses an object, the full-photo classifier still works. The YOLO box is **not background segmentation**, and COCO object classes do not include all waste items.

Install the additional Python package into the *same active virtual environment*:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-detection.txt
python scripts/download_models.py --detector
```

Restart the Python API, then refresh the React page. Photograph or upload an item, select **Find objects (YOLO)** and choose a detection, or **Select area manually** and drag a rectangle. Click **Identify item**. The Python backend crops the original, correctly oriented photo before resizing to 224×224 for MobileNetV3.

### Licensing warning: important before deployment

**Ultralytics' YOLO code and pretrained models are licensed AGPL-3.0 or under paid Enterprise terms.** WasteLens is otherwise MIT licensed, and the repository currently remains private. This branch is for exploratory local testing; the application licensing cannot automatically remain plain MIT if it incorporates Ultralytics under AGPL. Review https://www.ultralytics.com/license and resolve licensing and source disclosure requirements **before integrating/merging this optional module into a publicly deployed product**. Alternatives include an appropriately licensed detection model.

Tests without installing YOLO use mocked detector responses, so passing CI validates API/cropping contracts but **not YOLO's true detection accuracy or real-world speed**.

## Accuracy audit (before claiming the classifier works on phones)

The checkpoint 2 notebook's internal evaluation reported 98.6%, but the training data did not cover arbitrary everyday items and used no augmentation in its final fine-tuning. The eight-way classifier always returns a trained class, even for items outside those classes. Scores are **not calibrated probabilities**.

For independent evidence, place *new* correctly labeled camera images in your local `benchmark_photos/` directory, organized into folders named after the eight labels. Do not put images used for training in this folder. Add a `.crop.json` sidecar with normalized bounds if testing a crop. Examples:

```text
benchmark_photos/
  metal/
    aluminum_can_01.jpg
  plastic/
    empty_bottle_01.jpg
```

Run `python scripts/benchmark_camera_photos.py` from the project root after installing all four model checkpoints. The script writes a private CSV with image-level predictions, raw model scores and per-model accuracy on the **same** test photos. It does not improve the model by itself, and small samples do not prove accuracy. Keep personal photos private: these folders are git-ignored.

The result page also lets a user correct a wrong material; this changes the associated guidance for that session, not the model. It should not be mistaken for an automated accuracy improvement.
