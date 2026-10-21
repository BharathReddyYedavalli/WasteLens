# ZIP-aware recycling guidance — limited verified municipal coverage

WasteLens's scanner, reuse suggestions, recycling-location map, bottle returns,
audits and education tools work throughout the United States. This **does not**
mean every city has independently documented curbside sorting rules.

The Scan results have an optional **Check local recycling rules** section.
It reuses the ZIP code typed in the regular recycling finder; no geolocation
permission or exact home address is requested or stored by this lookup.

## How the rules checker works

1. A ZIP code is resolved with the application's **offline postal area**
   database. Postal cities are hints, *not* proof of municipal boundaries,
   individual address eligibility, or which company services an address.
2. Program names are suggested only when the postal city corresponds to one
   of the curated, published municipal collection programs.
3. The person must select their residential service and explicitly confirm
   it serves their address. They also select the physical **item category**;
   the Gemini object guess is not silently promoted to a verified material.
4. For a supported program and documented item, WasteLens returns a
   deterministic program-specific instruction linked to the official
   municipal or official service-provider page.
5. An unsupported location, unspecified item, school/commercial service,
   unconfirmed provider or mismatching postal area receives **Not confirmed**.
   The normal map and AI scanner remain available; the app does not borrow
   Frisco rules for unlisted cities.

School and commercial bins may use contractor-specific agreements; this
system makes **no claim** about those services. Likewise, official city
sorting rules do not verify that a recycling **facility pin** takes an item.

## Documented residential collection programs

| Program | Source | Important distinctions |
|---|---|---|
| Frisco, TX | https://www.friscotexas.gov/556/Residential-Recycling-Services | Plastic clamshells and paper coffee cups excluded from blue carts. Certain special materials use separate collection. |
| McKinney, TX | https://www.mckinneytexas.org/792/Recycling | Plastic containers have resin-number requirements; some item types are unconfirmed. |
| San Francisco, CA | https://www.recology.com/recology-san-francisco/what-goes-where/ | Empty plastic clamshells, plastic utensils and clean paper coffee cups are listed as accepted recyclables; contaminated paper follows other rules. |
| Los Angeles, CA | https://sanitation.lacity.gov/services/single-family-residents | Single-family blue carts accept paper, metals, glass and specified plastics #1/#2/#5. Some unknown-resin packaging cannot be affirmed from shape alone. |

Additional official LA sources:
- https://sanitation.lacity.gov/services/weekly-curbside-black-bin-collection-trash
- https://sanitation.lacity.gov/programs/safe-centers-and-household-hazardous-waste

Rules last reviewed against these pages **October 20, 2026**.
They are a curated subset, not a continuously refreshed national policy database.
Cities and contractors can change rules; the linked primary source governs.

The older /api/local-rules/frisco/categories and /frisco/check endpoints
remain supported for existing integrations. The scanner now uses:
- GET /api/local-rules/programs?zip_code=75070
- GET /api/local-rules/check?zip_code=75070&program_id=mckinney_tx&category=plastic_bottle_jug&context=residential&service_confirmed=true

The check response differentiates a **documented program rule** from
**independently verified acceptance at a physical address**. This lookup
never claims to verify the address; user confirmation is not an independent
municipal service-record check.

## Quality and testing

Automated tests cover postal matches for all four cities, unsupported ZIPs,
invalid inputs, explicit service confirmation, special handling for school
and commercial bins, incompatible city/ZIP combinations, unlisted items,
and **different** plastic-clamshell and paper-cup recommendations between
Frisco and San Francisco.

The frontend lookup aborts superseded queries so results from a prior
ZIP/program/item cannot appear after a change.

Remaining for final manual QA: verify sample ZIPs in a real browser, all
program/item selections, map coexistence, responsive design, all themes,
Spanish/Hindi labels, and the actual official websites. The official
item-specific directions currently remain in **English** and a translated
notice discloses that limitation. No user adoption, real-photo scanner
accuracy or environmental impact has been independently measured.
