# Parcel Lens 前端数据连接交接

版本：v1.0｜2026-09-26｜面向前端开发

关联文档：[Track 1 数据评估与 PRD](Track1_Data_Assessment_and_PRD.md)

## 1. 交付目标

前端围绕同一个规范 `parcel_id` 展示地块边界、县评估、分区、环境图层、许可/案例和区域背景。页面必须区分：已核验事实、推导关联、区域背景、待人工复核和 N/A。不能为了填满页面而伪造 parcel ID，也不能把数据缺失解释成“没有风险”。

首版建议只把以下链路接成可演示闭环：

1. 搜索或地图点选确定一个 parcel。
2. 用 Parcel Boundaries 的 `PIN` 作为唯一规范 `parcel_id`。
3. 用该 ID 查询 Property Assessments。
4. 用完整 parcel polygon 与 zoning、25%+ steep slopes 做空间相交。
5. 把每个源的结果、关联方式、来源日期和失败原因汇总到统一报告。
6. 关键数据不足时显示 `unrated` / N/A，不计算“低风险”或默认分数。

Permit、FEMA、采空区、财务和区域指标按本文后续顺序增加，不阻塞首版。

## 2. 当前代码现状

| 能力 | 当前文件 | 当前做法 | 前端接手注意事项 |
|---|---|---|---|
| 地块边界 | `src/lib/arcgis.ts`、`src/map/ParcelMap.tsx` | `/api/parcels/query` 查询 Allegheny County ArcGIS；读取 `PIN`、`MAPBLOCKLOT`、`MUNICODE`、`CALCACREAGE`。 | `PIN` 是唯一规范 `parcel_id`。保留完整 polygon，后续所有空间关联都以它为输入。 |
| 地址/parcel 搜索 | `src/lib/ckan.ts`、`src/App.tsx` | 先查县评估表，再用 `PARID` 找边界。 | 地址可能返回多个 parcel，用户必须明确选择；不能默认取第一条。 |
| 县评估 | `src/lib/ckan.ts` | `/api/ckan/datastore_search`，用标准化 `PARID` 查询。 | 返回前应核验 `PARID` 与选中 `PIN` 相等；不相等或缺失时显示 N/A。 |
| Zoning | `src/lib/zoning.ts` | 用地块坐标平均值做单点查询，只取第一条 zoning。 | 必须改为完整 parcel polygon 相交并返回全部 district/overlay。完成前 UI 标“仅中心点初查”，不能声称覆盖整块地。 |
| 评分 | `src/lib/score.ts` | 0–100 扣分；缺 assessment/zoning 也扣分。 | 与新版 PRD 不一致。缺关键证据应为 `unrated`，不能扣分后生成貌似有效的分数。当前分数只能标为实验或暂时隐藏。 |
| 详情 UI | `src/panel/ParcelDetails.tsx` | 直接读取 `SelectedParcel` 中的 `feature`、`assessment`、`zoning`。 | 改为读取统一 `ParcelReport`；每个区块独立加载/失败，不因一个源失败清空其他结果。 |
| 本地代理 | `vite.config.ts` | Vite dev server 将 `/api/*` 转发到 ArcGIS/WPRDC。 | 该代理只在本地开发有效。生产部署必须提供同路径的 serverless/API proxy，或改用允许 CORS 的后端服务。 |

## 3. 统一前端数据模型

不要继续给 `SelectedParcel` 零散增加可空字段。建议引入统一报告模型，让页面只处理稳定状态，不直接猜测各源返回值。

