# Web Research Cache（Web Research 缓存，V15）

在 dispatch `web-researcher` 前检查 V15 cache，或 dispatch 后把 fresh research append 到 cache 时，读取本文件。这里的 behavior 是 conditional：大多数 invocations 要么命中 cache，要么写入一次后继续。

## Cache file shape（cache 文件结构）

```json
[
  {
    "key": {
      "mode": "repo|elsewhere-software|elsewhere-non-software",
      "focus_hint_normalized": "<lowercase, whitespace-collapsed focus hint or empty string>",
      "topic_surface_hash": "<short hash of the user-supplied topic surface>"
    },
    "result": "<web-researcher output as plain text>",
    "ts": "<iso8601>"
  }
]
```

Files 位于 `<scratch-dir>/web-research-cache.json` 下，其中 `<scratch-dir>` 是 `/tmp/compound-engineering/ce-ideate/<run-id>`，在 SKILL.md Phase 1 中解析一次。

## Reuse check（复用检查）

Dispatch `web-researcher` 前，在 bash 中解析 scratch root（`<scratch-dir>` 的 parent），并列出 sibling run-id directories；同一 session 内的 refinement loops 可以按 topic 合法复用另一个 run 的 cache，而不是按 run-id：

```bash
SCRATCH_ROOT="/tmp/compound-engineering/ce-ideate"
find "$SCRATCH_ROOT" -maxdepth 2 -name 'web-research-cache.json' -type f 2>/dev/null
```

当不存在 cache files 时，`find` 会以 empty output 退出 0，因此 first-run case 不会中止 reuse-check step。

读取每个 matching file。如果任一 entry 的 `key` 匹配当前 dispatch（相同 full mode variant：`repo`、`elsewhere-software` 或 `elsewhere-non-software`；加上相同 case-insensitive normalized focus hint；加上相同 topic surface hash），跳过 dispatch，并把 cached `result` 传给 consolidated grounding summary。Mode variants 必须精确匹配：`elsewhere-software` 和 `elsewhere-non-software` 是不同 domains，不得 cross-reuse。在 summary 中注明："Reusing prior web research from this session — say 're-research' to refresh."

当出现 `re-research` override 时，删除 matching entry 并 fresh dispatch。

## Fresh dispatch 后 append

Fresh dispatch 后，使用 Phase 1 中的 absolute path，把 new result append 到当前 run 的 cache file `<scratch-dir>/web-research-cache.json`（需要时创建 directory 和 file）。Session 中的下一次 invocation 可以通过上面的 `find` listing 复用它。

## Topic surface hash（主题表面 hash）

Topic surface 是 web research 所依据的 user-supplied content：
- **Elsewhere modes（`elsewhere-software`、`elsewhere-non-software`）：** 用户的 topic prompt 加上任何 Phase 0.4 intake answers（agent 正在 research 的实际 subject）。两个 sub-modes 分别 key；同一 topic hash 在 software 和 non-software 间 reclassification 必须强制 fresh dispatch，因为 research domain 不同。
- **Repo mode：** focus hint 加上 stable repo discriminator。这样在 focus 为空时 cache key 仍有意义：同一 repo 中两次 bare-prompt invocations 可以合法共享 research，但 key 仍能区分 repos。由于每个 repo 的 run cache files 现在都位于 shared OS-temp root 下，像 `app` 或 `frontend` 这样的 bare basename 会在无关 repos 之间 collide。用下面的 fallback chain 解析 discriminator 并 hash 结果（sha256 的前 8 个 hex chars 足够）：
    1. `git remote get-url origin` — 跨 machines 稳定，对同一 remote 上的 collaborators 正确。
    2. `git rev-parse --show-toplevel` — absolute repo path；machine-local，但在 git checkout 中始终可用。
    3. current working directory 的 absolute path — 不在 git repo 中时的 last resort。

Hashing 前 normalize：lowercase，collapse whitespace。（Repo discriminator hash 从 raw command output 计算；只有 focus hint 和 topic text 会 normalize。）

## Degradation（降级）

如果当前 platform 上 cache file 无法跨 invocations 访问（filesystem isolation、sandboxing、ephemeral working directory），degrade 到 "no reuse, dispatch every time." 在 consolidated grounding summary 中说明 limitation，并在不复用的情况下继续，而不是虚构 platform 可能没有的能力。
