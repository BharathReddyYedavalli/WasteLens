# WasteLens

**Planning stage · 2026 Congressional App Challenge**

WasteLens is a proposed camera-first waste-sorting web application that helps people answer three practical questions: **What is this item? Where should it go? And where can I take it if special collection is needed?**

This is a **separate repository** inspired by the existing [Garbage-Crew robotics project](https://github.com/BharathReddyYedavalli/Garbage-Crew). The original project will not be modified.

> **Status:** This README describes planned features only. There is no application code or working WasteLens web service yet.

## Why build it?

Recycling programs vary by community and material. A visual recognition model alone cannot determine if a particular item is accepted in a curbside bin. WasteLens aims to connect image classification with local, material-specific disposal guidance and clear uncertainty.

## Planned user experience

1. **Scan:** Open the camera (or upload a photo) and capture one item.
2. **Identify:** Run a waste-image model and show the predicted material class, model score, and a correction control. Do not label the result as an exact object unless a separate item model supports it.
3. **Sort:** Show a provisional disposal route: compost, local curbside recycling, special collection, reuse/donation, or trash. Safety and local collection rules override naive class-to-bin mappings.
4. **Find nearby collection:** Ask for approximate location/ZIP code only when needed; show genuine candidate facilities and verify material acceptance before recommending a drop-off. Provide a map/directions link.
5. **Track (later):** Let the user confirm how the item was disposed of, and optionally save history and badges.

The default experience should avoid unnecessary location prompts for general trash or household composting.

## Existing machine-learning foundation

The read-only [Garbage-Crew repository](https://github.com/BharathReddyYedavalli/Garbage-Crew) contains:

- Fine-tuned **MobileNetV3** PyTorch image classifier for eight classes: battery, glass, metal, organic_waste, paper_cardboard, plastic, textiles, and trash.
- TorchScript and quantized model files, plus optional YOLO object detection.
- Raspberry Pi camera and mechanical waste-sorting controller code, which are **not required** for the website.
- A training notebook reporting **98.6% accuracy on an internal 1,600-image evaluation set**. This result is not yet validated on diverse real-world phone or webcam images, so it must not be advertised as general camera accuracy.

**Important:** Eight material labels do not identify an exact item such as "soda can" or "plastic bottle." Specific-object recognition is a separate research and engineering task.

## Candidate technical architecture

- **Frontend:** React, TypeScript and Vite; web camera using browser `getUserMedia`, with photo upload fallback.
- **Typography:** **Poppins**, with lively green/white color palette, legible UI and polished restrained animations.
- **Initial model API:** Python FastAPI with PyTorch/TorchScript loading the existing MobileNetV3 classifier.
- **Possible alternative:** Convert and verify ONNX model for `onnxruntime-web` on-device inference after the API pipeline is working.
- **Disposal data:** Source-backed material guidance with region-specific acceptance and safe handling.
- **Collection discovery:** Explore Google Places and/or verified municipal/industry directories. A place being called a "recycling center" does not prove it accepts a specific item.
- **Maps:** Directions link only to real places.

All provider, cost, model-conversion and deployment decisions remain unconfirmed until tested.

## Safety and scientific limitations

- Always offer "not sure" and a user correction control; softmax confidence is not guaranteed to be calibrated.
- Never automatically route lithium-ion or other potentially hazardous batteries to household bins; verify chemistry and consult [U.S. EPA guidance](https://www.epa.gov/recycle/used-household-batteries).
- Plastic and glass recyclability depends on local programs, not material appearance alone.
- Food scraps, meat, compostable packaging and household compost systems can have different requirements; do not assume all organic waste is suitable for home composting.
- No invented facilities, disposal actions, environmental savings, model accuracy, or claimed local acceptance.
- All inferred item labels and recommendations require testing and source attribution.

## Planned milestones (nothing built yet)

1. Camera and upload interface.
2. Actual MobileNetV3 inference with unit, integration and independent photo tests.
3. Clear prediction cards with calibrated uncertainty/manual corrections.
4. Local disposal rules and recycler/donation/hazardous-drop-off finder.
5. Personal history, badges and optional community features.
6. Production deployment and mobile usability testing.

## Licensing

WasteLens source is intended to be MIT licensed. The original Garbage-Crew project, training data, third-party software, models, fonts and map services each retain their own applicable licenses and attribution obligations. Nothing from the original repository has been copied into WasteLens.

## Development rule

Build and verify each feature end-to-end before starting the next. Do not display mocked classifications, made-up recycling facilities or incomplete placeholder screens as real results.
