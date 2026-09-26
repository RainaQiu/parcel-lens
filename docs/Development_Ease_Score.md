# ParcelLens Development Ease Score（LDES v2.0）

版本：`LDES-v2.0`｜2026-09-26｜文档规范，代码尚未按本版实现

## 1. 目标与适用范围

LDES 用于回答一个早期筛选问题：

> 对 **Pittsburgh 市内的一块地 + 一个明确的住宅开发方案**，现有公开数据已经显示出哪些 zoning、场地和容量障碍，是否值得进入下一轮人工尽调？

它不是许可结论、法律或工程意见，也不预测获批概率、开工时间或投资回报。同一地块更换住宅类型、套数、拟建足迹、法规版本或数据版本后必须重新计算。

本版将英国 Stage 2 site assessment 的分维度思路改写为适合 Pittsburgh 单地块筛选的结构，但不直接移植英国的法规或阈值：

1. **Suitability Score**：0–100，衡量已核验的 zoning、环境/地质及历史/现状约束。
2. **Development Potential**：容量区间与 RAG，判断所选方案在已知尺寸规则下是否放得下。
3. **Availability**：本版不评分；缺少业主出售意愿、site control、产权和租约等数据。
4. **Achievability / Financial Feasibility**：本版不评分；缺少项目级土地成本、租售收入、建设成本和融资结构。
5. **Delivery Timing**：本版不评分；公开记录不足以可靠预测审批、清场、融资和施工时间。

因此，`overall_result` 是 **Suitability + Development Potential 的初筛结论**，不是完整项目可行性结论。页面必须同时显示三个 `NOT_ASSESSED` 警示，不能把高分解释成“容易建成”或“值得投资”。

## 2. 与现有产品和数据的关系

当前 [`src/lib/score.ts`](../src/lib/score.ts) 仍是 v1 原型：从 100 分起扣除 zoning、现状用途、面积和税务状态罚分。该实现与本规范不一致，在完成 v2 数据接入和规则验证前不得标记为 `LDES-v2.0`。

### 2.1 数据覆盖状态

| 因素 | 数据目录状态 | v2 用法 | 当前限制 |
|---|---|---|---|
| Parcel ID、边界、面积 | 已有：Allegheny County Parcel Boundaries；Property Assessments | 识别地块、完整 polygon、面积和空间叠加 | 必须唯一匹配；评估表面积不能替代 polygon 校验 |
| Zoning district | 已有：Pittsburgh Zoning GIS | 用完整 parcel polygon 找出所有相交 district | 当前应用只做点查询并取第一条结果，不能满足 v2 |
| Zoning use pathway | 有官方 Zoning Code / use table | 按“district + housing scenario”映射 `P/A/S/C/not permitted` | 需要版本化规则和人工核验；不能仅按 district 名称猜测 |
| Overlay 与尺寸标准 | 目录有法规入口，尚未形成完整结构化规则 | 用于用途路径、退距、lot area、宽度、coverage、height/FAR、parking 等 | 关键规则缺失时 Development Potential 为 `Unknown` |
| 25%+ steep slope | 已有 GIS 图层 | 计算与 parcel/拟建范围的重叠比例 | 相交是复核线索，不等于不能建设 |
| Landslide-prone area | 已有 GIS 图层 | 场地/地质扣分 | 精度和图层日期必须随结果保存 |
| Undermined area | 已有 GIS 图层 | 场地/地质扣分 | 历史矿图可能不完整，需专业核查 |
| FEMA flood hazard | 有 NFHL；目录也含较旧资料 | 按最新可用 NFHL 分类 floodway、SFHA、0.2% zone | 旧提取文件只能作 fallback/context，不能覆盖当前 NFHL |
| Historic district / site | 已有 GIS / official records | 历史保护约束扣分 | district 与 individual site 分开记录 |
| PLI violations / condemned | 已有公开记录 | 仅对 active/unresolved 状态扣分 | 记录连接方式和状态字段需验证 |
| Permits / OneStopPGH / ZBA | 已有记录或人工入口 | 背景证据、下一步核查；可供 Jev 提取线索 | 历史许可不进入分数，也不代表当前项目会获批 |
| Building footprints | 已有 | 辅助估算现状占地和容量 | 不是拟建设计，不应直接当作 buildable envelope |
| Streets、curb cuts、water/sewer | 部分有数据 | 仅作证据或未核事项 | 缺合法 access、管线连接和 capacity 证据，不进入 v2 分数 |
| Owner willingness、site control、title、tenancy | 无稳定公开数据 | Availability | `NOT_ASSESSED` |
| Land price、rent/sales comps、cost、financing、subsidy | 现有数据不足以做项目 pro forma | Achievability | `NOT_ASSESSED`；县评估值/历史成交价不得冒充项目可行性 |
| Approval、clearance、finance、construction schedule | 无可靠统一数据 | Delivery Timing | `NOT_ASSESSED` |

