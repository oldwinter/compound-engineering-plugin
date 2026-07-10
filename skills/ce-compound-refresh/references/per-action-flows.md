# Per-Action Flows（按 Action 的流程）

执行 Phase 4 时读取本 reference。找到与 Phase 2 分类、Phase 3 确认的 action（Keep、Update、Consolidate、Replace 或 Delete）匹配的 section，并遵循该 flow。

## Keep Flow（保留流程）

默认不编辑文件。总结为什么该 learning 仍然 trustworthy。

## Update Flow（更新流程）

只有当 solution 仍然 substantively correct 时，才应用 in-place edits。

有效 in-place updates 示例：

- 将 `app/models/auth_token.rb` reference 重命名为 `app/models/session_token.rb`
- 将 `module: AuthToken` 更新为 `module: SessionToken`
- 修复指向相关 docs 的过期 links
- 在 directory move 后刷新 implementation notes

**不应**作为 in-place updates 的示例：

- 修复不影响理解的 typo
- 只为了 style 重写 prose
- 不实质改善 accuracy 或 usability 的小 cleanup
- 旧 fix 现在已是 anti-pattern
- System architecture 已变化到让旧 guidance 产生误导
- Troubleshooting path 已实质不同

这些情况需要 **Replace**，而不是 Update。

## Consolidate Flow（合并流程）

Orchestrator 直接处理 consolidation（不需要 subagent：docs 已经读过，merge 是 focused edit）。按 topic cluster 处理 Consolidate candidates。对 Phase 1.75 中识别出的每个 cluster：

1. **确认 canonical doc**：cluster 中更广、更 current、更准确的 doc。
2. **从 subsumed doc(s) 提取 unique content**：canonical doc 尚未覆盖的任何内容。这可能是 specific edge cases、additional prevention rules 或 alternative debugging approaches。
3. **把 unique content merge 到 canonical doc 的自然位置。** 不要只是 append；要集成到逻辑上所属的位置。如果 unique content 很小（一个 bullet point、一句话），inline 它。如果是 substantial sub-topic，添加为清晰标记的 section。
4. **更新 cross-references**：如果任何其他 docs 引用了 subsumed doc，将这些 references 更新为指向 canonical doc。
5. **删除 subsumed doc。** 不要 archive，不要添加 redirect metadata；直接删除文件。Git history 会保留它。

如果一个 doc cluster 有 3+ overlapping docs，pairwise 处理：先 consolidate 重叠最多的两个 docs，然后评估 merged result 是否应与下一个 doc consolidate。

完成 merge 后，对 canonical doc 运行 mechanical claims check（见下方 Replace flow 的 step 4）。Merged content 会连同它的 citations 一起带入，而 consolidation 是 cross-references 最容易失效的地方。

**Merge 以外的 structural edits：** Consolidate 也覆盖反向情况。如果一个 doc 已变得笨重，并覆盖多个适合 separate retrieval 的 distinct problems，可以建议拆分。只有当 sub-topics 真正 independent，且 maintainer 可能只搜索其中一个而不需要另一个时才这样做。

## Replace Flow（替换流程）

**一次一个，顺序**处理 Replace candidates。每个 replacement 由 subagent 编写，以保护 main context window。

需要 replacement 时，读取 documentation contract files，并把内容传入 replacement subagent 的 task prompt：

- `references/schema.yaml` — frontmatter fields and enum values
- `references/yaml-schema.md` — category mapping
- `assets/resolution-template.md` — section structure

不要让 replacement subagents 凭记忆发明 frontmatter fields、enum values 或 section order。

**当 evidence sufficient 时：**

1. Spawn 单个 subagent 编写 replacement learning。传入：
   - old learning 的完整内容
   - investigation evidence summary（什么变了、当前 code 做什么、为什么旧 guidance 会误导）
   - target path 和 category（除非 category 本身变化，否则与 old learning 相同）
   - 上面列出的三个 support files 的 relevant contents
