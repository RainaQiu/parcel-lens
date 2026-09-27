import { describe, expect, it } from 'vitest'
import { deriveReviewTasks } from './tasks'
import type { LdesEvidence } from '../types'
import type { MappedConstraint } from './types'

const constraint = (id: MappedConstraint['id'], status: MappedConstraint['status'], category: MappedConstraint['category'] = null): MappedConstraint => ({
  id, label: id, status, category, overlapPct: status === 'DETECTED' ? 2.208 : 0,
  intersectionAreaSqft: status === 'DETECTED' ? 100 : 0, boundaryUncertain: false,
  projectImpact: status === 'DETECTED' ? 'UNKNOWN' : 'NOT_APPLICABLE',
  source: { sourceId: id, sourceUrl: 'https://example.org', sourceUpdatedAt: null, retrievedAt: '2026-09-27', joinMethod: 'polygon_clip' },
})
describe('review task derivation', () => {
  it('keeps routine diligence from creating a special review task', () => {
    expect(deriveReviewTasks({}, 'BY_RIGHT_PATH_IDENTIFIED', [], []).filter((task) => task.scoreEffect === 'triggered')).toHaveLength(0)
  })
  it('creates one review task for discretionary use', () => {
    expect(deriveReviewTasks({}, 'REVIEW_PATH_ONLY', [], []).filter((task) => task.scoreEffect === 'triggered').map((task) => task.id)).toEqual(['housing-pathway-review'])
  })
  it('uses a detected slope as a location check, not a project impact conclusion', () => {
    const tasks = deriveReviewTasks({}, 'BY_RIGHT_PATH_IDENTIFIED', [constraint('slope', 'DETECTED'), constraint('slope', 'DETECTED')], [])
    expect(tasks.filter((task) => task.id === 'mapped-slope')).toHaveLength(1)
    expect(tasks.find((task) => task.id === 'mapped-slope')?.whyItMatters).toContain('unknown')
  })
  it('gives floodway a distinct next step', () => {
    const task = deriveReviewTasks({}, 'BY_RIGHT_PATH_IDENTIFIED', [constraint('fema', 'DETECTED', 'FLOODWAY')], []).find((item) => item.id === 'mapped-fema')
    expect(task?.trigger).toContain('floodway')
  })
  it('flags active PLI records but not closed history', () => {
    const active: LdesEvidence = { activeCondemned: true, activeViolation: true, closedViolationCount: 4 }
    const ids = deriveReviewTasks(active, 'BY_RIGHT_PATH_IDENTIFIED', [], []).filter((task) => task.scoreEffect === 'triggered').map((task) => task.id)
    expect(ids).toContain('active-condemned')
    expect(ids).toContain('active-violation')
    expect(deriveReviewTasks({ closedViolationCount: 4 }, 'BY_RIGHT_PATH_IDENTIFIED', [], []).filter((task) => task.scoreEffect === 'triggered')).toHaveLength(0)
  })
  it('does not turn a boundary sliver into a confirmed trigger', () => {
    const sliver = { ...constraint('slope', 'NOT_DETECTED'), boundaryUncertain: true, overlapPct: 0.05, intersectionAreaSqft: 5 }
    expect(deriveReviewTasks({}, 'BY_RIGHT_PATH_IDENTIFIED', [sliver], []).filter((task) => task.scoreEffect === 'triggered')).toHaveLength(0)
  })
})
