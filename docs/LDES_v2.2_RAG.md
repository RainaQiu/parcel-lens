# LDES v2.2 RAG（当前实现）

版本：`LDES-v2.2-rag`｜规则串 `LDES-v2.2-rag-rules`｜用途表 `pittsburgh-use-pathways-v1`（§911 as of **2026-06-11**）

这是 **live 代码的说明**，不是 0–100 实验分。页面主结果是 `GREEN | AMBER | RED | UNRATED`。Green 只表示已核范围内观察到的用途/场地负担较少，**不是许可、也不是容易建成**。

## 产品在评什么

对 Pittsburgh 市内一块地：

1. **Housing pathways**：五类核心住宅各自在 §911.02 **base district** 上的 `P / A / S / C / P_OR_S / NOT_PERMITTED`（侧栏矩阵，用户不必先选 housing type）。
2. **Zoning 芯片**：单一 `districtKey` 取五条路径里**最严**的颜色。跨两个不同 base district **不合成一色**，Zoning 保持 UNRATED 并标 split-zoned。
3. **Environmental**：坡度、滑坡、采空、FEMA（真实 polygon clip；细条降噪；洪泛 sliver 会改分类时仍 UNRATED）。
4. **Historic / condition**：历史街区/地标、PLI 违规、condemned。细条交叉视为未相交。
5. **Development potential**：setbacks / coverage / height-FAR / parking / access / overlay 尺寸**尚未入库**，本阶段诚实 **UNRATED**。
6. **Headline ease**：见下方合成。Availability / financial / delivery timing 仍为 `NOT_ASSESSED`。

运行时**禁止抓 eCode360**。只读仓库里 `reviewStatus=verified` 的单元格。

## 路径颜色

| Pathway | Zoning 颜色 | 含义 |
|---|---|---|
| `P` | GREEN | 列入 permitted |
| `A` / `S` / `C` / `P_OR_S` | AMBER | 需额外审查或待核条件（R1D attached：lot width ≤35 ft 为 P，否则 S） |
| `NOT_PERMITTED` | RED | **未列入** §911.02 该列；不是永久不能开发 |
| 无分区 / 专项规划 / 未核单元格 | UNRATED | 例如 `SP-*`、IPOD、机场/公园、GPR/OPR/UPR、MTOBOR |

GIS 归一：`R1D-*` → `R1D`，`RM-*` → `RM`，`RIV-*` 按子区，`NDO/LNC/UNC/GT` 等按 §911.02 列。NDO/GT/RIV 是 use table **列**，不是 overlay。

## Headline 合成

`suitability` = Zoning、Environmental、Historic 的最差色（RED 优先于 UNRATED）。

然后：

- use variance 或 condemned 等硬 RED → 整单 **RED**
- potential **RED**（容量不够）→ **RED**
- suitability **UNRATED**（查询失败、overlay 未处理、真缺表、split-zone）→ 整单 **UNRATED**
- potential **UNRATED**（缺尺寸表）→ **不否决**主标；主标 = suitability（GREEN 或 AMBER）
- 两者都已评级 → 取较低色

侧栏须写明：主标来自已评级维；potential 仍缺尺寸，不是许可。

## 阶段

**已完成（本分支）**

- 五类住宅 use table 进仓；侧栏矩阵
- GIS POST clip；polygon 失败时用点查询 `zon_new`
- Zoning 芯片按核实路径着色；历史细条降噪
- Headline 忽略 potential UNRATED

**明确未做（第二阶段）**

- setback、lot width/area、coverage、height、FAR、parking、overlay 尺寸
- 某用途在尺寸齐备前不得把 potential 从 UNRATED 推成 GREEN
- `P` 不能直接变成完整开发 Green

## 关键验收

- UNC 五条 P + 环境绿 + 历史细条降噪 + potential UNRATED → **主标 GREEN**（例如 4749 Baum Blvd）
- R1D 含 two-unit NOT_PERMITTED → Zoning **RED**，主标 **RED**
- R1D+R2 split → Zoning UNRATED，矩阵两色
- overlay 未处理 / FEMA 查询失败 → 该维 UNRATED，可拖主标
- `npm test`

官方 use table：[§911.02](https://ecode360.com/45476784)。
