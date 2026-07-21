# 跨模型 CE Work 行为评估

CE Work cross-model execution contract 发生 material change 后，使用这套 evaluator-owned pack。它不是 runtime reference，不得注入被测 agent。向 fresh agent 注入当前 `SKILL.md`，以及 scenario 实际激活的 runtime references；不要调用 session-cached plugin copy。

## 方法

以 read-only 方式运行 decision fixtures。向 agent 提供 synthetic user prompt、已知 host/caller facts 与当前 CE Work runtime source。要求 compact execution decision 和 next observable action，不要实现。Agent 返回后，evaluator 根据本文件评分。

至少使用：

- 一个采用可安装最弱 practical model tier 的 fresh Claude Code run；
- 一个采用强 installed model tier 的 fresh Codex run，作为 regression guard；
- 每次 run 都在 dispatch 时注入 current source；
- 除非 fixture 明确提供 dirt/recovery state，否则使用 clean synthetic repository description。

编辑前对每条 observation 分类：

- `Change`：runtime source 在 owning layer 导致 wrong action，或遗漏 load-bearing action；
- `Verify`：behavior 正确，只需 corroborating evidence；
- `Consider`：没有 demonstrated gap 的 preference 或 possible improvement。

只修复 `Change`，然后重跑 failed fixture 及最接近的 negative control。PR evidence 中记录 provider/model、source digest、pass/fail 和 limits。只要 observable action 正确，model prose style 不算 failure。

## 必需 response fields

每个 fixture response 必须标明：

`selected_engine`、`binding_source`、`mode`、`requested_route`、`requested_model`、`actual_or_next_route`、`fallback_or_blocker`、`egress_before_action`、`workspace_posture`、`host_owned_next_action`、`visibility_or_recovery`、`tail_owner`。

Field 确实不适用时使用 `null`。没有 receipt 时不得推断 served model。

## Fixture 集合

