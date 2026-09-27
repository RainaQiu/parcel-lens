# PRD 4.2 Basic, plain-language meeting notes

Matches [PRD 4.2](Track1_Data_Assessment_and_PRD.md), updated from the 2026-09-26 team meeting. **The user only has to choose a parcel. They do not need to know housing type or unit count first.**

## In scope now

- **B1 Find a parcel:** Click the map or enter a parcel ID. If an address matches several parcels, the user must choose one. Do not emit a report until a unique parcel is selected.
- **B3 Map and report stay in sync:** Map highlight, parcel details, and the report show the same parcel ID. Missing address, area, and similar fields say “unknown.”
- **B4 Zoning classification:** Use the [city Zoning Map](https://pittsburghpa.maps.arcgis.com/apps/instant/sidebar/index.html?appid=4bb79ea64bf848b3a0560e3856efeccb) to say which districts the parcel falls in. That map is a **zoning map**. It cannot tell whether the land is flat or sloped, and it cannot assert what can be built without a development proposal.
- **B5 Terrain classification:** Use the separate 25%+ steep-slope layer. Show “overlap detected / not detected / insufficient data,” overlap area or share, and date. Do not label the whole parcel “flat” or “hilly” unless a defined standard exists.
- **B6 Bounded grade:** If evidence is sufficient, green / amber / red may describe **checked parcel constraints**. Missing critical evidence is gray. Show rationale, source, and rule version next to the color. Without a specific housing proposal, this is not a full project Development Ease Score.
- **B7 All obstacles:** List every identified obstacle, with fact, possible impact, who to consult, and source. The report opening may highlight the highest-priority items, but it must not hide the rest. Unknowns are listed separately.
- **B8 Readable explanation:** AI may only explain verified material. It must not invent code rules or change the grade. On AI failure, use a template report.
- **B9 Sources and dates:** Key conclusions show source, data date, and scope, and state that this is an early screen that needs human review.

## Dropped or deferred this round

- **B2 removed from Basic:** At site-search, a developer may not know housing type or unit count. Use-rule checks wait until there is a defined proposal.
- **B10 deferred:** UI for the four personas will be planned later.
- **B11 last:** A repeatable real-parcel demo from input to result is the final overall acceptance task.
- **B12 deferred:** Suitable financial data is not available yet, so do not add a financial brief or analysis. Existing reports must not claim finances were assessed.

**Example:** Enter a parcel ID and see which zoning districts it crosses, whether it hits the 25%+ slope layer, every identified obstacle, and the unknowns. After the user later decides what to build, discuss whether that project meets specific use rules.
