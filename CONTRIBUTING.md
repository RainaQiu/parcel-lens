# ParcelLens 协作约定

本约定供三人团队在 hackathon 期间使用。目标是让 `main` 随时可演示，避免互相覆盖改动。流程保持轻量；遇到不确定的 Git 提示，先停下来在团队频道贴出 `git status`，不要猜测着强推。

## 1. 谁改什么，先说清楚

- 开始一项工作前，在团队频道说一句：**任务、准备修改的文件、分支名**。特别是 `src/App.tsx`、`src/lib/types.ts`、`package.json`、`package-lock.json` 和 `vite.config.ts`，同一时间尽量只有一人修改。
- 一项任务一个分支，名称简短，例如 `feat/scenario-input`、`data/slope-layer`、`docs/prd-update`、`fix/parcel-search`。不要几个人共用一个本地工作目录或分支。
- `main` 是集成与演示分支。日常改动先开 Pull Request（PR）；紧急直接提交 `main` 只在团队频道明确约定一位集成人后使用，并立即通知其他人拉取。

## 2. 每次开始工作的命令

在自己的仓库目录中运行：

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/short-task-name
```

如果 `git pull --ff-only` 失败，先运行 `git status` 看原因；不要用 `reset --hard` 或强推来“修好”。

## 3. 提交和交接

1. 只提交本任务的文件；提交前运行 `git status` 和 `git diff`，核对没有无关文件、密钥或大数据文件。
2. 改应用代码时运行 `npm run build` 和 `npm run lint`。改文档时检查相对链接和事实/假设标注。
3. 用能说明内容的提交信息，例如 `feat: add housing scenario input`、`fix: handle missing zoning response`、`docs: clarify score limitations`。
4. 推送自己的分支，再在 GitHub 创建指向 `main` 的 PR：

```powershell
git add -- path/to/changed-file
git commit -m "feat: describe the change"
git push -u origin feat/short-task-name
```

PR 简述三件事：**改了什么、怎么验证、还有哪些数据或判断未核实**。请一位队友快速看一遍；时间紧时至少在团队频道贴 PR 链接和验证结果，再由集成人合并。合并后大家回到 `main` 并运行 `git pull --ff-only origin main`。不要 `git push --force` 到 `main` 或他人的分支。

## 4. 数据与产品结论

- 地块事实、法规分类和评分依据写明来源及数据日期；把“已验证”“暂定假设”“未知”区分开。地图能显示某字段，不代表它已经足以支持许可、财务或投资结论。
- 不提交 API key、token、`.env`、个人资料、未获许可的数据集或大量原始下载文件。需要环境变量时提交说明或不含密钥的示例文件。
- PRD 在 [`docs/Track1_Data_Assessment_and_PRD.md`](docs/Track1_Data_Assessment_and_PRD.md)。收到专家意见时记录出处和影响的需求，再更新 PRD；不要把单条专家意见写成通用规则。

## 5. 当前目录与后续整理

| 当前路径 | 目前用途 |
|---|---|
| `src/map/` | 地块地图与选择。 |
| `src/panel/` | 地块资料侧栏。 |
| `src/lib/` | 数据查询、格式化与类型。 |
| `docs/` | PRD、访谈和后续数据/架构说明。 |

当前先按既有目录添加功能，不为整理目录而阻塞演示。地图、方案和评分功能成形后，再由团队单独讨论是否改成 `src/features/parcels/`、`src/features/analysis/`、`src/shared/` 及 `docs/product/`、`docs/data/` 等按职责分组的结构。若决定调整，**用一个独立 PR 搬文件并修正引用，避免同时改业务逻辑**；先让其他人的分支合并或约好更新时间。

## 6. Git 卡住时

- `git status` 先确认当前分支和未提交改动；把错误消息贴给队友，不要在不理解时删除文件或历史。
- 推送认证失败时使用 GitHub 的浏览器登录或 Git Credential Manager；**不要把 token 发到 Slack、聊天、PR 或仓库**。
- 本机若有不可用代理，先检查代理环境设置；不要把个人代理地址写进仓库配置。团队约定不要求每个人采用相同的代理或认证方式。
