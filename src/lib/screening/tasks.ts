import type { LdesEvidence } from '../types'
import { mappedConstraintRag } from './hazards'
import type { EvidenceGap, MappedConstraint, PathwaySummary, ReviewTask } from './types'

const sourceFor = (item: MappedConstraint) => item.source ? [item.source.sourceId] : [item.id]

export function deriveReviewTasks(
  evidence: LdesEvidence,
  pathway: PathwaySummary,
  constraints: MappedConstraint[],
  gaps: EvidenceGap[],
): ReviewTask[] {
  const tasks: ReviewTask[] = []
  const add = (task: ReviewTask) => { if (!tasks.some((existing) => existing.id === task.id)) tasks.push(task) }

  if (pathway === 'REVIEW_PATH_ONLY') add({
    id: 'housing-pathway-review', trigger: 'Only discretionary residential use listings were found.',
    whyItMatters: 'The listed housing uses need a separate approval or standards review; no by-right use was verified.',
    whoToConsult: 'Pittsburgh zoning staff', sourceRefs: [evidence.sources?.zoning?.sourceId ?? 'pgh-zoning'], scoreEffect: 'triggered',
  })

  for (const item of constraints) {
    if (item.status !== 'DETECTED') continue
    const floodway = item.id === 'fema' && item.category === 'FLOODWAY'
    const scoreEffect = mappedConstraintRag(item) === 'GREEN' ? 'routine' : 'triggered'
    add({
      id: `mapped-${item.id}`,
      trigger: floodway ? 'FEMA regulatory floodway overlaps the parcel.' : `${item.label} map overlaps the parcel.`,
      whyItMatters: floodway
        ? 'A floodway-specific review may apply; impact on the proposed footprint is unknown.'
        : 'The proposed construction or disturbance location is unknown, so project impact is unknown.',
      whoToConsult: item.id === 'slope' || item.id === 'landslide' || item.id === 'undermined'
        ? 'Pittsburgh planning staff and a surveyor or geotechnical professional'
        : item.id === 'fema' ? 'Local floodplain administrator' : 'Pittsburgh historic preservation staff',
      sourceRefs: sourceFor(item), scoreEffect,
    })
  }

  if (evidence.activeCondemned) add({
    id: 'active-condemned', trigger: 'Active condemned record is linked to this parcel.',
    whyItMatters: 'Confirm current status and applicability before a development decision.',
    whoToConsult: 'Pittsburgh Permits, Licenses, and Inspections',
    sourceRefs: [evidence.sources?.condemned?.sourceId ?? 'wprdc-condemned'], scoreEffect: 'triggered',
  })
  if (evidence.activeViolation) add({
    id: 'active-violation', trigger: 'Active violation record is linked to this parcel.',
    whyItMatters: 'Confirm the open issue and whether it affects a proposed project.',
    whoToConsult: 'Pittsburgh Permits, Licenses, and Inspections',
    sourceRefs: [evidence.sources?.violations?.sourceId ?? 'wprdc-violations'], scoreEffect: 'triggered',
  })

  for (const gap of gaps) add({
    id: `gap-${gap.id}`, trigger: gap.reason, whyItMatters: 'This part of the preliminary screen cannot be verified yet.',
    whoToConsult: 'Original data source or relevant city office', sourceRefs: gap.sourceRefs, scoreEffect: 'gap',
  })
  add({ id: 'project-footprint', trigger: 'Define the intended housing use, size, and construction location.',
    whyItMatters: 'Parcel-level map overlaps do not locate the proposed building or disturbance.',
    whoToConsult: 'Project architect, surveyor, and planning staff', sourceRefs: [], scoreEffect: 'routine' })
  add({ id: 'site-control-economics', trigger: 'Verify land control, engineering cost, and financial assumptions.',
    whyItMatters: 'These project-specific factors are outside the parcel screen.',
    whoToConsult: 'Owner, developer, and cost adviser', sourceRefs: [], scoreEffect: 'routine' })
  return tasks
}
