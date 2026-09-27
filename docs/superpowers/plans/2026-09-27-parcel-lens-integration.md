# ParcelLens 单地块初筛集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用户审核本计划后才执行；用户本人负责最终合并 `main`。

**Goal:** 把 LDES v2.2 RAG 分支与最新地图前端整合，完成无需高级选项的单地块证据报告，并用真实地块核验结论。

**Architecture:** 用户只需确认一个 Pittsburgh `parcel_id`。浏览器自动读取全部当前支持的证据图层，适配器保存每个来源的状态与元数据；纯函数生成限范围 RAG 结果，页面展示用途矩阵、约束、未知项、来源和下一步。Vite 的 `/api` 代理仅服务本地开发；生产取数在发布前单独验证。

**Tech Stack:** React 19、TypeScript、Vite、MapLibre、Turf、Vitest；沿用现有 ArcGIS/WPRDC 接口和仓库目录。

**Spec:** `docs/Track1_Data_Assessment_and_PRD.md` 的无方案 Basic；`docs/LDES_v2.2_RAG.md` 的已实现图层和规则。两者的冲突按下方“产品决定”解决。

## 产品决定（请在审核本计划时重点确认）

1. 默认流程只有地址、parcel ID 或地图点选。所有已接入证据源自动查询；本轮不增加住宅类型、套数或环境类别的表单。
2. 五类住宅用途路径作为**逐项输出**。无用户指定方案时，不把某一类用途的 `NOT_PERMITTED` 写成整块地“需要 use variance”。移除隐藏的 `fourplex-4` 产品默认假设。
3. 页面主标题为“Parcel screening / 地块初筛”，不称完整项目 Development Ease。建议默认 zoning 摘要规则：同一已核 base district 的五类路径均有结果时，至少一类 `P` 为 GREEN；没有 `P` 但至少一类 `A/S/C/P_OR_S` 为 AMBER；五类均 `NOT_PERMITTED` 为 RED；规则缺失、跨 base district、overlay 未处理为 UNRATED。页面必须解释该颜色仅概括“是否存在已列明的住宅用途路径”，**不判断拟建规模、尺寸、许可或财务**。环境、历史约束维度单独展示，主标取已核维度中最严重的颜色；关键查询失败仍为 UNRATED。
4. Development potential 因尺寸/停车/access 规则未入库，继续显示 UNRATED，不给容量结论，也不要求用户填写方案。
5. 不改写用户现有的 `package-lock.json` 工作区改动；执行时用独立工作树和集成分支。按用户后续指示，**先只做本地审核，不推送、不创建 PR、不合并 `main`**。

## Global Constraints

- 规范 `parcel_id` 只能取县 Parcel Boundary 返回的 `PIN`；地址、Assessment `PARID` 只能用于定位和核对。
- “未相交”必须以成功查询、覆盖核验和有效多边形计算为前提；未知不能显示为 `0%` 或零风险。
- 每条关键事实展示原始来源 URL、源数据日期（未知时明示）和获取日期；`retrievedAt` 不充当 `sourceUpdatedAt`。
- 评分只能读结构化证据；不给未覆盖的项目许可、容量、财务或投资结论。
- 保留 `origin/main` 已有地图样式、zoning 图层、选中高亮、详情布局和分区定义链接；来源日期展示在 Task 3 补齐。

## Review Focus

1. 一个 district 对某住宅类别 `NOT_PERMITTED`、对另一类别 `P`：整块地的默认主标不能仅因此变 RED；Task 2 的测试覆盖。
2. 图层 API 失败、无覆盖、成功查询但无相交：三者在报告中不同；Task 3 和 Task 4 的测试覆盖。
3. 用户快速连续选两块地：旧请求不得覆盖新地块；Task 4 的测试与手工步骤覆盖。
4. 住宅用途规则已核但跨两个 base district 或 overlay 未处理：主标 UNRATED，矩阵仍展示已知事实；Task 2 的测试覆盖。
5. 生产环境没有 Vite 开发代理：部署前实际检查 `/api/*` 与跨域行为；Task 6 的验收覆盖。

---

## 文件边界

