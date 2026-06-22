---
title: "多步骤 pipeline scripts 优先使用 Python 而不是 bash"
date: 2026-04-09
last_refreshed: 2026-06-20
category: best-practices
module: "skill scripting / historical ce-demo-reel"
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - Script 编排 2+ 个 external CLI tools（ffmpeg、curl、silicon、vhs）
  - Script 需要 retry logic，或在 tool failure 时 graceful degradation
  - Script 会运行在默认 bash 3.2 的 macOS 上
  - Script 需要从 non-shell test runner（Bun、Jest、pytest）测试
  - Script 有 conditional failure paths，其中一些 errors 应被捕获，而另一些应 abort
tags:
  - bash-vs-python
  - pipeline-scripts
  - skill-scripting
  - set-e-footguns
  - error-handling
  - ce-demo-reel
---

# 多步骤 pipeline scripts 优先使用 Python 而不是 bash

## 背景

构建 `ce-demo-reel` skill 时，初始 implementation 使用 bash script（`capture-evidence.sh`）编排 ffmpeg stitching、frame normalization 和 catbox.moe upload。在 4 轮 review 中，该脚本遇到了 4 类不同 bugs，它们源自 bash execution model 本身，而不是简单 coding mistakes。

## 指导

对于需要串联多个 CLI tools 并处理 error handling 的 agent pipeline scripts，使用 Python。Bash `set -euo pipefail` 适合简单 sequential scripts，但当你需要 controlled failure paths 时，它会变成 footgun。

**Python subprocess model（显式 error handling）：**
```python
result = subprocess.run(
    ["curl", "-s", "-F", f"fileToUpload=@{file_path}", url],
    capture_output=True, text=True, timeout=30, check=False
)
if result.returncode != 0:
    # Retry logic runs normally
    attempts += 1
    continue
```

**Python timeout handling（显式 catch）：**
```python
try:
    result = subprocess.run(cmd, timeout=60)
except subprocess.TimeoutExpired:
    # Controlled failure, not a crash
    return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="Timed out")
```

**Bash equivalent（等价 Bash，footgun）：**
```bash
set -euo pipefail

# Exits the entire script before retry logic runs
url=$(curl -s -F "fileToUpload=@${file}" "$endpoint")
# Never reaches here on curl failure

# Workaround: || true on every line that might fail
url=$(curl -s -F "fileToUpload=@${file}" "$endpoint") || true
# Works but fragile and easy to forget
```

## 为什么重要

Agent pipeline scripts 会运行在 skill author 无法控制的环境中：不同 macOS versions（bash 3.2 vs 5.x）、CI containers、worktrees。每个 bash portability issue 都需要 reviewers 捕获一个非显而易见的 workaround。Python 的 subprocess model 让 error handling 显式且可测试，而不是隐式且依赖版本。

发现的 4 个 bugs 并不罕见。它们是用 bash 编写超出其舒适区的 scripts 所产生的可预测后果。

## 适用时机

在以下场景使用 Python：
- script 编排 2+ 个 external CLI tools
- script 需要 retry logic 或在 tool failure 时 graceful degradation
- script 会运行在默认 bash 3.2 的 macOS 上
- script 需要从 non-shell test runner 测试
- script 有超过约 3 个 subcommands

Bash 仍适合以下场景：
- 没有 error recovery 的简单 sequential scripts（set -e 可以）
- 围绕单个 tool 的 one-liner wrappers
- 只使用 POSIX features 且没有 array manipulation 的 scripts
- 唯一 failure mode 是“abort the pipeline”的 Git hooks 和 CI steps

## 示例

**Before（bash，4 轮 review 中 4 个 bugs）：**

| Bug | 原因 | 所需 workaround |
|---|---|---|
| `url=$(curl ...)` exits on network failure | `set -e` + command substitution | `\|\| true` on every line |
| `${array[-1]}` fails | Bash 3.2 lacks negative indexing | `${array[${#array[@]}-1]}` |
| Frame reduction keeps all frames for n=3,4 | Integer math: `step=(n-1)/2` with min 1 | Minimum step of 2 |
| `command -v ffmpeg` in Bun tests | `command` is a shell builtin, not spawnable | Use `which` instead |

**After（Python，全部 4 类 bugs 消除）：**

```python
# Negative indexing just works
last = frames[-1]

# Timeout handling is explicit
try:
    result = subprocess.run(cmd, timeout=30)
except subprocess.TimeoutExpired:
    return None

# Tool detection is a regular function
if not shutil.which("ffmpeg"):
    sys.exit("ffmpeg not found")

# Math is straightforward
step = max(2, (len(frames) - 1) // 2)
```

## 相关

- `docs/solutions/skill-design/script-first-skill-architecture.md`：覆盖何时使用 scripts vs agent logic（互补：该文回答“是否应由 script 做这件事？”，本文回答“用哪种语言？”）
- `docs/solutions/agent-friendly-cli-principles.md`：从 consumer side 讨论 CLI design（与 exit code 和 stderr patterns 部分重叠）
