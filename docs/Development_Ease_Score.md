# ParcelLens Development Ease Score（LDES v2.1）

版本：`LDES-v2.1`｜2026-09-26｜文档规范，代码须按本版收紧后才能继续自称 `LDES-v2.x`

本版相对 v2.0 的收紧：禁止用区划字母猜用途路径；overlay 名称不等于已处理；只用最小地块面积不能判容量 green；多区划和已关闭违规必须作为背景列出；页面主结果不得用 100 分和 “Easier” 充当开发容易度。

## 1. 目标与适用范围

LDES 用于回答一个早期筛选问题：

> 对 **Pittsburgh 市内的一块地 + 一个明确的住宅开发方案**，现有公开数据已经显示出哪些 zoning、场地和容量障碍，是否值得进入下一轮人工尽调？

它不是许可结论、法律或工程意见，也不预测获批概率、开工时间或投资回报。同一地块更换住宅类型、套数、拟建足迹、法规版本或数据版本后必须重新计算。

本版将英国 Stage 2 site assessment 的分维度思路改写为适合 Pittsburgh 单地块筛选的结构，但不直接移植英国的法规或阈值：

1. **Suitability Score**：0–100，衡量已核验的 zoning、环境/地质及历史/现状约束。没扣分只表示“已核范围内没看到这些障碍”，不表示容易建成。
2. **Development Potential**：容量区间与 RAG，判断所选方案在已知尺寸规则下是否放得下。
3. **Availability**：本版不评分；缺少业主出售意愿、site control、产权和租约等数据。
4. **Achievability / Financial Feasibility**：本版不评分；缺少项目级土地成本、租售收入、建设成本和融资结构。
5. **Delivery Timing**：本版不评分；公开记录不足以可靠预测审批、清场、融资和施工时间。

因此，`overall_result` 是 **Suitability + Development Potential 的初筛结论**，不是完整项目可行性结论。页面必须同时、醒目地显示三个 `NOT_ASSESSED` 警示，以及现况建筑/评估值仅作背景、不进分数。禁止把高分、Green 或 `STRONG_CANDIDATE` 解释成“容易建成”“好开发”或“值得投资”。

默认住宅方案不得选用“最容易拿满分”的类型。在未做产品决策前，默认方案应为政策相关的多户情景（本产品为 `fourplex-4`），而不是 1-unit house。用户仍可手动改情景，但每次改情景必须重算。

## 2. 与现有产品和数据的关系

当前 [`src/lib/score.ts`](../src/lib/score.ts) 已按 v2 三模块加分，但仍违反本版门槛，在修正前不得标记为 `LDES-v2.1`。已知违规包括：

- 用 LNC/UNC/R1 等前缀表猜测 `P/A/S/C`，不是核验过的 use table；
- `overlayHandled = zoning 查询成功`，没有把 overlay 规则接到路径或尺寸；
- 容量只用 lot area ÷ 本地 min-lot，却把 `criticalInputsComplete` 设为 true，从而打出 potential green 和 `STRONG_CANDIDATE`；
- 页面主视觉是大号 0–100 分和 “Easier”；
- 已关闭违规和多区划不展示，造成“没有任何 driver”的假干净。

### 2.1 数据覆盖状态

