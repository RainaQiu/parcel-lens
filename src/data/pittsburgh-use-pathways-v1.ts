import type { HousingUseType, UsePathway, UsePathwayCell } from '../lib/types'

export const USE_TABLE_RULE_VERSION = 'pittsburgh-use-pathways-v1'
export const USE_TABLE_CODE_AS_OF = '2026-06-11'
export const USE_TABLE_SOURCE_URL = 'https://ecode360.com/45476784'
export const USE_TABLE_VERIFIED_AT = '2026-09-27'
export const USE_TABLE_VERIFIED_BY = 'parcel-lens-ldes-v2.2'

export const HOUSING_USES: Array<{ id: HousingUseType; label: string }> = [
  { id: 'single_unit_detached', label: 'Single-unit detached' },
  { id: 'single_unit_attached', label: 'Single-unit attached' },
  { id: 'two_unit', label: 'Two-unit' },
  { id: 'three_unit', label: 'Three-unit' },
  { id: 'multi_unit', label: 'Multi-unit (4+)' },
]

export const SECTION_911_02_DISTRICTS = [
  'R1D',
  'R1A',
  'R2',
  'R3',
  'RM',
  'NDO',
  'LNC',
  'NDI',
  'UNC',
  'HC',
  'GI',
  'UI',
  'UC-MU',
  'UC-E',
  'R-MU',
  'P',
  'H',
  'EMI',
  'GT',
  'RIV-RM',
  'RIV-MU',
  'RIV-NS',
  'RIV-GI',
  'RIV-IMU',
] as const

export type Section91102District = (typeof SECTION_911_02_DISTRICTS)[number]

const STANDARD_69 = ['§911.04A.69']
const STANDARD_69A = ['§911.04A.69', '§911.04A.69A']
const STANDARD_85 = ['§911.04A.85']

function cells(
  useType: HousingUseType,
  listed: Partial<Record<Section91102District, UsePathway>>,
  standards: string[] = [],
): UsePathwayCell[] {
  return SECTION_911_02_DISTRICTS.map((districtKey) => {
    const pathway = listed[districtKey] ?? 'NOT_PERMITTED'
    const extra =
      useType === 'single_unit_attached' && districtKey === 'R1D' && pathway === 'P_OR_S'
        ? ['Lot width ≤ 35 ft is P; lot width > 35 ft is S (§911.04A.69A).']
        : []
    return {
      districtKey,
      useType,
      pathway,
      standards: pathway === 'NOT_PERMITTED' ? [] : [...standards, ...extra],
      sourceUrl: USE_TABLE_SOURCE_URL,
      codeAsOf: USE_TABLE_CODE_AS_OF,
      ruleVersion: USE_TABLE_RULE_VERSION,
      reviewStatus: 'verified' as const,
      verifiedAt: USE_TABLE_VERIFIED_AT,
      verifiedBy: USE_TABLE_VERIFIED_BY,
    }
  })
}

/** Encoded from eCode360 §911.02 as amended through Ord. 18-2026 (2026-06-11). Empty table cells are NOT_PERMITTED. */
export const PITTSBURGH_USE_PATHWAYS_V1: UsePathwayCell[] = [
  ...cells(
    'single_unit_detached',
    {
      R1D: 'P',
      R1A: 'P',
      R2: 'P',
      R3: 'P',
      RM: 'P',
      NDO: 'P',
      LNC: 'P',
      NDI: 'P',
      UNC: 'P',
      'R-MU': 'P',
      P: 'P',
      H: 'A',
      EMI: 'P',
    },
    STANDARD_69,
  ),
  ...cells(
    'single_unit_attached',
    {
      R1D: 'P_OR_S',
      R1A: 'P',
      R2: 'P',
      R3: 'P',
      RM: 'P',
      NDO: 'P',
      LNC: 'P',
      NDI: 'P',
      UNC: 'P',
      'UC-MU': 'P',
      'R-MU': 'P',
      H: 'S',
      'RIV-RM': 'P',
      'RIV-MU': 'P',
    },
    STANDARD_69A,
  ),
  ...cells('two_unit', {
    R2: 'P',
    R3: 'P',
    RM: 'P',
    NDO: 'P',
    LNC: 'P',
    NDI: 'P',
    UNC: 'P',
    'UC-MU': 'P',
    'R-MU': 'P',
    GT: 'P',
    'RIV-RM': 'P',
    'RIV-MU': 'P',
    'RIV-IMU': 'P',
  }),
  ...cells('three_unit', {
    R3: 'P',
    RM: 'P',
    NDO: 'P',
    LNC: 'P',
    NDI: 'P',
    UNC: 'P',
    'UC-MU': 'P',
    'R-MU': 'P',
    GT: 'P',
    'RIV-RM': 'P',
    'RIV-MU': 'P',
    'RIV-IMU': 'P',
  }),
  ...cells(
    'multi_unit',
    {
      RM: 'P',
      NDO: 'P',
      LNC: 'P',
      NDI: 'P',
      UNC: 'P',
      UI: 'S',
      'UC-MU': 'P',
      'UC-E': 'A',
      'R-MU': 'P',
      EMI: 'A',
      GT: 'P',
      'RIV-RM': 'P',
      'RIV-MU': 'P',
      'RIV-NS': 'P',
      'RIV-IMU': 'P',
    },
    STANDARD_85,
  ),
]
