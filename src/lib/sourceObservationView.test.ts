import { describe, expect, it } from 'vitest'
import { publishedLabel, sourceObservationRows } from './sourceObservationView'
import type { OverlapFact, SourceObservation, SourceObservations } from './types'

const obs = <T,>(
  extra: Partial<SourceObservation<T>> & Pick<SourceObservation<T>, 'status'> & { value: T | null },
): SourceObservation<T> => ({
  sourceId: 'test',
  sourceUrl: 'https://example.org/source',
  sourceUpdatedAt: null,
  retrievedAt: '2026-09-27T12:00:00Z',
  joinMethod: 'polygon_clip',
  nAReason: null,
  ...extra,
})

describe('source observation presentation', () => {
  it('formats overlap, flood, zoning, and record facts instead of status enums', () => {
    const sources: SourceObservations = {
      zoning: obs({ status: 'available', value: ['R1D-VL', 'H'], joinMethod: 'point_lookup' }),
      slope: obs({ status: 'available', value: { overlapPct: 2.208, intersectionAreaSqft: 1234 } }),
      fema: obs({
        status: 'available',
        value: [
          { category: 'SFHA', overlapPct: 3, intersectionAreaSqft: 30 },
          { category: 'FLOODWAY', overlapPct: 0, intersectionAreaSqft: 0 },
        ],
      }),
      violations: obs({ status: 'available', value: 1, joinMethod: 'parcel_id' }),
    }
    const rows = sourceObservationRows(sources)
    expect(rows.map((row) => row.key)).toEqual(['zoning', 'slope', 'fema', 'violations'])
    expect(rows[0]).toMatchObject({
      label: 'Pittsburgh zoning',
      fact: 'R1D-VL, H',
      statusNote: null,
      joinLabel: 'Point lookup',
      publishedLabel: null,
    })
    expect(rows[1].fact).toBe('2.208% of parcel (1,234 sq ft)')
    expect(rows[2].fact).toBe('Special flood hazard area · 3% of parcel')
    expect(rows[3].fact).toBe('1 record')
  })

  it('says no overlap or no flood overlay instead of inventing a hit', () => {
    const rows = sourceObservationRows({
      slope: obs({ status: 'available', value: { overlapPct: 0, intersectionAreaSqft: 0 } }),
      fema: obs({ status: 'available', value: [] }),
    })
    expect(rows.find((row) => row.key === 'slope')?.fact).toBe('No overlap')
    expect(rows.find((row) => row.key === 'fema')?.fact).toBe('No flood overlay')
  })

  it('surfaces unavailable reasons without a fake zero overlap', () => {
    const rows = sourceObservationRows({
      landslide: obs<OverlapFact>({ status: 'unavailable', value: null, nAReason: 'slope timeout' }),
    })
    expect(rows[0].fact).toBe('slope timeout')
    expect(rows[0].statusNote).toBe('Unavailable · slope timeout')
  })

  it('omits a publication date when the source has none', () => {
    expect(publishedLabel(null)).toBeNull()
    expect(publishedLabel(undefined)).toBeNull()
    expect(publishedLabel('2025-01-15')).toBe('Published Jan 15, 2025')
  })

  it('keeps a stable display order and assessment PARID fact', () => {
    const rows = sourceObservationRows({
      condemned: obs<number>({ status: 'not_found', value: null, nAReason: 'No matching record', joinMethod: 'parcel_id' }),
      assessment: obs({
        status: 'available',
        value: { PARID: '0052G00030000000' },
        joinMethod: 'parcel_id',
        sourceUpdatedAt: '2024-07-01',
      }),
      zoning: obs({ status: 'available', value: ['RM-M'] }),
    })
    expect(rows.map((row) => row.key)).toEqual(['assessment', 'zoning', 'condemned'])
    expect(rows[0].fact).toBe('Matched PARID 0052G00030000000')
    expect(rows[0].publishedLabel).toBe('Published Jul 1, 2024')
    expect(rows[2].statusNote).toBe('No record found')
    expect(rows[2].fact).toBe('No matching record')
  })
})