```ts
export type ParcelLinkStatus =
  | 'exact_id'
  | 'derived_spatial'
  | 'derived_address'
  | 'regional_context'
  | 'manual_review'
  | 'n/a'

export type EvidenceStatus =
  | 'loading'
  | 'available'
  | 'partial'
  | 'not_found'
  | 'unavailable'
  | 'not_applicable'

export type Evidence<T> = {
  sourceId: string
  sourceName: string
  sourceUrl: string
  status: EvidenceStatus
  parcelLinkStatus: ParcelLinkStatus
  joinMethod: string
  matchQuality: 'high' | 'medium' | 'low' | null
  sourceRecordId: string | null
  sourceNativeParcelId: string | null
  sourceUpdatedAt: string | null
  retrievedAt: string
  geographicLevel: 'parcel' | 'zip' | 'county' | 'tract' | 'national' | null
  data: T | null
  nAReason: string | null
  needsReview: boolean
}

export type SpatialObservation = {
  intersects: boolean
  overlapAreaSqFt: number | null
  overlapRatio: number | null
  geometrySource: string
  crs: string
}

export type ParcelReport = {
  parcelId: string
  parcel: Evidence<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>>
  assessment: Evidence<AssessmentRow>
  zoning: Evidence<Array<ZoningDistrict & SpatialObservation>>
  steepSlope: Evidence<SpatialObservation>
  undermined: Evidence<SpatialObservation> | null
  flood: Evidence<FloodObservation> | null
  permits: Evidence<PermitRecord[]> | null
  regionalContext: Array<Evidence<RegionalIndicator>>
  constraintBand: 'green' | 'amber' | 'red' | 'unrated'
  missingRequired: string[]
  generatedAt: string
  ruleVersion: string
}
```

后端尚未提供聚合接口时，前端可以先在 `src/lib/report.ts` 中组装该模型；但 ArcGIS/CKAN 原始响应到统一模型的转换必须放在 adapter 层，不能散落在 React 组件中。

## 4. 数据源如何连接

| 数据源 | 连接方式 | 前端使用位置 | 无法连接时 |
|---|---|---|---|
| Parcel Boundaries | `PIN` → `parcel_id`，`exact_id` | 搜索结果、地图高亮、报告标题、所有后续请求 | 没有唯一边界则停止分析；显示 N/A 和“无法唯一定位地块”。 |
| Property Assessments | 标准化 `PARID` 后与 `PIN` 精确匹配 | 地址、面积、现状用途、评估/交易原始资料 | `PARID` 不命中时 assessment 区块 N/A；不要用地址静默替换。 |
| Zoning Districts | 完整 parcel polygon 与 zoning polygon 相交，`derived_spatial` | 分区事实、跨区/overlay、约束驱动项 | 几何/CRS/服务失败时 N/A；单点结果只能显示为“初查”。 |
| Steep Slopes | parcel polygon 与坡度 polygon 相交，`derived_spatial` | 环境约束、重叠面积/比例 | 未覆盖、服务失败和未相交是三个不同状态。前两者 N/A，只有成功计算且无命中才是 `intersects=false`。 |
| Undermined / FEMA | 同上；FEMA 另保留 zone、panel/community ID | Nice 4 环境区块 | 覆盖或版本未核实时 N/A，不给安全/正式洪水结论。 |
| PLI Permits | 有 parcel ID 则精确匹配；否则标准化地址，`derived_address` | Permit 历史 | 多候选/模糊匹配标 `manual_review`，显示“可能相关”，不进入自动等级。 |
| OneStopPGH / ZBA | application/case number 是记录键；用地址或经核验坐标找 parcel | 官方记录入口 | 无唯一候选时 `parcel_id=null`，显示 N/A 并保留官方链接。 |
| HUD、ACS、Census、CHAS 等 | ZIP/FIPS/GEOID 区域连接，`regional_context` | 区域背景/后续财务资料卡 | 必须显示区域层级和 vintage；不能写成“该 parcel 的属性”。 |
| BLS PPI | series ID + 月份，`n/a` parcel linkage | 未来财务情景 | 明示“非地块级数据”；`parcel_id=null`。 |

### Parcel ID 标准化

当前 `normalizePin()` 会移除空格和连字符、转大写并补足 16 位。前端可以继续用于输入和请求，但必须额外做到：

