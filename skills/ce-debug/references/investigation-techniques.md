# Investigation Techniques（调查技巧）

当 standard code tracing 不够时，用于 deeper investigation 的 techniques。当 bug 不能可靠 reproduce、涉及 timing 或 concurrency、或需要 framework-specific tracing 时加载本文件。

---

## Root-Cause Tracing（根因追踪）

当 bug 在 call stack 深处显现时，本能反应通常是在 error 出现处修复。这是在治疗 symptom。正确做法是沿 call chain 向后 tracing，找出 bad state 从哪里产生。

**Backward tracing（向后追踪）：**

- 从 error 开始
- 在每一层问：这个 value 从哪里来？谁调用了这个 function？传入了什么 state？
- 持续 upstream，直到找到 valid state 首次变成 invalid 的点；那就是 root cause

**Worked example（示例）：**

```
Symptom: API returns 500 with "Cannot read property 'email' of undefined"
Where it crashes: sendWelcomeEmail(user.email) in NotificationService
Who called this? UserController.create() after saving the user record
What was passed? user = await UserRepo.create(params) — but create() returns undefined on duplicate key
Original cause: UserRepo.create() silently swallows duplicate key errors and returns undefined instead of throwing
```

fix 应该落在 origin（UserRepo.create 应在 duplicate key 时 throw），而不是 error 出现处（NotificationService）。

**当 manual tracing 卡住时**，添加 instrumentation：

```
// Before the problematic operation
const stack = new Error().stack;
console.error('DEBUG [operation]:', { value, cwd: process.cwd(), stack });
```

在 tests 中使用 `console.error()`；logger output 可能被 suppressed。在 dangerous operation 之前 log，而不是在它失败后。

---

## Multi-Component Boundary Instrumentation（多组件边界插桩）

Root-cause tracing 沿着一条 call chain 走。当 bug 跨越 subsystems（CI → build → signing，API → service → database，frontend → API → background worker）时，failure 很难 localize 到单一 chain。此时应在一次运行中 instrument 每个 component boundary，capture 每一层的进入与退出，让 evidence 指向 failing layer。

**Shape（步骤形状）：**

1. 列出 data 从 trigger 到 observed symptom 跨过的 component boundaries。
2. 在每个 boundary log 进入和退出的内容：包括 values、relevant environment，以及识别 boundary 的 short tag。
3. 运行 scenario 一次。
4. 线性阅读 log，将每个 "exits" value 与下一个 "enters" value 对比。
5. data 首次不再匹配 expectation 的 boundary 就是 failing layer。

**Worked example（app signing on CI 示例）：**

```bash
# Layer 1: workflow env
echo "=== workflow env ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 2: build script env
echo "=== build script env ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 3: signing stage keychain state
echo "=== keychain ==="
security list-keychains
security find-identity -v

# Layer 4: the actual signing call
codesign --sign "$IDENTITY" --verbose=4 "$APP"
```

一次运行后，log 会精确显示哪一层丢掉了 value：secrets → workflow ✓，workflow → build ✗。investigation 应聚焦 workflow-to-build-script inheritance，而不是 signing。

**何时优于 backward tracing：** symptom 距 trigger 很远（跨 many components）、components 归属不同 systems（CI vs app code）、"call stack" 是 conceptual 而不是 literal（message bus、HTTP、process boundaries）时。一旦 failing layer 被识别，backward tracing 仍适用于该 layer 内部。

---

## Git Bisect for Regressions（用 Git Bisect 定位回归）

当 bug 是 regression（"it worked before"）时，用 binary search 找到 breaking commit：

```bash
git bisect start
git bisect bad                    # current commit is broken
git bisect good <known-good-ref> # a commit where it worked
# git bisect will checkout a middle commit — test it
# mark as good or bad, repeat until the breaking commit is found
git bisect reset                  # return to original branch when done
```

使用 test script 做 automated bisection：

```bash
git bisect start HEAD <known-good-ref>
git bisect run <test-command>
```

