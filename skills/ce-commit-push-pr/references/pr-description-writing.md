# PR Description Writing（PR 描述写作）

## 核心原则

Diff 已经在 GitHub 上可见。Description 的存在是为了解释 diff 无法展示的内容：以前无法做到而现在可以做到什么、什么曾经 broken 而现在 fixed、什么 shape 发生了变化。删除任何 reader 能从 diff 本身重建出来的句子。

- Bad（差）： "Adds `evidence-decider.ts`, modifies `ce-commit-push-pr/SKILL.md` to call it, and updates two test files."
- Good（好）： "Evidence capture now decides automatically whether a change has observable behavior. CLI tools and libraries are now eligible alongside web UIs."

如果 lead sentence 描述的是移动、重命名或添加了什么，而不是现在可以做到什么或修复了什么，重写它。这适用于每个 section，不只是 opening；restating the diff 正是此 skill 要防止的 failure mode。

对 user-facing bugs，在写 mechanism 前额外做一次 before/after pass：说明用户以前会看到什么、现在会看到什么。只有在这之后才提 technical cause 或 fix，并且仅当它帮助 reviewer 理解 risk 时才提。如果 visible bug 是 "old videos, thumbnails, or errors could appear after switching selections."，那么 "Playback hooks now ignore late async responses" 这样的 lead 仍然太 mechanical。

---

## Step Pre-A：Resolve the range and base（解析范围和 base）

两种模式：

- **Current-branch mode**（default）：描述 HEAD vs repo default base。
- **PR mode**：描述 specific PR。当 caller 传入 PR ref 时触发。

对 PR mode，先 fetch metadata：

```bash
gh pr view <ref> --json baseRefName,headRefOid,url,body,state,isCrossRepository,headRepositoryOwner
```

如果 `state` 不是 `OPEN`，报告并停止；不要 invent description。使用 `baseRefName` 作为 `<base>`，使用 `headRefOid` 作为 `<head>`。

对 current-branch mode，按优先级解析 `<base>`：caller-supplied（`base:<ref>`）-> `git rev-parse --abbrev-ref origin/HEAD`（strip `origin/`）-> `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'` -> 通过 `git rev-parse --verify origin/<candidate>` 尝试 `main`/`master`/`develop`。如果都无法 resolve，询问用户。`<head>` 是 `HEAD`。

**Base remote：** current-branch mode 和 same-repo PRs 使用 `origin`。对 fork PRs，将 PR 的 base owner/repo 与 `git remote -v` 匹配。如果没有 local remote 匹配，跳到 `gh` fallback；不要与 `origin` diff（base 错误）。

```bash
git fetch --no-tags <base-remote> <base>
git fetch --no-tags <base-remote> <head>   # PR mode only: <head> is headRefOid and may not be local
git log  --oneline "<base-remote>/<base>..<head>"
git diff           "<base-remote>/<base>...<head>"
```

如果 commit list 为空，报告 "No commits to describe" 并停止。

**Fallback**：当 local git 无法访问 refs（fork PR 没有 matching remote、shallow clone、offline、unrelated histories 上的 merge-base）时，使用 `gh pr diff <ref>` 和 `gh pr view <ref> --json commits`。对拒绝 SHA fetch 但允许 `refs/pull/` 的 GHES configurations：

```bash
git fetch --no-tags <base-remote> "refs/pull/<number>/head"
PR_HEAD_SHA=$(awk '/refs\/pull\/[0-9]+\/head/ {print $1; exit}' "$(git rev-parse --git-dir)/FETCH_HEAD")
```

使用 API fallback 时，在 user-facing summary 中注明。

---

## Step A：Size the description（确定描述篇幅）

让描述重量匹配 change 重量。拿不准时，越短越好。Sizing 时减去 fix-up commits（review fixes、lint、rebase resolutions）；它们对 reader 不可见。Large PRs 需要更多 selectivity，而不是更多 content。

