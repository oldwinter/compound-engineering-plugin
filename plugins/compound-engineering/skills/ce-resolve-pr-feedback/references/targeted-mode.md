# Targeted Mode（定向模式）

当 Mode Detection（在 SKILL.md 中）路由到 **Targeted Mode** 时，读取本 reference：用户提供了特定 comment 或 thread URL。Targeted mode 只处理该 thread。

## 1. 提取 Thread Context

解析 URL，提取 OWNER、REPO、PR number 和 comment REST ID：
```
https://github.com/OWNER/REPO/pull/NUMBER#discussion_rCOMMENT_ID
```

**Step 1** -- 通过 REST 获取 comment details 和 GraphQL node ID（便宜的单 comment 请求）：
```bash
gh api repos/OWNER/REPO/pulls/comments/COMMENT_ID \
  --jq '{node_id, path, line, body}'
```

**Step 2** -- 将 comment 映射到它的 thread ID。使用 [scripts/get-thread-for-comment](../scripts/get-thread-for-comment)：
```bash
bash scripts/get-thread-for-comment PR_NUMBER COMMENT_NODE_ID [OWNER/REPO]
```

这会获取 thread IDs 及其 first comment IDs（最小字段，不含 bodies），并返回带完整 comment details 的 matching thread。

## 2. Fix、Reply、Resolve（修复、回复、解决）

为该 thread spawn 一个 `ce-pr-comment-resolver` agent。传入与 full mode 相同的字段，包括 `isOutdated` 和 location fields（`line`、`originalLine`、`startLine`、`originalStartLine`）；targeted threads 也可能 outdated，并且需要相同的 relocation handling。然后遵循与 Full Mode steps 5-7（见 `references/full-mode.md`）相同的 validate -> commit -> push -> reply -> resolve 流程。