| 因素 | 数据目录状态 | v2.1 用法 | 当前限制 |
|---|---|---|---|
| Parcel ID、边界、面积 | 已有：Allegheny County Parcel Boundaries；Property Assessments | 识别地块、完整 polygon、面积和空间叠加 | 必须唯一匹配；评估表面积不能替代 polygon 校验 |
| Zoning district | 已有：Pittsburgh Zoning GIS | 用完整 parcel polygon 找出所有相交 district 和 overlay | 必须列出全部相交区；两个及以上基地块必须作为背景 driver |
| Zoning use pathway | 有官方 Zoning Code / use table | 按已核验的 `district + housing scenario` 映射 `P/A/S/C/not permitted` | **禁止**按区划字母或分组（R1/RM/MX）猜测；未核验则 Suitability `UNRATED` |
| Overlay 与尺寸标准 | 目录有法规入口，尚未形成完整结构化规则 | overlay 必须改变路径、尺寸规则，或被书面排除 | 只查到 overlay 名称不算 handled；关键尺寸缺失时 Development Potential 为 `Unknown` |
| 25%+ steep slope | 已有 GIS 图层 | 计算与 parcel/拟建范围的重叠比例 | 相交是复核线索，不等于不能建设；bbox 重叠不能冒充真实 clip |
| Landslide-prone area | 已有 GIS 图层 | 场地/地质扣分 | 精度和图层日期必须随结果保存 |
| Undermined area | 已有 GIS 图层 | 场地/地质扣分 | 历史矿图可能不完整，需专业核查 |
| FEMA flood hazard | 有 NFHL；目录也含较旧资料 | 按最新可用 NFHL 分类 floodway、SFHA、0.2% zone | 旧提取文件只能作 fallback/context，不能覆盖当前 NFHL |
| Historic district / site | 已有 GIS / official records | 历史保护约束扣分 | district 与 individual site 分开记录 |
| PLI violations / condemned | 已有公开记录 | 仅对 active/unresolved 扣分；closed 必须作背景列出 | 记录连接方式和状态字段需验证 |
| 现况用途、建筑、评估值 | 已有评估与 footprint | 背景事实，不进 Suitability 分数 | 不得用评估值或成交价冒充可取得性或财务可行性 |
| Permits / OneStopPGH / ZBA | 已有记录或人工入口 | 背景证据、下一步核查；可供 Jev 提取线索 | 历史许可不进入分数，也不代表当前项目会获批 |
| Building footprints | 已有 | 辅助估算现状占地和容量 | 不是拟建设计，不应直接当作 buildable envelope |
| Streets、curb cuts、water/sewer | 部分有数据 | 仅作证据或未核事项 | 缺合法 access、管线连接和 capacity 证据，不进入 Suitability 分数 |
| Owner willingness、site control、title、tenancy | 无稳定公开数据 | Availability | `NOT_ASSESSED` |
| Land price、rent/sales comps、cost、financing、subsidy | 现有数据不足以做项目 pro forma | Achievability | `NOT_ASSESSED` |
| Approval、clearance、finance、construction schedule | 无可靠统一数据 | Delivery Timing | `NOT_ASSESSED` |

“数据目录已有”不等于“应用已经接入”。只有查询成功、字段映射已验证并保存来源/日期后，该因素才可进入某次计算。查询失败不得按零罚分，也不得因为“未发现记录”在查询未成功时自动给绿。查询成功且确认为无相交，才可以对该因素记 0 罚分。

## 3. 运行前证据门槛

以下条件必须全部满足，才能生成 Suitability 数字分数（`score_status = ASSESSED`）：

- 唯一 `parcel_id`；
- 地块在 Pittsburgh 市界内；
- 有完整 parcel polygon，而非只有地址或中心点；
- 已找出全部相交 zoning district，并列出全部 overlay；
- **overlay 已真正处理**：每条 overlay 要么已应用到用途路径或尺寸规则，要么被版本化规则书面排除。仅 GIS 相交成功或 `overlays = []` 不够；
- 用户选择了明确的住宅方案（至少 housing type 和 target units）；
- `district + scenario`（含适用 overlay）的用途路径来自**版本化、已人工核验的 use table**，不是 district 名称启发式；
- steep slope、landslide、undermined 和 FEMA flood 查询均成功；
- historic district、individual historic site 查询成功；
- active violation、condemned 查询成功；
- 每条关键证据有来源 URL、数据/法规版本和查询日期。

任一必需项缺失时：

```text
score_status = INSUFFICIENT_DATA
suitability_score = null
suitability_band = UNRATED
overall_result = NEEDS_FURTHER_EVIDENCE
```

缺失数据不得按零罚分处理。用本地 prototype / 字母分组表代替核验 use table 时，视为路径未核验，必须 `UNRATED`，不得打出 45 分的 `P`。

若用户尚未选择方案，只能展示 `parcel_constraint_band` 和已知事实，不能生成完整 LDES。

## 4. Suitability Score（0–100）

```text
suitability_score = zoning_pathway_points
                  + environmental_geotechnical_points
                  + historic_condition_points
```

三个模块合计 100 分。每个 driver 必须保存原始事实、分值影响、来源、日期和下一步建议；同一根因不得重复扣分。

在 planner/developer 本地案例校准完成前，权重为实验性：`weights_status = EXPERIMENTAL`。算术仍用 0–100，但页面不得把 100 表现为“最容易开发”，也不得省略实验性标注。

### 4.1 Scenario zoning pathway（45 分）

按所有相交 district/overlay 中对当前方案最不利且适用的**已核验**路径计分。

| 当前方案的已核验路径 | 分值 |
|---|---:|
| `P` — permitted use | 45 |
| `A` — administrator exception | 35 |
| `S` — special exception | 23 |
| `C` — conditional use | 15 |
| Not permitted / use variance required | 0 |
| 路径未核验、规则冲突，或仅按 LNC/UNC/R1 等前缀猜测 | 不出分，返回 `UNRATED` |

若已确认当前方案不允许或需要 use variance，触发 zoning hard stop：

