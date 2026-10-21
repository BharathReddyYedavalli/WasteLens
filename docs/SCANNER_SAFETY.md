# Scanner reliability safeguards — Stage 3

These safeguards reduce some AI risks. They do not establish an independent
real-world accuracy rate or guarantee correct sorting for all materials.

## Photo and API handling

- Users explicitly choose a photo or camera image and press Identify item.
- The backend enforces image content types and 8 MB size, checks the image and
  dimensions, applies EXIF orientation, and downscales to JPEG.
- Gemini must return the structured ItemAnalysis schema; failed responses
  produce actionable errors without exposing API credentials.
- Transient provider HTTP 500/502/503/504 errors get at most **two scanner-level retries**
  (three attempts total), with short exponential backoff and jitter.
  The Google SDK's own retry loop is disabled for this route so retries do not
  multiply. HTTP 429, authentication errors, and invalid requests are not retried.
- Each Gemini scanner request has a 30-second SDK timeout. With retries this is
  a per-attempt limit, **not** a 30-second bound on the entire scan.
- Backend diagnostic logs record only model, elapsed time, retry attempt and
  provider status code; they never include provider error bodies, photos,
  user hints or the API key. Persistent provider outages still produce an error;
  these safeguards cannot guarantee availability.
- Photo bytes are not saved by WasteLens. The photo is sent to Google Gemini;
  authenticated users may save text analysis results, not the image.

## Post-response reliability checks

The deterministic code in backend/app/vision_safety.py examines Gemini's
structured result BEFORE it is returned or saved to scan history:

1. Unknown item or multiple items: removes unverified disposal steps, reuse
   projects, short reuse ideas, and specific facility-search terms; requires
   clarification before sorting.
2. Unknown material when recycling, compost, or regular trash is proposed:
   requests material confirmation rather than asserting a bin is appropriate.
   A known reusable item can still be recommended for continued use.
3. Explicit battery, needle, chemical, aerosol, and similar high-risk item
   names: replaces model DIY and disposal suggestions with cautious special
   collection instructions. Common English, Spanish and Hindi names are
   included; this is text matching, not independent photo classification.
4. Items already assigned a special-drop-off route: DIY/reuse projects are
   suppressed even when a high-risk keyword isn't present.
5. Unqualified AI claims that a material goes directly into a recycling or
   compost bin: a narrow phrase filter substitutes a reminder to confirm
   the actual program's collection rules. Conditional, local-rule-aware
   advice and useful item-preparation steps remain.
6. The React result screen flags BOTH uncertain item identity and unconfirmed
   material, so a blocked recommendation is visibly explained.

The source-backed Frisco residential rule lookup remains separate, optional,
and limited to household collection rules. Neither it nor a generic map
listing establishes school contractor acceptance.

## Known limitations

- Gemini may still misidentify an object or its material even if it sounds
  confident. The safeguards do not train or independently validate a model.
- Keyword checks can miss synonyms or flag unusual phrasing. They are not
  exhaustive and don't replace municipal or hazardous-waste guidance.
- Unsupported bin claims can occur in forms the narrow filter doesn't catch.
- No user impact, sorting accuracy percentage, carbon savings or real-world
  disposal outcomes have been independently measured.
- Existing tests use synthetic model responses and a mocked Gemini client,
  not the live provider or a photographed benchmark dataset.

## Regression tests

Mocked provider tests also cover success after transient errors, exhausted
503 retries, no retry for 429/credential errors, configured HTTP timeout,
and sanitized diagnostics. No live Gemini API calls are made in CI.

Tests cover ambiguous images, material uncertainty, hazardous labels in three
languages, battery charger false positives, explicit special-drop-off routes,
conditional vs unqualified bin statements, preserving useful normal scans,
photo validation order, and the mocked end-to-end analyzer response.
The CI checks also typecheck/build the frontend and run backend API tests.

Full live scanner, browser, account, camera, accessibility, and multi-model
tests are intentionally left for the final user-led stress-test phase.
