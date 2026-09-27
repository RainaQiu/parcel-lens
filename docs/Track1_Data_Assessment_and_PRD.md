# Track 1 地块开发初筛工具：数据评估与产品需求草案

版本：v0.9｜2026-09-26｜工作线 3；明确 parcel 关联、置信度与 N/A 处理

## 1. 先说结论

**当前实现补充（2026-09-27）：** 默认报告已升级为 [LDES v3 限范围综合 RAG 初筛卡](LDES_v3_screening_scorecard.md)，满足 Track 1 的评分展示；以下条目保留需求调研时的原始取舍与历史背景。此 RAG 不代表具体项目获批、成本或财务可行性。

**产品要解决的问题**：用户可能只知道候选地块，尚未确定住宅类型或套数，需要先了解公开事实、分区和地形约束，再决定是否进入下一轮人工尽调。产品把证据、障碍、未知项和下一步放进可追溯报告；不作许可、法律、工程、融资或投资结论。

**建议的比赛演示范围**：只支持 Pittsburgh 市内地块；先完成“输入地块 → 确认边界 → 查分区与地形图层 → 展示地块约束、未知项与来源”。多地块比较是增强项；真实地块端到端演示放在收尾阶段。[官方挑战 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)提到 Development Ease Score；在没有具体建设方案时，当前颜色只能代表已核验的**地块约束**，不能冒称某项目的完整开发便利度。

**数据判断**：官方目录的 `Core` 是面向多个赛道的目录标签，不表示 Track 1 每条 Core 数据都必须接入。当前 Basic 首先依赖地块边界、分区地图和一个经核验的地形图层；具体住宅用途的法规映射留待方案功能。县评估、许可、市场和宏观数据只在对应功能中使用。第 3.1 节列出功能与数据源的关系，并标记暂缓项。

## 2. 案头研究：角色、任务与边界

### 2.1 资料能确认的事实