“数据目录已有”不等于“应用已经接入”。只有查询成功、字段映射已验证并保存来源/日期后，该因素才可进入某次计算。

## 3. 运行前证据门槛

以下条件必须全部满足，才能生成 Suitability 数字分数：

- 唯一 `parcel_id`；
- 地块在 Pittsburgh 市界内；
- 有完整 parcel polygon，而非只有地址或中心点；
- 已处理全部相交 zoning district，并明确处理或排除 overlay；
- 用户选择了明确的住宅方案（至少 housing type 和 target units）；
- `district + scenario` 的用途路径已由版本化规则核验；
- steep slope、landslide、undermined 和 FEMA flood 查询均成功；
- historic district、individual historic site 查询成功；
- active violation、condemned 查询成功；
- 每条关键证据有来源 URL、数据/法规版本和查询日期。

任一必需项缺失时：

```text
score_status = INSUFFICIENT_DATA
suitability_score = null
suitability_band = UNRATED
```

缺失数据不得按零罚分处理，也不得因为“未发现记录”自动给绿。若用户尚未选择方案，只能展示 `parcel_constraint_band` 和已知事实，不能生成完整 LDES。

## 4. Suitability Score（0–100）

```text
suitability_score = zoning_pathway_points
                  + environmental_geotechnical_points
                  + historic_condition_points
```

三个模块合计 100 分。每个 driver 必须保存原始事实、分值影响、来源、日期和下一步建议；同一根因不得重复扣分。

### 4.1 Scenario zoning pathway（45 分）

按所有相交 district/overlay 中对当前方案最不利且适用的已核验路径计分。

| 当前方案的已核验路径 | 分值 |
|---|---:|
| `P` — permitted use | 45 |
| `A` — administrator exception | 35 |
| `S` — special exception | 23 |
| `C` — conditional use | 15 |
| Not permitted / use variance required | 0 |
| 路径未核验或规则冲突 | 不出分，返回 `UNRATED` |

若已确认当前方案不允许或需要 use variance，触发 zoning hard stop：

```text
zoning_hard_stop = true
suitability_score = min(calculated_score, 49)
```

这是对“当前方案不能按常规路径推进”的提示，不代表地块永久不可开发，也不保证 variance 申请结果。

### 4.2 Environmental & geotechnical（40 分）

```text
environmental_geotechnical_points =
  max(0, 40 - terrain_geotechnical_penalty - flood_penalty)
```

#### Terrain / geotechnical penalty（合计最高 25）

| 已核验事实 | 扣分 |
|---|---:|
| 25%+ slope overlap = 0% | 0 |
| overlap > 0% 且 ≤ 10% | 4 |
| overlap > 10% 且 ≤ 30% | 8 |
| overlap > 30% | 12 |
| 与 landslide-prone area 相交 | 10 |
| 与 undermined area 相交 | 10 |

坡地、滑坡和采空区合计扣分封顶 25。优先计算拟建范围的重叠；没有拟建足迹时使用 parcel overlap，并在结果中标注这一保守假设。

#### Flood penalty（最高 15）