| 文件/目录 | 职责 |
|---|---|
| `src/App.tsx` | 选地块、取消旧请求、装配数据状态；不写评分规则。 |
| `src/lib/gis.ts`、`src/lib/ldes.ts` | 查询与多边形叠加；输出每源的成功、无命中或失败状态。 |
| `src/lib/types.ts` | 共享 `ParcelReport`、来源状态、评分输出类型。 |
| `src/lib/ldes/zoning.ts`、`src/lib/score.ts` | 无方案的用途摘要与纯评分合成；不做网络请求。 |
| `src/panel/ParcelDetails.tsx`；必要时新建 `src/panel/EvidenceSection.tsx` | 展示结果、全部驱动项、未知项、原始来源和下一步。 |
| `src/map/ParcelMap.tsx`、`src/lib/zoning.ts` | 沿用 `main` 已有地图能力；仅在整合冲突时做最小改动。 |
| `docs/LDES_v2.2_RAG.md`、`README.md` | 精确描述运行中的规则、覆盖范围、演示方式。 |

## Task 1：先把评分分支整合到最新前端

**Files:** 修改 `src/App.tsx`、`src/App.css`、`src/lib/types.ts`、`src/panel/ParcelDetails.tsx`、`src/lib/zoning.ts`、`vite.config.ts`、`package.json`、`package-lock.json`；引入评分分支的 `src/data/pittsburgh-use-pathways-v1.ts`、`src/lib/gis.ts`、`src/lib/housingPathways.ts`、`src/lib/ldes.ts`、`src/lib/ldes/`、`src/lib/scenarios.ts`、相关测试和文档。

**Interfaces:** 保留地图向 `App` 提供 `ParcelFeature` 的现有接口；`collectLdesLayers(feature, assessment, signal)` 返回 `LdesLayerFacts`，`scoreEvidence(evidence)` 返回 `ParcelScore`。本任务只整合现有行为；Task 2 再修改默认评分语义。

- [ ] **Step 1: 建独立集成工作树与分支。** 从最新 `origin/main` 建 `feat/parcel-screen-integration`；记录当前 `main`、评分分支的提交和工作区脏文件。不要在当前工作区重置 `package-lock.json`。
- [ ] **Step 2: 合入 `origin/feat/ldes-rag-use-pathways` 并逐文件解决冲突。** `src/App.tsx` 保留 `main` 的地图、设置和详情布局，同时接入 LDES 请求；`src/map/ParcelMap.tsx`、`src/lib/zoning.ts` 保留新地图功能；`src/panel/ParcelDetails.tsx` 同时保留布局和评分卡。不要用评分分支旧版前端整体覆盖 `main`。
- [ ] **Step 3: 运行 `npm install`、`npm test`、`npm run build`、`npm run lint`。** 所有命令退出码为 0；构建产物中包含评分模块。
- [ ] **Step 4: 浏览器回归。** 测试地址/parcel ID 搜索、三种地图样式、zoning 图层、选中高亮、详情布局与来源链接；评分卡和用途矩阵能显示。发现问题先修再提交。
- [ ] **Step 5: 提交集成基线。** 提交信息 `feat: integrate LDES with current parcel workspace`；不合并 `main`。

## Task 2：移除隐藏方案，修正默认评分含义

**Files:** 修改 `src/lib/scenarios.ts`、`src/lib/ldes/zoning.ts`、`src/lib/ldes/combine.ts`、`src/lib/ldes/constants.ts`、`src/lib/score.ts`、`src/lib/types.ts`、`src/panel/ParcelDetails.tsx`、`src/lib/housingPathways.test.ts`、`src/lib/ldes/score.test.ts`；新增 `docs/LDES_v2.3_parcel_screen.md`，更新 `docs/README.md` 将 v2.2 标为历史。

**Interfaces:** `defaultHousingPathwayRag(rows: HousingPathwayRow[]): Rag` 汇总五类已核路径；`scoreEvidence(evidence: LdesEvidence, opts?): ParcelScore` 保持纯函数。`ParcelScore` 保留五类用途矩阵和分维度 RAG，`scenarioId` 默认改为 `null`，主结果 `scope` 明确为 `parcel_screening`。规则语义变化后使用 `scoreVersion = LDES-v2.3-parcel-screen`、`ruleVersion = LDES-v2.3-parcel-screen-rules`。

