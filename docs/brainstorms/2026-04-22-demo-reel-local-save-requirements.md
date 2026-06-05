---
date: 2026-04-22
topic: demo-reel-local-save
---

# Demo Reel：本地保存 Evidence

## 问题框架

当 `ce-demo-reel` 捕获 evidence（GIFs、screenshots、terminal recordings）时，local artifacts 会在上传到 catbox.moe 后被删除。想在本地保留 evidence 的用户——用于 offline access、提交到 repo 或 archival——只能在 cleanup 运行前从 temp directory 手动复制 files。

---

## 需求

**Destination choice（目标选择）**
- R1. capture 完成后，询问用户是上传到 catbox（existing behavior），还是保存到本地。
- R2. 问题必须展示 captured artifact(s)，并清楚描述两个 options。

**Local save behavior（本地保存行为）**
- R3. 当用户选择 local save 时，将 final artifact(s)（GIF、PNG 或 recording）复制到稳定的 OS-temp path（`$TMPDIR/compound-engineering/ce-demo-reel/`）。不要上传到 catbox。
- R4. 如果 destination directory 不存在，则创建它。
- R5. 使用 descriptive filename，包含 branch name 或 PR identifier 以及 timestamp，避免跨 runs 冲突。
- R6. 保存后，向用户显示 local file path(s)，方便引用。

---

## 成功标准

- 运行 `ce-demo-reel` 的用户无需手动介入，即可把 captured evidence 保留在磁盘上。
- Saved artifacts 位于 predictable、stable OS-temp location，容易发现。

---

## 范围边界

- Catbox upload logic 本身不变——只新增 routing（local vs. upload）。
- 不自动 git-add 或 commit saved artifacts。
- 不提供 configurable save path——`$TMPDIR/compound-engineering/ce-demo-reel/` 暂时是 fixed default。
- 不 retroactively save 之前捕获过的 evidence。

---

## 关键决策

- **Local save as an alternative to upload, not an addition**：用户为每次 capture 选择一个 destination——要么 catbox，要么 local。这让 flow 保持简单，并避免 redundant artifacts。
- **OS-temp as the local target**：按 repo 的 cross-invocation scratch-space convention 使用 `$TMPDIR/compound-engineering/ce-demo-reel/`。Stable prefix 让 files 可查找，同时不污染 repo tree。

---

## 下一步

-> `/ce-plan` 进行 structured implementation planning；鉴于 scope 较小，也可以直接进入 implementation。
