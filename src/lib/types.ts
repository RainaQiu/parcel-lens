export type ParcelProperties = {
  PIN?: string
  MAPBLOCKLOT?: string
  MUNICODE?: number
  CALCACREAGE?: number
  MODIFIEDON?: string | null
}

export type ParcelFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParcelProperties
>

export type AssessmentRow = {
  PARID: string
  PROPERTYHOUSENUM?: string | number | null
  PROPERTYFRACTION?: string | null
  PROPERTYADDRESS?: string | null
  PROPERTYCITY?: string | null
  PROPERTYSTATE?: string | null
  PROPERTYUNIT?: string | null
  PROPERTYZIP?: string | number | null
  MUNICODE?: number | string | null
  MUNIDESC?: string | null
  SCHOOLCODE?: string | null
  SCHOOLDESC?: string | null
  LEGAL1?: string | null
  LEGAL2?: string | null
  LEGAL3?: string | null
  NEIGHCODE?: string | null
  NEIGHDESC?: string | null
  TAXCODE?: string | null
  TAXDESC?: string | null
  OWNERCODE?: number | string | null
  OWNERDESC?: string | null
  CLASS?: string | null
  CLASSDESC?: string | null
  USECODE?: string | number | null
  USEDESC?: string | null
  LOTAREA?: number | string | null
  SALEDATE?: string | null
  SALEPRICE?: number | string | null
  SALEDESC?: string | null
  DEEDBOOK?: string | null
  DEEDPAGE?: string | null
  CHANGENOTICEADDRESS1?: string | null
  CHANGENOTICEADDRESS2?: string | null
  CHANGENOTICEADDRESS3?: string | null
  CHANGENOTICEADDRESS4?: string | null
  COUNTYBUILDING?: number | string | null
  COUNTYLAND?: number | string | null
  COUNTYTOTAL?: number | string | null
  FAIRMARKETBUILDING?: number | string | null
  FAIRMARKETLAND?: number | string | null
  FAIRMARKETTOTAL?: number | string | null
  TAXYEAR?: number | string | null
  ASOFDATE?: string | null
}

export type ZoningInfo = {
  code: string
  description: string
  definitionUrl: string | null
  updatedAt: string | null
}

export type SearchHit = {
  PARID: string
  PROPERTYHOUSENUM?: string | number | null
  PROPERTYADDRESS?: string | null
  PROPERTYCITY?: string | null
  PROPERTYZIP?: string | number | null
  MUNIDESC?: string | null
}

export type SelectedParcel = {
  feature: ParcelFeature
  assessment: AssessmentRow | null
  zoning: ZoningInfo | null
}

export type Barrier = {
  id: string
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
  penalty: number
  source: { name: string; field: string; value: string }
}

export type ParcelScore = {
  score: number
  band: 'easier' | 'mixed' | 'harder'
  barriers: Barrier[]
  unscored: string[]
}
