# WasteLens institution-specific rules (Texas pilot)

This is a **source-backed sample collection guide** for named Texas schools, a campus office setting and varied customer collection programs. It is NOT a statewide directory, continuously refreshed database, or a school-by-school certified bin policy. The app never infers organization enrollment from a ZIP code.

## User experience

In **Scan → Check local recycling rules**, the person:
1. Sees the **scanned item** automatically; the same item is checked for any selected program.
2. Selects a specific **school, office or business** from one grouped dropdown. That choice is remembered on the device to support repeated kiosk scans.
3. Reads one matching, source-linked rule, where available.
4. Uses **Wrong item? Change it** only if the image recognition was incorrect or uncertain.
5. Can choose **Other location** to get honest instructions to consult the site's staff or waste provider. This does not auto-verify local rules.

The ZIP control is intentionally removed from this particular panel. It remains in **Find a place** for nearby facility search. The Home option is intentionally removed here but the separate existing Frisco residential backend is not deleted.

## Included profiles

### Schools
- Purefoy Elementary
- Spears Elementary
- Scoggins Middle School
- Maus Middle School
- Panther Creek High School
- Wakeland High School
- UT Dallas University Campus

Frisco ISD publicly describes classroom recycling, Green Teams and district bag/film and battery drives:
https://www.friscoisd.org/article/2660069

It does **not** publish a comprehensive, exact campus-by-campus daily bin acceptance policy in the sources reviewed. The six Frisco ISD profiles only give *conditional special collection* guidance for bag/film and batteries; everything else is unconfirmed. The school's exact current collection availability must be checked. UT Dallas campus has a more detailed, officially published recycling program:
https://sustainability.utdallas.edu/download/Sustainable_Development_Goal_Report.pdf
https://sustainability.utdallas.edu/download/Green_Initiative_Student_Sustainability_Guide.pdf

### Office
- UT Dallas Campus Offices. Applies campuswide UT Dallas office recycling and specialty collection policy **only to offices served by that system**, not unrelated workplaces.

### Businesses (customer collection programs, not internal employee bins)
- H-E-B Frisco — clean plastic bags/film: https://www.heb.com/static-page/article-template/The-Recycling-Process
- Best Buy Frisco — eligible consumer electronics: https://www.bestbuy.com/site/services/recycling/pcmcat149900050025.c?id=pcmcat149900050025%2F
- Home Depot North Frisco — customer bag/film, intact CFLs, eligible rechargeable batteries: https://www.homedepot.com/l/North-Frisco/TX/Frisco/75033/6513
- Staples Frisco — customer tech, ink/toner, supplies, some fee-based recycling: https://www.staples.com/stores/recycling

### Food chains (brand consumer guidance, not verified store bins)

- **Domino's Pizza — Frisco Preston Road**: their official pizza-box recycling program advises emptying corrugated pizza boxes and checking local collection acceptance. Small grease marks do not automatically prevent technical recyclability. This does **not** establish that a Frisco store has a recycling bin or that every Texas collection service accepts pizza boxes.
  - https://www.recycling.dominos.com/
  - https://media.dominos.com/stories/recycling-pizza-boxes/
  - https://pizza.dominos.com/texas/frisco/2930-preston-road-suite-170
- **Starbucks — Frisco**: customers can avoid disposable-cup waste by bringing a clean reusable personal cup to company-operated or participating licensed Starbucks stores. Official guidance also describes their plastic cold cups as widely recyclable nationally, but local bin acceptance remains unverified.
  - https://about.starbucks.com/press/2024/starbucks-becomes-first-national-coffee-retailer-to-accept-reusable-cups-for-drive-thru-and-mobile-orders/
  - https://about.starbucks.com/a-better-cup-for-all/

### Reliable Scan matching and suggested demo props

The rules checker matches common AI names such as **plastic bottle or jug**, **soda can**, **cell phone**, **pizza box**, and **reusable travel cup** to standardized source-backed item keys. The current selected location shows three simple items to try under the selector. A missing synonym is labeled *unmatched scanned item* rather than treated as evidence that the organization rejects the item. The **Wrong item? Change it** control remains available; ambiguous material labels alone do not establish the item.

## Interpretation

- A **check local recycling rules** result is educational packaging guidance, not permission to recycle at a particular Frisco facility.
- A **reuse** result prevents waste; it is not an instruction to place a reusable cup in a recycling bin.
- A rule for **special drop-off** must not be displayed as permission to put an object in a regular blue bin.
- **Not accepted here** does not mean the object belongs in ordinary trash.
- If a recognized object has no matching item rule, display **No confirmed rule for this item**.
- For a low-confidence scan, require the user to identify the item manually before showing any supported item-specific result.
- For Frisco ISD batteries and plastic film, published *district drives* do not prove there is a currently operating collection point in a specific school.
- Always display the official source so people can check dates, conditions, eligibility and changes.
- Demo data file: `frontend/src/data/texas-demo-rules.json`.
- The user's existing account, Audit, Finder, and other page data are unaffected.