| Change profile（变更类型） | Description approach（描述方式） |
|---|---|
| Small + simple (typo, config, dep bump) | 1-2 sentences, no headers. Under ~300 characters. |
| Small + non-trivial (bugfix, behavioral change) | 3-5 sentences. No headers unless two distinct concerns. |
| Medium feature or refactor | Narrative frame, then what changed and why. Call out design decisions. |
| Large or architecturally significant | Narrative frame + 3-5 design-decision callouts + brief test summary. Target ~100 lines, cap ~150. For PRs with many mechanisms, use a Summary table; do not create an H3 per mechanism. |
| Performance improvement | Include before/after measurements as a markdown table. |

对 small + simple PRs，value-led sentence 就是整个 description。
对 small + non-trivial bugfixes，当 bug 影响 UI、CLI output、workflow output 或任何其他 user-observable behavior 时，即使目标是 3-5 句，仍需要 user-visible before/after lead。Concision 不是跳过 visible symptom 的理由。

---

## Step B：Compose the title（撰写标题）

`type: description` or `type(scope): description`.

- Type 按 intent，而不是 file extension。`fix` 和 `feat` 都看似合适时，默认用 `fix`：添加代码来补救 missing behavior 是 `fix`。`feat` 保留给用户此前无法完成的 capabilities。更精确时使用 `refactor`/`docs`/`chore`/`perf`/`test`。
- Scope（optional）：最窄且有用的 label。没有单个 label 能增加 clarity 时省略。
- Description：imperative、lowercase、72 chars 以内、无 trailing period。
- 匹配 recent commits 中可见的 repo conventions。
- **没有用户明确确认时，永远不要使用 `!` 或 `BREAKING CHANGE:`**；它们会触发 automated major-version bumps。

---

## Step C：组装 body

顺序：opening -> 真正有价值的 body sections -> non-obvious 时的 test plan -> 如存在则 evidence block -> `---` rule 后的 Compound Engineering badge。

如果 body 使用任何 `##` headings，opening 放在 `## Summary` 下；否则使用裸 paragraph。不要在第一个 heading 上方留下 orphaned opening paragraphs。

**Evidence handling：** 保留任何 existing `## Demo` 或 `## Screenshots` block 原样，除非用户 focus 要求 refresh。如果 caller 传入 freshly captured URL 或 path，以 `## Demo` splice。否则省略。放在 badge 前。永远不要把 test output 标为 "Demo" 或 "Screenshots."

**Visual aids：** 当 diagram 或 table 比 prose 更快传达 change 时使用：relationships、flows、state transitions、sequences、trade-offs、before/after data，或任何 prose 必须枚举的 structure。Mermaid 和 markdown tables 覆盖大多数 shapes；如果其他形式更适合 change，不要被特定类型限制。放在相关位置 inline。对 simple、prose-clear 或 rename/dep-bump changes 跳过。Prose 与 visual 冲突时，以 prose 为准。

**GitHub gotchas：** 永远不要用 `#` 作为 list items 前缀（GitHub 会把 `#1` 自动链接为 issue ref）。实际 references 使用 `org/repo#123` 或 full URL。

---

## Step D：Badge（徽章）

```markdown
---

[![Compound Engineering](https://img.shields.io/badge/Built_with-Compound_Engineering-6366f1)](https://github.com/EveryInc/compound-engineering-plugin)
![HARNESS](https://img.shields.io/badge/MODEL_SLUG-COLOR?logo=LOGO&logoColor=white)
```

| Harness | `LOGO` | `COLOR` |
|---|---|---|
| Claude Code | `claude` | `D97757` |
| Codex | (omit `?logo=` param) | `000000` |
| Antigravity CLI (`agy`) | `googlegemini` | `4285F4` |

**Model slug：** spaces 变为 underscores；如果已知，附加 context window 和 thinking level（用 parens）。**将 literal parens URL-encode 为 `%28` / `%29`**；markdown image URLs 中未编码的 parens 会破坏 release-please 的 commit parser，导致 commit 被静默从 changelog 丢弃。示例：`Opus_4.6_%281M,_Extended_Thinking%29`、`Sonnet_4.6_%28200K%29`、`Gemini_3.1_Pro`。

如果正在 regenerate 的 body 已包含 badge，跳过 badge。