test command 对 good 应 exit 0，对 bad 应 non-zero。

---

## Intermittent Bug Techniques（间歇性 Bug 技巧）

当 bug 在 2-3 次尝试后仍无法 reliably reproduce：

**Logging traps（日志陷阱）。** 在 suspected failure point 添加 targeted logging，并反复运行 scenario。capture passing 和 failing runs 之间不同的 state。

**Statistical reproduction（统计复现）。** 在 loop 中运行 failing scenario，建立 reproduction rate：

```bash
for i in $(seq 1 20); do echo "Run $i:"; <test-command> && echo "PASS" || echo "FAIL"; done
```

5% reproduction rate 证明 bug 存在，但也暗示 timing 或 data sensitivity。

**Environment isolation（环境隔离）。** 系统性排除 variables：
- Same test，不同 machine？
- Same test，不同 data seed？
- Same test，serial vs parallel execution（串行 vs 并行执行）？
- Same test，with vs without network access（有无网络访问）？

**Data-dependent triggers（数据依赖触发）。** 如果 bug 只在 certain data 下出现，识别 trigger condition：
- failing input 有什么 unique 之处？
- input size、encoding 或 edge value 是否重要？
- data order 是否 significant（sorted vs random）？

**Test-order pollution（测试顺序污染）。** 如果 individual test 单独运行通过，但 suite 运行时失败，说明 tests 之间在 leaking state：

- 单独运行 failing test；如果通过，pollution 已确认
- 单独运行 failing test 所在文件；将 pollution narrowed 到 same-file 或 cross-file
- 用 randomized test order 运行 suite（多数 runners 支持 seed flag）；每次 failing-test neighbor 不同，暗示 global state mutation
- Bisect preceding tests：让 failing test 只与前面 tests 的前半部分一起运行，再与后半部分一起运行，然后继续 narrow

isolated 后常见 culprits：module-level state、mocks 未 torn down、temp files 未 cleaned up、database rows 未 rolled back、environment variables 被 mutated 且未 restored。

---

## Repro Minimization（最小化复现）

一旦 bug 能 reliably reproduce，reproduction 往往很大：500-line integration test、huge payload、lengthy form-filling sequence。更小的 reproduction 会让后续每一步 investigation 更快，并 localize actual trigger。

**Delta debugging（manual，手动）：**

1. 将 reproduction cut in half。
2. 它仍然 fail 吗？如果是，discard 另一半，并对剩余部分 recurse。如果不是，failing behavior 依赖你 cut 掉的那一半；把它放回去，再 cut 另一半。
3. 持续到无法在保留 failure 的前提下进一步 reduction。

**For input payloads（输入 payload）：**

- 一次 remove 一个 field（或一半），同时确认 bug 仍存在
- 缩短 string values，直到找到仍 trigger bug 的 minimum length
- 用能 reproduce 的 smallest shape 替代 complex nested structures

**For test sequences（测试序列）：**

- 移除看起来不影响 failing assertion 的 setup steps
- 将 helpers inline 到 test 中，查看实际运行了什么
- 移除其他 assertions，以 isolate 哪个 assertion 在什么 state 上失败

minimized repro 经常直接揭示 root cause："bug only triggers when the string contains a tab character" 比 "bug triggers in this 500-line integration test" 强得多。

---

## Framework-Specific Debugging（框架特定 Debugging）

### Rails（Rails）
- 检查 callbacks：`before_save`、`after_commit`、`around_action`；它们会 implicitly execute 并可能 alter state
- 检查 middleware chain：`rake middleware` 列出 full stack
- 检查 Active Record query generation：对任意 relation 使用 `.to_sql`
- 使用带 tagged logging 的 `Rails.logger.debug` 做 request tracing

### Node.js（Node.js）
- Async stack traces（异步 stack traces）：使用 `--async-stack-traces` flag 运行，获取 full async call chains
- Unhandled rejections（未处理 rejections）：检查 promises 是否缺少 `.catch()` 或 `await`
- Event loop delays（event loop 延迟）：在 suspect operations 前后使用 `process.hrtime()`
- Memory leaks（内存泄漏）：`--inspect` flag + Chrome DevTools heap snapshots

