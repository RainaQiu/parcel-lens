# LDES v2.3 parcel screening

The default workflow has no housing scenario or unit count. Selecting a parcel automatically checks all five housing use paths in the verified Pittsburgh §911.02 base-district table. Each row is an output; a prohibited row does not imply that the whole parcel needs a use variance.

For one verified base district, the zoning summary is GREEN if any row is `P`, AMBER if there is no `P` but at least one row is `A`, `S`, `C`, or `P_OR_S`, and RED only if all five rows are `NOT_PERMITTED`. Missing or unverified cells, split base districts, or untreated overlays make the zoning summary UNRATED. This color says only whether a listed housing use path exists. It does not assess proposed unit count, dimensional rules, parking, permits, or financial feasibility.

Environmental/geotechnical and historic/condition dimensions remain separate. The headline uses the most severe rated suitability dimension; a missing critical dimension makes it UNRATED. Development potential stays UNRATED until setbacks, coverage, height/FAR, parking, open space, and access are actually evaluated. The version identifiers are `LDES-v2.3-parcel-screen` and `LDES-v2.3-parcel-screen-rules`; use-table cell versions are recorded separately.

The v2.2 fixture suite remains as historical regression coverage for explicit scenario evidence. The default product path uses the five-row screen. Live source status and provenance appear in the parcel report.

Four [public real parcel cases](verification/real-parcel-cases.md) cover a routine single district, a district with both permitted and prohibited housing uses, a split-zoned parcel, and a parcel with major geotechnical overlaps. A successful zero-overlap clip is distinguished from a positive boundary sliver.
