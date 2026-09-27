# ParcelLens Slack housing-expert interview guide

Version: 2026-09-26 v0.4. Use asynchronous expert feedback to calibrate Track 3 product assumptions. **Do not wait for replies before writing the PRD, collecting data, or designing interfaces.** One financial clue and one user-relayed scoring reply are already in hand.

## 1. What to ask

Ask only about **real decisions, work order, trust thresholds, and counterexamples** that public sources cannot answer. Allow anonymous cases. Do not request unpublished project addresses, client files, or internal documents. Record each reply with the respondent’s professional role and date. Do not treat one expert as standing for all users. Per organizer guidance in #housing-sme-help, **open a separate thread per question**, using Team / track, What we are building, Our question, What we currently believe. Position the tool as decision support.

Already known, so do not spend expert time repeating it: Pittsburgh has Basic, Site Plan, and Planning Commission Zoning Review; a use listed as allowed in the district table still must meet parcel conditions; [OneStopPGH Insights](https://insightshelp.pittsburghpa.gov/) publishes planning and permit records; the [URA Rental Gap Program](https://www.ura.org/pages/rental-gap-program) has explicit project eligibility and underwriting requirements. Those can be read from [city process pages](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes), the [Zoning FAQ](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Zoning-FAQ), and the program page.

## 2. Expert clues already received, and what is still open

In the Slack record the user provided, Het Sheth asked what existing tools still cannot answer and who bears that gap. Steve Wray (SME, City of Pittsburgh) answered that **financial feasibility is a key question**: developers and nonprofits need comparable rents/values or lease/sale data from similar neighborhoods. Source: the record the user supplied in this conversation. There is no message permalink, and it was not validated against a specific housing proposal for this project. **Do not ask again, in generic form, what the biggest feasibility problem is.**

A later Slack reply relayed by the user said there is **no prescribed scoring system**. The team may propose something intuitive for users, with green / amber / red as an example. That answers whether an expert-specified formula exists, so **do not resend Q1 or ask for weights**. The reply did not give ParcelLens thresholds, and it does not prove that a prototype missing financial data is fit for real investment decisions. Respondent identity, timestamp, and message link are still missing. Until then, the team uses reviewable classification rules from [PRD 4.4](Track1_Data_Assessment_and_PRD.md).

## 3. Independent questions worth asking in office hours

| Question | What public sources cannot answer | Which PRD item a reply would change |
|---|---|---|
| **Q2 Financial boundary:** Given that financial feasibility is critical, if this weekend’s prototype only checks zoning/environment and clearly marks “finances not assessed,” in which early decisions would a developer or nonprofit still use it? If they would not, what is the smallest financial input or comparable-data check to add? | Steve already pointed to the data direction, but not whether a non-financial screen still has independent value or what the minimum financial need is. | Whether to adjust the primary user, Basic scope, and financial prompts / extras. |
| **Q3 Screening-grade counterexample review (ask only after a real case exists):** Here are our green / amber / red / gray rules and a real parcel + proposal report. Where might a developer wrongly think the parcel is already buildable or financially viable? If dimensional or financial data is missing, should we show gray, keep an amber obstacle flag, or narrow the grade name? | Experts already allowed the team to define a readable system. Specific thresholds and user interpretation are unverified. A real counterexample is more valuable than asking for a formula again. | B6 thresholds, wording, and pre-demo review. |

If only one more question can be sent, use Q2 to test whether the prototype has value for a real decision. Send Q3 only after the data track delivers a real parcel and the team has a provisional grade. Do not invent a case. Do not resend answered Q1.

## 4. Optional follow-ups by professional role

- **Municipal planner / zoning expert:** For a real proposed single-family house, which common overlay, existing lawful use, or dimensional condition would make “the use table shows permitted” still badly misleading? What precise wording should we use? Point to a counterexample or code entry. Public sources can list rules; they cannot replace an expert picking the most common, most easily misunderstood cases.
- **Small/mid-size developer:** When screening sites, which usually comes first: land/code screening or rent/sale comps? Without comps, would you still use a sourced parcel-obstacle report to decide whether to continue due diligence? Give a recent example. Public sources cannot measure actual work order.
- **Housing nonprofit / CDC:** If you skip a full pro forma, which financial or funding condition should the report flag earliest as “not checked”? Public program guides list eligibility; they do not explain early site-screening priorities.
- **Policy analyst:** To roll parcel results into neighborhood/policy insight, what minimum coverage, comparability, or missing-data disclosure would you require? Which ranking would risk a wrong policy judgment? Public policy pages cannot set this product’s analysis bar.

## 5. English Slack drafts ready to send (one thread each)

**Thread B: follow Steve Wray’s financial clue in a new post**

> **Team / track:** ParcelLens, Track 1 — Development Feasibility Navigator
>
> **What we are building:** An early parcel + housing-scenario screen using public zoning and site-constraint evidence.
>
> **Our question:** Steve Wray noted that financial feasibility and neighborhood rent/value comps are crucial for developers and nonprofits. If our weekend prototype explicitly leaves finances unassessed, is its source-linked land-use/site screen still useful for a real early decision? If not, what is the smallest financial input or comparable-data check we should add first?
>
> **What we currently believe:** A land-use/site score should be kept separate from project financial feasibility; we can flag missing comps rather than imply a project is viable.

This is a **draft to send**, not a message already posted to Slack. If the relayed scoring reply already answered whether the screen has practical value, check the original thread first to avoid duplication. Its current text does not name a minimum financial input. Open a separate thread for grade review after a real case exists.

## 6. Handling late replies

| Field | Notes |
|---|---|
| Respondent role, date, question ID | Keep a trail. Do not record personal privacy. |
| Quote or anonymous case | Separate evidence from our interpretation. |
| Affected requirement ID | For example B4 zoning, B6 scoring, B7 obstacles, B10 shared report. |
| Disposition | Accept / needs authoritative-source review / do not adopt, with reason and owner. |

On receipt, check whether the reply overturns an established fact or only changes priority. Fact conflicts go back to code/data-source verification. Priority changes may update the PRD and page order. Even if interviews arrive after the prototype, use this table for targeted edits. Data and engineering workstreams do not have to start over.
