# Development Ease Score

This is the rubric implemented in [`src/lib/score.ts`](../src/lib/score.ts). The panel derives the score from the selected parcel’s already-loaded assessment and zoning records. There is no extra GIS call and no model in the number.

The score is a **hackathon screening hint**, not a permit, legal, engineering, or investment conclusion.

## Formula

Start at **100**. Subtract every named barrier penalty. Clamp to **0–100**.

```
score = clamp(100 − Σ penalty, 0, 100)
```

| Band | Range |
|---|---|
| Easier | 75–100 |
| Mixed | 50–74 |
| Harder | 0–49 |

Each barrier carries `source.name`, `source.field`, and `source.value` so the UI can show a chip (for example `PGH zoning · zon_new · RM-M`).

Severity is derived from penalty: **high** if ≥ 20, **medium** if ≥ 10, otherwise **low**.

## Inputs

| Factor | Field | Source shown on chip |
|---|---|---|
| Zoning district | `zoning.code` (`zon_new`) | PGH zoning |
| Current use | `USEDESC`, `CLASSDESC` | WPRDC assessments |
| Lot size | `LOTAREA` or county `CALCACREAGE` via `acresFrom()` | WPRDC assessments |
| Tax status | `TAXCODE` / `TAXDESC` | WPRDC assessments |

Missing zoning or assessment is scored as a barrier; the function does not fill in a high score when records are absent.

## Penalties

Zoning always contributes one barrier (district match or missing layer). Use, size, and tax add at most one barrier each when they match.

### Zoning (`zon_new`)

Match is case-insensitive. `RM-*` is prefix (`RM-M`, `RM-H`, …). Overlay codes are treated as full district strings in this version.

| Match | Penalty | Barrier title |
|---|---|---|
| `R1D`, `H`, `P`, `EMI`, `SP`, `GT`, `OPR`, `GPR`, `UPR`, `RIV` | 28 | Higher-review zoning district |
| Code starts with `RM` | 12 | Multi-unit residential zoning |
| `LNC`, `UNC` | 6 | Neighborhood commercial zoning |
| Any other present code | 10 | Local zoning constraints |
| No zoning at centroid | 10 | Not on PGH zoning layer |

### Use (`USEDESC` / `CLASSDESC`)

The two descriptions are concatenated and matched with word-ish substrings (case-insensitive). First matching row wins.

| Match | Penalty | Barrier title |
|---|---|---|
| `VACANT` or `PARKING` | 0 (no barrier) | — |
| `INDUSTRIAL`, `UTILITY`, or `GOVERNMENT` | 28 | Constrained current use |
| `APART` | 18 | Existing apartment building |
| No match | 0 | — |

### Lot size

Square feet come from `LOTAREA` when numeric; otherwise `acresFrom()` × 43,560.

| Condition | Penalty | Barrier title |
|---|---|---|
| Area missing or ≤ 0 | 5 | Lot size missing |
| Area &lt; 2,500 sq ft | 10 | Very small lot |
| Otherwise | 0 | — |

### Tax (`TAXCODE`)

| Match | Penalty | Barrier title |
|---|---|---|
| `E` or `P` (exempt / PURTA) | 15 | Exempt or PURTA tax status |
| Taxable or other | 0 | — |

### Incomplete assessment

If `assessment` is null, **25** points: “Incomplete assessment record”. Use, size, and tax barriers are not added on top of that gap.

## Not in this score

These are always listed as unscored (not fetched, not inferred):

- FEMA flood zone
- Steep slope overlay
- PLI / Building & Development permits

## Calibration check

PIN `0051N00300000000` (4750 Centre Ave): RM-M, `APART:40+ UNITS`, ~0.55 acres, taxable.

Expected: **70 / Mixed** (12 zoning + 18 apartments). Verified in the local app against live WPRDC and PGH zoning responses.

## Changing weights

Edit the tables and constants in [`src/lib/score.ts`](../src/lib/score.ts), then update this file to match. Keep the number deterministic and cited; do not substitute an LLM rewrite for the score.
