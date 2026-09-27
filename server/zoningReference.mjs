import reference from './data/pittsburgh-zoning-reference-v1.json' with { type: 'json' }

const sourceById = new Map(reference.sources.map((source) => [source.sourceId, source]))
const baseCodes = Object.keys(reference.baseDistricts).sort((a, b) => b.length - a.length)
const densityCodes = Object.keys(reference.developmentSubdistricts).sort((a, b) => b.length - a.length)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalizeInput = (value) => String(value ?? '').toUpperCase().replace(/[‐–—]/g, '-').replace(/\s+/g, ' ').trim()

function codePattern() {
  const bases = baseCodes.map(escapeRegExp).join('|')
  const densities = densityCodes.map(escapeRegExp).join('|')
  return new RegExp(`(?<![A-Z0-9])(${bases})(?:[- ](${densities}))?(?![A-Z0-9])`, 'i')
}

const zoningCodePattern = codePattern()

export function parseZoningCode(value) {
  const match = normalizeInput(value).match(zoningCodePattern)
  if (!match) return null
  const baseCode = match[1].toUpperCase()
  const densityCode = match[2]?.toUpperCase() ?? null
  return { baseCode, densityCode, raw: densityCode ? `${baseCode}-${densityCode}` : baseCode }
}

function citationFor(sourceId) {
  const source = sourceById.get(sourceId)
  if (!source) return null
  return {
    sourceId: source.sourceId,
    reportSection: 'official zoning reference',
    kind: 'official',
    url: source.url,
    title: source.title,
    retrievedAt: reference.retrievedAt,
    provider: 'Pittsburgh Code',
  }
}

function unique(values) {
  return [...new Set(values)]
}

function textFor(baseCode, densityCode) {
  const base = reference.baseDistricts[baseCode]
  const density = densityCode ? reference.developmentSubdistricts[densityCode] : null
  if (!base) return null
  if (!density) {
    return `${baseCode} means ${base.label}. It is a ${base.kind} in the Pittsburgh zoning framework. The applicable use table, site standards, overlays, and parcel-specific review still determine what a particular project may do.`
  }
  return `${baseCode}-${densityCode} combines ${baseCode}, ${base.label}, with ${densityCode}, ${density.label}. The density suffix describes the development-density designation associated with that district. The code alone does not confirm project approval; the applicable use table, site standards, overlays, and parcel-specific review still apply.`
}

export function lookupZoningReference(question, context = {}) {
  const parsed = parseZoningCode(question)
  if (!parsed) return null
  const base = reference.baseDistricts[parsed.baseCode]
  const density = parsed.densityCode ? reference.developmentSubdistricts[parsed.densityCode] : null
  if (!base || (parsed.densityCode && !density)) return null
  const sourceIds = unique([...(base.sourceIds ?? []), ...(density?.sourceIds ?? [])])
  return {
    code: parsed.raw,
    baseCode: parsed.baseCode,
    densityCode: parsed.densityCode,
    answer: textFor(parsed.baseCode, parsed.densityCode),
    sourceIds,
    referenceFacts: [{ code: parsed.raw, baseCode: parsed.baseCode, baseLabel: base.label, densityCode: parsed.densityCode, densityLabel: density?.label ?? null }],
    citations: sourceIds.map(citationFor).filter(Boolean),
    address: context.address ?? null,
  }
}

function latestQuestion(request) {
  return [...(request.messages ?? [])].reverse().find((message) => message.role === 'user')?.content ?? ''
}

export function classifyParcelChatIntent(request, referenceResult = null) {
  const question = latestQuestion(request).toLowerCase()
  if (referenceResult) return 'zoning_reference'
  if (/\b(is|would|can|could|should|suitable|appropriate)\b[\s\S]*\b(school|hospital|commercial|retail|office|warehouse)\b/.test(question)) return 'unsupported_suitability'
  if (/\b(build|construct|project|apartment|duplex|housing|unit|home|residential)\b/.test(question) && /\b(can|could|would|should|build|construct|project|support|fit|work)\b/.test(question)) return 'project_scenario'
  if (/\b(current|latest|today|now|this year|effective|ordinance|regulation|rule|setback|parking|height|far|overlay|permit process)\b/.test(question)) return 'current_external'
  if (/\b(parcel|score|rag|grade|amber|green|red|unrated|report|pathway|constraint|hazard|evidence|verify|check|zoning)\b/.test(question)) return 'parcel_fact'
  return 'current_external'
}

export function getOfficialReferenceSources() {
  return reference.sources.map((source) => ({ ...source, retrievedAt: reference.retrievedAt, provider: 'Pittsburgh Code' }))
}

export function getOfficialReferenceVersion() {
  return reference.version
}