- [ ] **Step 1: 写失败测试。** 覆盖“R1D 某一用途不允许但另一用途 P → 默认 zoning 非 RED”“五类均不允许 → RED”“至少一类额外审查且没有 P → AMBER”“规则单元缺失、跨区、overlay 未处理 → UNRATED”“默认 `scenarioId=null`”。
- [ ] **Step 2: 运行目标测试确认失败。** `npm test -- src/lib/housingPathways.test.ts src/lib/ldes/score.test.ts`。
- [ ] **Step 3: 实现无方案摘要与文案。** 删除固定 `fourplex-4` 对默认主结果的影响；保留五类用途路径表。用途行的 RED 仅属于那一行；主标和驱动项不得称“当前方案需 variance”。主标标注范围，并说明 potential 未评估。
- [ ] **Step 4: 再运行目标测试、`npm run build` 和 `npm run lint`，全部通过后提交。** 提交信息 `fix: scope default rating to parcel screening`。

## Task 3：把评分卡变成可核查的证据报告

**Files:** 修改 `src/lib/types.ts`、`src/lib/ldes.ts`、`src/lib/ldes/constants.ts`、`src/panel/ParcelDetails.tsx`；必要时新增 `src/panel/EvidenceSection.tsx`、`src/lib/evidence.test.ts`。

**Interfaces:** 新增 `SourceObservation<T>`：`status: 'available' | 'not_found' | 'unavailable'`、`value: T | null`、`sourceId`、`sourceUrl`、`sourceUpdatedAt: string | null`、`retrievedAt`、`joinMethod`、`nAReason: string | null`。`LdesLayerFacts` 为 zoning、slope、landslide、undermined、FEMA、historic、violation/condemned 保留对应来源状态。`makeDriver` 接受对应来源对象，输出能点击的 URL 和日期。

- [ ] **Step 1: 写失败测试。** 成功无相交为 `available` 且 `intersects=false`；超时为 `unavailable` 且 value 为 `null`；未查到记录与请求失败不同；源更新日期未知时保持 `null`，不得复制获取时间。
- [ ] **Step 2: 运行 `npm test -- src/lib/evidence.test.ts` 确认失败。**
- [ ] **Step 3: 实现来源元数据与报告。** 每个维度显示观察事实、评分影响、全部 drivers、未覆盖项、`nextStep`、原始来源、源日期/获取日期及连接方式。坡地/滑坡/采空缺值显示“未知”，删除 UI 中的 `?? 0` 假零值。来源日期确实不可得时写“源更新日期未提供”。
- [ ] **Step 4: 运行目标测试、`npm run build`、`npm run lint`，并用一块正常地块和一块受控失败状态检查页面，再提交。** 提交信息 `feat: show traceable parcel evidence and next steps`。

## Task 4：补齐搜索、部分失败和切换地块状态

**Files:** 修改 `src/App.tsx`、`src/lib/ckan.ts`、`src/lib/arcgis.ts`、`src/lib/ldes.ts`、`src/lib/evidence.test.ts`；新增 `src/lib/selection.ts`、`src/lib/selection.test.ts`。

**Interfaces:** `resolveSearchSubmission(raw: string, hits: SearchHit[]): { kind: 'pin'; pin: string } | { kind: 'choose_candidate' } | { kind: 'empty' }` 只允许直接 PIN 提交；地址必须点击明确候选。`isCurrentSelection(requestId: number, activeRequestId: number, returnedPin: string, selectedPin: string): boolean` 控制异步结果更新。每次选择生成 request ID 并取消旧 `AbortController`；仅当返回结果的 `PIN` 与当前选中地块一致时更新。Assessment `PARID` 标准化后与边界 `PIN` 核对，不一致时该来源为 `unavailable`，不替换规范 ID。