| 最新可用 FEMA NFHL 分类 | 扣分 |
|---|---:|
| 已确认不在所查 flood hazard area | 0 |
| 0.2% annual chance flood hazard | 4 |
| Special Flood Hazard Area（SFHA） | 10 |
| Regulatory floodway | 15 |

若同一地块命中多个 flood category，使用最高扣分，不重复相加。

### 4.3 Historic & existing condition（15 分）

从 15 分起扣，模块最低为 0：

| 已核验事实 | 扣分 |
|---|---:|
| 位于 historic district | 6 |
| 命中 individual historic site | 10 |
| 存在 active/unresolved violation | 5 |
| 存在 active condemned status | 15 |

本模块合计扣分封顶 15。普通 permit history 不加分也不扣分；closed/resolved violation 不扣分，但可作为背景展示。

### 4.4 Suitability band

| 分数 | Band | 页面解释 |
|---|---|---|
| 80–100 | Green | 在已核验范围内观察到的初筛负担较少 |
| 60–79 | Amber | 存在中等程序、场地或现状约束 |
| 0–59 | Red | 存在较高约束或当前方案的重大路径问题 |
| `null` | Unrated | 关键证据不足，不能安全评分 |

颜色只描述本版核查范围，不代表整体开发容易度。

## 5. Development Potential（容量区间 + RAG）

Development Potential 不使用另一个任意的 0–100 分。它回答：在当前已知的 parcel geometry 和 zoning dimensional rules 下，所选方案的规模是否有合理空间。

### 5.1 输入

- gross parcel area；
- housing type、target units 和必要的 prototype assumptions；
- minimum lot area、lot width/frontage；
- front/side/rear setbacks；
- maximum lot coverage；
- height / FAR；
- parking 与 open-space requirement；
- overlay dimensional rules；
- floodway 等 hard exclusion area；
- 已知 access 对可建设范围的影响。

### 5.2 输出

- `gross_parcel_area`；
- `constrained_area` 及每类约束；
- `net_developable_area_range`；
- `capacity_range`；
- `target_units`；
- `development_potential_band`；
- `confidence`；
- `missing_inputs[]` 和 assumptions。

### 5.3 判定

| Band | 规则 |
|---|---|
| Green | `capacity_range.lower_bound >= target_units` |
| Amber | `target_units` 落在容量估计区间内 |
| Red | `capacity_range.upper_bound < target_units` |
| Unknown | 关键尺寸、停车、overlay 或 access 输入缺失，无法形成可信区间 |

该结果是初步 massing/capacity screen，不是建筑设计或 zoning approval。

## 6. Availability、Achievability 与 Delivery Timing

本版保留这些维度，是为了明确说明完整 site assessment 还缺什么；它们不进入分数，也不被隐藏。

### Availability — `NOT_ASSESSED`

至少需要：owner willingness to sell、site control/option、title defects、liens、tenancies/relocation、restrictive covenants、easements、public land disposition status 和预计可取得日期。

### Achievability / Financial Feasibility — `NOT_ASSESSED`

至少需要：asking/acquisition price、项目级 rent/sales comps、hard and soft costs、remediation/demolition costs、financing terms、subsidy eligibility/timing、operating assumptions 和 return/coverage thresholds。

- HUD Income Limits 以后可在 affordable-housing 模式中用于 AMI/租金假设，但不进入土地适宜性分数。
- HMDA 不适合单地块 MVP，删除。
- Zillow Research 只能提供区域市场背景，不能作为地块价格或项目收入，也不进入分数。

### Delivery Timing — `NOT_ASSESSED`

至少需要：site-control milestone、审批路径和队列、appeal 风险、清场/搬迁、设计和工程周期、utility upgrade、融资 closing、采购与施工计划。

## 7. Overall result

按以下顺序生成，先命中的规则优先：

| 优先级 | 条件 | `overall_result` |
|---:|---|---|
| 1 | `zoning_hard_stop = true` | `CURRENTLY_UNSUITABLE` |
| 2 | Development Potential = Red | `SELECTED_SCENARIO_DOES_NOT_FIT` |
| 3 | Suitability = Unrated 或 Potential = Unknown | `NEEDS_FURTHER_EVIDENCE` |
| 4 | Suitability = Green 且 Potential = Green | `STRONG_CANDIDATE` |
| 5 | 没有 Red，且至少一个 Amber | `CANDIDATE_WITH_CONDITIONS` |
| 6 | Suitability = Red 且无已确认永久性 hard stop | `MAJOR_CONSTRAINTS` |