- 保存用户输入的原值用于排错；
- 只有边界服务实际返回的 `PIN` 才写入 `parcelId`；
- Assessment 的 `PARID` 必须再次标准化后与返回 `PIN` 比较；
- permit/application/case/GEOID/FIPS 永远不能赋给 `parcelId`。

## 5. 推荐调用顺序

```text
用户搜索/点地图
  → 获取唯一 Parcel Boundary
  → 确认 canonical parcel_id = feature.properties.PIN
  → 立即渲染边界和基础卡片
  → 并行请求 Assessment、Zoning polygon intersection、Steep Slope intersection
  → 每个请求独立更新 Evidence 状态
  → 必要证据齐全后计算 parcel_constraint_band
  → Permit / FEMA / 区域背景延迟加载
```

实施要求：

- 每次选择新地块都取消旧请求；现有 `AbortController` 模式可以保留。
- 用 `Promise.allSettled()` 或独立请求状态，不要用 `Promise.all()` 让一个源失败导致所有结果丢失。
- 请求响应必须检查当前 `parcelId`，避免快速切换地块时旧响应覆盖新页面。
- 缓存键至少包含 `parcelId + sourceId + sourceVersion`。
- 地图、侧栏和报告只能从同一个 `ParcelReport.parcelId` 读取。

## 6. 建议接口

最省前端工作量的目标接口：

```http
GET /api/parcels/{parcelId}/report
```

返回 `ParcelReport`。如果后端暂时不能聚合，保留以下细粒度接口：

```http
GET  /api/parcels/query?...                  # 已有：边界
GET  /api/ckan/datastore_search?...          # 已有：评估/搜索
POST /api/zoning/intersections               # 待加：body 传 parcel geometry
POST /api/environment/steep-slope/intersections
POST /api/environment/undermined/intersections
POST /api/environment/flood/intersections
GET  /api/permits?parcel_id=...&address=...
```

空间接口应由后端/proxy 调用外部服务，前端不要拼接超长 polygon URL。示例：

```json
{
  "parcel_id": "0000000000000000",
  "geometry": { "type": "Polygon", "coordinates": [] }
}
```

示例 Evidence 响应：

```json
{
  "sourceId": "pgh_zoning",
  "sourceName": "Pittsburgh Zoning Districts",
  "sourceUrl": "https://services1.arcgis.com/.../FeatureServer/0",
  "status": "available",
  "parcelLinkStatus": "derived_spatial",
  "joinMethod": "parcel_polygon_intersection",
  "matchQuality": "high",
  "sourceRecordId": "42",
  "sourceNativeParcelId": null,
  "sourceUpdatedAt": null,
  "retrievedAt": "2026-09-26T20:00:00Z",
  "geographicLevel": "parcel",
  "data": [{
    "code": "R1A-H",
    "description": "Residential Single-Unit Attached High Density",
    "intersects": true,
    "overlapAreaSqFt": 4100,
    "overlapRatio": 0.82,
    "geometrySource": "parcel boundary + zoning polygon",
    "crs": "EPSG:4326"
  }],
  "nAReason": null,
  "needsReview": false
}
```

N/A 示例：

```json
{
  "sourceId": "steep_slope_25",
  "status": "unavailable",
  "parcelLinkStatus": "n/a",
  "data": null,
  "nAReason": "Source service timed out; intersection was not calculated",
  "needsReview": true
}
```

## 7. 页面状态和文案规则

| 数据状态 | UI 标签 | 是否可进入自动等级 |
|---|---|---|
| `exact_id` + `available` | 已核验 parcel ID | 是 |
| `derived_spatial` + `available` | 空间关联 | 是，前提是 CRS、覆盖和版本已核验 |
| `derived_address` + high quality | 地址关联 | 可作为证据，但必须展示匹配质量 |
| `regional_context` | 区域背景（ZIP/County/Tract） | 否 |
| `manual_review` | 可能相关，待人工确认 | 否 |
| `n/a` / `unavailable` | N/A：附具体原因 | 否 |
| `not_found` | 已查询，未找到记录 | 视数据源而定；不得与服务失败混淆 |
| 空间计算成功且 `intersects=false` | 未发现图层重叠 | 可以作为已核查事实 |

