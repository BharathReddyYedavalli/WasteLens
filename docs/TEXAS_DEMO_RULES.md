# Texas-only sample collection rules (WasteLens)

This is a **demo feature** using published rules from four Texas-based collection programs. It is *not* an AI model retraining, provider lookup, or nationwide collection service database.

## What is included

| Location | What the profile describes | Reference |
| --- | --- | --- |
| City of Frisco residence | Blue-cart municipal residential collection; selected special drop-offs | https://www.friscotexas.gov/556/Residential-Recycling-Services |
| University of Texas at Dallas | Campus recycling / designated specialty and limited compost stations | https://sustainability.utdallas.edu/about/faq/ |
| H-E-B Main St, Frisco | **Customer** plastic bags and film collection, not employee-bin instructions | https://www.heb.com/static-page/article-template/The-Recycling-Process |
| Best Buy, Frisco | **Consumer** electronics take-back; not corporate/employee waste bins | https://www.bestbuy.com/site/services/recycling/pcmcat149900050025.c?id=pcmcat149900050025%2F |

The source data is at `frontend/src/data/texas-demo-rules.json`. No extra JSON download or API key is needed. It has 45 sample item-specific rules, with statuses for recycle, trash, compost, special drop-off, or **not accepted by that specific program**.

## Test on Mac

1. Fetch branch `feat/texas-demo-location-rules-2026-10-24` (based on `claudetest`).
2. Start your normal Python backend and Vite frontend; there is no new backend route.
3. **Scan** an item. Expand **Check local recycling rules**. Select **At home**, **At school**, or **At a business**.
4. Choose one of the matching named Texas profiles. The Scan item is suggested when identification is likely. Select a different item from the dropdown for comparison.
5. Compare `plastic_bottle` under Frisco Home and H-E-B, `plastic_grocery_bag` under Frisco Home and H-E-B, and `cell_phone` under UTD and Best Buy.

## Safety and scope

- Selecting Frisco does not prove that a given household uses its city collection program. ZIP code alone **never** selects a profile.
- H-E-B and Best Buy describe **customer drop-off programs**, not how those stores sort their own trash.
- If an item is missing or unclear, the UI says its rule is **not confirmed**. In particular, `not_accepted_here` is **not** a directive to throw an item in the trash.
- Conditions shown for specialty collection must be checked with the participating site. Opening hours, policies, limits, and site availability can change.
- These are **source-backed snapshots as of October 24, 2026**, not continuously verified live rules. Check linked official policies before relying on a decision.
- Existing residential city checker and external guidance links remain available. No automatic generalization to other schools or businesses.
