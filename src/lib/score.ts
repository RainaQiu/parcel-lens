/** Deterministic Development Ease Score. Rubric: docs/Development_Ease_Score.md */
import { acresFrom } from './format'
import type { Barrier, ParcelScore, SelectedParcel } from './types'

const HIGH_ZONING = new Set([
  'R1D',
  'H',
  'P',
  'EMI',
  'SP',
  'GT',
  'OPR',
  'GPR',
  'UPR',
  'RIV',
])

const EASIER_ZONING = new Set(['LNC', 'UNC'])

const SMALL_LOT_SQFT = 2500
const SQFT_PER_ACRE = 43560

const UNSCORED = [
  'FEMA flood zone',
  'Steep slope overlay',
  'PLI / Building & Development permits',
]

function barrier(
  partial: Omit<Barrier, 'severity'> & { severity?: Barrier['severity'] },
): Barrier {
  const severity =
    partial.severity ??
    (partial.penalty >= 20 ? 'high' : partial.penalty >= 10 ? 'medium' : 'low')
  return { ...partial, severity }
}

function zoningPenalty(code: string): { penalty: number; title: string; detail: string } {
  const upper = code.toUpperCase()
  if (HIGH_ZONING.has(upper)) {
    return {
      penalty: 28,
      title: 'Higher-review zoning district',
      detail: `${upper} typically involves extra planning, institutional, or overlay review versus standard multi-family districts.`,
    }
  }
  if (upper.startsWith('RM')) {
    return {
      penalty: 12,
      title: 'Multi-unit residential zoning',
      detail: `${upper} allows housing, but density and site-plan rules still apply.`,
    }
  }
  if (EASIER_ZONING.has(upper)) {
    return {
      penalty: 6,
      title: 'Neighborhood commercial zoning',
      detail: `${upper} is generally more flexible for mixed-use or infill than single-family or special districts.`,
    }
  }
  return {
    penalty: 10,
    title: 'Local zoning constraints',
    detail: `District ${upper} is not among the easiest housing-oriented categories in this rubric.`,
  }
}

function currentUseBarrier(useDesc: string, classDesc: string): Barrier | null {
  const blob = `${useDesc} ${classDesc}`.toUpperCase()
  if (!blob.trim()) return null

  if (/\bVACANT\b|\bPARKING\b/.test(blob)) {
    return null
  }

  if (/\bINDUSTRIAL\b|\bUTILITY\b|\bGOVERNMENT\b/.test(blob)) {
    return barrier({
      id: 'use-constrained',
      penalty: 28,
      title: 'Constrained current use',
      detail: 'Industrial, utility, or government use usually means more conversion cost and policy review.',
      source: {
        name: 'WPRDC assessments',
        field: classDesc ? 'CLASSDESC' : 'USEDESC',
        value: classDesc || useDesc,
      },
    })
  }

  if (/\bAPART\b/.test(blob)) {
    return barrier({
      id: 'use-apartments',
      penalty: 18,
      title: 'Existing apartment building',
      detail: 'A large occupied apartment is harder to redevelop than vacant or underused land.',
      source: { name: 'WPRDC assessments', field: 'USEDESC', value: useDesc },
    })
  }

  return null
}

export function scoreParcel(selected: SelectedParcel): ParcelScore {
  const barriers: Barrier[] = []
  const zoning = selected.zoning
  const assessment = selected.assessment

  if (!zoning?.code) {
    barriers.push(
      barrier({
        id: 'zoning-missing',
        penalty: 10,
        title: 'Not on PGH zoning layer',
        detail: 'City zoning was not found at this parcel centroid, so district rules are incomplete.',
        source: { name: 'PGH zoning', field: 'zon_new', value: 'missing' },
      }),
    )
  } else {
    const z = zoningPenalty(zoning.code)
    barriers.push(
      barrier({
        id: 'zoning',
        penalty: z.penalty,
        title: z.title,
        detail: z.detail,
        source: { name: 'PGH zoning', field: 'zon_new', value: zoning.code },
      }),
    )
  }

  if (!assessment) {
    barriers.push(
      barrier({
        id: 'assessment-missing',
        penalty: 25,
        title: 'Incomplete assessment record',
        detail: 'Use, tax, and lot fields were not returned, so this score is capped by missing data.',
        source: { name: 'WPRDC assessments', field: 'PARID', value: 'missing' },
      }),
    )
  } else {
    const useFlag = currentUseBarrier(
      String(assessment.USEDESC ?? ''),
      String(assessment.CLASSDESC ?? ''),
    )
    if (useFlag) barriers.push(useFlag)

    const acres = acresFrom(assessment, selected.feature.properties.CALCACREAGE)
    const sqft =
      Number(assessment.LOTAREA) ||
      (acres !== null ? acres * SQFT_PER_ACRE : NaN)

    if (!Number.isFinite(sqft) || sqft <= 0) {
      barriers.push(
        barrier({
          id: 'size-unknown',
          penalty: 5,
          title: 'Lot size missing',
          detail: 'Parcel area is unknown, so bulk and setback feasibility cannot be checked.',
          source: { name: 'WPRDC assessments', field: 'LOTAREA', value: 'missing' },
        }),
      )
    } else if (sqft < SMALL_LOT_SQFT) {
      barriers.push(
        barrier({
          id: 'size-small',
          penalty: 10,
          title: 'Very small lot',
          detail: 'Lots under about 2,500 sq ft are harder to reuse for new housing without variances.',
          source: {
            name: 'WPRDC assessments',
            field: 'LOTAREA',
            value: String(Math.round(sqft)),
          },
        }),
      )
    }

    const tax = String(assessment.TAXCODE ?? '').toUpperCase()
    if (tax === 'E' || tax === 'P') {
      barriers.push(
        barrier({
          id: 'tax-exempt',
          penalty: 15,
          title: 'Exempt or PURTA tax status',
          detail: 'Exempt or public-utility tax status often means disposition or policy steps before private development.',
          source: {
            name: 'WPRDC assessments',
            field: 'TAXCODE',
            value: String(assessment.TAXDESC ?? tax),
          },
        }),
      )
    }
  }

  const penalty = barriers.reduce((sum, item) => sum + item.penalty, 0)
  const score = Math.max(0, Math.min(100, 100 - penalty))
  const band: ParcelScore['band'] =
    score >= 75 ? 'easier' : score >= 50 ? 'mixed' : 'harder'

  barriers.sort((a, b) => b.penalty - a.penalty)

  return { score, band, barriers, unscored: UNSCORED }
}

export function scoreSummary(result: ParcelScore): string {
  const top = result.barriers.slice(0, 2)
  if (top.length === 0) {
    return `This site scores ${result.score} (${result.band}). No major zoning, use, size, or tax barriers were flagged in the open records used here.`
  }
  const titles = top.map((item) => item.title.toLowerCase()).join(' and ')
  const rest =
    result.barriers.length > 2
      ? ` Additional flags: ${result.barriers
          .slice(2)
          .map((item) => item.title.toLowerCase())
          .join(', ')}.`
      : ''
  return `This site scores ${result.score} (${result.band}). The biggest barriers are ${titles}.${rest}`
}
