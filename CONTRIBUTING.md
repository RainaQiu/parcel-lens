# ParcelLens collaboration guide

These conventions are for a three-person hackathon team. The goal is that `main` stays demoable and people do not overwrite each other. Keep the process light. If a Git prompt is unclear, stop and paste `git status` in the team channel instead of guessing a force-push.

## 1. Say who is changing what

- Before starting work, post in the team channel: **task, files you expect to edit, branch name**. Especially for `src/App.tsx`, `src/lib/types.ts`, `package.json`, `package-lock.json`, and `vite.config.ts`, try to have only one person editing at a time.
- One task, one branch. Keep names short, for example `feat/scenario-input`, `data/slope-layer`, `docs/prd-update`, `fix/parcel-search`. Do not share a local working tree or branch among several people.
- `main` is the integration and demo branch. Day-to-day changes go through a pull request (PR). Emergency commits to `main` are allowed only after the team channel names one integrator, and everyone else is told to pull immediately.

## 2. Commands at the start of work

In your own clone:

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/short-task-name
```

If `git pull --ff-only` fails, run `git status` and read why. Do not “fix” it with `reset --hard` or a force-push.

## 3. Commits and handoff

1. Commit only this task’s files. Before committing, run `git status` and `git diff` and check that there are no unrelated files, secrets, or large data files.
2. For app changes, run `npm run build` and `npm run lint`. For docs, check relative links and fact/assumption labels.
3. Use commit messages that describe the change, for example `feat: add housing scenario input`, `fix: handle missing zoning response`, `docs: clarify score limitations`.
4. Push your branch, then open a GitHub PR targeting `main`:

```bash
git add -- path/to/changed-file
git commit -m "feat: describe the change"
git push -u origin feat/short-task-name
```

The PR should state three things: **what changed, how it was verified, and which data or judgments remain unverified**. Ask a teammate for a quick look. If time is short, at least post the PR link and verification result in the team channel before the integrator merges. After merge, everyone returns to `main` and runs `git pull --ff-only origin main`. Do not `git push --force` to `main` or to someone else’s branch.

## 4. Data and product claims

- Parcel facts, regulatory classifications, and scoring rationale must name the source and data date. Separate “verified,” “provisional assumption,” and “unknown.” A field appearing on the map does not mean it is enough for a permit, financial, or investment conclusion.
- Do not commit API keys, tokens, `.env`, personal data, unlicensed datasets, or large raw downloads. For environment variables, commit instructions or a secret-free example file.
- The PRD is [`docs/Track1_Data_Assessment_and_PRD.md`](docs/Track1_Data_Assessment_and_PRD.md). When expert feedback arrives, record the source and which requirement it affects, then update the PRD. Do not treat one expert comment as a universal rule.

## 5. Current layout and later cleanup

| Path | Current use |
|---|---|
| `src/map/` | Parcel map and selection. |
| `src/panel/` | Parcel-detail sidebar. |
| `src/lib/` | Data queries, formatting, and types. |
| `docs/` | PRD, interviews, and later data/architecture notes. |

Add features in the existing folders first. Do not block a demo to reorganize directories. After the map, scenario, and scoring work has settled, the team can separately discuss a move to `src/features/parcels/`, `src/features/analysis/`, `src/shared/`, and `docs/product/`, `docs/data/`. If that happens, **use a dedicated PR that only moves files and fixes references, without mixing in behavior changes**; wait for other branches to merge or agree on an update window.

## 6. When Git is stuck

- Run `git status` first to confirm the branch and uncommitted changes. Paste the error to a teammate. Do not delete files or history when you do not understand the error.
- If push authentication fails, use GitHub’s browser login or Git Credential Manager. **Do not put a token in Slack, chat, a PR, or the repo.**
- If a local proxy is unusable, inspect proxy environment settings. Do not write a personal proxy address into repo config. The team does not require everyone to use the same proxy or auth method.
