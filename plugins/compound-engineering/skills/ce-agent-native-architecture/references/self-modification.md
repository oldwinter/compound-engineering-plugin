<overview>
Self-modification 是 agent native engineering 的 advanced tier：agent 可以演化自己的 code、prompts 和 behavior。不是每个 app 都需要，但它是未来的重要组成部分。

这是 "whatever the developer can do, the agent can do" 的逻辑延伸。
</overview>

<why_self_modification>
## 为什么需要 Self-Modification？

传统 software 是 static 的：它只做你写下的事，不多不少。Self-modifying agents 可以：

- **修复自己的 bugs** - 看到 error，patch code，restart
- **添加 new capabilities** - 用户提出新需求，agent 自己实现
- **演化 behavior** - 从 feedback 中学习并调整 prompts
- **部署自己** - Push code，trigger builds，restart

agent 会成为随时间改进的 living system，而不是 frozen code。
</why_self_modification>

<capabilities>
## Self-Modification 能带来什么

**Code modification（代码修改）：**
- 阅读并理解 source files
- 编写 fixes 和 new features
- Commit 并 push 到 version control
- Trigger builds 并验证通过

**Prompt evolution（Prompt 演化）：**
- 根据 feedback 编辑 system prompt
- 将 new features 添加为 prompt sections
- refine 不起作用的 judgment criteria

**Infrastructure control（基础设施控制）：**
- 从 upstream pull latest code
- 从其他 branches/instances merge
- changes 后 restart
- 出问题时 roll back

**Site/output generation（站点 / 输出生成）：**
- 生成并维护 websites
- 创建 documentation
- 基于 data 构建 dashboards
</capabilities>

<guardrails>
## Required Guardrails（必要 Guardrails）

Self-modification 很强大，因此需要 safety mechanisms。

**面向 code changes 的 approval gates：**
```typescript
tool("write_file", async ({ path, content }) => {
  if (isCodeFile(path)) {
    // Store for approval, don't apply immediately
    pendingChanges.set(path, content);
    const diff = generateDiff(path, content);
    return { text: `Requires approval:\n\n${diff}\n\nReply "yes" to apply.` };
  }
  // Non-code files apply immediately
  writeFileSync(path, content);
  return { text: `Wrote ${path}` };
});
```

**changes 前 auto-commit：**
```typescript
tool("self_deploy", async () => {
  // Save current state first
  runGit("stash");  // or commit uncommitted changes

  // Then pull/merge
  runGit("fetch origin");
  runGit("merge origin/main --no-edit");

  // Build and verify
  runCommand("npm run build");

  // Only then restart
  scheduleRestart();
});
```

**Build verification（构建验证）：**
```typescript
// Don't restart unless build passes
try {
  runCommand("npm run build", { timeout: 120000 });
} catch (error) {
  // Rollback the merge
  runGit("merge --abort");
  return { text: "Build failed, aborting deploy", isError: true };
}
```

**restart 后的 health checks：**
```typescript
tool("health_check", async () => {
  const uptime = process.uptime();
  const buildValid = existsSync("dist/index.js");
  const gitClean = !runGit("status --porcelain");

  return {
    text: JSON.stringify({
      status: "healthy",
      uptime: `${Math.floor(uptime / 60)}m`,
      build: buildValid ? "valid" : "missing",
      git: gitClean ? "clean" : "uncommitted changes",
    }, null, 2),
  };
});
```
</guardrails>

<git_architecture>
## Git-Based Self-Modification（基于 Git 的自我修改）

使用 git 作为 self-modification 的基础。它提供：
- Version history（版本历史，rollback capability）
- Branching（安全 experiment）
- Merge（与其他 instances sync）
- Push/pull（deploy 和 collaborate）

**Essential git tools（必要 git tools）：**
```typescript
tool("status", "Show git status", {}, ...);
tool("diff", "Show file changes", { path: z.string().optional() }, ...);
tool("log", "Show commit history", { count: z.number() }, ...);
tool("commit_code", "Commit code changes", { message: z.string() }, ...);
tool("git_push", "Push to GitHub", { branch: z.string().optional() }, ...);
tool("pull", "Pull from GitHub", { source: z.enum(["main", "instance"]) }, ...);
tool("rollback", "Revert recent commits", { commits: z.number() }, ...);
```