| 事实 | 产品含义 | 来源 |
|---|---|---|
| 比赛列出四类 persona 和四个 use case，成功标准包含单地块或多地块的 Development Ease Score、主要障碍、来源与人工复核点。 | 四类角色都要在需求中覆盖；不意味着比赛 MVP 必须做完四套工作流。 | [官方挑战 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit) |
| 即使分区允许双户住宅，具体地块仍要满足面积、退距和停车等其他要求。 | 分区用途分类不能写成“已获准建设”；尺寸与覆盖区未查时必须列为未知。 | [Pittsburgh Zoning FAQ](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Zoning-FAQ) |
| Pittsburgh 的 Zoning Review 有 Basic、Site Plan 和 Planning Commission 三类，具体取决于地点与项目；影响 25% 以上自然陡坡的开发可能进入 Planning Commission Review。 | 环境图层相交是审查线索，不能单独推断审批级别；报告提供官方复核入口。 | [City Planning：Planning Application and Process](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes) |
| OneStopPGH Insights 已公开展示规划/分区申请及许可等记录，并提供地图、统计和搜索。 | 竞品/现有工作流不是“没有数据”，产品价值应是围绕同一地块与方案整合证据并解释限制。 | [OneStopPGH Insights 导览](https://insightshelp.pittsburghpa.gov/) |
| Regrid 的 Pittsburgh 页面以地块地图为主界面，并有搜索、地块详情、图层、筛选和导出等功能。团队 [parcel-lens 仓库](https://github.com/RainaQiu/parcel-lens)已有地址/parcel ID 搜索、地图点选、边界高亮和地块详情侧栏的实现。 | **复用现有地图作为选地块与确认入口**，再接住宅方案与分析报告；不复制 Regrid 的项目管理、批量导入等高级功能。此处是代码检查，尚未运行验证。 | [Regrid Pittsburgh 页面](https://app.regrid.com/us/pa/allegheny/pittsburgh)、[App.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/App.tsx)、[ParcelMap.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/map/ParcelMap.tsx) |
| URA Rental Gap Program 的资格、承保和可负担性约束超出 zoning 与环境图层；PHFA 申请还要求地块、市场研究和资金证明等资料。 | 非营利机构可用本产品做土地/法规初筛，不能把结果称为整个可负担住房项目的融资或落地可行性。 | [URA Rental Gap Program](https://www.ura.org/pages/rental-gap-program)、[PHFA application guidelines](https://borrows.phfa.org/mhp/developers/housingapplication.aspx) |
| 用户提供的 #housing-sme-help 记录中，Steve Wray（City of Pittsburgh SME）指出：开发商和 nonprofit 的关键可行性问题之一是**财务可行性**，需要相似社区的租金/价值或销售可比数据。 | 这是后续财务调研线索；团队本轮暂缓 B12 财务资料与功能，不把现有地块数据误当作财务分析。 | 用户提供的 Slack 聊天记录，Steve Wray 回复 Het Sheth，2026-09-26 11:27 ET；尚无消息 permalink |
| 用户随后转述的评分回复明确表示**没有预设评分系统**，团队可以提出对潜在用户直观的系统，并以绿／黄／红作为示例（绿：按现状容易开发；黄：需变更许可或补贴；红：存在重大分区、财务或地形障碍）。 | 颜色是专家提出的**可选示例**，不是官方阈值或对 ParcelLens 规则的批准。团队可用易读的分级代替任意权重的数字；但当前原型缺财务和完整场地证据，不能把“绿色”解释为整体项目容易落地。 | 用户转述的 Slack 评分回复，2026-09-26；回答者身份、时间与消息 permalink 待补 |
| 市府持续讨论住房相关 zoning 修订；截至本版查到的市府页面，部分修订仍处审议流程。 | 政策分析视角必须标明法规生效状态与数据日期；拟议规则不能混入现行规则计算。 | [Housing Needs Assessment amendments](https://engage.pittsburghpa.gov/implementing-housing-needs-assessment)、[Zoning Amendment Hub](https://engage.pittsburghpa.gov/pittsburghs-zoning-code-amendment-hub) |

上表网页项目是**公开文件所载事实**；两条 Slack 回复属于**专家反馈**，其中评分回复的回答者尚未核实；团队地图能力已在浏览器用真实地块搜索与选中验证。下面的阈值、任务与优先级仍是团队待验证的**产品假设**。

### 2.2 四类 persona 的任务假设

| Persona | 典型输入与要做的决定 | 共用报告中首先要看的信息 | 不能由本次初筛替其决定 |
|---|---|---|---|
| Small/Mid-Size Developer（MVP 首要角色） | 已有候选地块，但可能还未确定住宅类型和套数；决定是否花钱进入下一轮尽调。 | 所属分区、地形约束、待核查事项及应咨询的部门。 | 买地、设计、获批概率与收益。 |
| Housing Nonprofit/CDC | 已有候选地块或社区项目目标；决定是否投入前期设计及向资助方准备材料。 | 与开发商共用的地块证据，另突出资金/地块控制/可负担性假设及 comps 仍需核实。 | 是否符合 URA/PHFA 项目资格、是否获资助及社区支持。 |
| Municipal Planner | 评估一处或多处候选地块；决定先复核哪项法规或引导申请人找哪个审查路径。 | 法规条文、证据日期、跨分区/覆盖区、人工审查点；多地块比较为增强项。 | 正式分区裁定、许可决定或批准时间。 |
| Policy Analyst | 研究某类住宅在哪些地块受规则或设施限制；决定应进一步调查什么政策障碍。 | 可比较的规则分类、数据覆盖率、版本与未知项；聚类和政策情景需规模化数据。 | 用单一地块样本推出社区级政策效益。 |

**MVP 核心决策**：是否值得进入下一轮人工尽调，以及下一轮先核实什么。**地理范围**：只含 Pittsburgh 市内；县地块数据的更广覆盖不代表市 zoning 规则适用于其他自治市。

### 2.3 Use case 分级与演示承诺

| 官方 use case | 本产品的可演示任务 | 优先级及前置条件 |
|---|---|---|
| 开发商输入 parcel ID，获得分数与障碍。 | 不要求预设户型/套数，先显示地块分区、地形约束、证据不足和全部已识别障碍。颜色仅表示已核验的地块约束。 | **Basic 主路径**：完成地块事实与图层分类；真实地块端到端演示最后收尾。 |
| 规划人员比较多个地块，寻找适合 starter home 的地点。 | 两块地按相同规则和图层版本并排显示分区、地形、障碍及未知项；没有住宅方案时不判断 starter home 用途许可。 | **有余力再做**：单地块链路稳定后；不得只比较不等价的等级。 |
| 城市识别低分地块，评估 zoning 改革或基础设施升级。 | 从低分原因进入法规/设施证据，区分已知障碍与数据缺失。 | **后续**：需要足够广的地块覆盖、可靠设施数据及经核验的政策情景规则。 |
| 机构按社区分数聚类安排投资。 | 聚合多个地块、展示覆盖率与分布，不把缺数据地区误判为低需求。 | **后续**：需要代表性数据、公平性审查和明确的投资决策标准。 |

### 2.4 信息架构决定

四类角色的详细 UI 与信息架构**暂缓规划（B10）**。当前主路径围绕地块、结果报告、证据与来源，不要求用户先确定住宅方案或套数。

**已有地图模型的产品位置**：把团队的 Regrid 式地图作为地块发现与确认画布。仓库已有地址/parcel ID 搜索、地图点选、边界高亮和地块详情。选定地块即可查看分区、地形和证据报告；不以住宅方案或套数作为入口门槛。详细 UI 留待 B10 规划。

**仓库代码与 PRD 的差距（不等于已修复）**：当前 [zoning.ts](https://github.com/RainaQiu/parcel-lens/blob/main/src/lib/zoning.ts)用单个计算点查询 zoning，只返回第一项；B4 要求处理地块跨区和 overlay，需由数据/接口工作线验证面相交或明确标记“尚未核查”。现有侧栏的成交价、县评估值不是完整财务分析，B12 功能暂缓。以上来自代码阅读，实际数据返回、部署及交互流畅度仍待运行测试。

## 3. 数据源筛选

下面的“可用性”是**截至 9 月 24 日的目录和来源页面核对**。尚未下载每个源的样本并验证字段、地块 ID 匹配率或 GIS 计算；这些是开工后第一批验证任务。P0=演示主路径，P1=基础路径跑通后增加，P2=本次不依赖。

| 级别 | 数据/入口 | 具体用途与连接方式 | 当前判断及风险 |
|---|---|---|---|
| **P0** | [Allegheny County Parcel Boundaries](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1) | 用 parcel/block-lot ID 找地块多边形，算面积，与其他图层做空间叠加。页面列出 Esri REST、GeoJSON、CSV、SHP；官方说明数据很大，可筛选下载，PASDA 是更权威入口。 | **必要，资源路径已找到**。目录中的无 `1` 结尾链接不正确。必须核实 ID 格式、坐标系与选定样本是否存在。 |
| **P0** | [Pittsburgh zoning GIS layer](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/ArcGIS/rest/services/PGHWebZoning/FeatureServer/0) | 地块多边形与 zoning 多边形空间相交，读取 `zon_new` 等分区字段。 | **必要，查询图层与字段已核对**。目录中的 WPRDC zoning 链接不稳定；先用市 ArcGIS 图层。一个地块可能跨区，必须显示多区而非随意取一个。 |
| **P1** | [City zoning page](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning) → [Zoning Code §911.02 use table](https://ecode360.com/45476784) | 后续用户确定具体用途时，按“分区 + 拟建住宅类型”查用途分类。 | 当前 Basic 只显示分区事实，不要求推断住宅用途或套数；法规映射在具体方案功能启动时再做。 |
| **P0** | [Pittsburgh 25%+ steep slope](https://data.wprdc.org/dataset/25-or-greater-slope) | 与地块做多边形相交，显示重叠面积/比例和相关风险。页面列 GeoJSON、REST、SHP。 | **优先的环境图层，资源格式已核对**。重叠只意味着可能要进一步审查，不能直接说“不能建”。 |
| **P1** | [County property assessments](https://data.wprdc.org/dataset/property-assessments) | 用 parcel/block-lot ID 补充地址、地块/建筑特征，帮助识别地块。页面有 CSV、API 版本和字典。 | **容易增加，但并非判断 zoning 的前置条件**。估值不是市场价；注意下载版与 API 版字段类型、日期格式不同。 |
| **P1** | [Pittsburgh undermined areas](https://data.wprdc.org/dataset/undermined-areas) | 地块与采空区图层相交，形成“需地质核实”标记。 | **适合第二个环境图层**。历史矿图可能不完整或不精确，不能据此作安全决定。 |
| **P1** | [FEMA National Flood Hazard Layer](https://www.fema.gov/flood-maps/national-flood-hazard-layer) | 地块与洪水区叠加，标记风险和图层版本。 | **价值高但接入较复杂**；应先核实所需图层、区域覆盖和空间精度。地图不是正式洪水认定。 |
| **P1** | [PLI permits](https://data.wprdc.org/dataset/pli-permits) | 展示相关地址或附近地块的许可历史，提示审批路径和数据证据。 | **用于历史背景，不是“住宅是否允许”的标签**。记录自 2019 年起；2024 年后 Building & Development Application 改变了分类。地址/地块连接、类型与状态要核验；不能把历史批准率变成当前项目获批概率。 |
| **P2** | [OneStopPGH](https://onestoppgh.pittsburghpa.gov/)、[ZBA decisions](https://www.pittsburghpa.gov/Business-Development/City-Planning) | 人工查现案或特殊例外的官方记录。 | 前者为交互门户，后者多为非结构化记录；周末不把自动批量抓取作为主路径。 |
| **P2** | PA DEP、PASDA/USGS LiDAR、PennDOT、OSM、销售/租金、HUD FMR/Income Limits | 更深入的环境、通行或财务分析。 | 先不接入。数据门户仍需挑具体层；道路邻近≠合法道路出入口，区域租金≠具体项目收入。 |

**明确排除**：ACS、CHAS、人口普查、HMDA、Zillow/Redfin 等宏观或区域市场指标，不应直接决定单个地块“是否容易获准建设”。如果以后增加财务 pro forma，再按其真实空间粒度和假设使用市场、收入及成本数据。

### 3.1 功能—数据依赖矩阵

以下映射以[官方 Public Data Catalog](https://docs.google.com/spreadsheets/d/19CKyt1kansUZ3VGOAOBihYYxNFuitx5VTkzOiEy4iXA/edit?gid=2076065299#gid=2076065299)的 `Data Catalog`、`Read Me` 和 `Brief Source Map` 三页为依据，并结合本产品的单地块主路径收窄。表中的 `Core`／`Useful` 沿用目录标签；**P0/P1/P2 才是本 PRD 的接入优先级**。目录给出的 “Typical update” 只是一般频率，报告仍须记录实际资源的版本或抓取日期。

| 功能 | 需要的数据集 | 进入功能的数据／连接方式 | 必需程度与缺失时行为 |
|---|---|---|---|
| **B1 找地块与失败状态** | [Allegheny County Parcel Boundaries](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1)（Core/P0）；[County Property Assessments](https://data.wprdc.org/dataset/property-assessments)（Core/P1） | 以标准化 `parcel_id`／block-lot 唯一定位地块；边界返回 polygon，评估表补地址等搜索线索。地址只用于候选匹配，不能代替 parcel ID。 | 边界与唯一 ID 是阻断依赖；无唯一匹配不运行。评估表失败时仍可按 parcel ID 工作，地址等字段显示未知。 |
| **B3 地块事实、地图与报告联动** | Parcel Boundaries（Core/P0）；Property Assessments（Core/P1） | `parcel_id` 是地图、详情和报告的主键；polygon 计算/校验面积，评估表提供地址、用途描述、评估值等原始记录。 | 边界或 ID 不一致时阻断分析。评估值、历史成交只放“原始地块资料”，不进入地块约束等级。 |
| **B4 Zoning 分区分类** | [市府 Zoning Map](https://pittsburghpa.maps.arcgis.com/apps/instant/sidebar/index.html?appid=4bb79ea64bf848b3a0560e3856efeccb) 与 [Pittsburgh Zoning Districts](https://data.wprdc.org/dataset/pittsburgh-zoning)（Core/P0，可接市 ArcGIS 图层）；Parcel Boundaries（Core/P0） | 用完整 parcel polygon 与 zoning polygon 相交，显示全部 district/overlay、代码及来源。 | 单点查询或跨区未处理时标未知；没有住宅方案时不做用途许可分类。 |
| **B5 一个环境图层** | [Pittsburgh Steep Slopes (25% or greater)](https://data.wprdc.org/dataset/25-or-greater-slope)（Core/P0）；Parcel Boundaries（Core/P0） | polygon spatial join；输出 `intersects`、重叠面积、占 parcel 比例、图层版本/日期与精度说明。 | P0 演示必须有一个已核环境层；图层失败时环境结论未知，并使依赖它的 B6 变为 `unrated`。相交只产生复核提示。 |
| **B6 地块约束等级** | B3–B5 的结构化输出；不直接读取新数据集 | 规则引擎读取分区交集、陡坡观察及版本，生成 `parcel_constraint_band`、`drivers[]`、`missing_required[]`；县评估值和市场数据不参与。 | 关键证据不齐为 `unrated`；不生成整体 Development Ease Score。LLM 不生成颜色或补齐事实。 |
| **B7 障碍、未知与下一步** | B4–B6 的 observations/drivers；官方来源 URL；可选 OneStopPGH/ZBA 人工入口 | 每个 driver 保存事实、影响、下一步部门/专业人员、原始来源、数据日期和规则版本；许可/案例入口只用于进一步核查。 | 缺来源或日期的 driver 不能列为已核验障碍；转入未知项。没有命中也要显示未检查的尺寸、overlay、基础设施等。 |
| **B8 可读解释及退化** | B3–B7 已结构化结果；无新增目录数据 | 模板或 AI 只能重述允许字段和核验过的规则；输入中保留来源、范围和未知状态。 | AI 服务失败时使用模板；不得改变 B6 等级、隐藏未知项或从常识补数据。 |
| **B9 日期、来源与边界** | 所有被调用资源的 metadata；官方目录 `Read Me` 的质量规则 | 为每条 evidence 保存 steward、resource URL、access format、retrieved_at、source_updated_at/vintage、字段定义、转换和适用地理范围。 | metadata 不完整时证据可展示为“待核版本”，但不得冒充当前事实；关键证据版本不明时 B6 可降为 `unrated`。 |
| **B10 暂缓** | 待团队规划 | 四类角色的 UI 与报告视角另行设计。 | 不计入当前 Basic。 |
| **B11 收尾** | B1–B9 实际使用的数据快照、规则版本和人工核验记录 | 最后固定一个真实 `parcel_id`，记录来源、版本、预期结果与人工核验。 | 不计入本轮 Basic 开发；合成 Mock 不冒充真实验证。 |
| **B12 暂缓** | 财务数据尚未确定 | 暂不做财务资料卡或分析。 | 不计入当前 Basic；评估值、成交价不得冒充财务可行性。 |
| **Nice 3 两地块比较** | 两块地各自的分区与地形证据 | 只在规则版本、数据源/vintage、图层覆盖和证据范围一致时逐字段比较；连接键仍为各自 parcel ID。 | 任一侧缺证据或版本不一致时可比较事实，不排序等级。 |
| **Nice 4 采空区/FEMA** | [Pittsburgh Undermined Areas](https://data.wprdc.org/dataset/undermined-areas)（Core/P1）；[FEMA National Flood Hazard Layer](https://www.fema.gov/flood-maps/national-flood-hazard-layer)（Core/P1）；Parcel Boundaries | 与 B5 相同的 polygon spatial join；保存命中类型、重叠范围、图层/面板或社区标识、版本和局限。 | 未核覆盖、精度或版本前不接入 B6。命中是专业复核线索，不是安全或正式洪水认定。 |
| **Nice 5 Permit 历史** | [PLI Permits](https://data.wprdc.org/dataset/pli-permits)（Core/P1）；[OneStopPGH](https://onestoppgh.pittsburghpa.gov/)（Core/P2）；ZBA decisions（Useful/P2） | PLI 有 parcel ID 时作精确关联，否则按标准化地址；OneStopPGH 用 application number 作记录键、按地址关联；ZBA 用 case number 作记录键，优先提取 parcel ID，否则按地址并进入人工复核。显示记录 ID、类型、状态、日期、关联质量和官方链接。 | 仅作历史背景/复核入口，不推断当前方案获批概率；多候选、模糊地址或无法唯一定位时不强行写入 parcel ID，显示“可能相关”或 N/A。 |
| **Nice 6 最小财务资料卡** | Property Sale Transactions（Core/P2）；HUD FMR（Core/P2）；HUD Income Limits、BLS PPI（Useful/P2）；Zillow/Redfin/Realtor.com 公共聚合数据（Core/P2）；用户手工样本 | 每个样本保存地址/区域、日期、类型、数值、来源、空间粒度和筛选理由；销售记录先过滤非正常/名义转让。 | 只作资料卡和假设记录，不自动形成投资建议或 `overall_band`；上市网站的公开聚合数据不等于 listing-level 数据授权。 |
| **Later 区域/政策/批量功能** | ACS、Decennial Census、CHAS、TIGER/Line、Census GEOID；再按功能加入 transit、EJScreen、NLCD 等 | 用 GEOID/FIPS 连接统计地理；维护 geography vintage crosswalk，并展示覆盖率、误差和缺失。 | 不回填到单地块许可判断。完成代表性、公平性和政策规则验证前，不开放社区排名或投资排序。 |

#### 3.1.1 Parcel 关联结果与 N/A 规则

`parcel_id` 只使用 Parcel Boundaries 中的规范 ID（当前实现字段为 `PIN`）。其他数据源的编号保留在 `source_native_parcel_id` 或 `source_record_id`，不得把 permit ID、application number、case number、ZIP、FIPS、GEOID 或面板号改名冒充 parcel ID。关联结果统一写入 `parcel_link_status`，并保留方法、质量和版本；无法安全落到唯一地块时，`parcel_id = null`。

| 数据源 | 原生 parcel ID 情况 | 处理后的 `parcel_link_status` | 关联方法与产物 | 无法可靠关联时 |
|---|---|---|---|---|
| Parcel Boundaries | 有：`PIN` | `exact_id` | 作为规范 `parcel_id`；先检查非空、唯一性、格式和几何有效性。 | 边界或 ID 缺失则该地块不可分析，显示 N/A 并停止依赖 parcel 的计算。 |
| Property Assessments | 有：`PARID` | `exact_id` | 规范化大小写、空格、连字符和前导零后与 `PIN` 对照；保存原值和变换记录。 | 无唯一匹配时 `parcel_id = null`，评估字段显示 N/A，不按地址自动覆盖。 |
| Property Sale Transactions | 通常有 parcel ID | `exact_id` | 先做与边界 ID 的一对一/一对多核验，再保留 sale/deed 记录键。 | 无 ID 或历史拆并地块无法确认时转 `manual_review`；价格不进入自动评分。 |
| Zoning Districts | 无 | `derived_spatial` | 以完整 parcel polygon 与 zoning polygon 相交，保存全部 district/overlay、重叠面积和比例。 | 几何、坐标系、覆盖或版本不可用时显示 N/A；不得退回单点结果冒充整地块结论。 |
| Steep Slopes、Undermined Areas | 无 | `derived_spatial` | polygon intersection；保存 `intersects`、`overlap_area`、`overlap_ratio` 和图层版本。 | 图层不可用、无覆盖或空间计算失败时显示 N/A；N/A 不等于未相交。 |
| FEMA NFHL | 无；有社区/面板等源标识 | `derived_spatial` | parcel polygon 与洪水图层相交，保留 zone、panel/community ID、图层版本和适用限制。 | 服务、覆盖、精度或版本无法核实则显示 N/A，不给出正式洪水认定。 |
| PLI Permits | 部分记录有 | 有 ID 为 `exact_id`；否则 `derived_address` | 有 parcel 字段时先与 `PIN` 校验；否则标准化地址并保存候选数、距离与匹配质量。 | 多候选或仅模糊匹配时 `parcel_id = null`、`needs_review = true`，显示“可能相关”或 N/A。 |
| OneStopPGH | 不把 application number 当 parcel ID | `derived_address` 或 `manual_review` | application number 作 `source_record_id`；用标准化地址或经核验坐标找候选 parcel。 | 没有地址、地理位置或唯一候选时显示 N/A，并保留官方记录入口。 |
| ZBA decisions | 有时在文本中出现 | `exact_id`、`derived_address` 或 `manual_review` | case number 作记录键；提取出的 parcel ID 必须回查边界，否则按地址生成候选并复核。 | 多候选、地址缺失或文本提取不确定时显示 N/A，不进入自动规则。 |
| Zoning Code | 不适用直接 parcel join | 继承 zoning evidence 的 `parcel_id` | 按 zoning district、法规章节、生效日期连接；代码文本自身不生成 parcel ID。 | district 或法规版本未知时规则结果显示 N/A，保留待核章节。 |
| HUD FMR、Income Limits、Zillow/Redfin/Realtor 区域聚合 | 无 parcel ID | `regional_context` | 按 ZIP、县、HUD Area 等区域键连接，并明确 `geographic_level`；只能作为区域背景。 | 无对应区域或 vintage 时显示 N/A；不得把区域数值写成该地块事实。 |
| ACS、Census、CHAS | 无 parcel ID | `regional_context` | 用 GEOID/FIPS 和统计区边界定位地块所属区域，保留 geography vintage 和误差。 | crosswalk 或边界版本不兼容时显示 N/A；不回填单地块许可判断。 |
| BLS PPI 等全国/行业指数 | 无且不适用 | `n/a` | 仅按 series ID、月份与财务情景连接，`parcel_id = null`。 | 页面显示“非地块级数据 / N/A”，只作情景背景。 |

**关联优先级与可用范围**：`exact_id` ＞ 已核验的 `derived_spatial` ＞ 唯一且高质量的 `derived_address` ＞ `manual_review`。只有前三类可作为地块证据；地址关联必须展示质量。`manual_review`、模糊匹配和 `n/a` 不进入自动等级或评分。`regional_context` 可在同一地块报告中展示，但必须标注区域粒度，不能转成 parcel-level claim。

**规范关联表 `parcel_data_link`** 至少保存：`parcel_id`、`source_id`、`source_record_id`、`source_native_parcel_id`、`parcel_link_status`、`join_method`、`match_quality`、`intersects`、`overlap_area`、`overlap_ratio`、`distance_m`、`geographic_level`、`source_version`、`retrieved_at`、`n_a_reason`、`needs_review`。同一源记录关联多个候选 parcel 时，每个候选单独一行，但在人工确认前均不得标成 `exact_id`。

**共享数据契约**：所有数据适配器至少输出 `source_id`、`source_url`、`steward`、`retrieved_at`、`source_updated_at`/`vintage`、`geographic_scope`、`parcel_link_status`、`source_native_parcel_id`、`join_method`、`match_quality`、`raw_identifier`、`n_a_reason`、`needs_review` 和 `transform_notes`。空间叠加另输出 `geometry_source`、`crs`、`intersects`、`overlap_area`、`overlap_ratio` 与精度/覆盖说明。这样 B6、B7、B9、Nice 3 和导出功能复用同一证据，不在页面层重新猜测来源。

### 3.2 数据进入产品前的验收清单

每个纳入的源必须记录：源机构、具体资源 URL、格式、下载/调用时间、数据更新时间、使用字段及定义、坐标系、许可/署名要求、缺失率。对同一个真实地块，验证：

1. 地块 ID 能在边界数据中唯一定位，图形在地图上落点正确。
2. 分区图层能返回分区编码；跨多个分区时能识别并显示。
3. 核对官方 Zoning Map 与 GIS 分区字段是否一致；没有具体住宅方案时，不推断用途许可。
4. 环境叠加的面积单位、坐标系及重叠比例经人工抽查。
5. 对每个有原生 parcel ID 的源，测量非空率、与边界 `PIN` 的精确命中率、一对多/多对一和历史拆并地块情况。
6. 对空间关联，核验坐标系、几何有效性、图层覆盖、边界接触规则及至少一个人工抽查样本；单点命中不能替代全 parcel polygon 相交。
7. 对地址关联，记录标准化步骤、候选数、距离和匹配质量；多候选或模糊匹配进入 `manual_review`，不得自动进入评分。
8. 对区域数据，核验 ZIP/FIPS/GEOID 与 vintage；页面必须显示区域粒度，不能把区域指标写成地块属性。

任一环节失败时，界面应显示“数据缺失/无法判断”或 N/A，并同时展示 `n_a_reason` 和可执行的下一步，保留已得到的证据；不得默默按低风险、零值或满分处理。N/A 表示当前无法形成可靠地块关联，不表示该风险、记录或现象不存在。

## 4. PRD：网站具体功能

### 4.1 用户流程

1. **在已有地图中找地块**：按 parcel ID 搜索、按地址查看候选项，或在地图点选。地址与 ZIP code 本身不是唯一地块 ID；用户必须确认一块具体地块。
2. **确认地块**：地图高亮边界，侧栏显示编号、可得地址、面积与 Pittsburgh 市界状态。无需先选住宅类型或套数；无法唯一定位时不运行分析。
3. **生成证据报告**：先展示地块分区、地形分类与等级适用范围，再展示全部已发现障碍、未知项、来源日期与人工复核步骤。
4. **行动或复核**：用户打开官方原始来源、记录待核查问题；数据源失败时仍可查看已取得的证据，并清楚知道哪项结果不可得。

### 4.2 Basic：必须完成

会议速读版：[B1–B12 白话解释](Track1_Basic_Plain_Language.md)。

| ID | 功能 | 可验收的具体表现 |
|---|---|---|
| B1 | 复用地图找地块、确认与失败状态 | 地图点选或 parcel ID 搜索定位同一 `parcel_id`；地址搜索如返回多个候选项，要求用户明确选择。空值、无匹配、市界外给出原因与下一步；无唯一地块时不计算。现有仓库已实现部分交互，须运行验证。 |
| B3 | 地块事实、地图与报告联动 | 地图高亮、详情侧栏和结果报告始终引用同一 `parcel_id`；边界、ID、面积和市界状态可追溯到来源。面积或地址缺失时显示“未知”，不填推测值。 |
| B4 | Zoning 分区分类 | 以[匹兹堡市官方 Zoning Map](https://pittsburghpa.maps.arcgis.com/apps/instant/sidebar/index.html?appid=4bb79ea64bf848b3a0560e3856efeccb)为参考，显示地块所相交的全部分区及其名称/代码、来源和日期；跨区或 overlay 单独列出。此时只做**地块所属分区**的事实分类；用户没有建设方案时，不推断某种住宅可建、可获准或可建多少套。该链接是分区地图，不是平地/山地图。 |
| B5 | 地形分类与环境图层 | 至少核查 25%+ 陡坡图层，显示是否与地块相交、经验证的重叠面积/比例和图层日期。界面可写“发现陡坡重叠／未发现重叠／数据不足”，避免未经定义阈值就把整块地称为“平地”或“山地”。相交不等于拟建足迹受影响，也不自动判断审批级别。 |
| B6 | 限范围地块约束等级 | 用可解释的绿／黄／红表示**已核查的分区与地形约束**，关键证据缺失时为灰色；没有建设方案时，不把颜色解释成某住宅项目的 Development Ease、获批概率或可建套数。显示规则版本、GIS 来源、判定链、已核验与未覆盖因素；结果由可测试规则生成，不由 LLM 生成。若后续要给特定项目打 Development Ease Score，须先定义方案并重新评估；百分制扣分仍仅是待校准实验，见 4.4。 |
| B7 | 所有已发现障碍、未知与下一步 | **完整列出**所有已识别障碍，不设 3 项上限；每项包含观察事实、影响解释、下一步核查对象和来源。摘要可突出最优先的几项，但完整列表必须可见。未知项独立列出，不算作零风险；无障碍时仍列出未检查项目。 |
| B8 | 可读解释及退化 | AI 解释只能使用已结构化的观察和核验过的规则；服务失败时模板化摘要仍可读，且不得改变事实或结论。 |
| B9 | 日期、来源与边界 | 每个关键结果显示来源、数据日期/获取日期及适用范围；结果首屏注明“早期初筛，需人工复核”。法规版本与拟议政策状态须可辨。 |

**暂缓项（保留原编号便于追踪，不计入当前 Basic）：** B10 四类角色的 UI 设计待团队另行规划；B11 真实地块可重复演示放在最后收尾阶段；B12 财务资料/功能待找到合适数据后再讨论。当前报告仍不得声称已评估财务或整体开发可行性。

### 4.3 有时间再加

| 级别 | 功能 | 前置条件 |
|---|---|---|
| Nice 1 | 用户明确方案后再做用途规则判断 | 用户自愿提供住宅类型及必要参数，规则经人工核验；改变方案须重新判断。 |
| Nice 2 | 多角色关注视角 | B10 的详细 UI 后续另行规划。 |
| Nice 3 | 固定 A 地块后搜索 B，逐行比较 | 同时显示两块地的分区、地形、障碍和未知项；仅在规则/数据版本及证据范围一致时比较地块约束等级。比赛原型可用两块明确标注的合成地块演示交互。 |
| Nice 4 | 采空区或 FEMA 洪水图层 | 已核对覆盖、空间精度与叠加结果。 |
| Nice 5 | Permit 历史或可下载报告 | 匹配质量、日期、来源及未知标记在展示/导出时均保留。 |
| Nice 6 | 最小财务资料卡：用户手动记录少量带日期/地址的可比租金或销售样本及假设 | 先向 developer/nonprofit SME 确认哪项输入确实影响早期决策；不把县评估值当租售 comps，不自动计算投资建议。 |
| Later | 政策情景、区域热力图、批量筛地、完整财务 pro forma、Agent/MCP | 另行验证广域数据覆盖、政策规则、投资标准与用户任务。 |

### 4.4 地块约束等级与未来 Development Ease Score：范围与规则

[官方挑战 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)没有预设公式；专家回复以红黄绿举例。[英格兰住房部门的地方规划地块评估草案指南](https://www.gov.uk/guidance/assessing-sites-for-local-plans-stage-2)也建议将适宜性、可取得性、可实施性分开评估，并优先使用 RAG。其**方法结构**可借鉴，但不是 Pittsburgh 法规，也不能把它的结论直接用于本市单地块许可。四种方案比较、Pittsburgh 法规依据、GIS/AHP 论文、Jev 适用边界及验证要求见 [评分方法与验证计划](Development_Ease_Scoring_Proposal.md)。

**待决风险：** 官方 use case 要求 Development Ease Score；本轮取消方案输入后，无法严谨评价特定住宅开发方案的 ease。当前先交付地块约束分类，团队须在最终提交前决定如何向评委解释这一范围差异，或在明确方案的后续流程补齐项目级评分。

**与现有实现的差距：** `main` 已有 [0–100 分实现与规则说明](Development_Ease_Score.md)，其输入、扣分和“Easier/Mixed/Harder”名称尚未按本次会议决定重新验证；尤其单点 zoning、缺少陡坡叠加及任意扣分权重，不能直接视为本版 B4–B6 已验收。产品和技术工作线需要一起决定保留为标明实验性质的演示，还是在真实报告中改为有证据门槛的地块约束分类。

- **当前 Basic 的等级：** `parcel_constraint_band = green | amber | red | unrated`，只指已核验的分区与地形约束，关键证据缺失为灰色。**不得称为某住宅方案的 Development Ease Score**；绿只表示当前核查范围内未发现约束，不表示可建或容易开发。
- **未评估维度：** 住宅用途、拟建规模、土地可取得性及财务情况均未进入当前判定；不生成整体 ease 等级。财务资料功能 B12 暂缓，但页面不得暗示已完成财务判断。
- **判定方法：** 以官方 Zoning Map/GIS 和 25%+ 陡坡图层为事实输入，按版本化规则分类。跨区、陡坡重叠及图层缺失应分别说明；单纯出现地图重叠不能自动判为不可开发。颜色旁显示原因、范围、来源、版本和下一步。将来若要回答具体住宅用途及规模，需另引入方案并重新设计、验证评分规则。
- **数值实验：** 团队提出的 100 起点扣分、严重障碍封顶/阻断可作为内部候选。具体扣分、阈值目前没有官方或本地实证依据；完成本地案例与敏感性校准之前，**不对外显示百分制**。Jev 可辅助非结构化文本提取，不决定法规结果或分数。

数据／接口工作线可并行准备 `parcel_constraint_band`、`scope`、`rule_version`、`drivers[]`（事实、原因、来源、日期）、`missing_required[]`、`not_assessed[]`。**目前原型只能真实显示灰色**：地块资料与单点 zoning 查询尚不足以覆盖全地块相交和陡坡叠加。真实地块端到端验证放在 B11 收尾阶段；跨地块只比较相同规则与证据范围。[评分方法提案](Development_Ease_Scoring_Proposal.md)仍描述“地块＋明确方案”的更完整方法，不直接作为本版无方案 Basic 的评分实现规范。

### 4.5 非功能与可用性要求

- 关键结论不只靠颜色表达；“未知”“需核实”“未发现图层重叠”使用不同文字。
- 来源链接在结果与导出物中可打开；图层、规则、数据快照日期可查。
- 部分数据源失败不清空已得到的证据；AI 失败不使报告不可用。
- 对屏幕较窄的设备保持阅读顺序：摘要 → 障碍 → 未知 → 证据 → 来源。

## 5. 页面与状态

- **地图工作台**：复用现有地图、地址/parcel ID 搜索与边界高亮。选中地块即可查看分区和地形证据，不要求先填写住宅方案。
- **统一结果报告**：保持地图上的同一选中地块；展示地块约束等级或灰色证据不足、所有已识别障碍、未知项与下一步。摘要可以突出优先项，完整列表仍可查看。现有估值/历史成交价只作为原始地块资料，不能混作财务结论。
- **关注视角**：B10 暂缓，具体角色 UI 和页面布局待团队另行规划。
- **加载/部分失败**：分步骤显示查找进度；某源失败时保留已取得内容，并指出失败源及其对等级判定的影响。
- **错误状态**：空 ID、无匹配、多匹配、市界外、跨区/overlay、规则未覆盖、来源失败和 AI 失败，各有明确下一步。

**示例结果文案（结构示意，非真实地块结论）**：

> Parcel `[经核实的 ID]`。地块所在分区为 `[待核对代码]`；与 25%+ 陡坡图层 `[相交/未相交/未知]`。尚未提供住宅类型和规模，因此不判断住宅用途是否允许、可建套数或许可路径。每条观察提供来源与日期。

本示例不展示绿色／黄色／红色，因为尚无完成必要核验的真实报告。

## 6. 演示验收标准

1. 从网页输入 parcel ID；结果与地图指向同一地块，不要求先填住宅类型或套数。
2. 分区和地形分类附可打开的官方来源、日期及未核实项。
3. 若展示红／黄／绿，仅称“地块约束等级”，说明覆盖范围；证据不足时显示灰色。不得称为特定住宅项目的完整 Development Ease Score。若另展示 0–100 实验分数，须完成文档中的校准与披露门槛。
4. 至少一个真实的“未知/需人工核实”出现，且不按零风险计算。
5. B10 角色 UI 验收暂缓，后续单独定义。
6. 从现有地图点选或搜索结果进入分析时，地图、详情侧栏和报告都保持同一地块；现有点查询 zoning 的限制不得隐藏。
7. 用户能查看**全部**已识别障碍及其官方复核入口；说明本报告不含具体项目、许可或财务结论。
8. B11 真实地块端到端演示和仓库交付说明是最后收尾验收项，不阻塞本轮 Basic 功能设计。

## 7. 并行推进与访谈回流

工作线 3 的 [Slack 专家访谈提纲](Track1_Expert_Interview_Guide.md)只询问案头资料无法回答的实践判断。**不把访谈回复作为 PRD、数据收集或接口设计的启动条件。** 当前版本先核对地块、分区、地形字段和页面/API 契约；具体住宅方案与财务功能另行规划。

| 决策 | 现在采用的可逆假设 | 晚到访谈如何回流 |
|---|---|---|
| 首要用户 | Small/Mid-Size Developer 的单地块早期尽调；公益项目和规划人员共用报告。 | 若多位专家明确指出另一类用户的决策更紧迫，调整摘要顺序和演示叙事；不重新采集同一地块事实。 |
| 报告内容 | 摘要 + 证据 + 未知 + 下一步并列；等级仅为有边界的辅助信息。 | 访谈可调整障碍排序和文案，不覆盖法规事实。 |
| 评分 | 当前仅考虑版本化的分区/地形约束分类，不用无方案等级代表整体 Development Ease；数值扣分暂为内部实验。 | 用真实地块请专家找误导性反例；具体方案评分另立规则。 |
| 财务 | B12 财务资料和功能暂缓；现有估值/成交价不充当租售 comps。 | 找到合适财务数据后再决定需求与优先级。 |
| 多角色交互 | B10 UI 设计暂缓。 | 团队后续单独规划各角色的交互。 |

访谈回复记录为“回答者角色、日期、原话/案例、影响哪条需求、需不需要改、负责人”。一个晚到意见不自动覆盖已核验规则；涉及法规或数据的说法须回到权威来源复核。三条工作线先用**同一地块**对齐分区、地形、障碍与未知项。

历史赛程约束见[参赛手册](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?tab=t.0)：项目代码须在 2026-09-26 09:00 ET 开工后编写；本文是需求文档。提交要求仍以主办方最新公告为准。

## 来源

- [AI for Housing 参赛手册](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?tab=t.0)
- [Track 1 官方 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)
- [官方 Public Data Catalog](https://docs.google.com/spreadsheets/d/19CKyt1kansUZ3VGOAOBihYYxNFuitx5VTkzOiEy4iXA/edit?gid=2076065299#gid=2076065299)：Data Catalog、Read Me、Brief Source Map 三页
- 团队现有《Housing AI Horizon Team Meeting Agenda.pdf》，尤其是 Relevant Datasets 和 Scoring Mechanism 部分
