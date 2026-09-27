import {
  HOUSING_USES,
  PITTSBURGH_USE_PATHWAYS_V1,
  SECTION_911_02_DISTRICTS,
  USE_TABLE_RULE_VERSION,
  USE_TABLE_SOURCE_URL,
} from '../data/pittsburgh-use-pathways-v1'
import type { HousingPathwayRow, HousingUseType, Rag, UsePathway } from './types'

const SPECIAL_PREFIX = /^(SP|OPR|GPR|UPR|IPOD|MTOBOR|AP|CP|RP)([-_]|$)/

export type DistrictNormalization =
  | { kind: 'base'; districtKey: string; raw: string }
  | { kind: 'overlay'; overlayKey: string; raw: string }
  | { kind: 'special'; reason: string; raw: string }

export function pathwayRag(pathway: UsePathway): Rag {
  if (pathway === 'UNKNOWN') return 'UNRATED'
  if (pathway === 'P') return 'GREEN'
  if (pathway === 'NOT_PERMITTED') return 'RED'
  return 'AMBER'
}

export function normalizeDistrictKey(raw: string): DistrictNormalization {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!compact) return { kind: 'special', reason: 'empty zoning code', raw }
  if (SPECIAL_PREFIX.test(compact)) {
    return {
      kind: 'special',
      reason: 'Special planned or overlay district is outside the §911.02 base-district columns; check the specific plan text.',
      raw,
    }
  }
  const riv = compact.match(/^RIV[-_]?([A-Z]+)/)
  if (riv) {
    const sub = riv[1]
    const key = sub === 'RM' ? 'RIV-RM' : sub === 'MU' ? 'RIV-MU' : sub === 'NS' ? 'RIV-NS' : sub === 'GI' ? 'RIV-GI' : sub === 'IMU' ? 'RIV-IMU' : null
    if (key) return { kind: 'base', districtKey: key, raw }
    return { kind: 'special', reason: 'Riverfront subdistrict is not a §911.02 column.', raw }
  }
  if (/^UC[-_]?MU/.test(compact)) return { kind: 'base', districtKey: 'UC-MU', raw }
  if (/^UC[-_]?E/.test(compact)) return { kind: 'base', districtKey: 'UC-E', raw }
  if (/^R[-_]?MU/.test(compact) && !compact.startsWith('RM')) return { kind: 'base', districtKey: 'R-MU', raw }
  if (compact.startsWith('R1D')) return { kind: 'base', districtKey: 'R1D', raw }
  if (compact.startsWith('R1A')) return { kind: 'base', districtKey: 'R1A', raw }
  if (compact.startsWith('R2')) return { kind: 'base', districtKey: 'R2', raw }
  if (compact.startsWith('R3')) return { kind: 'base', districtKey: 'R3', raw }
  if (compact.startsWith('RM')) return { kind: 'base', districtKey: 'RM', raw }
  if (compact.startsWith('NDO')) return { kind: 'base', districtKey: 'NDO', raw }
  if (compact.startsWith('LNC')) return { kind: 'base', districtKey: 'LNC', raw }
  if (compact.startsWith('NDI')) return { kind: 'base', districtKey: 'NDI', raw }
  if (compact.startsWith('UNC')) return { kind: 'base', districtKey: 'UNC', raw }
  if (compact.startsWith('HC')) return { kind: 'base', districtKey: 'HC', raw }
  if (compact.startsWith('GI')) return { kind: 'base', districtKey: 'GI', raw }
  if (compact.startsWith('UI')) return { kind: 'base', districtKey: 'UI', raw }
  if (compact.startsWith('EMI')) return { kind: 'base', districtKey: 'EMI', raw }
  if (compact.startsWith('GT')) return { kind: 'base', districtKey: 'GT', raw }
  if (compact === 'P' || compact.startsWith('P-')) return { kind: 'base', districtKey: 'P', raw }
  if (compact === 'H' || compact.startsWith('H-')) return { kind: 'base', districtKey: 'H', raw }
  return { kind: 'overlay', overlayKey: compact, raw }
}

