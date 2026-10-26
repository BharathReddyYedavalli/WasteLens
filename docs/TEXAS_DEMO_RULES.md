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

It does **not** publish a comprehensive, exact campus-by-campus daily bin acceptance policy in the sources reviewed. The six Frisco ISD profiles only give *conditional special collection* guidance for bag/film and batteries; everything else is unconfirmed. The school's exact current collection availability must be checked.

**AA-battery scan matching:** Each school profile has a source-linked `alkaline_battery` entry for a clearly identified **alkaline AA or AAA battery**, in addition to the more general `household_battery` entry. These entries lead to **conditional special collection**, not an ordinary recycling bin and not blanket campus acceptance. The six Frisco ISD profiles refer to district battery drives: staff must confirm that a drive is running and accepts that chemistry. UT Dallas refers to designated campus battery recycling collection; visitors must confirm eligibility. A plain **AA battery** does not prove it is alkaline—AA is a battery size, so unspecified AA photos follow the general household-battery guidance. If identification is uncertain, the user must confirm the item before a rule is shown. UT Dallas campus has a more detailed, officially published recycling program:
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

## Advanced physical demo: less obvious objects

The pilot also has two specialist service profiles:

- **Texas Disposal Systems (Central Texas commercial/residential program)** — its [published material table](https://www.texasdisposal.com/whats-accepted/) explicitly lists **aluminum baking trays and pie plates** in the recycling stream. It excludes both household and rechargeable batteries from its ordinary recycling stream. Selecting this service does not establish that a particular home, school or office has a TDS contract. Only use the recycling instruction if the actual site is served by the relevant TDS program.
- **DFW Electronics Recycling (Plano drop-off)** — its [material list](https://dfwelectronicsrecycling.com/services) explicitly includes **cell phones, cabling, computers, and computer components/parts**, with a [published Plano drop-off](https://dfwelectronicsrecycling.com/locations). A Raspberry Pi is a type of single-board computer, but **Raspberry Pi boards are not named verbatim**. The result says **Confirm with recycling center**, not guaranteed acceptance.

Useful contrasts for live demos:

| Item | Select a program | Result | Practical consideration |
| --- | --- | --- | --- |
| Clean empty aluminum food tray | Texas Disposal Systems | Recycle, if using its recycling stream | Do not infer acceptance for other cities/services |
| Alkaline AA battery | Home Depot | Not accepted in its rechargeable-battery bin | Staples lists single-use batteries for a fee |
| Rechargeable tool battery | Home Depot | Special collection; only eligible intact batteries | Avoid using swollen/damaged batteries as demo props |
| Old personal phone | Best Buy, Staples or DFW Electronics Recycling | Special electronics drop-off, conditions apply | Wipe personal information before recycling |
| Raspberry Pi board | DFW Electronics Recycling | Confirm with recycling center | The site's published category is computer components, not the exact product name |
| Loose circuit board | DFW Electronics Recycling | Confirm with recycling center | Never put a board into ordinary mixed recycling |
| Old ink cartridge | Staples | Dedicated cartridge take-back | Physical prop is safer than batteries |

The matcher now recognizes **aluminum foil baking pan, aluminum food tray, disposable foil container, alkaline AA or AAA battery, rechargeable Li-ion battery, Raspberry Pi, single-board computer and PCB** as distinct object types. Names should be exact enough to avoid inventing acceptance from a material label.

Bring a clean empty aluminum tray, old smartphone with data removed, an unused/broken Raspberry Pi **without a connected battery**, an ink cartridge, and cardboard/pizza box. For batteries, consider a picture rather than handing loose batteries around at a public kiosk. Distinguish **recycling**, **not accepted here**, and **verify with recycler** as three different results.

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