### Python（Python）
- Traceback enrichment（traceback 增强）：在 except blocks 中使用 `traceback.print_exc()`
- 用 `pdb.set_trace()` 或 `breakpoint()` 做 interactive debugging
- 用 `sys.settrace()` 做 execution tracing
- 用 `logging.basicConfig(level=logging.DEBUG)` 输出 verbose output

---

## Stepping Debugger vs Instrumentation（单步调试器 vs 插桩）

Print-debugging 是默认手段：添加快，且适用于许多 cases。但有些情况下，interactive stepping debugger 会更快 converge 到 root cause。经验法则：

- **Reach for a stepping debugger when：** failing code path 已 localized（specific function 或 tight call chain）、bug reliably reproducible，且你需要 known point 的 precise state：一次看许多 locals 的 values、structure 的 exact shape、或 loop 中 state 的 progression。break 一次，inspect everything。
- **Reach for instrumentation when：** bug 是 intermittent，跨 many calls 或 distributed components，或发生在 breaking execution 会 disruptive 的 context（production、timing-sensitive concurrent code、long-running processes）。Instrumentation 捕获跨 time 和 environments 的 diffuse behavior。

Mixed use 很常见：先 instrument 以 localize，再在 localized point attach debugger。

**Entry points by language（按语言的入口）：**

| Language（语言） | Interactive breakpoint（交互断点） | Attach to running process（附加到运行中进程） |
|----------|------------------------|---------------------------|
| Python | `breakpoint()` in code, or `python -m pdb script.py` | `python -m pdb -p <pid>` (Python 3.14+ only); on earlier versions, instrument the target with `rpdb` / `remote-pdb` and connect after it triggers |
| Node.js | `debugger;` in code + `node --inspect-brk`, then connect via Chrome DevTools or VS Code | `kill -SIGUSR1 <pid>` to enable the inspector on the running process (Linux/macOS), then connect Chrome DevTools or VS Code to the default port 9229 |
| Ruby | `binding.irb` (stdlib), `binding.pry` (pry gem), `debugger` (debug gem), `rdbg` | `rdbg --attach <pid>` with `debug` gem loaded |
| Go | `dlv debug` or `dlv test`, then `break`, `continue`, `print` | `dlv attach <pid>` |
| Rust / C / C++ | `lldb target/debug/binary` or `gdb binary`, then `break`, `run`, `print` | `lldb -p <pid>` / `gdb -p <pid>` |
| Browser JS | `debugger;` in code, or DevTools Sources → set breakpoint | DevTools attaches to page automatically |

对 test runs，多数 test runners 可与上述工具集成，例如 `node --inspect-brk $(which jest)`、`pytest --pdb`、带 `binding.pry` 的 `rspec`、`dlv test`。优先使用 runner integration，而不是事后 attach。

---

## Race Condition Investigation（Race Condition 调查）

当怀疑 timing 或 concurrency 时：

**Timing isolation（时序隔离）。** 在 suspect points 添加 deliberate delays，扩大 race window，使其可 reproduce：

```
// Simulate slow operation to expose race
await new Promise(r => setTimeout(r, 100));
```

**Shared mutable state。** 搜索被多个 threads 或 processes 无 synchronization 访问的 variables、caches 或 database rows。常见 patterns：
- Global 或 module-level mutable state
- 无 locks 的 cache reads
- Database rows 先 read 后 update，且无 optimistic locking

**Async ordering。** 检查 operations 是否假设了不被保证的 specific execution order：
- 包含 dependent operations 的 Promise.all
- 假设 emission order 的 event handlers
- 假设 read consistency 的 database writes

**Condition-based waits instead of arbitrary delays。** Flaky tests 往往建立在 `setTimeout`/`sleep` calls 上，猜测 operation 需要多久。这些 tests 在 fast machines 上通过，在 load 或 CI 下失败。用 polling test 实际依赖的 condition 替代猜测，并设置 timeout：