export function splitZoning(codes: string[]): { districts: string[]; overlays: string[]; districtKeys: string[] } {
  const districts: string[] = []
  const overlays: string[] = []
  const districtKeys: string[] = []
  for (const raw of codes) {
    const parsed = normalizeDistrictKey(raw)
    if (parsed.kind === 'base') {
      if (!districts.includes(raw.trim().toUpperCase())) districts.push(raw.trim().toUpperCase())
      if (!districtKeys.includes(parsed.districtKey)) districtKeys.push(parsed.districtKey)
    } else if (!overlays.includes(raw.trim().toUpperCase())) {
      overlays.push(raw.trim().toUpperCase())
    }
  }
  return { districts, overlays, districtKeys }
}

function cellFor(districtKey: string, useType: HousingUseType) {
  return PITTSBURGH_USE_PATHWAYS_V1.find(
    (cell) => cell.districtKey === districtKey && cell.useType === useType && cell.reviewStatus === 'verified',
  )
}

export function lookupHousingPathways(rawDistricts: string[]): HousingPathwayRow[] {
  const rows: HousingPathwayRow[] = []
  const seen = new Set<string>()
  for (const raw of rawDistricts) {
    const parsed = normalizeDistrictKey(raw)
    const identity = parsed.kind === 'base' ? parsed.districtKey : raw.toUpperCase()
    if (seen.has(identity)) continue
    seen.add(identity)
    for (const use of HOUSING_USES) {
      if (parsed.kind !== 'base') {
        rows.push({
          useType: use.id,
          useLabel: use.label,
          rawDistrict: raw,
          districtKey: parsed.kind === 'special' ? parsed.raw : parsed.overlayKey,
          pathway: 'UNKNOWN',
          rag: 'UNRATED',
          standards: [],
          sourceUrl: USE_TABLE_SOURCE_URL,
          ruleVersion: USE_TABLE_RULE_VERSION,
          reviewStatus: 'unverified',
          notes:
            parsed.kind === 'special'
              ? parsed.reason
              : 'Zoning code is not a §911.02 base-district column.',
        })
        continue
      }
      const cell = cellFor(parsed.districtKey, use.id)
      if (!cell) {
        rows.push({
          useType: use.id,
          useLabel: use.label,
          rawDistrict: raw,
          districtKey: parsed.districtKey,
          pathway: 'UNKNOWN',
          rag: 'UNRATED',
          standards: [],
          sourceUrl: USE_TABLE_SOURCE_URL,
          ruleVersion: USE_TABLE_RULE_VERSION,
          reviewStatus: 'unverified',
          notes: 'No verified §911.02 cell for this district and use.',
        })
        continue
      }
      const notes: string[] = []
      if (cell.pathway === 'NOT_PERMITTED') {
        notes.push('Not listed in §911.02 base-district permitted pathways. This is not a permanent ban on all development.')
      }
      if (cell.pathway === 'P_OR_S') {
        notes.push('Verified dual path: lot width unknown, so the specific P vs S result is pending lot width.')
      }
      if (cell.useType === 'multi_unit' && cell.districtKey === 'UC-E') {
        notes.push('Administrator exception; see §911.04A.85.')
      }
      rows.push({
        useType: use.id,
        useLabel: use.label,
        rawDistrict: raw,
        districtKey: parsed.districtKey,
        pathway: cell.pathway,
        rag: pathwayRag(cell.pathway),
        standards: cell.standards,
        sourceUrl: cell.sourceUrl,
        ruleVersion: cell.ruleVersion,
        reviewStatus: cell.reviewStatus,
        notes: notes.join(' '),
      })
    }
  }
  return rows
}

export function districtKeysCovered(): readonly string[] {
  return SECTION_911_02_DISTRICTS
}