**Multi-instance architecture（多实例架构）：**
```
main                      # Shared code
├── instance/bot-a       # Instance A's branch
├── instance/bot-b       # Instance B's branch
└── instance/bot-c       # Instance C's branch
```

每个 instance 可以：
- 从 main pull updates
- 将 improvements push 回 main（通过 PR）
- 从其他 instances sync features
- 维护 instance-specific config
</git_architecture>

<prompt_evolution>
## Self-Modifying Prompts（自修改 Prompts）

system prompt 是 agent 可以 read 和 write 的文件。

```typescript
// Agent can read its own prompt
tool("read_file", ...);  // Can read src/prompts/system.md

// Agent can propose changes
tool("write_file", ...);  // Can write to src/prompts/system.md (with approval)
```

**System prompt as living document（作为活文档的 system prompt）：**
```markdown
## Feedback Processing

When someone shares feedback:
1. Acknowledge warmly
2. Rate importance 1-5
3. Store using feedback tools

<!-- Note to self: Video walkthroughs should always be 4-5,
     learned this from Dan's feedback on 2024-12-07 -->
```

agent 可以：
- 给自己添加 notes
- Refine judgment criteria（细化判断标准）
- 添加 new feature sections
- 记录它学到的 edge cases
</prompt_evolution>

<when_to_use>
## 何时实现 Self-Modification

**Good candidates（适合场景）：**
- Long-running autonomous agents（长时间运行的 autonomous agents）
- 需要适应 feedback 的 agents
- behavior evolution 有价值的 systems
- rapid iteration 重要的 internal tools

**Not necessary for（不一定需要的场景）：**
- 简单 single-task agents
- Highly regulated environments（高监管环境）
- behavior 必须 auditable 的 systems
- One-off 或 short-lived agents

从 non-self-modifying prompt-native agent 开始。确实需要时，再添加 self-modification。
</when_to_use>

<example_tools>
## Complete Self-Modification Toolset（完整 Self-Modification Toolset）

```typescript
const selfMcpServer = createSdkMcpServer({
  name: "self",
  version: "1.0.0",
  tools: [
    // FILE OPERATIONS
    tool("read_file", "Read any project file", { path: z.string() }, ...),
    tool("write_file", "Write a file (code requires approval)", { path, content }, ...),
    tool("list_files", "List directory contents", { path: z.string() }, ...),
    tool("search_code", "Search for patterns", { pattern: z.string() }, ...),

    // APPROVAL WORKFLOW
    tool("apply_pending", "Apply approved changes", {}, ...),
    tool("get_pending", "Show pending changes", {}, ...),
    tool("clear_pending", "Discard pending changes", {}, ...),

    // RESTART
    tool("restart", "Rebuild and restart", {}, ...),
    tool("health_check", "Check if bot is healthy", {}, ...),
  ],
});

const gitMcpServer = createSdkMcpServer({
  name: "git",
  version: "1.0.0",
  tools: [
    // STATUS
    tool("status", "Show git status", {}, ...),
    tool("diff", "Show changes", { path: z.string().optional() }, ...),
    tool("log", "Show history", { count: z.number() }, ...),

    // COMMIT & PUSH
    tool("commit_code", "Commit code changes", { message: z.string() }, ...),
    tool("git_push", "Push to GitHub", { branch: z.string().optional() }, ...),

    // SYNC
    tool("pull", "Pull from upstream", { source: z.enum(["main", "instance"]) }, ...),
    tool("self_deploy", "Pull, build, restart", { source: z.enum(["main", "instance"]) }, ...),

    // SAFETY
    tool("rollback", "Revert commits", { commits: z.number() }, ...),
    tool("health_check", "Detailed health report", {}, ...),
  ],
});
```
</example_tools>

<checklist>
## Self-Modification Checklist（Self-Modification 检查清单）

启用 self-modification 前：
- [ ] 已设置 Git-based version control
- [ ] code changes 有 approval gates
- [ ] restart 前有 build verification
- [ ] rollback mechanism 可用
- [ ] health check endpoint（健康检查 endpoint）
- [ ] 已配置 instance identity

实现时：
- [ ] Agent 可以读取所有 project files
- [ ] Agent 可以写 files（带 appropriate approval）
- [ ] Agent 可以 commit 和 push
- [ ] Agent 可以 pull updates
- [ ] Agent 可以 restart itself
- [ ] Agent 可以在需要时 roll back
</checklist>