```typescript
// before: races under load
await new Promise(r => setTimeout(r, 50));
expect(getResult()).toBeDefined();

// after: waits for the condition
await waitFor(() => getResult() !== undefined, 'result available', 5000);
expect(getResult()).toBeDefined();
```

只有在测试 actual timing behavior（debounce intervals、throttle windows）时，arbitrary delays 才仍然正确；这种情况下，要 comment 说明为什么需要 specific duration。

---

## Heisenbugs and the Observer Effect（海森堡 Bug 与观察者效应）

当添加 `console.log`、attach debugger 或插入 instrumentation 导致 bug 消失时，observation 正在改变 system behavior。这本身就是 diagnostic；不要得出 "fixed" 结论。bug 仍然存在，只是 instrumentation 将它 perturb 到视野之外。

**disappearance 告诉你的信息：**

- **Timing-sensitive：** Instrumentation 让 code 变慢，race condition 不再获胜。调查 concurrency、async ordering 和 shared mutable state，而不是 nominal logic。
- **Garbage-collection-sensitive：** Logging 分配 memory 并 trigger GC，隐藏了 symptom。查看 memory pressure、finalizers、object lifecycle。
- **Optimization-dependent：** Instrumentation 阻止了产生错误结果的 compiler/JIT optimization。少见但真实存在（尤其是 C/C++/Rust release builds）。
- **Buffering-dependent：** Log flushing 改变 I/O ordering。通常表明 elsewhere 有 unflushed writes。
- **Async-ordering-sensitive：** Log I/O 引入 microtask boundary，重排 subsequent operations。寻找 implicitly depends on synchronous ordering 的 code。

**如何在不 perturb 的情况下 investigate：**

- Non-blocking instrumentation（非阻塞插桩）：写入 memory 中的 ring buffer，仅在 observed failure 后 dump
- Sampling profilers instead of tracing（使用 sampling profiler 替代 tracing）：不向 path 注入 code，从外部观察正在运行什么
- Platform-level instrumentation（平台级插桩）：`strace`、`dtrace`、eBPF、无需 code changes 的 platform profilers
- Post-mortem evidence（事后证据）：core dumps、heap snapshots、failure 后 captured state，而不是 during 时观察

defining rule：如果 bug 对 observation sensitive，fix 必须在 re-introduction of observation 后仍然成立。只有 instrumentation 存在时才有效的 fix，本身就是 heisenbug。

---

## Browser Debugging（浏览器 Debugging）

使用 `agent-browser` 或 equivalent tools investigate UI bugs 时：

```bash
# Open the affected page
agent-browser open http://localhost:${PORT:-3000}/affected/route

# Capture current state
agent-browser snapshot -i

# Interact with the page
agent-browser click @ref          # click an element
agent-browser fill @ref "text"    # fill a form field
agent-browser snapshot -i         # capture state after interaction

# Save visual evidence
agent-browser screenshot bug-evidence.png
```

**Port detection：** 先检查 project instruction files（`AGENTS.md`、`CLAUDE.md`）中的 port references，再看 `package.json` dev scripts，然后 `.env` files，最后 fallback 到 `3000`。

**Console errors：** 检查 browser console output 中的 JavaScript errors、failed network requests 和 CORS issues。它们往往在需要 code tracing 前就揭示 UI bugs 的 root cause。

**Network tab：** 检查 failed API requests、unexpected response codes 或 missing CORS headers。backend 返回 422 或 500 会立即 narrow investigation。

---

## Evidence Harvesting Across Systems（跨系统收集证据）

当 bug 跨越 real environment（production、staging、multi-service setup）时，最丰富的 evidence 通常已经存在于 logs、traces 和 error-tracker payloads 中。尽可能使用它，而不是从零 reproduce。

**Follow a single request end-to-end（端到端跟踪单个 request）。** 选择一个 concrete failing request（exact timestamp、user ID，或 error tracker 中的 event ID）。然后：

