# ParcelLens｜Development Ease Score：依据、方法与验证计划（历史稿）

> **已过时。** 当前产品已实现 `LDES-v2.2-rag`。请改读 [LDES_v2.2_RAG.md](LDES_v2.2_RAG.md)。本文是 2026-09-26 的方法备忘，其中“尚未实现评分”不再成立。

版本：v0.2 草案｜2026-09-26｜供团队审阅；**尚无经验证的数值算法，当前产品尚未实现评分**

## 1. 定义测量对象

评估对象是 **Pittsburgh 市内一块地块 + 一个明确住宅方案 + 一个法规与数据版本**。地块换用途、户数或拟建足迹，结论可能改变。结果是早期决策支持，不是许可结论、获批概率、工期或投资回报预测。

比赛 brief 要求 Development Ease Score，但没有公式。用户转述的住房专家回复允许团队自定易懂的系统，并举出绿／黄／红示例；这不是对 ParcelLens 规则的认证。[挑战 brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)

**现有证据主要支持 zoning 与场地的早期初筛，不支持“整体容易开发”。** 财务、土地可取得性、基础设施容量未知时，不应把已知项的高分叫作整体 Development Ease。

## 2. 公开依据：可借鉴什么

| 来源 | 可借鉴 | 不能直接搬用 |
|---|---|---|
| [英国住房部门《Stage 2: Assessing sites》](https://www.gov.uk/guidance/assessing-sites-for-local-plans-stage-2)：适用于英格兰的地方规划**草案指南** | 将 suitability（适宜性）、availability（可取得性）、achievability（可实施性）分开；每个维度按约束与缓解可能性给 RAG；有把握判定开发完全不适宜时才早期排除。指南明确建议 RAG 而非量化打分。 | 不是 Pittsburgh 法规，也不是单地块许可标准；其颜色、总评和阈值无法直接移植。 |
| [Pittsburgh 用途表](https://ecode360.com/45476538)、[variance 条件](https://ecode360.com/45479034)、[审批流程](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes) | 用本地权威规则确定所选方案的 P/A/S/C 路径、尺寸约束与额外审查；把“可申请”与“可获批”分开。 | 法规没有提供 10/20/25 分的开发便利度扣分；申请 variance 不保证通过。 |
| [住宅用地 GIS 多准则研究](https://www.mdpi.com/2071-1050/16/13/5767)、[土地适宜性 AHP 权重研究](https://www.mdpi.com/2073-445X/10/3/235) | GIS 叠加、多准则评价、专家成对比较估权重、权重敏感性检查是可复现的方法。 | 他国因素、权重与结论不能转移到 Pittsburgh；AHP 只使权重来源透明，不自动证明其本地效度。 |
| [TypeSafe Jev 文档](https://docs.typesafe.ai/introduction)、[OpenRouter Jev 教程](https://openrouter.ai/blog/tutorials/how-to-use-jev/) | 对非结构化许可文字作窄问题分类，可作为待核线索。 | Jev 的 `score` 针对**我们自定义的等级**，不是现成的地块开发分数；空间叠加、法规判定和算术需交给可核数据与代码。 |

借鉴上述**方法结构**，再用 Pittsburgh 的法规、数据和专家案例填充具体规则。引用论文不能为自定权重自动背书。

## 3. 四种方案与推荐次序

| 方案 | 做法 | 主要风险 |
|---|---|---|
| A. 纯 100 分扣分 | 100 起步，发现阻碍就减固定分。 | 未采集数据被误看作无阻碍；扣分缺本地依据。 |
| B. GIS + MCDA/AHP | 软因素标准化，用本地专家成对比较求权重，合成 0–100。 | 需本地专家、多案例和敏感性分析；硬性法规阻断不能被高分抵消。 |
| **C. 分维度 RAG + 未知（MVP 推荐）** | 已核查的用途与场地适宜性给绿／黄／红／灰；可取得性和财务可实施性独立标未知；每项有事实、来源和下一步。 | 不能进行细粒度数值排序；本地判定仍需人工审阅。 |
| D. 证据门槛 + 扣分 + 上限 | 证据齐备后 100 减障碍分，重大阻碍封顶或阻断，再映射 RAG。 | 保留团队偏好的数字，但扣分和阈值目前都是**待校准假设**；先作为内部实验。 |

**对外推荐把 Score 定义为有依据的等级。** 页面写 **Development Ease — zoning & site screening**，例如“Suitability: Yellow / Availability: Unknown / Achievability: Unknown”；再写“Overall development ease: not assessed”。若要突出主等级，用“Zoning & site screening: Yellow”，不暗示项目整体容易落地。结果由结构化规则产生，不由 LLM 直接生成。

## 4. MVP 判定规则候选（待本地专家审阅）

### 4.1 证据门槛

至少确认：唯一 parcel ID 与边界、Pittsburgh 市界、住宅方案、所有相交 zoning/overlay、适用法规版本、用途路径、影响方案的尺寸要求，以及选定环境图层的正确叠加。当前单点 zoning 查询不能代替全地块相交。关键输入缺失时返回 `unrated` 并列出缺项；未知既不是绿，也不是红。

评估**特定方案**的路径，不给土地永久贴标签。[用途表](https://ecode360.com/45476538)的 P 仍须满足其他规定；[市府 FAQ](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Zoning-FAQ)指出用途允许仍需核查 lot area、setbacks 等。地块与 25%+ 坡地图层相交只是线索；需结合拟建足迹与[市府审批流程](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes)判断影响。

### 4.2 候选等级

| 状态 | 定义与例子 |
|---|---|
| Green | **已核查的用途与场地范围内**未发现需额外路径或重大缓解的阻碍，例如用途 P 且相关尺寸、overlay、选定图层均核验。其余未覆盖项仍须显示；不得声称“市场条件下很可能建成”。 |
| Amber | 当前方案有可能解决的额外程序或需专业判断的阻碍，例如 A/S/C、尺寸 variance、已确认影响拟建足迹的陡坡。写明具体程序和结果不确定性；申请路径不等于保证批准。 |
| Red | 有证据表明**当前方案**在现行规则下存在重大不适宜或阻断，不能简单按原方案常规推进。需人工复核和具体来源；给出改方案或求助市府的路径，不说地块永远不能开发。 |
| Unrated | 关键证据缺失、跨分区规则未核实或来源冲突。显示已查事实及待核问题，不算成零风险。 |

硬性阻断不得被其他顺利因素抵消；同一根因不得重复计数。任何“不可克服”文案都需证据与人工签核，参照[英格兰指南](https://www.gov.uk/guidance/assessing-sites-for-local-plans-stage-2)对早期排除的谨慎原则。

### 4.3 输出契约

`parcel_id`、`scenario_id`、`scope`、`rule_version`、`data_as_of`、`assessed_at`、`suitability_band`、`availability_band`、`achievability_band`、`overall_band`、`drivers[]`（事实、等级影响、来源、下一步）、`missing_required[]`、`not_assessed[]`。未评估维度用 `unknown`；本应评估却缺关键证据用 `unrated`。三个维度未完整评估前 `overall_band = null`。

页面展开链条：**地块与方案 → GIS/法规事实 → 适用规则 → 等级 → 缺项与人工复核**。公开法规/图层版本和日期，GitHub 上保存相同规则。

## 5. 如果坚持 0–100：待验证的实验版

团队的“满分起步、遇障碍扣分”想法可作为单独的 **zoning & site friction index** 候选，不称为已验证的整体 Development Ease：

```text
if required_evidence_missing: score = null
else:
    raw = max(0, 100 - sum(independent_obstacle_penalties))
    score = min(raw, all_applicable_caps)
    if verified_no_legal_or_physical_path_for_current_scenario: score = 0
```

软障碍可扣分，硬阻断用独立 gate 或上限。**10、20、60 分等扣分及颜色分界，目前没有官方或本地实证依据，不能对外称“科学标准”。** 0 分只用于当前方案经核实完全阻断的极少情形；用途不允许、需要 variance 或地图重叠本身不自动等于 0。[Pittsburgh variance 条件](https://ecode360.com/45479034)

即使用 AHP 求权重，也先定义本地因素、取得跨角色专家判断，并保留不可补偿的硬限制。数值版公开因素、来源时点、规则版本、每项扣分与 cap 的设定者/理由、无法评估条件、逐步算例、敏感性结果和已知误判。无法解释“为何扣 20 而非 10”时，不在页面显示数字。

## 6. 数学模型、Jev 与深度学习的分工

| 层 | MVP | 升级条件 |
|---|---|---|
| GIS 与法规事实 | 空间相交、P/A/S/C、尺寸由确定性查询及人工核验规则产生。 | 扩大规则覆盖并验证。 |
| 综合判定 | 版本化分类规则 + 硬门槛 + 缺失状态。 | 用本地案例和专家成对比较校准软权重；做敏感性分析。 |
| Jev/LLM | 只从许可文本等非结构化资料提取窄问题线索，保留原文与人工复核。 | 用标注样本测误报/漏报；固定模型版本，`jev-latest` 浮动别名不利于复现。 |
| 预测模型 | 不预测批准或开工。 | 先定义目标，获得包括失败案例在内的足量历史样本；处理仅观察已提交项目的选择偏差；按时间/地理留出验证集，与简单基线比较。 |

[Jev 文档](https://docs.typesafe.ai/introduction)提供 typed `choice`/`score`/`noul`；[OpenRouter 教程](https://openrouter.ai/blog/tutorials/how-to-use-jev/)描述 `score` 为自定级别的概率加权值，并建议将算术与精确计数留在代码。这些能力无法凭空给地块扣分提供权威依据。

## 7. 验证与发布门槛

1. 用市府法规、GIS 元数据和明确方案核对每个判断；请 planner 检查是否误把申请路径写成许可保证。
2. 收集覆盖不同路径的真实地块＋方案，找 planner、developer、nonprofit 审阅误导性结果。5–10 个案例可检查逻辑与可用性，**不能宣称统计验证**。
3. 对争议规则与软权重做敏感性分析，记录等级/排序翻转，尤其检查未知与边界相交变化。
4. 同一 `parcel + scenario + data_version + rule_version` 必须同结果；缺关键证据不得绿；新增硬阻断不得改善等级；换方案重算。
5. GitHub 保留可读方法和机器可读规则；页面展示范围、版本、来源、未知维度和人工复核入口。数值未达到上述条件时，发布 RAG 与原因，不发布任意百分制。

## 8. 仍值得问本地专家的判断

- 对同一住宅方案与两个真实 Pittsburgh 地块，哪些额外程序应判黄，何种证据才足以判红？最可能的反例是什么？
- 只有用途、尺寸与坡地证据时，开发商/公益机构会用这个等级做哪一步决定？哪些缺项会使它误导？
- 对 3–5 个已核验案例，请专家成对比较开发阻力并说明理由；只有相对判断稳定且可解释后，才考虑数值权重。

访谈与 PRD、数据接入、页面可同步进行；晚到反馈通过规则版本回流，不阻塞初版事实采集与分类结果。
