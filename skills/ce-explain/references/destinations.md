# Destination Sub-flows

Per-destination mechanics for Phase 6. The menu itself and the one-line action per option live inline in SKILL.md — this file carries only the elaborate sub-flows. Detection is by capability: probe the current session's tools and context; a missing binary, env var, or unloaded MCP tool is not proof of absence when a connector could supply the capability. Local file is the always-present floor.

## Claude Artifact

当 session 位于 Claude Code 且存在 Artifact tool 时，为 HTML output 提供此选项。把 canonical `$RUN_DIR/explainer.html` 交给 tool，遵循其当前 contract，并向用户确认返回的 URL 或 reference。Tool 负责适配其 artifact runtime；不要预处理 HTML。

## 公开发布到 ht-ml.app

未选择 Claude Artifact adapter 时，这是首选 HTML publisher。ht-ml.app 接受完整的 standalone HTML document，通过普通 HTTP 工作，不依赖 agent harness。

发布前，destination option 本身必须声明：**页面是公开的，可能被索引、爬取、复制或归档**。如果用户的初始请求明确选择了 ht-ml.app，因而跳过菜单，也要在 chat 中给出同样完整的警告，并在任何 publish 前取得警告后的明确确认；“这是公开的”并非完整警告，初始请求本身也不算确认。只有选择了已带警告的菜单选项，或在警告后明确确认，才允许发布。如果无法取得确认，不得发布；保留 canonical `$RUN_DIR/explainer.html` 并报告其 local path。绝不 headlessly 发布，也不要因为用户请求了 explainer 就推断 consent。内容敏感时，改为路由到 Local file。

用户选择已警告的选项，或在警告后明确确认后：

1. 优先使用当前 session 检测到的任何 ht-ml.app 或通用 HTML-publishing capability。如果它是 skill，就通过平台的 skill-invocation primitive 调用，传入 canonical `$RUN_DIR/explainer.html` 和用户对公开发布的确认；否则直接调用检测到的 tool、connector 或 browser capability。遵循该 capability 当前 contract。不要假设特定 skill name 或 installation path。
2. 没有安装 publisher 时，使用可访问的 web 或 HTTP interface，遵循 `https://ht-ml.app/llms.txt`（或其中链接的 API help）面向 agent 的说明，并发布完整 canonical HTML。Explainer 已经组成；不要选择 template，也不要重新设计。
3. 展示返回的 URL。把任何返回的 update credential 当作 secret：不要在 chat 中打印，也不要嵌入页面。失败时短暂等待后重试一次，然后报告 error，并回退到 canonical local-file path。

## Local file

1. Ask nothing extra if the user already named a path; otherwise accept the path from their menu answer's free-text.
2. Copy the artifact out of the run dir to that path (`cp "$RUN_DIR/explainer.html" <path>` — or `explainer.md` for a markdown run), creating parent directories if needed.
3. Where the platform exposes a browser-opening primitive (`open` on macOS, `xdg-open` on Linux, `start` on Windows), offer to open it; otherwise print the absolute path.

## Publish to Proof (markdown output only)

Proof ingests markdown, so this option renders only when the run resolved `output:md`. Invoke the `ce-proof` skill via the platform's skill-invocation primitive when it is installed, passing the artifact path, a title (`Explainer: <subject>`), and identity `ai:compound-engineering` / `Compound Engineering`; surface the returned share URL. When the skill is not installed but the Proof web API is reachable, POST the markdown per that API. On failure: retry once after a short wait, then report plainly that the upload didn't succeed and why, and fall back to the local-file path. One-way publish; the run-dir file stays canonical.

## Send to Thinkroom

Offered only when a Thinkroom capability is detected — a Thinkroom skill in the session's skill list, a reachable MCP tool, or a documented CLI that responds. Use whatever interface that capability exposes to create/share a document from the explainer content, following that interface's own contract for title and body format. Surface the returned document reference. When the send fails, report it and fall back to the local-file path. Never guess at a Thinkroom API shape when no capability is detectable — the option simply doesn't render.