```text
zoning_hard_stop = true
suitability_score = min(calculated_score, 49)
```

这是对“当前方案不能按常规路径推进”的提示，不代表地块永久不可开发，也不保证 variance 申请结果。

**多区划：** 相交基地块 ≥ 2 时，路径仍取最严的一条，但必须增加一条背景 driver（`score_effect = 0`）：列出全部 district，说明审批可能要同时满足多个区。不得因为两条都映射到 `P` 就当作单一区划、不展示。

**方案与现况用途：** 现况为商业、工业或已有多户，而所选方案为 1-unit house 时，不因此改路径分，但必须增加一条背景 driver（`score_effect = 0`），说明这是情景筛选结果，不是“改成单户更容易开发”。

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

坡地、滑坡和采空区合计扣分封顶 25。优先计算拟建范围的重叠；没有拟建足迹时使用 parcel overlap，并在结果中标注这一保守假设。slope overlap 必须基于真实 polygon clip；bounding-box 重叠只能作为临时实现，且在用 bbox 时不得声称 overlap 已核验到 v2.1 精度。

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

本模块合计扣分封顶 15。普通 permit history 不加分也不扣分。

**已关闭违规：** `closed/resolved` violation 不扣分，但只要查询成功且存在此类记录，就必须作为背景 driver 列出（`score_effect = 0`），至少包含最近状态和案件类型。禁止在存在关闭记录时输出“No scored suitability drivers were flagged”而不提合规史。没有记录才可以不列。

### 4.4 Suitability band

| 分数 | Band | 页面解释 |
|---|---|---|
| 80–100 | Green | 在已核验范围内观察到的初筛负担较少 |
| 60–79 | Amber | 存在中等程序、场地或现状约束 |
| 0–59 | Red | 存在较高约束或当前方案的重大路径问题 |
| `null` | Unrated | 关键证据不足，不能安全评分 |

颜色只描述本版核查范围，不代表整体开发容易度。页面不得把 Green 写成 “Easier” 或“好开发”。

## 5. Development Potential（容量区间 + RAG）

Development Potential 不使用另一个任意的 0–100 分。它回答：在当前已知的 parcel geometry 和 zoning dimensional rules 下，所选方案的规模是否有合理空间。

### 5.1 输入

必须尽量使用下列输入；缺关键项则不能形成 green/amber/red：

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

**明确禁止：** 仅用 `lot area ÷ 某个本地 min-lot 常数` 得到套数上界，并把 `criticalInputsComplete = true`。这只是面积启发式，只能写入 `assumptions[]`，**不能**单独支撑 Green / Amber / Red。

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
| Green | 关键尺寸输入齐全，且 `capacity_range.lower_bound >= target_units` |
| Amber | 关键尺寸输入齐全，且 `target_units` 落在容量估计区间内 |
| Red | 关键尺寸输入齐全，且 `capacity_range.upper_bound < target_units` |
| Unknown | 缺 setbacks、coverage、height/FAR、parking、适用 overlay 尺寸、access，或仅有 min-lot 启发式 |

该结果是初步 massing/capacity screen，不是建筑设计或 zoning approval。Potential = Unknown 时，`overall_result` 必须是 `NEEDS_FURTHER_EVIDENCE`，即使 Suitability 已是 Green 且数字分接近 100。

## 6. Availability、Achievability 与 Delivery Timing

本版保留这些维度，是为了明确说明完整 site assessment 还缺什么；它们不进入分数，也不被隐藏。现况用途、地上建筑评估值、历史成交价只能作为背景，不能填进这三个维度。

### Availability — `NOT_ASSESSED`

至少需要：owner willingness to sell、site control/option、title defects、liens、tenancies/relocation、restrictive covenants、easements、public land disposition status 和预计可取得日期。

### Achievability / Financial Feasibility — `NOT_ASSESSED`

至少需要：asking/acquisition price、项目级 rent/sales comps、hard and soft costs、remediation/demolition costs、financing terms、subsidy eligibility/timing、operating assumptions 和 return/coverage thresholds。

- HUD Income Limits 以后可在 affordable-housing 模式中用于 AMI/租金假设，但不进入土地适宜性分数。
- HMDA 不适合单地块 MVP，删除。
- Zillow Research 只能提供区域市场背景，不能作为地块价格或项目收入，也不进入分数。
- 县 `FAIRMARKET*`、`SALEPRICE` 只能展示为评估/历史成交背景。

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

`STRONG_CANDIDATE` 的触发条件很窄：路径已核验、overlay 已处理、容量关键尺寸齐全且 lower bound 盖住目标套数、Suitability Green。缺任何一项都不得使用该标签。

每个 overall result 后必须紧跟：

