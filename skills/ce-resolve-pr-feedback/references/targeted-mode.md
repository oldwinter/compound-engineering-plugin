# Targeted Mode

Read this reference when Mode Detection (in SKILL.md) routes to **Targeted Mode** — a specific comment or thread URL was provided. Targeted mode addresses only that thread.

## 1. Extract Thread Context

Parse the URL to extract HOST, OWNER, REPO, PR number, and comment REST ID:
```
https://HOST/OWNER/REPO/pull/NUMBER#discussion_rCOMMENT_ID
```

**GitHub Enterprise host.** Take the host from the URL (targeted mode is always URL-triggered). When it is **not** `github.com`, pass it as a `GH_HOST=<host>` env prefix inline on **every** `gh api` / bundled-script call below (`gh api` honors `GH_HOST` as the request host) so an enterprise thread is fetched, replied to, and resolved on the right host instead of `github.com`. On `github.com`, drop the `GH_HOST=<host> ` prefix. Carry the same host into the reply/resolve calls you run from Full Mode steps 5-7.

**Step 1** -- Get comment details and GraphQL node ID via REST (cheap, single comment):
```bash
GH_HOST=<host> gh api repos/OWNER/REPO/pulls/comments/COMMENT_ID \
  --jq '{node_id, path, line, body}'   # omit GH_HOST=<host> on github.com
```

**Step 2** -- Map comment to its thread ID. Use [scripts/get-thread-for-comment](../scripts/get-thread-for-comment). Set `SKILL_DIR` to the absolute directory you loaded the ce-resolve-pr-feedback SKILL.md from — the Bash tool's CWD is the user's project, not the skill dir, and shell state does not persist between Bash calls, so set it inline. If the bundled script is missing, use Full Mode's fallback `gh` commands to inspect the PR comments:
```bash
SKILL_DIR="<absolute path of the directory containing the ce-resolve-pr-feedback SKILL.md>";
GH_HOST=<host> bash "$SKILL_DIR/scripts/get-thread-for-comment" PR_NUMBER COMMENT_NODE_ID [OWNER/REPO]
```

This fetches thread IDs and their first comment IDs (minimal fields, no bodies) and returns the matching thread with full comment details.

**Step 3** -- 开始任何工作前，检查自己是否有尚未提交的 review。当你持有这种 review 时，发布的 reply 会被吸收到该 draft：调用会像成功一样返回 comment ID 和 URL，但 draft 提交前 reviewer 看不到任何内容。Full Mode 可从 `get-pr-comments` 直接获得此信息；targeted mode 不会调用该 script，因此要直接检查（PENDING reviews 只对 author 可见，所以任何命中都属于你）：
```bash
GH_HOST=<host> gh api --paginate repos/OWNER/REPO/pulls/PR_NUMBER/reviews --jq '.[] | select(.state == "PENDING") | .id'
```
必须使用 `--paginate`：该 endpoint 按时间顺序排列，每页 30 项，因此 draft 可能排到第 1 页之后。输出 IDs 而不是 count；`--jq` 会逐页运行，因此 count 每页输出一个数字，而 IDs 只会依次拼接，并在没有 draft 时保持为空。（`--slurp` 不可用；与 `--jq` 同时使用时 `gh` 会拒绝。）

如果输出了任何内容，就停止。告诉用户该 PR 上有一个尚未提交的 review，必须先提交或丢弃，skill 才能回复。不要自行提交或丢弃；draft review 是尚未发送的人工内容。

## 2. Judge, Fix, Reply, Resolve

**Judge first (the gate).** Apply the rubric in `references/evaluation-rubric.md` to this one thread, in your own context. Account for `isOutdated` and the location fields (`line`, `originalLine`, `startLine`, `originalStartLine`) -- targeted threads can be outdated too and need the same relocation handling. The cross-item reasoning in the rubric is a no-op for a single thread, but the read-depth and divert logic apply in full: deep-read (callers, invariants, `git blame`/PR rationale for author intent) before accepting a contestable finding or overriding code that looks deliberate. This is the legitimacy check — don't fix on the reviewer's authority alone.

**Then act on the verdict:**

- **`fixed` / `fixed-differently`** — read `references/agents/pr-comment-resolver.md` and spawn a single generic subagent seeded with that fixer prompt to implement it. Do not dispatch a standalone agent by type/name. Pass the file/location fields (resolved location or anchor if outdated), the comment text, and your note on what to change and why it's valid. The fixer is a pure executor.
- **`replied` / `not-addressing` / `declined`** — no subagent. Compose the reply text per the rubric and proceed to reply/resolve.
- **`needs-human`** — compose `decision_context` and the natural-sounding reply per the rubric, leave the thread open (don't resolve), and present the decision to the user (use the platform's blocking question tool as in Full Mode step 9). The shared reply step below posts the reply once — do not post it here.

Then follow the same validate -> commit -> push -> reply -> resolve flow as Full Mode steps 5-7 (in `references/full-mode.md`). Skip validate/commit when no code changed.
