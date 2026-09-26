# Track 1 地块开发初筛工具：数据评估与产品需求草案

版本：v0.3｜2026-09-26｜工作线 3；纳入用户提供的一条 SME 回复并查阅现有地图仓库；不包含项目代码

## 1. 先说结论

**产品要解决的问题**：用户对一块具体地块和一个具体住宅方案，需要决定是否进入下一轮人工尽调，以及先核实什么。产品把分散的公开事实、初步规则分类、障碍、未知项和下一步放进一份可追溯报告。它不作许可、法律、工程、融资或投资结论。

**建议的比赛演示范围**：只支持 Pittsburgh 市内地块；用一个真实地块编号和一个明确住宅方案，展示完整的“输入 → 确认地块 → 查分区与法规 → 查至少一个环境图层 → 限范围评分/无法评分状态 → 可解释结果与来源”流程。多地块比较是增强项；政策情景、社区投资排序与完整财务 pro forma 不进入比赛主路径。[官方挑战 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)明确要求 Development Ease Score、障碍解释、来源和人工复核点，因此评分不能从产品目标中悄悄删除，但其覆盖范围和不确定性必须直接可见。

**数据判断**：官方目录的 `Core` 是面向多个赛道的目录标签，不表示 Track 1 每条 Core 数据都必须接入。Track 1 的第一依赖是地块、分区地图、分区法规。目录页只是索引；要继续进入具体 dataset 的资源页，确认 GeoJSON、CSV、API、字段和更新日期。

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
| 用户提供的 #housing-sme-help 记录中，Steve Wray（City of Pittsburgh SME）指出：开发商和 nonprofit 的关键可行性问题之一是**财务可行性**，需要相似社区的租金/价值或销售可比数据。 | 这是**一位专家对早期问题的回复**，足以让 PRD 加入显著的财务缺口提示并追问 MVP 的独立价值；尚不足以确定完整财务功能或评分权重。 | 用户提供的 Slack 聊天记录，Steve Wray 回复 Het Sheth，2026-09-26 11:27 ET；尚无消息 permalink |
| 市府持续讨论住房相关 zoning 修订；截至本版查到的市府页面，部分修订仍处审议流程。 | 政策分析视角必须标明法规生效状态与数据日期；拟议规则不能混入现行规则计算。 | [Housing Needs Assessment amendments](https://engage.pittsburghpa.gov/implementing-housing-needs-assessment)、[Zoning Amendment Hub](https://engage.pittsburghpa.gov/pittsburghs-zoning-code-amendment-hub) |

上表前述网页项目是**公开文件所载事实**；Steve 的回答属于**单条专家反馈**；团队地图能力经仓库代码检查，但未运行端到端验证。下面的任务、优先级与页面排序仍是团队待验证的**产品假设**。

### 2.2 四类 persona 的任务假设

| Persona | 典型输入与要做的决定 | 共用报告中首先要看的信息 | 不能由本次初筛替其决定 |
|---|---|---|---|
| Small/Mid-Size Developer（MVP 首要角色） | 已有目标地块与拟建小型住宅方案；决定是否花钱进入下一轮尽调。 | 用途分类、可能触发的审查、场地障碍、**财务未评估及需找的 comps**、应咨询的部门。 | 买地、设计、获批概率与收益。 |
| Housing Nonprofit/CDC | 已有候选地块或社区项目目标；决定是否投入前期设计及向资助方准备材料。 | 与开发商共用的地块证据，另突出资金/地块控制/可负担性假设及 comps 仍需核实。 | 是否符合 URA/PHFA 项目资格、是否获资助及社区支持。 |
| Municipal Planner | 评估一处或多处候选地块；决定先复核哪项法规或引导申请人找哪个审查路径。 | 法规条文、证据日期、跨分区/覆盖区、人工审查点；多地块比较为增强项。 | 正式分区裁定、许可决定或批准时间。 |
| Policy Analyst | 研究某类住宅在哪些地块受规则或设施限制；决定应进一步调查什么政策障碍。 | 可比较的规则分类、数据覆盖率、版本与未知项；聚类和政策情景需规模化数据。 | 用单一地块样本推出社区级政策效益。 |

**MVP 核心决策**：是否值得进入下一轮人工尽调，以及下一轮先核实什么。**地理范围**：只含 Pittsburgh 市内；县地块数据的更广覆盖不代表市 zoning 规则适用于其他自治市。

### 2.3 Use case 分级与演示承诺

| 官方 use case | 本产品的可演示任务 | 优先级及前置条件 |
|---|---|---|
| 开发商输入 parcel ID，获得分数与障碍。 | 同一地块 + 明确住宅方案的证据报告与限范围评分。 | **Basic 主路径**：至少一块真实地块、核过的方案规则和环境图层。 |
| 规划人员比较多个地块，寻找适合 starter home 的地点。 | 两块地采用同一方案、规则版本和数据版本并排显示证据及未知项。 | **有余力再做**：单地块链路稳定后；不得只比较不等价的总分。 |
| 城市识别低分地块，评估 zoning 改革或基础设施升级。 | 从低分原因进入法规/设施证据，区分已知障碍与数据缺失。 | **后续**：需要足够广的地块覆盖、可靠设施数据及经核验的政策情景规则。 |
| 机构按社区分数聚类安排投资。 | 聚合多个地块、展示覆盖率与分布，不把缺数据地区误判为低需求。 | **后续**：需要代表性数据、公平性审查和明确的投资决策标准。 |

### 2.4 信息架构决定

不在入口强制选择身份。统一导航围绕**地块/方案、结果报告、证据与来源**；报告中的“开发评估／公共规划／公益项目”仅是可切换的关注视角，改变摘要排序和待办提示，**不改变地块事实、法规分类或评分规则**。没有账户或角色授权需求时，不建四套首页。公益项目视角的资金问题以“需另行核实”呈现；政策分析入口在聚合功能具备后才出现。

**已有地图模型的产品位置**：把团队的 Regrid 式地图作为同一应用的**地块发现与确认画布**。仓库 [App.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/App.tsx)已有地址/parcel ID 搜索、地图点选与 `SelectedParcel` 状态；[ParcelMap.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/map/ParcelMap.tsx)已有高亮选中边界；[ParcelDetails.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/panel/ParcelDetails.tsx)已有地块事实侧栏。建议在同一选中地块状态下，侧栏先确认 ID/边界，再选择住宅方案并运行分析；报告在侧栏的“初筛结果／原始地块资料”两种内容间切换或展开，地图持续高亮同一地块。无需另做一套 parcel 搜索首页。

**仓库代码与 PRD 的差距（不等于已修复）**：当前 [zoning.ts](https://github.com/RainaQiu/parcel-lens/blob/main/src/lib/zoning.ts)用单个计算点查询 zoning，只返回第一项；B4 要求处理地块跨区和 overlay，需由数据/接口工作线验证面相交或明确标记“尚未核查”，不能把现有点查询当作完整 zoning 初筛。现有侧栏显示成交价、县评估值等字段，但并无同类地块/相似社区的租售 comps，也无财务 pro forma；这些字段不能填补 Steve 指出的财务缺口。以上来自代码阅读，实际数据返回、部署及交互流畅度仍待运行测试。

## 3. 数据源筛选

下面的“可用性”是**截至 9 月 24 日的目录和来源页面核对**。尚未下载每个源的样本并验证字段、地块 ID 匹配率或 GIS 计算；这些是开工后第一批验证任务。P0=演示主路径，P1=基础路径跑通后增加，P2=本次不依赖。

| 级别 | 数据/入口 | 具体用途与连接方式 | 当前判断及风险 |
|---|---|---|---|
| **P0** | [Allegheny County Parcel Boundaries](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1) | 用 parcel/block-lot ID 找地块多边形，算面积，与其他图层做空间叠加。页面列出 Esri REST、GeoJSON、CSV、SHP；官方说明数据很大，可筛选下载，PASDA 是更权威入口。 | **必要，资源路径已找到**。目录中的无 `1` 结尾链接不正确。必须核实 ID 格式、坐标系与选定样本是否存在。 |
| **P0** | [Pittsburgh zoning GIS layer](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/ArcGIS/rest/services/PGHWebZoning/FeatureServer/0) | 地块多边形与 zoning 多边形空间相交，读取 `zon_new` 等分区字段。 | **必要，查询图层与字段已核对**。目录中的 WPRDC zoning 链接不稳定；先用市 ArcGIS 图层。一个地块可能跨区，必须显示多区而非随意取一个。 |
| **P0** | [City zoning page](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning) → [Zoning Code §911.02 use table](https://ecode360.com/45476784) | 根据“分区 + 拟建住宅类型”查用途分类；法规表的 P/A/S/C 分别表示 by-right、行政例外、特殊例外、条件用途。每项结论链接到条文。 | **必要，文本入口已核对**。GIS 分区名称本身不能判断可否建设；还需覆盖区、定义、尺寸、合法现状等。MVP 只把人工核过的少数住宅类型规则写成结构化表，其他输出“需人工核实”。 |
| **P0** | [Pittsburgh 25%+ steep slope](https://data.wprdc.org/dataset/25-or-greater-slope) | 与地块做多边形相交，显示重叠面积/比例和相关风险。页面列 GeoJSON、REST、SHP。 | **优先的环境图层，资源格式已核对**。重叠只意味着可能要进一步审查，不能直接说“不能建”。 |
| **P1** | [County property assessments](https://data.wprdc.org/dataset/property-assessments) | 用 parcel/block-lot ID 补充地址、地块/建筑特征，帮助识别地块。页面有 CSV、API 版本和字典。 | **容易增加，但并非判断 zoning 的前置条件**。估值不是市场价；注意下载版与 API 版字段类型、日期格式不同。 |
| **P1** | [Pittsburgh undermined areas](https://data.wprdc.org/dataset/undermined-areas) | 地块与采空区图层相交，形成“需地质核实”标记。 | **适合第二个环境图层**。历史矿图可能不完整或不精确，不能据此作安全决定。 |
| **P1** | [FEMA National Flood Hazard Layer](https://www.fema.gov/flood-maps/national-flood-hazard-layer) | 地块与洪水区叠加，标记风险和图层版本。 | **价值高但接入较复杂**；应先核实所需图层、区域覆盖和空间精度。地图不是正式洪水认定。 |
| **P1** | [PLI permits](https://data.wprdc.org/dataset/pli-permits) | 展示相关地址或附近地块的许可历史，提示审批路径和数据证据。 | **用于历史背景，不是“住宅是否允许”的标签**。记录自 2019 年起；2024 年后 Building & Development Application 改变了分类。地址/地块连接、类型与状态要核验；不能把历史批准率变成当前项目获批概率。 |
| **P2** | [OneStopPGH](https://onestoppgh.pittsburghpa.gov/)、[ZBA decisions](https://www.pittsburghpa.gov/Business-Development/City-Planning) | 人工查现案或特殊例外的官方记录。 | 前者为交互门户，后者多为非结构化记录；周末不把自动批量抓取作为主路径。 |
| **P2** | PA DEP、PASDA/USGS LiDAR、PennDOT、OSM、销售/租金、HUD FMR/Income Limits | 更深入的环境、通行或财务分析。 | 先不接入。数据门户仍需挑具体层；道路邻近≠合法道路出入口，区域租金≠具体项目收入。 |

**明确排除**：ACS、CHAS、人口普查、HMDA、Zillow/Redfin 等宏观或区域市场指标，不应直接决定单个地块“是否容易获准建设”。如果以后增加财务 pro forma，再按其真实空间粒度和假设使用市场、收入及成本数据。

### 3.1 数据进入产品前的验收清单

每个纳入的源必须记录：源机构、具体资源 URL、格式、下载/调用时间、数据更新时间、使用字段及定义、坐标系、许可/署名要求、缺失率。对同一个真实地块，验证：

1. 地块 ID 能在边界数据中唯一定位，图形在地图上落点正确。
2. 分区图层能返回分区编码；跨多个分区时能识别并显示。
3. 手工从法规原文核对演示住宅类型的规则映射；不确定之处不自动判定。
4. 环境叠加的面积单位、坐标系及重叠比例经人工抽查。
5. 如果使用 permits，先测地址/parcel ID 匹配率和同一地址多条记录情况。

任一环节失败时，界面应显示“数据缺失/无法判断”，保留已得到的证据；不得默默按低风险或满分处理。

## 4. PRD：网站具体功能

### 4.1 用户流程

1. **在已有地图中找地块**：按 parcel ID 搜索、按地址查看候选项，或在地图点选。地址与 ZIP code 本身不是唯一地块 ID；用户必须确认一块具体地块。
2. **确认地块与指定方案**：地图高亮边界，侧栏显示编号、可得地址、面积与 Pittsburgh 市界状态；用户选择一个定义清楚的拟建住宅方案。无法唯一定位时不运行分析。
3. **生成同一份证据报告**：先展示结论性摘要和分数适用范围，再展示 zoning、环境观察、未知项、来源日期与人工复核步骤。关注视角可以改变显示顺序，但不改变计算。
4. **行动或复核**：用户打开官方原始来源、记录待核查问题；数据源失败时仍可查看已取得的证据，并清楚知道哪项结果不可得。

### 4.2 Basic：必须完成

| ID | 功能 | 可验收的具体表现 |
|---|---|---|
| B1 | 复用地图找地块、确认与失败状态 | 地图点选或 parcel ID 搜索定位同一 `parcel_id`；地址搜索如返回多个候选项，要求用户明确选择。空值、无匹配、市界外给出原因与下一步；无唯一地块时不计算。现有仓库已实现部分交互，须运行验证。 |
| B2 | 方案输入 | 至少一个经过规则核验、写清住宅类型及单位数的预设；报告标题同时显示 parcel ID 和方案。更换方案不得沿用旧规则结果。 |
| B3 | 地块事实、地图与报告联动 | 地图高亮、详情侧栏、所选住宅方案和结果报告始终引用同一 `parcel_id`；边界、ID、面积和市界状态可追溯到来源。面积或地址缺失时显示“未知”，不填推测值。 |
| B4 | Zoning 初筛 | 显示全部相交的分区；仅对人工核验的 `district + scenario` 显示用途分类和条文链接。跨区、overlay、尺寸未核查时列出具体未知项，不写“可建”或“已获准”。 |
| B5 | 一个环境图层 | 至少核查 25%+ 陡坡图层，显示是否与地块相交、经验证的面积/比例和图层日期；相交不等于拟建足迹受影响，也不自动判断审批级别。 |
| B6 | 限范围 Development Ease Score | 显示版本化规则、参与计算的因素和未覆盖的因素；任一必要证据缺失或规则未核验则显示“数据不足，无法评分”。评分不得由 LLM 生成，不称为许可概率或整体财务可行性。具体映射按 4.4 的并行决策门槛确认。 |
| B7 | 障碍、未知与下一步 | 至多 3 个优先障碍，每项包含观察事实、影响解释、下一步核查对象和来源；未知项独立列出，不算作零风险。无障碍时仍列出未检查项目。 |
| B8 | 可读解释及退化 | AI 解释只能使用已结构化的观察和核验过的规则；服务失败时模板化摘要仍可读，且不得改变事实或结论。 |
| B9 | 日期、来源与边界 | 每个关键结果显示来源、数据日期/获取日期及适用范围；结果首屏注明“早期初筛，需人工复核”。法规版本与拟议政策状态须可辨。 |
| B10 | 四类角色共享报告 | 不要求先选身份；同一地块/方案在不同关注视角中事实、评分与来源完全一致，仅摘要排序和下一步提示可变。没有不同视角实现时，默认报告也应让四类用户看见证据与未知项。 |
| B11 | 可重复演示 | 至少一块真实地块和一个住宅方案经人工交叉核对；从网页输入至结果可重复运行，README 记录数据来源、AI 用途和局限。 |
| B12 | 财务未评估提示 | 结果首屏单独说明本次分数**不包含财务可行性**；列出下一步需要的本地租金/销售可比数据、土地取得与建设/融资假设。现有地块成交价或县评估值不得标成市场 comps 或 pro forma。 |

### 4.3 有时间再加

| 级别 | 功能 | 前置条件 |
|---|---|---|
| Nice 1 | 第二种住宅方案，切换后重算并解释变化 | 第二种方案的法规映射已人工核验。 |
| Nice 2 | 同报告的开发／规划／公益关注视角 | 只调整信息排序和待办；不另建规则体系。 |
| Nice 3 | 两个地块并排比较 | 同一住宅方案、规则版本、数据版本与缺失信息标记；对不等价结果禁止简单排第一名。 |
| Nice 4 | 采空区或 FEMA 洪水图层 | 已核对覆盖、空间精度与叠加结果。 |
| Nice 5 | Permit 历史或可下载报告 | 匹配质量、日期、来源及未知标记在展示/导出时均保留。 |
| Nice 6 | 最小财务资料卡：用户手动记录少量带日期/地址的可比租金或销售样本及假设 | 先向 developer/nonprofit SME 确认哪项输入确实影响早期决策；不把县评估值当租售 comps，不自动计算投资建议。 |
| Later | 政策情景、区域热力图、批量筛地、完整财务 pro forma、Agent/MCP | 另行验证广域数据覆盖、政策规则、投资标准与用户任务。 |

### 4.4 评分产品规则与待校准项

官方挑战要求 Development Ease Score；现有团队 PDF 的 zoning/entitlement 40、环境/物理 30、审批复杂度 20、设施/可达性 10 是**团队早期设想，不是行业标准或已核准权重**。当前 P0 数据不足以覆盖四维，所以产品先设计为**“仅覆盖已核验因素的初筛分数”**，在数字旁直接写“覆盖：用途规则、25%+ 陡坡；未覆盖：尺寸/overlay、设施容量、完整审批、财务等”。

2026-09-26 的用户会议记录仍未给出公认评分标准；[官方挑战 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)也没有提供具体权重或公式。因此不能让专家“提供官方公式”作为唯一实现前提。已准备 [Slack 独立问题](Track1_Expert_Interview_Guide.md)：请专家先界定该分数应衡量什么、哪些因素不能平均、何时必须拒绝评分；团队随后以真实地块和透明暂定规则请其找反例。Steve 对财务的提醒进一步要求分数旁显著写明“**不包含财务可行性**”。

评分实现可与访谈并行：数据线提供事实和缺失状态，接口线保留 `score_status`、`score_version`、`covered_factors[]`、`unknown_factors[]` 与逐项依据，前端先实现“有分数／无法评分”两种状态。**比赛演示目标是至少一块经核验的真实地块能够显示限范围数值分数；**数值映射和权重由团队记录为版本化演示假设，并在最终演示前尽可能请住房/规划专家检查措辞和明显反例。专家回复较晚时，团队仍可完成和公开说明自己的暂定规则；若某块地缺乏计算所需证据，界面显示“数据不足，无法评分”，不得编造数值。

- 缺失地块边界、分区、已核验的 `district + scenario` 规则或所选环境图层时，不显示数值。
- P/A/S/C 只描述用途在表中的程序分类；尺寸、覆盖区、合法现状和其他审查仍需确认。
- 陡坡图层与地块相交不等于拟建建筑足迹影响陡坡。需要正式判断时指向市府审查流程。
- 评分不是获批概率、投资建议，也不以历史许可记录推断获批率。
- 不同地块比较时需显示评分版本、覆盖因素与缺失项；不同版本或覆盖范围不直接排序。

### 4.5 非功能与可用性要求

- 关键结论不只靠颜色表达；“未知”“需核实”“未发现图层重叠”使用不同文字。
- 来源链接在结果与导出物中可打开；图层、规则、数据快照日期可查。
- 部分数据源失败不清空已得到的证据；AI 失败不使报告不可用。
- 对屏幕较窄的设备保持阅读顺序：摘要 → 障碍 → 未知 → 证据 → 来源。

## 5. 页面与状态

- **地图工作台**：复用现有地图、地址/parcel ID 搜索与边界高亮。选中地块后右侧打开原有地块详情；在详情顶部新增住宅方案选择与“运行初筛”，而非再建一套入口。不给角色选择设门槛。
- **统一结果报告**：保持地图上的同一选中地块；侧栏先呈现“地块 + 方案”、限范围分数或无法评分、三项主要障碍、财务未评估与下一步，再逐步展开 zoning、环境、未知事项、原始来源及日期。现有估值/历史成交价放在“原始地块资料”，不与投资可行性结论混排。
- **关注视角**：默认所有人看到相同报告；可选“开发评估／公共规划／公益项目”改变摘要顺序。不要把“政策分析”做成仅有单地块数据的伪区域仪表盘；聚合功能准备好后再开放。
- **加载/部分失败**：分步骤显示查找进度；某源失败时保留已取得内容，并指出失败源及其对评分的影响。
- **错误状态**：空 ID、无匹配、多匹配、市界外、跨区/overlay、规则未覆盖、来源失败和 AI 失败，各有明确下一步。

**示例结果文案（结构示意，非真实地块结论）**：

> Parcel `[经核实的 ID]` · 新建一户住宅。初筛仅覆盖“用途规则 + 25%+ 陡坡图层”；地块尺寸、退距、设施容量等尚未核查。主要待核实项：该地块与陡坡图层有重叠，需确认拟建足迹是否受影响；请向 City Planning 核对适用审查路径。每条观察提供图层/法规来源和日期。

本示例不展示数字，以免把尚未校准的演示权重伪装成真实地块评分。

## 6. 演示验收标准

1. 演示时从网页输入真实 parcel ID 与方案；结果与地图都指向同一地块。
2. 分区和环境结果与原始来源人工核对一致；至少一项可打开原始数据及适用法规条文。
3. 至少一块经核验的真实演示地块显示可解释、限范围的数值 Development Ease Score；另验证具体证据缺口会触发“无法评分”。数字、覆盖范围及未知因素不能分离展示。
4. 至少一个真实的“未知/需人工核实”出现，且不按零风险计算。
5. 开发、规划和公益三种关注视角共享同一事实；若仅完成默认视角，四类角色仍可读到其所需证据与限制。
6. 从现有地图点选或搜索结果进入分析时，地图、详情侧栏和报告都保持同一地块；现有点查询 zoning 的限制不得隐藏。
7. 用户能从主要障碍找到下一步的官方复核入口；分数旁明确写“财务未评估”，解释不声称具有法定效力。
8. 公开仓库说明运行方法、数据和 AI 来源、局限性；演示视频展示实际输入到结果的过程。

## 7. 并行推进与访谈回流

工作线 3 的 [Slack 专家访谈提纲](Track1_Expert_Interview_Guide.md)只询问案头资料无法回答的实践判断。**不把访谈回复作为 PRD、数据收集或接口设计的启动条件。** 当前版本先以“来源可证实的事实 + 标明为假设的产品选择”推进，团队同步完成真实地块、方案、字段和页面/API 契约验证。

| 决策 | 现在采用的可逆假设 | 晚到访谈如何回流 |
|---|---|---|
| 首要用户 | Small/Mid-Size Developer 的单地块早期尽调；公益项目和规划人员共用报告。 | 若多位专家明确指出另一类用户的决策更紧迫，调整摘要顺序和演示叙事；不重新采集同一地块事实。 |
| 报告内容 | 摘要 + 证据 + 未知 + 下一步并列；分数仅为有边界的辅助信息。 | 访谈可调整障碍排序和文案，不覆盖法规事实。 |
| 评分 | 先准备版本化评分接口及有/无分数状态；数值映射要用真实例子和专家反馈复核。 | 若专家指出误导性的权重或反例，修订版本并重新计算；无法核实时保留“无法评分”。 |
| 财务 | Steve 的回复使“财务未评估”成为首屏必须提示；现有估值/成交价不充当租售 comps。 | 另问开发商/nonprofit：非财务报告在什么决策点有用、最小财务输入是什么；决定是否把资料卡提升优先级。 |
| 多角色交互 | 共用地块/方案报告，视角只改变关注顺序。 | 测试中若发现某角色确需不同输入或输出，再提出独立用例，不先建立四套页面。 |

访谈回复记录为“回答者角色、日期、原话/案例、影响哪条需求、需不需要改、负责人”。一个晚到意见不自动覆盖已核验规则；涉及法规或数据的说法须回到权威来源复核。三条工作线汇合时用**同一真实地块 + 同一方案**对齐输入、证据、分数状态和页面措辞。

历史赛程约束见[参赛手册](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?tab=t.0)：项目代码须在 2026-09-26 09:00 ET 开工后编写；本文是需求文档。提交要求仍以主办方最新公告为准。

## 来源

- [AI for Housing 参赛手册](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?tab=t.0)
- [Track 1 官方 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)
- [官方 Public Data Catalog](https://docs.google.com/spreadsheets/d/19CKyt1kansUZ3VGOAOBihYYxNFuitx5VTkzOiEy4iXA/edit?gid=2076065299#gid=2076065299)：Data Catalog、Read Me、Brief Source Map 三页
- 团队现有《Housing AI Horizon Team Meeting Agenda.pdf》，尤其是 Relevant Datasets 和 Scoring Mechanism 部分
