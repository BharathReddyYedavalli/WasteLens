# WasteLens Bottle Journey: documentary sourcing and photo rights

The `Bottle Journey` route now renders `frontend/src/DocumentaryStory.tsx`. It is an editorial, photo-led interactive feature, **not an experiment or a simulation of real-time waste flows**. The five-question deposit quiz that awards the existing Bottle Explorer badge and 30 XP remains in `frontend/src/BottleJourney.tsx`.

## Statistics (read scope and year before quoting)

| In-story figure | What it actually measures | Primary source |
| --- | --- | --- |
| **353 million tonnes** | Worldwide **plastic waste**, all products, 2019; not beverage bottles. | OECD, [Global Plastics Outlook](https://www.oecd.org/en/publications/global-plastics-outlook_de747aef-en.html), 2022 report using 2019 data. |
| **9%** | Share of global plastic waste **ultimately recycled**, accounting for processing losses, in 2019; not the recycling rate for bottles. | OECD, [Global Plastics Outlook](https://www.oecd.org/en/publications/global-plastics-outlook_de747aef-en.html). |
| **11 million tonnes/year** | Estimated plastic entering the ocean annually, from UNEP's 2021 assessment; this estimate uses a different methodology and period from OECD's 2019 leakage figures. | UNEP, [From Pollution to Solution](https://www.unep.org/interactives/pollution-to-solution/). |
| **700 species** | Estimated number of wildlife species affected by **marine debris in general** (includes fishing gear and other debris); not exclusively plastic bottles. | NOAA, [Impacts of marine debris](https://oceanservice.noaa.gov/education/tutorial-coastal/marine-debris/md06.html). |
| **1,468 bottles** | Bottles removed by a NOAA cleanup in the Northwestern Hawaiian Islands **in 2016**. Not a typical cleanup rate or extrapolation. | NOAA, [Photo and caption](https://marinedebris.noaa.gov/multimedia/images/plastic-beverage-bottles-nwhi). |
| **87.41%** | **Oregon's 2024 statewide beverage-container refund redemption rate.** Return/redemption is not necessarily the same as recycling yield and must not be compared directly to the global 9% figure. | Oregon OLCC, [2024 Beverage Container Return Data](https://www.oregon.gov/olcc/Docs/bottle_bill/2024-BeverageContainerReturnData.pdf). |
| **95% less energy** | Producing an aluminum can from recycled aluminum compared to virgin bauxite ore. **Not plastic bottle recycling**. | EIA, [Recycling and energy](https://www.eia.gov/energyexplained/energy-and-the-environment/recycling-and-energy.php). |

Additional guidance is grounded in the U.S. EPA [recycling hierarchy](https://www.epa.gov/recycle/recycling-basics-and-benefits), which places waste prevention and reuse before recycling. Photos illustrate real places but do **not** depict the specific region or year of every statistic.

## Actual photographs, credits and permissions

The application references verified direct image URLs, with clickable photo credits in each chapter and direct links to the source pages. Images come from outside the WasteLens repository; they require an internet connection to load. If a host is unavailable, a descriptive fallback is displayed rather than a fictional/generated image.

### NOAA material — U.S. government photographs

According to the [NOAA Marine Debris Program's multimedia policy](https://marinedebris.noaa.gov/multimedia), **only assets credited to NOAA** are public-domain/free to reuse. The photos below were individually verified as credited to NOAA or its NOAA programs. Photos credited to outside organizations on NOAA websites were deliberately excluded.

- **Beverage bottles recovered during a 2016 cleanup** — NOAA CREP. [Source / credit](https://marinedebris.noaa.gov/multimedia/images/plastic-beverage-bottles-nwhi). Image: `https://marinedebris.noaa.gov/live/s3fs-public/20160423_NOAA_CREP_050.jpg`
- **Eastern Island shoreline before debris removal** — NOAA PIFSC Coral Reef Ecosystem Program. [Source / credit](https://marinedebris.noaa.gov/multimedia/images/debris-found-along-shoreline). Image: `https://marinedebris.noaa.gov/live/s3fs-public/28.jpg`
- **Plastic film in waves** — NOAA PIFSC Coral Reef Ecosystem Program. [Source / credit](https://marinedebris.noaa.gov/multimedia/images/thin-plastic-film-shoreline). Image: `https://marinedebris.noaa.gov/live/s3fs-public/24.jpg`
- **NOAA marine-debris cleanup team at work** — NOAA PIFSC Coral Reef Ecosystem Program. [Source / credit](https://marinedebris.noaa.gov/multimedia/images/cutting-thin-plastic-film-debris). Image: `https://marinedebris.noaa.gov/live/s3fs-public/debris_removal.jpg`
- **Debris staged after a shoreline cleanup** — NOAA PIFSC Coral Reef Ecosystem Program. [Source / credit](https://marinedebris.noaa.gov/multimedia/solutions/images/debris-shoreline-cleanup-northwestern-hawaiian-islands). Image: `https://marinedebris.noaa.gov/live/s3fs-public/debris_pile_0418_2016.jpg`
- **Coral damage linked to a derelict fishing net** — NOAA CREP. [Source / credit](https://marinedebris.noaa.gov/multimedia/images/coral-removed-derelict-net). Image: `https://marinedebris.noaa.gov/live/s3fs-public/20160501_NOAA_PIFSCCoralReefEcosystemProgram_106.jpg`

### Wikimedia Commons — reusable licensed photographs

These are **real photographs**, not NOAA assets. The application credits the creator, links the specific original photo page and the license in the on-page caption. Images may be cropped in the displayed layout; this is explicitly disclosed.

- **Plastic sorted at a materials recovery facility, Olomouc, Czech Republic (2012)** — **Michal Maňas**, [original on Commons](https://commons.wikimedia.org/wiki/File:Materials_recovery_facility.jpg), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Image: `https://upload.wikimedia.org/wikipedia/commons/8/80/Materials_recovery_facility.jpg`
- **Reverse vending station, Victoria, Australia (2023)** — **Sgroey**, [original on Commons](https://commons.wikimedia.org/wiki/File:Reverse_Vending_Machine_for_Victoria%27s_Container_Deposit_Scheme_in_Sunshine.jpg), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Image: `https://upload.wikimedia.org/wikipedia/commons/2/20/Reverse_Vending_Machine_for_Victoria%27s_Container_Deposit_Scheme_in_Sunshine.jpg`. **This image depicts Australia, not Oregon**; the page caption explicitly says that its purpose is to illustrate how return infrastructure looks.

## Editorial and UX safeguards

- Translations exist in English, Spanish and Hindi for all documentary headlines, body text, statistic context and action buttons.
- No photo is AI-generated, and no unlicensed commercial photo is copied into the project.
- Source links open the original pages and are available again in the collapsible 'Behind the story' section.
- Statistics are intentionally *not* extrapolated to calculate carbon saved, bottles recovered per user or local recycling rates.
- A real recycling facility photo illustrates the sorting challenge; a real reverse vending station illustrates a deposit solution.
- Narration uses the existing opt-in shared voice system. Users can control narration by chapter.
- Reduced-motion styles, accessible image descriptions, keyboardable chapter navigation and responsive layout are included.
- The separate final deposit-law quiz still calls the original one-time XP/badge endpoint; choosing a documentary pledge does **not** create XP or backend claims.
- Photograph availability and appearance on devices require manual testing; CI only validates build/tests.

