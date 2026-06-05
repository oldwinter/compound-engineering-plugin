---
title: "feat(ce-demo-reel): 添加 local save 作为 catbox upload 的替代选项"
type: feat
status: active
date: 2026-04-22
origin: docs/brainstorms/2026-04-22-demo-reel-local-save-requirements.md
---

# feat(ce-demo-reel): 添加 local save 作为 catbox upload 的替代选项

## 概览

为 ce-demo-reel upload flow 添加 destination choice：capture 后，用户选择 "upload to catbox"（现有行为）或 "save locally"（新增）。Local save 会把 final artifact 复制到稳定的 OS-temp path，并使用 descriptive filename。catbox upload path 保持不变。

---

## 问题框架

当 ce-demo-reel 捕获 evidence 时，local artifacts 会在 upload 到 catbox.moe 后被删除。想要在本地保留 evidence 的用户没有办法做到。（See origin: `docs/brainstorms/2026-04-22-demo-reel-local-save-requirements.md`）

---

## 需求追踪

- R1. Capture 完成后，询问用户 upload to catbox 还是 save locally
- R2. 问题必须展示 captured artifact(s)，并清晰描述两个 options
- R3. 当用户选择 local save 时，将 artifacts copy 到 `$TMPDIR/compound-engineering/ce-demo-reel/`；不要 upload to catbox
- R4. 如果 destination directory 不存在，则创建它
- R5. 使用包含 branch name 与 timestamp 的 descriptive filename，避免 collisions
- R6. 保存后向用户显示 local file path(s)

---

## 范围边界

- Catbox upload logic 本身不变 -- 只新增 routing
- 不自动 git-add 或 commit saved artifacts
- 不支持 configurable save path -- `$TMPDIR/compound-engineering/ce-demo-reel/` 是固定 default
- 不 retroactively save 过去 captured evidence

---

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-demo-reel/references/upload-and-approval.md` -- 将插入 destination choice 的 5-step upload flow
- `plugins/compound-engineering/skills/ce-demo-reel/scripts/capture-demo.py` -- 带 `preview` 和 `upload` subcommands 的 pipeline script；将新增 `save-local` subcommand
- `plugins/compound-engineering/skills/ce-demo-reel/SKILL.md` -- Step 8 delegate 到 `upload-and-approval.md`；Output section 定义 return format

### 组织内 learnings

- **Script-first architecture**（`docs/solutions/skill-design/script-first-skill-architecture.md`）：File manipulation（mkdir、copy、path generation）属于 Python script，不应 inline 在 SKILL.md 中
- **Prefer Python over bash**（`docs/solutions/best-practices/prefer-python-over-bash-for-pipeline-scripts.md`）：`save-local` subcommand 应使用 Python，与现有 script 一致

---

## 关键技术决策

- **Destination choice 替代 approval gate，而不是新增一个 gate**：现有 Step 2 approval gate 询问 "use this / recapture / skip"。新 flow 询问 "upload to catbox / save locally / recapture / skip" -- 一个合并的问题，而不是两个 sequential prompts。
- **`save-local` 作为 script subcommand**：根据 script-first architecture，由 Python script 处理 directory creation、filename generation 和 file copying。SKILL.md 负责 orchestration choice 并调用 script。
- **Filename format**：`<branch>-<YYYYMMDD-HHMMSS>.<ext>` -- branch 提供 context，timestamp 防止 collisions。Branch name 会 sanitize（slashes to dashes，truncated to 60 chars）。
- **Output format for local save**：现有 output 使用 `URL: [public URL]`。对 local saves，改用 `Path: [local path]`，使 caller 可区分两者。

---

## 开放问题

### 规划期间已解决

- **Should preview upload still happen before the choice?** 是 -- 用户需要看到 artifact 才能决定。preview 是 temporary（1h），如果选择 local save，不会有额外成本。

### 延后到实现阶段

- **Exact branch-name sanitization regex**：Implementation detail；遵循 Python `re.sub` conventions。

---

## 实现单元

- [ ] U1. **向 capture-demo.py 添加 `save-local` subcommand**

**目标:** 添加一个 script subcommand，将 artifact copy 到 target directory，并使用 descriptive filename。

**需求:** R3, R4, R5, R6

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-demo-reel/scripts/capture-demo.py`

**做法:**
- 添加 `save-local` subcommand，接受 `--file`（artifact path）、`--branch`（branch name）和 `--output-dir`（target directory，默认 `$TMPDIR/compound-engineering/ce-demo-reel/`）
- 用 `os.makedirs(exist_ok=True)` 创建 output directory
- Sanitize branch name：将 `/` 替换为 `-`，剔除非 alphanumeric chars（保留 `-`），截断到 60 chars
- 生成 filename：`<sanitized-branch>-<YYYYMMDD-HHMMSS>.<ext>`，ext 来自 source file
- 用 `shutil.copy2` copy file
- 将最终 absolute path 作为 output 的最后一行打印（匹配 `preview` 和 `upload` 打印 URL 作为最后一行的 convention）
- 在 argparse `main()` block 中 register subcommand

**遵循的模式:**
- 同一文件中的 `cmd_preview` 和 `cmd_upload` -- 相同 structure，相同 `die()` error handling
- 文件底部 argparse registration pattern

