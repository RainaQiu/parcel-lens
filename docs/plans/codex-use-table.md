---
name: Codex Use Table Plan
overview: Codex 认为大面积 UNRATED 不是 GIS 断连，而是仓库缺少核验过的 §911.02 use table。方案是把五类住宅用途写成版本化规则，先只解除用途路径的 Unrated，尺寸/overlay 仍诚实缺证据。
todos:
  - id: use-table-asset
    content: 核验并落仓五类住宅 §911.02 版本化 use table（仅 verified 单元进 live）
    status: completed
  - id: gis-normalize
    content: GIS zon_new 归一到 districtKey；专项规划区保持 Unrated
    status: completed
  - id: pathway-matrix-ui
    content: 侧栏展示五条 base-zoning pathway，不要求用户选 housing type
    status: completed
  - id: keep-potential-unrated
    content: 第一阶段 development potential / overlay 尺寸继续诚实 Unrated
    status: completed
isProject: false
---

# Codex 方案摘要：分阶段解除 Live UNRATED

来源：[Codex 对话「补齐核验 zoning use table」](https://chatgpt.com/s/cx_6ab89ed3c9488191a2466d1803707f24)

## 诊断（Codex 同意我们这边的结论）

- Parcel / 评估 / zoning 图层 / 坡度 **已经连上**。
- GitHub [RainaQiu/parcel-lens](https://github.com/RainaQiu/parcel-lens) **没有** `district → P/A/S/C` 结构化表，也没有 setbacks/coverage/FAR/parking 表。
- 官方来源是 [§911.02 Use Table 网页](https://ecode360.com/45476784)，不是 API。
- Live 把 `pathwayVerified = false` 是符合规格的；所以 zoning 和最终 ease 几乎全是 `UNRATED`。

## 总策略

不以字母猜区划、不恢复旧 0–100 分。以 **PR #2 的 report-first 分支** 为基线，把官方 use table **人工核进仓库**，运行时只读本地版本化数据，**禁止浏览器抓 eCode360**。

分两阶段：

1. **只解除“用途路径”UNRATED**：每个地块展示五条独立的 base-zoning pathway。
2. **尺寸 / overlay / parking 未齐时**，完整 development potential 继续 `NEEDS FURTHER EVIDENCE`。

## 第一阶段数据

新增版本化规则，覆盖五类核心住宅（不含养老、宿舍、非住宅）：

- `single_unit_detached`
- `single_unit_attached`
- `two_unit`
- `three_unit`
- `multi_unit`

每个单元格保存：`districtKey`、`useType`、`pathway`（`P | A | S | C | NOT_PERMITTED | P_OR_S`）、`standards[]`、`sourceUrl`、`codeAsOf`、`ruleVersion`、`reviewStatus`、`verifiedAt`、`verifiedBy`。

只有 `reviewStatus=verified` 才能进 live。法规基准记为修订至 **2026-06-11** 的 §911；以后改法出新 `ruleVersion`，不原地覆盖。

GIS 编码标准化示例：`R1D-* → R1D`、`RM-* → RM`、`RIV-*` 按子区、`NDO/LNC/UNC/...` 直接映射。`SP-*`、机场/公园类、`GPR/OPR/UPR`、`MTOBOR` 等套不上 §911.02 通用列的保持 Unrated，并说明需查专项规划。

## 路径颜色（只描述 base-district 用途，不是许可或整体开发难度）

- `P` → Green
- `A/S/C` → Amber
- `NOT_PERMITTED` → Red，文案限定为「未列入 §911.02 base-district permitted pathways」，不能写成永久不能开发
- `P_OR_S` → Amber + 待核条件（R1D attached：lot width ≤35 ft 为 P，否则 S；宽度未知仍算规则已核，路径显示待核 lot width）
- 缺分区 / 专项规划 / 未核规则 → Unrated
- 跨两个不同分区：**逐区展示，不合成一个颜色**；摘要标 split-zoned / manual review

`pathwayVerified` 不再写死，由匹配到的规则单元、复核状态和版本派生。

## UI / 实现要点

- 报告加 **Housing pathways by base zoning** 矩阵：一次看五种用途，用户不用先选 housing type。
- 每行：路径、颜色、相交分区、标准、规则版本、法规链接、限制；明确 overlay/bulk/parking/许可尚未完成。
- 环境（坡度、洪水等）继续独立 RAG，不因 zoning 规则缺而清空。
- 删除或隐藏旧 `score.ts` 百分制，避免启发式与新规则并存。

对话里 Codex 已开始改文件（约 5 个）：`src/lib/types.ts`、`src/data/pittsburgh-use-pathways-v1.ts`、`src/lib/housingPathways.ts` 等。那是 **Codex 工作区**，不一定已合进当前 parcel-lens 分支。

## 第二阶段（明确后做）

再入库 setback、lot area/width、coverage、height、FAR、parking、overlay。某用途规则和地块输入齐了才给该用途的 development-potential：

- `P` 本身不能直接变成完整 Green
- `A/S/C` 至少 Amber
- 已核实禁止或硬规则不可满足才 Red
- 缺尺寸/overlay/停车/几何继续 Unrated

## 验收用例（第一阶段）

- R1D-L + detached → P/Green
- R2-M + two-unit → P/Green
- RM-M + multi-unit → P/Green
- UI + multi-unit → S/Amber
- UC-E + multi-unit → A/Amber（附 §911.04A.85）
- R1D-L + two-unit → NOT_PERMITTED/Red
- R1D-L + attached → P_OR_S/Amber，显示 35 ft 条件
- SP-10 → Unrated（专项规划）
- 跨区不合成单一颜色
- 某一源失败互不清空；缺数据不能自动变 Green

Live 验收：普通地块不再只有一个笼统 UNRATED，而是五条有来源的用途路径；完整 development potential 仍显示证据缺口。