- 在每个 relevant log source 中搜索该 identifier：correlation ID、request ID、trace ID、user ID
- 按顺序 assemble timeline：edge → API → service → database → downstream calls → response
- 记录 timeline 哪里有 gaps（missing logs）或 contradictions（timestamps out of order、IDs 未 propagate）

一个 traced request 通常比十几次 reproduce attempt 更快揭示 root cause。

**Correlation IDs（关联 ID）。** 多数 web frameworks 会自动 attach request ID，或通过 header（`X-Request-ID`、`traceparent`）接受它。当 project 有 correlation ID 时，每条 log line 和每个 downstream call 都应携带它。如果它缺失或未 propagate，这本身就是 finding；propagation gaps 意味着 agent 无法 assemble timeline，调查下次 incident 的 on-call human 也不行。

**Timestamp triangulation（时间戳三角定位）。** 当 failing operation 没有 shared ID 时，timestamps 是 fallback。将每个 log query 限制在 observed failure 附近的 narrow window，然后按顺序寻找 first anomaly。注意 services 之间的 clock skew：两个 hosts 间 30 秒 drift 会 reorder evidence 并误导 triangulation。

**Error tracker payloads（错误追踪 payload）。** Sentry、Bugsnag、Honeybadger、AppSignal 和类似 tools 会在 failure moment capture stack traces、breadcrumbs、user context、request state 和 release metadata。tracing code 前先读 full payload；它常包含 exact file:line、variable state，以及 leading to error 的 breadcrumbs。Grouping rules 有时会隐藏 frequency 和 variant information；expand 查看每个 instance，而不是只看 representative one。

**APM / distributed traces（分布式追踪）。** 当 project 有 Datadog APM、Honeycomb、New Relic 或 OpenTelemetry collector 时，trace view 会展示跨 services 的 full call tree 和 timings。查看：unexpectedly long spans（blocking 或 slow dependency）、chain 中间的 failed spans、应该存在却不存在的 spans（missing instrumentation 也会 mask bugs）。

**Preserve before investigating（调查前先保存）。** Error trackers 和 log systems 有 retention windows。开始 long investigation 前，export 或 snapshot key evidence（event ID、trace ID、full stack trace、breadcrumbs），避免它在 session 中途 age out。

---

## System Boundary Checks（系统边界检查）

许多 bugs 存在于 application 与其运行 system 的 boundary：network、database、filesystem、OS。快速扫过这些 boundaries，通常能在 deep code tracing 前消除整类 suspect。

**Network（网络）。**

- DNS resolution（DNS 解析）：`dig <host>`、`nslookup <host>`、`host <host>` — name 是否从这台 host resolve 成你预期的结果？
- Reachability（可达性）：`curl -v https://host/path` — full headers、redirects、TLS errors
- Status codes and headers（状态码与 headers）：检查 response 是否有 4xx/5xx、unexpected redirects、missing CORS headers、content-encoding surprises
- Connection state（连接状态）：`ss -tan` / `netstat -an` / `lsof -i` — open connections、listening ports、处于 TIME_WAIT 或 CLOSE_WAIT 的 connections
- TLS：`openssl s_client -connect host:443` — certificate chain（证书链）、expiry（过期时间）、SNI mismatches（SNI 不匹配）

**Database（数据库）。**

- Query plan：对 suspect query 运行 `EXPLAIN` / `EXPLAIN ANALYZE` — 它是否使用 expected index，还是在 scan large table？
- Slow query log / recent queries：多数 databases 会 surface 最近最慢的 N 条 queries — failing queries 经常出现在这里
- Locks and transactions：检查 lock/transaction tables（`pg_locks`、`information_schema.innodb_trx`、`sys.dm_tran_locks`）— operation 是否在等待 long-held lock？
- Connection pool：app 是否耗尽了 pool？connections 是否在 leaking？
- Replication lag（如果 read replicas 在 path 上）：write 之后立即 read 可能命中尚未 catch up 的 replica