2. Subagent 以 support files 作为 source of truth 编写 new learning：`references/schema.yaml` 用于 frontmatter fields 和 enum values，`references/yaml-schema.md` 用于 category mapping 和 array items 的 YAML-safety rules，`assets/resolution-template.md` 用于 section order。如果需要传入内容之外的额外 context，应使用 dedicated file search 和 read tools。
3. **Validate parser-safety of the new learning's frontmatter**，捕获 prose rules 漏掉的 silent-corruption issues：malformed `---` delimiter lines、scalar values 中未 quote 的 ` #`（silent comment truncation），以及 scalar values 中未 quote 的 `: `（silent mapping confusion）。Bundled validator 位于 **skill bundle 内部**；在 Claude Code 中 `${CLAUDE_SKILL_DIR}` resolve 为 skill directory，但 runtime Bash tool 的 CWD 是用户 project，因此不带 `${CLAUDE_SKILL_DIR}` prefix 的 project-relative path 会 miss。通过 existence guard 运行，让无法 locate script 的平台（例如 native Codex/Gemini installs，`${CLAUDE_SKILL_DIR}` unset）fallback 到 manual check，而不是 silent skip protection：

   ```bash
   if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/validate-frontmatter.py" ]; then
     python3 "${CLAUDE_SKILL_DIR}/scripts/validate-frontmatter.py" <new-learning-path>
   else
     echo "Bundled validate-frontmatter.py not resolvable on this platform; applying the parser-safety checklist manually."
   fi
   ```

   - **如果 script 已运行：** exit 0 表示 parser-safe；exit 1 表示 stderr 会命名 offending field(s)：quote value(s)、rewrite doc，并重新运行直到 exit 0。Validation 失败时不要 declare success。
   - **如果 script 未运行**（else branch）：手动应用 validator checks，并匹配它的 exact scope；检查更广可能导致 validator 本不会要求的 edits。继续前通过 quote whole value 修复任何 violation：
     1. Opening 和 closing frontmatter delimiters 各自必须是一行内容为 `---` 的 line（trailing whitespace 可以；`----` 或 `---extra` 不是 valid delimiter）。
     2. 对每个 **top-level** mapping entry（`key: value`，无 leading indentation），如果 value **尚未 quoted 或 structured**（不以 `"`, `'`, `[`, `{`, `|`, 或 `>` 开头）：value 不得包含 unquoted ` #`（space-then-hash，YAML 会将其视为 comment 并 silent truncate），也不得包含 unquoted `: `（colon-then-space，strict YAML 可能读成 nested mapping）。如果出现任一情况，quote whole value。
     Nested values、array items 和 already-quoted values 不在这里的 scope 内（array-item quoting 由上方 schema/YAML-safety step 处理）。然后在 completion output 中说明 bundled script validator 在此平台 unavailable，已手动应用 checks。

   Validator 不 enforce schema rules，也不 flag YAML reserved-indicator characters（那些会 downstream 产生 loud parser errors，而非 silent corruption：out of scope）。仅使用 Python 3 stdlib（无 PyYAML 或其它 deps）。
4. **对 successor doc 运行 mechanical claims check。** Bundled `scripts/validate-doc-claims.py` 会 flag tree 中缺失的 cited repo paths、无法 resolve 或 unreachable 的 commit SHAs、无法 resolve 的 relative doc links，以及 dangling drafting scaffold（"Learning 3"、未 resolve 的 `{{...}}` tokens）：

   ```bash
   SKILL_DIR="<absolute path of the directory containing the SKILL.md you just read>"
   python3 "$SKILL_DIR/scripts/validate-doc-claims.py" <new-learning-path>
   ```

   Exit 1 flags 是 **adjudication input，而不是 failures**。描述 removed code 的 successor doc 可能合理地引用已不存在的 paths。通过修正 citation、将其标注为 historical，或确认其为 intentional 来处理每个 flag；scaffold flags 必须始终修复。如果该 script 在当前平台无法 resolve，手动扫描 body 中的相同 patterns，并在 report 中说明。
5. Subagent 完成后，orchestrator 删除 old learning file。New learning 的 frontmatter 可选包含 `supersedes: [old learning filename]` 以便 traceability，但这不是必须；git history 和 commit message 提供相同信息。

**当 evidence insufficient 时：**

1. 在原地将 learning 标记为 stale：
   - 添加到 frontmatter：`status: stale`、`stale_reason: [what you found]`、`stale_date: YYYY-MM-DD`
2. 报告已找到的 evidence 和缺失内容
3. 建议用户下次遇到该区域后运行 `ce-compound`

## Delete Flow（删除流程）

只有当 learning 明确 obsolete、redundant（没有 unique content 可 merge），或其 problem domain 已消失时才删除。不要仅因 document 很旧就删除；age alone 不是信号。

Unlink 文件前，在 repo markdown content 中运行 final inbound-link check，以捕获 Phase 1 investigation 中漏掉的 references。为了效率，优先使用 platform 的 native content-search tool（例如 Claude Code 中的 Grep）；对 matches 周围使用 ranged 或 context-line reads，而不是加载整个文件。

每个 match 都是删除后会 dangling 的 citation。Cleanup 是 mechanical 的；Phase 2 已经分类 citations 并确认 Delete 正确。不要重新争论。

如果此处出现 Phase 1 未见过的 citation，且它不是 unambiguously decorative（而是 substantive 或 mixed/unclear），停止并重新分类：autofix mode 做 stale-mark；interactive mode 询问用户 Replace 是否合适。只有当所有 late-discovered citations 都 unambiguously decorative 时，才继续 cleanup。
