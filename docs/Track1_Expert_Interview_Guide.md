# ParcelLens｜Slack 住房专家访谈提纲

版本：2026-09-26 v0.4。用途：用异步专家反馈校准工作线 3 的产品假设；**不等待回复再写 PRD、收集数据或设计接口**。已收到一条财务线索，以及一条用户转述的评分回复。

## 1. 问题筛选原则

只问公开资料无法回答的**真实决策、工作顺序、信任门槛与反例**。问题应允许对方用匿名案例回答；不索取未公开的项目地址、客户资料或内部文件。每条回复记录回答者的专业角色和日期，不把一位专家的意见写成所有用户的共识。按组织者在 #housing-sme-help 的指示，**每个问题单独开 thread**，格式为 Team / track、What we are building、Our question、What we currently believe；工具定位为 decision support。

已查到、无需占用专家时间反复询问的事项：Pittsburgh 有 Basic、Site Plan、Planning Commission 三类 Zoning Review；用途在分区表中允许仍须满足地块条件；[OneStopPGH Insights](https://insightshelp.pittsburghpa.gov/)公开规划和许可记录；[URA Rental Gap Program](https://www.ura.org/pages/rental-gap-program)有明确的项目资格与承保要求；这些分别可由[市府流程](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes)、[Zoning FAQ](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Zoning-FAQ)及项目网页直接查询。

## 2. 已收到的专家线索与仍需问的事

用户提供的 Slack 记录中，Het Sheth 已询问“现有工具仍难回答什么、由谁承担”。Steve Wray（SME, City of Pittsburgh）回答：**financial feasibility 是关键问题**，开发商或 nonprofit 会用到，需找相似社区的可比租金/价值、房地产租赁或销售数据。来源是用户在本次对话提供的记录；未取得消息 permalink，也未针对本项目的具体住宅方案验证。**不要再次泛问“最大的可行性问题是什么”**。

用户随后转述的另一条 Slack 回复明确说**没有预设评分系统**，团队可自行提出对用户直观的方案，并以绿／黄／红为例。这回答了“是否存在专家指定公式”，因此**不再重复问 Q1 或要求对方给权重**。该回复没有给出 ParcelLens 的实际阈值，也不能证明当前缺财务数据的原型可用于真实投资决策。回答者身份、发言时间、消息链接待补；团队暂按 [PRD 4.4](Track1_Data_Assessment_and_PRD.md)提出可复核的分类规则。

## 3. 最值得在 office hours 问的独立问题

| 问题 | 公开资料回答不了什么 | 回复会改变 PRD 哪一项 |
|---|---|---|
| **Q2 财务边界**：既然财务可行性很关键，若本周末原型只核查 zoning/环境并明确标记“财务未评估”，开发商或 nonprofit 会在什么早期决策中使用它？若不会，最少还要增加哪一项财务输入或可比数据？ | Steve 已指出关键数据方向，但没有说明非财务初筛是否仍有独立价值或最低财务需求。 | 是否调整主用户、Basic 范围及财务提示/增强项。 |
| **Q3 初筛等级反例复核（拿到真实案例后再问）**：这是我们的绿／黄／红／灰规则和一个真实地块 + 方案报告；哪一处可能让开发商误以为地块已可建或财务可行？若缺尺寸或财务资料，应该显示灰色、保留黄色障碍旗，还是收窄等级名称？ | 专家已允许团队自定易懂的系统，尚未验证具体阈值与用户理解；真实反例比再次问公式更有价值。 | B6 的阈值、措辞和演示前审查。 |

若只能再发一题，优先用 Q2 验证原型对真实决策是否有价值。Q3 待数据线交付一块真实地块与团队暂定等级后发送，不能编造案例；已回答的 Q1 不再发送。

## 4. 针对不同专业角色的可选追问

- **Municipal Planner / zoning 专家**：对于一个真实的拟建一户住宅案例，哪一种常见的 overlay、现有合法用途或尺寸条件会让“用途表显示 permitted”的表达仍显著误导？我们应使用什么准确措辞？请指出反例或法规入口。公开资料可查规则，但无法替代专家选出最常见、最容易误解的反例。
- **Small/Mid-Size Developer**：在筛地时，土地/法规初筛和租售可比数据通常谁先查？若没有 comps，你会不会仍用一份有来源的地块障碍报告决定是否继续尽调？请给最近一例。公开资料无法测得实际使用顺序。
- **Housing Nonprofit/CDC**：若不做完整 pro forma，你希望报告中哪项财务或资助条件最早被提醒为“未核查”？公开项目指南列资格，不能说明早期筛地工作的优先顺序。
- **Policy Analyst**：要把地块结果聚合成社区/政策洞察，你会要求什么最小覆盖率、可比性或缺失说明？哪种排序可能导致错误的政策判断？公开政策网页无法给本产品的分析可接受门槛。

## 5. 可直接发送的英文 Slack 草稿（每段单独开 thread）

**Thread B：承接 Steve Wray 的财务线索，另发一帖**

> **Team / track:** ParcelLens, Track 1 — Development Feasibility Navigator
>
> **What we are building:** An early parcel + housing-scenario screen using public zoning and site-constraint evidence.
>
> **Our question:** Steve Wray noted that financial feasibility and neighborhood rent/value comps are crucial for developers and nonprofits. If our weekend prototype explicitly leaves finances unassessed, is its source-linked land-use/site screen still useful for a real early decision? If not, what is the smallest financial input or comparable-data check we should add first?
>
> **What we currently believe:** A land-use/site score should be kept separate from project financial feasibility; we can flag missing comps rather than imply a project is viable.

这是**待发送草稿**，未向 Slack 发消息。若用户转述的评分回复已经直接回答了此题的实际使用价值，应先核对原 thread，避免重复；其现有文字本身没有给出最小财务输入。具体等级复核等真实案例完成后再单独开 thread。

## 6. 晚到回复的处理

| 记录字段 | 说明 |
|---|---|
| 回答者角色、日期、问题编号 | 保持可追溯；不必记录个人隐私。 |
| 原话或匿名案例 | 把证据与我们的解释分开。 |
| 影响的需求 ID | 如 B4 zoning、B6 评分、B7 障碍、B10 共用报告。 |
| 处理 | 接受 / 需权威来源复核 / 暂不采用，附理由和负责人。 |

收到回复后先查是否推翻既有事实或只是调整优先级。事实冲突回到法规/数据源核验；优先级变化可更新 PRD 和页面顺序。即使访谈在原型之后才到，也可按此表定点修改，不要求数据和技术工作重来。
