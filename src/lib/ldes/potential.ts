import type { Barrier, CapacityInputs, CriticalFlag, LdesEvidence, Rag } from '../types'
import { makeDriver } from './constants'
import { overlayHandled } from './zoning'

const REQUIRED_POTENTIAL = [
  'SETBACKS',
  'COVERAGE',
  'HEIGHT_FAR',
  'PARKING',
  'OPEN_SPACE',
  'OVERLAY_DIMENSIONS',
  'ACCESS',
] as const

export function computeCapacity(inputs: CapacityInputs): { lower: number; upper: number } | null {
  const parcelArea = inputs.parcelArea
  const setbackEnvelopeArea = inputs.setbackEnvelopeArea
  const maxLotCoverage = inputs.maxLotCoverage
  const maxHeight = inputs.maxHeight
  const assumedFloorToFloor = inputs.assumedFloorToFloor
  const maxFar = inputs.maxFar
  const assumedGrossAreaPerUnit = inputs.assumedGrossAreaPerUnit
  if (
    parcelArea === undefined ||
    setbackEnvelopeArea === undefined ||
    maxLotCoverage === undefined ||
    maxHeight === undefined ||
    assumedFloorToFloor === undefined ||
    maxFar === undefined ||
    assumedGrossAreaPerUnit === undefined ||
    inputs.parkingArea === undefined ||
    inputs.accessArea === undefined ||
    inputs.requiredOpenSpaceEffect === undefined ||
    inputs.commonCirculationArea === undefined
  ) {
    return null
  }
  const hardFree = parcelArea - (inputs.hardExclusionArea ?? 0)
  const coverageCap = parcelArea * maxLotCoverage
  const footprintCap = Math.min(setbackEnvelopeArea, coverageCap, hardFree)
  const heightStoryCap = Math.floor(maxHeight / assumedFloorToFloor)
  const allowedStories = Math.min(heightStoryCap, inputs.zoningStoryCap ?? heightStoryCap)
  const gfaFromGeometry = footprintCap * allowedStories
  const gfaFromFar = parcelArea * maxFar
  const grossFloorAreaCap = Math.min(gfaFromGeometry, gfaFromFar)
  const residentialArea =
    grossFloorAreaCap -
    inputs.parkingArea -
    inputs.accessArea -
    inputs.requiredOpenSpaceEffect -
    inputs.commonCirculationArea
  const capacity = Math.floor(Math.max(0, residentialArea) / assumedGrossAreaPerUnit)
  return { lower: capacity, upper: capacity }
}

export function scorePotential(evidence: LdesEvidence): {
  rag: Rag
  flags: CriticalFlag[]
  drivers: Barrier[]
  missing: string[]
} {
  const flags: CriticalFlag[] = []
  const drivers: Barrier[] = []
  const missing: string[] = []
  const potential = evidence.potential
  const overlaysPresent = evidence.overlayPresent ?? (evidence.overlays?.length ?? 0) > 0
  if (overlaysPresent && evidence.overlayDimensionsHandled === false) {
    missing.push('overlay dimensions')
    return { rag: 'UNRATED', flags, drivers, missing }
  }
  if (overlaysPresent && !overlayHandled(evidence) && evidence.overlayDimensionsHandled !== true) {
    missing.push('overlay dimensions')
    return { rag: 'UNRATED', flags, drivers, missing }
  }

  const present = new Set((potential?.presentInputs ?? []).map((item) => item.toUpperCase()))
  const listedMissing = (potential?.missingInputs ?? []).map((item) => item.toUpperCase())
  if (listedMissing.length) {
    missing.push(...listedMissing)
    return { rag: 'UNRATED', flags, drivers, missing }
  }
  if (present.size && REQUIRED_POTENTIAL.some((item) => !present.has(item))) {
    missing.push(...REQUIRED_POTENTIAL.filter((item) => !present.has(item)))
    return { rag: 'UNRATED', flags, drivers, missing }
  }
  if (potential?.minLotHeuristicOnly) {
    missing.push('dimensional capacity inputs beyond parcel area and min-lot')
    return { rag: 'UNRATED', flags, drivers, missing }
  }

  let lower = potential?.capacityLowerBound
  let upper = potential?.capacityUpperBound
  if ((lower === undefined || upper === undefined) && potential?.inputs) {
    const computed = computeCapacity(potential.inputs)
    if (computed) {
      lower = computed.lower
      upper = computed.upper
    }
  }

  if (lower === undefined || upper === undefined || potential?.criticalInputsComplete !== true || potential.minLotHeuristicOnly) {
    missing.push('setbacks, coverage, height/FAR, parking, open space, overlay dimensions, or access')
    return { rag: 'UNRATED', flags, drivers, missing }
  }

  const target = evidence.targetUnits
  if (target === undefined) {
    missing.push('project unit target not specified')
    return { rag: 'UNRATED', flags, drivers, missing }
  }
  let rag: Rag = 'RED'
  if (lower >= target) rag = 'GREEN'
  else if (upper >= target) rag = 'AMBER'
  else {
    rag = 'RED'
    flags.push('SCENARIO_CAPACITY_SHORTFALL')
    drivers.push(
      makeDriver({
        id: 'SCENARIO_CAPACITY_SHORTFALL',
        factor: 'capacity_range',
        title: 'Scenario does not fit',
        detail: `Capacity range [${lower}, ${upper}] is below the target of ${target} units.`,
        nextStep: 'Do not treat the current screening capacity as geometrically feasible on current rules.',
        observedValue: `[${lower},${upper}]`,
        rag,
        field: 'capacity_range',
      }),
    )
  }
  return { rag, flags, drivers, missing }
}