- [ ] **Step 1: 写失败测试。** 地址多候选按 Enter 返回 `choose_candidate`；无候选返回 `choose_candidate` 并给反馈；PIN 返回规范 ID；旧 request ID、PIN 不匹配均不能更新。Assessment ID 不一致和单源失败加入数据装配测试。
- [ ] **Step 2: 运行目标测试确认失败。** `npm test -- src/lib/selection.test.ts`，并运行相关已有评分测试。
- [ ] **Step 3: 实现选择与部分失败流程。** 在 `App.tsx` 使用上述纯函数、request ID 和 `AbortController`；用 `Promise.allSettled` 替换阻断所有资料的 `Promise.all`；显示每源失败原因，不清空成功证据。
- [ ] **Step 4: 运行 `npm test`、`npm run build`、`npm run lint`；手动快速切换两块地并模拟一个 API 失败，再提交。** 提交信息 `fix: preserve parcel evidence through partial failures`。

## Task 5：真实地块回归与规则校准

**Files:** 新增 `docs/verification/real-parcel-cases.md`、`src/lib/ldes/fixtures/verified-parcels.json`；按发现的问题修改对应 adapter、规则和测试；更新 `docs/LDES_v2.3_parcel_screen.md`。

**Interfaces:** 每个案例记录规范 PIN、来源 URL、源日期、获取日期、人工核验图/链接、预期五类用途路径、分区/坡地/洪水事实、预期 RAG、未核项。快照只存允许公开的少量必要字段，不提交大量原始下载或个人信息。

- [ ] **Step 1: 选并记录至少四种真实案例。** 包含常规单区、部分住宅用途不允许、跨区或 overlay、陡坡/洪水命中；案例不足时先从官方 GIS 找到可复核样本，不编造 PIN 或期望值。
- [ ] **Step 2: 将已人工核对的观察事实做成回归 fixture。** 测试同一数据/规则版本结果稳定、缺关键图层为 UNRATED、已确认障碍增加不会改善等级、边缘相交处理符合文档。
- [ ] **Step 3: 运行 `npm test`，逐项与官方地图或原始记录人工核对。** 记录差异及修正理由；对颜色边界/细条阈值做敏感性检查。专家意见若获得，标记为意见来源，不冒充法规事实。
- [ ] **Step 4: 修复真实案例发现的错误，再运行 `npm test`、`npm run build`、`npm run lint` 并提交。** 提交信息 `test: verify parcel screening on real cases`。

## Task 6：集成验收与用户交接

**Files:** 修改 `README.md`、`docs/README.md`、`docs/LDES_v2.3_parcel_screen.md`；新增 `docs/verification/deployment-readiness.md`。本任务不创建线上服务。

**Interfaces:** 浏览器评分继续为纯函数。`deployment-readiness.md` 列出 Parcel、CKAN、PGH GIS、PASDA、FEMA 所需 `/api/*` 路由、目标上游、超时/失败状态；未来部署必须在目标域名逐一验证。本计划交付可审核的集成 PR，不把未知部署平台写成已上线。

- [ ] **Step 1: 更新 README。** 写明“选一块地即可”、实际接入的数据源、RAG 范围、未评估内容、版本、运行及测试命令；旧版 0–100 文档标历史。
- [ ] **Step 2: 完成本地浏览器验收和部署需求记录。** 在 `npm run dev` 下用真实 PIN 完成边界、zoning、环境、评分和来源展示；运行 `npm run preview` 记录 Vite 开发代理不随静态产物发布，并将生产所需 `/api/*` 路由写入 `deployment-readiness.md`。若用户已有目标部署平台，再增加目标域名的网络检查；否则部署另行安排。
- [ ] **Step 3: 最终运行 `npm test`、`npm run build`、`npm run lint`，检查 `git diff`、无密钥/大数据、文档链接及四个真实案例。**
- [x] **Step 4: 本地交接供用户审核。** 记录集成分支、工作树路径、验证结果、数据限制和未解决项；用户审核后自行决定是否推送及何时合并 `main`。

## 明确不在本轮做

- 高级筛选表单、住宅套数输入、项目级容量结论、财务模型、AI 生成评分。
- 在单地块主路径验收前加入双地块比较、批量筛地或新的可选数据源。
- 未确定部署平台前擅自部署或购买服务。

## 自检

- 覆盖顺序：分支整合 → 无方案评分语义 → 证据报告 → 失败状态 → 真实案例 → 生产检查。
- Task 2 是最重要的产品决定；若用户不接受“至少一种路径”的摘要规则，应先改计划，再执行代码。
- 当前主工作区 `package-lock.json` 有未提交改动，计划不修改或清理它；执行阶段使用独立工作树。