**测试场景:**
- 成功路径：`save-local --file /tmp/demo.gif --branch feat/add-login` 创建 `$TMPDIR/compound-engineering/ce-demo-reel/feat-add-login-<timestamp>.gif` 并打印 path
- 成功路径：`save-local --file /tmp/screenshot.png --branch main` 创建 `$TMPDIR/compound-engineering/ce-demo-reel/main-<timestamp>.png`
- 边界情况：deep nesting branch `feat/team/subsystem/thing` sanitize 为 `feat-team-subsystem-thing`
- 边界情况：超过 60 chars 的 branch name 被截断
- 边界情况：output directory 不存在 -- 自动创建
- 错误路径：source file 不存在 -- 退出并输出 error message

**验证:**
- `python3 scripts/capture-demo.py save-local --file <test-gif> --branch test-branch` copies the file and prints the destination path

---

- [ ] U2. **更新 upload-and-approval.md 以添加 destination choice**

**目标:** 用包含 local save option 的 combined destination-choice question 替换当前 approval gate。

**需求:** R1, R2

**依赖:** U1

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-demo-reel/references/upload-and-approval.md`

**做法:**
- Step 1（preview upload）保持不变 -- 用户仍会看到 preview
- Step 2 从 "Approval Gate" 改为 "Destination Choice"
- blocking question 现在提供 4 个 options：
  1. **Upload to catbox (public URL)** -- 进入 Step 3（promote to permanent，不变）
  2. **Save locally** -- 运行 `save-local` subcommand，跳过 Step 3，进入 cleanup
  3. **Recapture** -- 行为不变
  4. **Proceed without evidence** -- 行为不变
- 添加新 section "Step 3b: Local Save"，调用 `python3 scripts/capture-demo.py save-local --file [ARTIFACT_PATH] --branch [BRANCH]`
- Step 3b 捕获 printed path，并在 output 中使用
- Step 5（cleanup）保持不变 -- `[RUN_DIR]` 总是移除，因为 artifact 已 copy 出去

**遵循的模式:**
- 现有 Step 2 approval gate structure（question wording、option format、platform blocking tool instructions）
- 现有 Step 3 promote structure（script invocation、output capture）

**测试场景:**
- 成功路径：用户选择 "Save locally" -> `save-local` runs，local path displayed，`[RUN_DIR]` cleaned up
- 成功路径：用户选择 "Upload to catbox" -> existing promote flow runs unchanged
- 成功路径：用户选择 "Recapture" -> returns to tier execution as before
- 集成：multiple static screenshots -- 每个 file 都以同一 branch prefix 但 unique timestamps 保存本地

**验证:**
- approval gate question 包含 4 个 options，且 descriptions 清晰
- "Save locally" branch 调用 script，且不 invoke catbox upload
- "Upload to catbox" branch 与当前行为 functionally identical

---

- [ ] U3. **更新 SKILL.md output format 以支持 local saves**

**目标:** 扩展 output contract，使其同时支持 local file paths 与 URLs。

**需求:** R6

**依赖:** U2

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-demo-reel/SKILL.md`

**做法:**
- 在 Output section 中，将 `Path` 加为 `URL` 的 alternative：
  - upload 到 catbox 时使用 `URL: [public URL]`（不变）
  - saved locally 时使用 `Path: [local file path]`
  - 两者只出现一个，绝不同时出现
- 更新关于 `URL: "none"` 的 note 覆盖 local case：saved locally 时，`URL` 为 `"none"`，但 `Path` populated

**遵循的模式:**
- SKILL.md 中 existing output block format

**测试场景:**
- 成功路径：local save 产生带 `Path:` field 与 `URL: "none"` 的 output
- 成功路径：catbox upload 产生带 `URL:` field 且无 `Path:` field 的 output（不变）

**验证:**
- Output contract 清楚说明何时存在 `Path` vs `URL`
- Callers（例如 ce-commit-push-pr）可区分 local 与 remote evidence

---

## 系统级影响

- **Interaction graph:** ce-commit-push-pr 是 ce-demo-reel 的主要 caller。它当前期望 output 中有 `URL` 用于嵌入 PR descriptions。Local saves 时，它会收到 `Path` -- 应该 graceful handle（例如 skip embedding 或注明 evidence is local-only）。
- **Error propagation:** 如果 `save-local` 失败（disk full、permission denied），artifact 仍存在于 `[RUN_DIR]`。skill 应报告 error，并提供 retry 或 fallback to catbox upload。
- **Unchanged invariants:** Catbox preview/upload pipeline、tier selection 和 capture logic 完全不变。

---

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| ce-commit-push-pr 不处理 `Path` output | 检查 ce-commit-push-pr 如何消费 demo-reel output；如需要再更新（但按 scope boundaries 不在本 plan 内） |
| OS-temp files 被 system reboot 清理 | 可接受 -- demo reel artifacts 是 transient；用户如果想 commit 可自行 `mv` 到 repo |

---

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-04-22-demo-reel-local-save-requirements.md](docs/brainstorms/2026-04-22-demo-reel-local-save-requirements.md)
- 相关代码: `plugins/compound-engineering/skills/ce-demo-reel/`
- Learnings（learnings）: `docs/solutions/skill-design/script-first-skill-architecture.md`, `docs/solutions/best-practices/prefer-python-over-bash-for-pipeline-scripts.md`
