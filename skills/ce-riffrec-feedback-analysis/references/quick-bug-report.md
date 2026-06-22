# Quick bug report path（快速 bug report 路径）

当输入是短 recording（约 60 秒以内）、用户描述单个具体 issue，或用户明确要求 "quick"、"small"、"simple" 或 "just transcribe" 时，使用此路径。目标是一份简洁 bug report，而不是 multi-artifact requirements package。

## Workflow（工作流）

1. 将 analyzer 输出到 temp directory，避免污染 repo：

   ```bash
   python scripts/analyze_riffrec_zip.py /path/to/input --output-dir "$(mktemp -d -t riffrec-quick-XXXXXX)"
   ```

   捕获打印出来的 output directory；后续步骤会从那里读取。

2. 只读取 temp output 中的 `analysis.md`。跳过 `problem-analysis.md`、`review-prompt.md`、`requirements-kickoff.md` 和 `source-materials.md`：它们是为 extensive path 设计的。

3. 从 `frames/` 中最多挑选一到两张直接展示 reported issue 的 screenshots。优先选择靠近 verbal complaint、failed click、console error 或 failed network request 的 frames。

4. 输出单份简洁 bug report。默认在 chat 中 inline 打印，让用户在任何内容写盘前确认。只有用户要求时才写文件；即便如此，也优先在 source recording 旁边或用户指定路径写单个 `bug-report.md`。不要为此路径自动创建 `docs/brainstorms/...`。

## Bug report shape（bug report 形态）

保持聚焦且简短。只包含 recording 支持的内容：

- **Title**：用一句短句命名 broken behavior。
- **Steps to reproduce**：从 clicks 和 transcript 重建的 bullet list。
- **Expected vs. actual**：用户说应该发生什么 vs. 实际发生了什么。
- **Evidence**：带 timestamps 的 transcript quote(s)，以及 0-2 个 screenshot references。
- **Suggested next step**：单句说明：file an issue、打开 `ce-debug`，或在出现更多 issues 时升级到 extensive analysis。

## Source mapping（optional，仅在明显时）

如果 workspace 是 product source code，并且 broken surface 在 transcript 或 visible UI 中被清晰命名，添加一行短的 "Likely surface"，包含 file path 和 confidence（`High` / `Medium` / `Low`）。当 mapping 属于 speculative 时，完全跳过此 section；speculative mappings 属于 extensive path，不属于 quick bug report。

## 跳过什么

- 不要生成 `problem-analysis.md`、`requirements-kickoff.md`，不要做 Visual / Functional / Requirement / UX category split。
- 不要自动 handoff 到 `ce-brainstorm`。Quick path 以 bug report 结束。
- 不要 commit `raw/` 或 `frames/`；它们只存在于 temp dir，并由 OS 丢弃。
- 不要跨 codebase 做 source-mapping pass。

## Escalation（升级路径）

如果在阅读 transcript 时发现 recording 包含多个 distinct issues、requirements 或 workflow walkthrough，停止并告诉用户："This recording has more than one issue — switching to the extensive path." 然后加载 `references/extensive-analysis.md`，并用 non-temp output directory 重新运行 analyzer。