每个 overall result 后必须紧跟：

```text
Availability: NOT_ASSESSED
Achievability / Financial Feasibility: NOT_ASSESSED
Delivery Timing: NOT_ASSESSED
```

禁止把 `STRONG_CANDIDATE` 翻译成“项目可行”“能获批”“能融资”或“会按期交付”。

## 8. 输出契约与可追溯性

最低输出字段：

```text
score_version = LDES-v2.0
score_scope = Suitability + Development Potential
parcel_id
scenario_id
rule_version
data_as_of
assessed_at
score_status
suitability_score
suitability_band
zoning_hard_stop
development_potential_band
overall_result
availability_status = NOT_ASSESSED
financial_feasibility_status = NOT_ASSESSED
delivery_timing_status = NOT_ASSESSED
drivers[]
missing_required[]
assumptions[]
not_assessed[]
```

每个 `driver` 至少包含：`factor`、`observed_value`、`score_effect`、`source_name`、`source_url`、`source_version/date`、`retrieved_at`、`reason`、`next_step`。

同一 `parcel + scenario + data_version + rule_version` 必须得到相同结果。规则、权重或阈值变化时必须升级 `score_version`，并保留旧结果的可解释性。

## 9. Jev 接口预留

Jev/LLM 只处理非结构化文本，不参与 GIS、法规事实或分数计算。

允许的任务：

- 从 permit、ZBA decision、violation narrative 中提取候选 issue；
- 将记录路由到预定义类别并给人工复核排序；
- 标记来源之间的可能矛盾；
- 返回原文片段、record ID、模型版本和置信度。

禁止的任务：

- 修改 Suitability 分数、hard stop 或 overall result；
- 推断空间相交、法定用途路径或未提供的事实；
- 把缺失数据补成“无风险”；
- 生成 Availability、财务可行性或 Delivery Timing 结论。

建议接口：

```ts
type JevEvidenceCandidate = {
  parcelId: string
  recordId: string
  sourceUrl: string
  recordDate: string | null
  category: 'permit' | 'zba' | 'violation' | 'other'
  issueCode: string | null
  excerpt: string
  confidence: number
  modelVersion: string
  requiresHumanReview: true
}
```

Jev 输出先进入 `evidence_candidates[]`；只有经结构化规则或人工核验后，事实才可进入 `drivers[]`。

## 10. 实施与验证顺序

1. 先替换点查询 zoning，完成 parcel polygon 与所有 district/overlay 的相交。
2. 建立版本化的 `district + scenario → P/A/S/C/not permitted` 规则表。
3. 接入并验证 slope、landslide、undermined、FEMA、historic、violation、condemned 查询。
4. 实现证据门槛和 `UNRATED`，再实现 Suitability 算术；不得先用缺失项跑出高分。
5. 结构化 dimensional rules，输出 Development Potential 容量区间；输入不足时返回 `Unknown`。
6. 用覆盖不同路径的真实 parcel + scenario 案例请 planner/developer/nonprofit 审阅；在本地案例与敏感性测试完成前，将权重标为实验性。
7. 最后再接 Jev，且先用标注样本测误报/漏报；Jev 失败时核心分数必须保持可用和确定。

## 11. 发布文案

推荐页面标题：

> **Development Ease — zoning & site screening**

推荐说明：

> This result screens public zoning, site-constraint, and preliminary capacity evidence for the selected parcel and housing scenario. Availability, financial feasibility, and delivery timing are not assessed. It is not a permit, engineering, legal, or investment conclusion.

本规范取代旧版“100 分起步、按 district/use/lot size/tax status 直接扣分”的说明。代码迁移完成前，UI 仍应标明其实际运行的是旧版原型，不能引用 `LDES-v2.0`。