每张证据卡至少显示：来源名称、原始链接、数据日期或获取日期、连接方法、匹配质量、N/A 原因。不要只用颜色表达状态。

## 8. 必须先改的前端问题

### P0：本轮先完成

1. 地址搜索多候选时禁止自动选择 `hits[0]`；要求用户点击具体结果。
2. 把 zoning 从中心点查询升级为 polygon intersection；升级前增加明显的“中心点初查”提示。
3. 接入 25%+ steep slope 空间结果，区分“未相交”和“N/A/未计算”。
4. 将 `Promise.all()` 改为独立 Evidence 状态，允许部分成功。
5. 把缺关键证据的评分改为 `unrated`；不允许用缺失值扣分后输出有效分数。
6. 所有字段缺失统一显示 `N/A` 或“无法判断”，并给出 `nAReason`；不要只显示破折号。
7. 每个关键结论提供来源链接、retrieved date 和关联方式。

### P1：基础链路稳定后

1. 增加 FEMA / undermined 图层。
2. 增加 permit 历史及 `manual_review` 状态。
3. 增加两地块同版本、同范围比较。
4. 增加报告下载，并确保导出保留来源和 N/A。

## 9. 前端文件建议

```text
src/
  lib/
    api/
      parcels.ts
      assessments.ts
      zoning.ts
      environment.ts
      permits.ts
    adapters/
      parcelEvidence.ts
      assessmentEvidence.ts
      spatialEvidence.ts
    report.ts
    reportTypes.ts
  hooks/
    useParcelReport.ts
  panel/
    ParcelReport.tsx
    EvidenceCard.tsx
    UnknownsCard.tsx
    SourceLink.tsx
```

组件只接收 `Evidence<T>` 或 `ParcelReport`，不直接接收 ArcGIS/CKAN 原始响应。这样换数据服务时，不需要重写页面。

## 10. 验收清单

- [ ] 地址返回多条结果时，用户必须明确选择，页面不会默认打开第一条。
- [ ] 地图、详情、证据报告始终显示同一个 `parcel_id`。
- [ ] Assessment 的 `PARID` 与 Parcel Boundary 的 `PIN` 已核验一致。
- [ ] Zoning 返回所有相交 district/overlay，不只取第一条或中心点命中。
- [ ] Steep slope 显示相交、未相交或 N/A，三种状态互不混淆。
- [ ] 任一数据源失败时，其他成功结果仍保留。
- [ ] N/A 带原因和下一步，不按 0、低风险或无障碍处理。
- [ ] `regional_context` 明确显示区域粒度，不写成 parcel 事实。
- [ ] `manual_review` 和模糊地址匹配不进入自动等级。
- [ ] 关键证据缺失时结果为 `unrated`。
- [ ] 每条关键证据都能打开原始来源，并显示日期和连接方式。
- [ ] 生产环境存在 `/api/*` 代理或后端，不依赖 Vite 本地 proxy。

## 11. 前后端对齐问题

前端开工前，请数据/后端负责人确认以下六项：

1. `PIN` 与 `PARID` 的真实长度、前导零和历史拆并规则。
2. Zoning/steep slope 空间计算是在后端完成，还是提供统一 GIS 服务。
3. 面积单位统一为平方英尺还是平方米，以及 `overlapRatio` 的计算口径。
4. 每个源的 `sourceUpdatedAt`、版本和覆盖范围从哪里取得。
5. 哪些 Evidence 是 `parcel_constraint_band` 的 required inputs。
6. 生产部署的 `/api/*` proxy/serverless 路径和超时策略。

在以上问题未确认前，前端可以完成数据模型、加载状态、N/A 展示和 mock adapter，但不要把 mock 结果标成真实地块结论。