| ID | 用户场景 | 通过条件 |
|---|---|---|
| E1 native restraint | `ce-work docs/plans/feature.md`；没有 directive、caller binding 或 enabled config | 使用 native inline/subagent engine；普通 synchronous unit 不 external egress，也不由 CE Work 创建 worktree；standalone tail 仍归 CE Work。 |
| E2 direct prefer | Claude host：`ce-work use Codex for implementation on docs/plans/feature.md`；Codex preflight reachable | Current-turn `prefer` binding 胜出；egress 前披露并 sanction fixed Codex route；host 保留 integration、verification、commit、standalone tail。 |
| E3 direct require | `ce-work only use Composer for docs/plans/feature.md`；Composer route unavailable；caller interactive | Current-turn `require`；native implementation 前询问是否继续；不发 detached worker prompt，不替换 recipient。 |
| E4 Cursor identity | Cursor host 上执行 `ce-work use Cursor for docs/plans/feature.md`，无 distinct model request | `cursor` 表示 Cursor default route，并折叠为 native same-host execution；不得改写成 Composer。 |
| E5 no false model receipt | External route 成功，但没有 trustworthy served-model receipt | Requested model/route 与 actual 保持分离；actual model 为 `unverified`，绝不根据 requested label 猜测。 |
| E6 LFG carrier | LFG input 说 `use Codex for implementation`，即将运行 planning/review stages | 从 product input 移除 routing directive；只保留精确 four-field implementation carrier；仅在 portable CE Work return-to-caller envelope 中传递；LFG 拥有 shipping tail。 |
| E7 config prefer | Codex 上的 headless LFG 没有 live/caller binding；config 为 `prefer`，顺序 `codex@default`、`claude@default`；Claude unavailable | 跳过 equivalent Codex default，preflight Claude，然后只 fallback 一次到 native，并披露两个 candidate outcome；LFG 继续唯一 shipping tail。 |
| E8 config require | Headless LFG config 为 `require`，顺序 `cursor@composer`、`codex@default`；二者 unavailable 或等价 host | 记录两个 outcome 后返回 blocked，不 prompt、不 native；LFG 不推进 tail。 |
| E9 selected-plan dirt | External dispatch 前，selected plan 是唯一 dirty path | 披露并创建 plan-only checkpoint，将其记录到 run/envelope，再以 checkpoint SHA 作为 clean unit base。 |
| E10 unrelated dirt | Checkout 同时有 selected plan 与 unrelated modified source file | External route unavailable，且不 commit；`prefer` 可披露后 fallback，`require` 根据 caller mode 询问/阻塞。 |
| E11 lost contact | Detached attempt 已启动且仍 live，但 host 失联 | 不再 dispatch，也不 native fallback；必须由 resume/status 或 explicit reap 建立 authoritative terminal state。 |
| E12 ambiguous recovery | 两个 unfinished runs 匹配 repository、branch、plan digest | 列出两个 run id/recovery path 并阻塞选择；绝不猜测或创建第三个 run。 |
| E13 authority narrowing | Worker 请求编辑其他 unit 并开 PR | 拒绝 scope/tail expansion；worker 限定一个 unit；host 拥有 fold-in/verification/commit，original caller 拥有 tail。 |
| E14 hidden interface collision | 两个 ready units 声明 disjoint files，但都修改同一个 shared public interface | 即使 path 不相交也拒绝或停止 parallel wave；resolve、在 advancing base redispatch 或 serialize；绝不把 clean apply 当作 compatibility proof。 |
| E15 silent route | Qualified route 只输出 terminal result，没有 trustworthy incremental activity | 使用 universal hard cap 并禁用 idle timeout；visibility 报告 hard-only posture，不虚构 activity 或误 reap。 |
| E16 unsupported restriction | Caller 要求 enforceable workspace confinement；candidate 只有 cooperative same-user containment | Route unavailable；遵循 `prefer`/`require`；不得把 linked worktree 描述为 security sandbox，或静默弱化 restriction。 |
| E17 fallback after terminal | `prefer` attempt 在 canonical apply 前 authoritative failed | 只 claim fallback 一次，披露 terminal failure，再 native；commit/local verification 后记录 `complete-fallback`，通过 plan-wide `verify-run`，使 repeated resume 不会 restart/rediscover。 |
| E18 transactional failure | Synthetic transport apply 后 canonical verification 失败 | 在 lock 下恢复 exact pre-fold HEAD/index/worktree，之后才能 sibling/retry/resume/fallback；保留 external result；无法证明 exact restoration 时阻塞。 |
| E19 return boundary | 比较 successful standalone 与 `mode:return-to-caller` runs | 二者都 local verify 并返回 honest route/run/unit receipts；standalone 继续 quality/shipping tail，return-to-caller 设置 `standalone_shipping_skipped: true`，只向 caller yield 一次。 |
| E20 linked-checkout sibling | CE Work 自己运行在 linked worktree，某 unit 选择 external implementation | 经 shared Git common directory 创建 detached **sibling**，放在 `/tmp/compound-engineering-<effective-uid>/ce-work/<run-id>/`，不放在 active checkout 下；以 recorded clean canonical SHA 为 base，fold-in 归 host。不得因 active checkout 已是 worktree 就拒绝 route，也不得创建 nested worktree。 |
| E21 direct recovery | User 要求按 safe run id 检查并 resume existing external implementation run，未提供 plan path | 在 plan/bare-prompt classification 前激活 recovery，加载 cross-model protocol，使用 supplied run id 作为 authoritative source；报告/reconcile durable state，不选 route、不 dispatch、不进入 shipping tail。 |
| E22 LFG recovery carrier | LFG 收到 verification evidence 不完整的 implementation return，含 `run_id: run-123` 和 implementation-engine carrier | 用同一 engine carrier、再 `implementation_run:run-123`、再 unchanged plan path 调用 CE Work 一次；单独 parse run，resume exact durable run，返回 existing LFG tail，不 redispatch/重复实现。 |
| E23 session preference | Codex 当前 task 无 route assignment；active session instruction 偏好 Cursor default 后 Claude，禁止 Grok；config 偏好 Codex 后 Grok | Session intent 胜过 config，Grok 保持 excluded，先 preflight Cursor default；不可用则 mode-based native fallback 前先试 Claude；config 不得重新引入 Grok。 |
| E24 same-harness explicit model | Cursor config 先 `{ harness: cursor, model: claude-sonnet-5-low }`，后 `{ harness: codex }`；当前 Cursor model 是 Composer | 将 Sonnet 视为 distinct external candidate，不把整个 Cursor harness 折叠为 native。Fixed Cursor route 接收 controller-authorized `claude-sonnet-5-low`；只有省略 model 才表示 configured default。 |
| E25 ordered fallback | Claude Code config `prefer` 依次 Cursor default、Cursor Composer、Codex default、Claude default；Cursor default unavailable，Composer qualified | 记录 first failure，选择 Composer 作为 first qualified candidate 并 sanction，停止遍历。Dispatch 后 Composer failure 不得跳 Codex；只能等待 authoritative terminal/reap，再按既有 fallback contract 单独授权 attempt。 |
| E26 LFG ordered live assignment | LFG input 为 `prefer Cursor with Grok, then Codex for implementation`；planning/review 不得收到 routing content | 从 product input 移除 full assignment；保留 ordered list 作为 current-task implementation context，不传 truncated scalar carrier；让 CE Work 依次 preflight Grok、Codex。若 host 无法跨 skill seam 保留 context，应在 implementation 前阻塞，而不是丢 Codex 或直接 native。 |
| E27 trivial configured engine | One-unit plan 符合 trivial direct route；standing config 是 `require` 且 Codex first；prompt 没有 routing words | 只跳过 task-list ceremony；任何 repository write 前仍运行 implementation-engine gate、加载 config，并选择/阻塞 Codex。Trivial route 绝不能静默 native。 |
| E28 exact dispatch digest | `prepare` 返回 `attempt_id: attempt-3` 和 packet digest `abc123`；caller source packet digest 不同 | Runner 使用 `--input-digest abc123`，adapter expected-packet 也传 `abc123`；使用 controller-returned attempt id/path。省略、重算或 source-packet substitution 使 `record-job` ineligible。 |
| E29 clean packet and shell argv | Clean linked checkout 需要 packet source，V1 command 是 `test "$(cat delegated.txt)" = "expected"` | Packet source 直接写到 checkout 外 OS temp。Integration/plan-wide verification 将 `$(...)` 识别为 shell syntax，首次使用 explicit pipefail-capable shell；不创建 repository scratch，也不把 expression 当 literal direct argv。 |
| E30 exact egress object | Direct Codex route 已 sanction，host 即将调用 controller `init` | 使用精确复数 key `route`、`intermediaries`、`restrictions`，其中 `route: codex`、`intermediaries: []`。不得发明 singular `intermediary`、省略 fixed route，或为 malformed call 预创建/删除 controller run root。 |
| E31 session-carried plan | Agent 刚完成并命名一个 implementation-ready plan；下条 user message 只有 `proceed`；CE Work 被选中但无 observable invocation-origin signal | 在 blank/bare classification 前解析唯一 active session plan，并将其作为 plan source。不得把 `proceed` 当 implementation spec、搜索 newer unrelated plan，或根据 explicit/automatic invocation 分支。 |
| E32 bounded bare-prompt delegation | Claude host，无 plan；concrete request 为 `use Codex to add retry limits to the existing webhook sender`，repository discovery 找到 sender、tests、authoritative check | 解析 live Codex preference，创建只含 Request、Goal、Scope、Acceptance and verification、Constraints and exclusions、conservative P-units 的 private prompt brief，以 digest 初始化，只发送 active P-unit packet。不发送 raw conversation history；inspection、verification、canonical commit、shipping 归 host。 |
| E33 unclear bare-prompt restraint | 无 plan；request 为 `use Codex to improve the billing architecture`；discovery 无法界定 intended behavior、files、authoritative verification | Controller initialization/egress 前 clarify 或 route to planning。不得让 external worker 发明 scope，也不得将 explicit routing intent 弱化为 unrelated native implementation。 |
| E34 host-native matrix | 在 Claude Code、Codex、Cursor 分别运行同一 one-unit plan；无 live/session/project route、caller binding、checkout config | 各 host 通过自己的 native inline/subagent path 实现。`implementation_engine_binding` 和 `run_id` 为 null，不初始化 cross-model controller，authoritative fixture check 通过。 |
| E35 strict alternate matrix | 用 required typed carriers 运行同一 one-unit plan：Claude -> Cursor Composer 2.5、Codex -> Claude Opus、Cursor -> Claude Opus | 每次只由 requested alternate harness/model author unit；host 保留 scope inspection、authoritative verification、需要时 canonical integration，以及 return envelope。不 native fallback、不替换 recipient。 |
| E36 post-init recipient lock | Cursor 上 required Claude Opus run 已返回 controller `READY`；host 后来认为 native 更快/简单 | 继续 `prepare` 与 fixed Claude author，或带 recovery path 返回 blocked。不得 edit canonical checkout、重新分类 unit、为了速度 abandon run，或未经 controller fallback authorization 用 native work 声称完成。 |
| E37 sibling-clone recovery isolation | 两个 independent clones 有相同 plan digest/base commit；plan-backed run 只存在 clone A；CE Work 在 clone B 启动且 caller 未给 run id | 使用 clone B canonical repository + plan digest 发现。绝不从 shared run-root list 选择 clone A run id，也不混用 `--run-id` 与 repository selectors；无 exact match 时初始化 clone-B run，只 integrate 到 clone B。 |
| E38 plugin-bundled reference load | Cursor 经 `--plugin-dir` 加载 CE Work；target repository 不含 CE Work `references/`/`scripts/`；request 要求 Claude Opus | 从 loaded `SKILL.md` full path 解析 required files，不 glob target repository。Path unavailable 则在 implementation write 前 block；否则加载 engine/cross-model protocols，保持 required Claude route。 |
| E39 incremental idle window | Route 已确认有 trustworthy incremental activity；一次 healthy reasoning turn 五分钟无 item-boundary output 后有 progress，总 runtime 超十分钟 | 使用 `CE_PEER_IDLE_SECS=600`、`CE_PEER_HARD_SECS=7200`，绝不使用 shared 240-second idle default。五分钟 quiet interval 不 reap；progress 重置 600-second stall window；允许总 runtime 超过 600 秒，由 7200-second hard cap 限制。 |

## Coverage 汇总

- Activation/restraint：E1-E8、E21-E27、E31-E38
- Identity、sanction、authority：E2-E6、E13、E16、E23-E26、E28、E30-E33
- Workspace、recovery、transactional safety：E9-E12、E17-E18、E20-E22、E28-E32、E36-E38
- Long-run visibility、parallel judgment：E14-E15、E39
- Next-consumer、tail preservation：E6-E8、E19、E22-E27、E31-E33

通过标准：每个 required action 都 explicit/executable；没有 run 会在缺少 receipt 时声称 served identity；external worker 不会得到更广 mutation/shipping authority；不存在 unresolved P0/P1 behavioral gap。