```text
Availability: NOT_ASSESSED
Achievability / Financial Feasibility: NOT_ASSESSED
Delivery Timing: NOT_ASSESSED
```

禁止把 `STRONG_CANDIDATE` 翻译成“项目可行”“能获批”“能融资”“会按期交付”或“容易开发”。推荐中性表述：**“初筛：zoning 与场地约束较少，容量初步放得下；可取得性、财务和工期未评估。”**

## 8. 输出契约与可追溯性

最低输出字段：

```text
score_version = LDES-v2.1
score_scope = Suitability + Development Potential
weights_status = EXPERIMENTAL
parcel_id
scenario_id
rule_version
data_as_of
assessed_at
score_status
suitability_score
suitability_band
zoning_hard_stop
intersecting_districts[]
overlays[]
overlay_handled          # true 仅当规则已应用或书面排除
development_potential_band
overall_result
availability_status = NOT_ASSESSED
financial_feasibility_status = NOT_ASSESSED
delivery_timing_status = NOT_ASSESSED
drivers[]                # 影响分数的项
context_drivers[]        # 多区划、关闭违规、现况用途等，score_effect = 0
missing_required[]
assumptions[]
not_assessed[]
```

每个 `driver` / `context_driver` 至少包含：`factor`、`observed_value`、`score_effect`、`source_name`、`source_url`、`source_version/date`、`retrieved_at`、`reason`、`next_step`。

同一 `parcel + scenario + data_version + rule_version` 必须得到相同结果。规则、权重或阈值变化时必须升级 `score_version`，并保留旧结果的可解释性。

## 9. Jev / LLM：暂不接入

本版暂不提供 Jev evidence 接口，也不把任何 LLM 输出接入评分链路。当前分数、hard stop、Development Potential 和 Overall Result 全部由结构化数据与确定性规则产生。

未来若接入 Jev，只能作为 permit、ZBA 或 violation 文本的待核线索，并必须经过人工/结构化规则核验；不得修改分数、补齐缺失数据或生成 Availability、财务可行性和 Delivery Timing 结论。

## 10. 实施与验证顺序

1. 完成 parcel polygon 与所有 district/overlay 的相交；多区划必须进入 `context_drivers`。
2. 用官方 use table 建立版本化 `district + overlay + scenario → P/A/S/C/not permitted`。在此之前 Suitability 保持 `UNRATED`，删除字母分组 prototype 表的计分资格。
3. overlay：无结构化规则则 `overlay_handled = false`，不能 `ASSESSED`；有规则则应用到路径或尺寸。
4. 接入并验证 slope（尽量真实 clip）、landslide、undermined、FEMA、historic、violation、condemned；关闭违规写入 `context_drivers`。
5. 先实现证据门槛和 `UNRATED`，再输出数字分；不得用缺失项或启发式跑出高分。
6. 结构化 dimensional rules，输出 Development Potential；只有 min-lot 时返回 `Unknown`。
7. 用覆盖不同路径的真实 parcel + scenario 案例请 planner/developer/nonprofit 审阅后再考虑去掉 `EXPERIMENTAL`。
8. 最后再接 Jev；Jev 失败时核心分数必须保持可用和确定。

## 11. 发布文案与页面层级

页面主结果必须按这个顺序，不得对调：

1. 标题：**Development Ease — zoning & site screening**
2. `overall_result` 的中性短句（或 `NEEDS_FURTHER_EVIDENCE`）
3. Suitability band 和 Development Potential band（Green / Amber / Red / Unrated / Unknown）
4. 三个 `NOT_ASSESSED` 行
5. `drivers[]` 与 `context_drivers[]`
6. 若 `ASSESSED`，数字分可作为次要细节，并标注 `LDES-v2.1 · experimental weights`

禁止：

- 用大号 0–100 作为第一视觉；
- 用 “Easier” / “Harder” 代替 Green / Red；
- 在 Potential = Unknown 或路径未核验时显示 `STRONG_CANDIDATE`；
- 在有关闭违规或多区划时写“未发现任何 driver”；
- 把 100 分读成满分开发容易度。

推荐说明：

> This result screens public zoning, site-constraint, and preliminary capacity evidence for the selected parcel and housing scenario. A high suitability number means few of the checked zoning and site flags fired. It does not mean the project is easy to build. Availability, financial feasibility, and delivery timing are not assessed. It is not a permit, engineering, legal, or investment conclusion.

本规范取代 v2.0 中可被实现钻空子的表述：overlay 查询成功即 handled、字母分组可当 use table、min-lot 可当容量 green、页面以 100 分为主。代码符合第 3–5 节和第 11 节之前，UI 不得引用 `LDES-v2.1`。