**Filesystem（文件系统）。**

- Existence and permissions：`ls -la <path>` — file 是否存在，running user 是否可读 / 可写？
- Case sensitivity：只在 Linux（而非 macOS）出现的 bugs，经常是 case mismatches
- Open handles：`lsof <path>` 或 `lsof -p <pid>` — 是否仍有东西 hold 该 file，阻止 write/unlink？
- Disk space：`df -h` — out-of-space errors 有时会在其他地方表现成 cryptic write failures
- File watching / inotify limits：EMFILE 或 "too many open files" 经常意味着 inotify/FD limit，而不是你的 code 有 leak
- Path separators and encoding：Unix code 中的 Windows-style paths，或 non-UTF-8 locale 中的 UTF-8 paths

**Processes and signals。** 检查 process 是否真的是你以为正在运行的 version（`ps aux | grep`，将 pid 与 build time cross-reference）。Zombies、orphaned workers、crashed-then-restarted-with-old-code processes 都会伪装成 code bugs。

---

## Bug-Class Pattern Checklist（Bug 类型模式检查清单）

在 deep tracing 前，快速过一遍这个 checklist。许多 bugs 匹配 recognizable class，而 class 会暗示应先看哪里。检查 observed symptom 是否符合这些 patterns：

- **Time and timezone（时间与时区）：** 午夜附近的 off-by-hours errors、DST transitions 期间的特定 failures、epoch/milliseconds confusion、naive 与 timezone-aware datetimes 混用、错误假设 UTC-vs-local
- **Encoding and locale（编码与 locale）：** output 中出现 mojibake、byte-vs-character length off-by-one、file 开头 BOM 破坏 parsers、non-ASCII characters missing、locale-sensitive comparisons 产生 inconsistent results
- **Floating-point precision（浮点精度）：** "should" be equal 的 comparisons 实际不相等、NaN 在 calculation 中传播并静默污染 downstream results、极大或极小数字丢失 precision
- **Integer overflow / underflow（整数溢出 / 下溢）：** bounded integer types 上 wraparound、没有 arbitrary-precision integers 的语言中 `int32` overflows、假设 non-negative 的地方出现 negative values
- **Off-by-one and boundaries（边界与差一错误）：** empty-collection edge case、first 或 last element missing、inclusive vs exclusive range mismatch、fencepost errors
- **Cache staleness（缓存陈旧）：** change 后立刻正确，一段时间后错误，restart 或 cache flush 后恢复；包括 HTTP caches、CDN caches、app-level memoization、browser service workers
- **Permissions / auth（权限 / 认证）：** 一个 user 可用另一个不可用，dev 无 auth layer 时可用但 prod 有 auth layer 时失败，superuser 可用但 actual operating identity 不可用
- **Dependency or version drift（依赖或版本漂移）：** 一台 machine 可用另一台不可用，lockfile 与 manifest 不一致，transitive dependency 更新并改变 behavior，native module 针对不同 runtime version 构建
- **Path / case sensitivity（路径 / 大小写敏感）：** macOS 可用但 Linux 失败（case），Linux 可用但 Windows 失败（path separators、`CON`/`PRN` 等 reserved names）
- **Concurrency / ordering（并发 / 顺序）：** serial test mode 可用，parallel 失败；randomized 后某种方式可用另一种失败
- **Stale build artifacts（陈旧构建产物）：** `dist/`、`.next/`、compiled `.pyc`、generated code、Docker image layers — 从 clean rebuild 看是否 reproduce
- **Observer effect (heisenbug)（观察者效应）：** logging、debugger 或 profiler attached 时 bug 消失 — 见上方 Heisenbugs section
- **TOCTOU (time-of-check vs time-of-use)：** 刚才 check 通过，但 dependent action 运行前底层 state 已变化

这里的 pattern-matching 成本很低。花 30 秒检查 symptom 是否符合 known class，可能省掉数小时 speculative tracing。
