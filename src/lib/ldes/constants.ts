import type { Barrier, CriticalFlag, DriverSource, Rag } from '../types'

export const RULE_VERSION = 'LDES-v2.3-parcel-screen-rules'
export const SCORE_VERSION = 'LDES-v2.3-parcel-screen' as const
export const TARGET_UNITS = 4
export const FIXED_SCENARIO_ID = 'fourplex-4' as const
export const GEOMETRY_VERSION = 'clip-v1'

export function driverSource(field: string, value: string, retrievedAt?: string): DriverSource {
  return { name: 'LDES v2.3 parcel screen evidence', field, value, version: RULE_VERSION, retrievedAt }
}

export function makeDriver(opts: {
  id: string
  kind?: Barrier['kind']
  factor: string
  title: string
  detail: string
  nextStep: string
  observedValue: string
  rag?: Rag
  severity?: Barrier['severity']
  field: string
}): Barrier {
  const kind = opts.kind ?? 'driver'
  return {
    id: opts.id,
    kind,
    factor: opts.factor,
    title: opts.title,
    detail: opts.detail,
    reason: opts.detail,
    nextStep: opts.nextStep,
    observedValue: opts.observedValue,
    rag: opts.rag,
    severity: opts.severity ?? (kind === 'context' ? 'context' : opts.rag === 'RED' ? 'high' : opts.rag === 'AMBER' ? 'medium' : 'low'),
    source: driverSource(opts.field, opts.observedValue),
  }
}

export function uniqueFlags(flags: CriticalFlag[]): CriticalFlag[] {
  return [...new Set(flags)]
}
