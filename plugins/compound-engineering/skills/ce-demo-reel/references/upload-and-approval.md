# Upload and Approval（上传与审批）

上传 temporary preview 供用户 review，然后根据用户选择 promote 到 permanent hosting 或 save locally。

## Headless / Background Mode（无头 / 后台模式）

如果没有可用的 blocking question tool（Codex autonomous running、background agent，或任何没有 synchronous user 的 mode），跳过 Steps 1-2，直接进入 headless upload：

1. **R2 available**（`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_ENDPOINT`、`R2_PUBLIC_URL` 全部已设置）：上传到 R2 并使用 public URL。继续 Step 3-R2。
2. **R2 not available**：不经过 preview step，直接上传到 catbox permanent hosting。继续 Step 3。

## Step 1：Preview Upload（Temporary，临时预览上传）

将 evidence file（GIF 或 PNG）上传到 litterbox，生成 temporary 1-hour preview：

```bash
python3 scripts/capture-demo.py preview [ARTIFACT_PATH]
```

Output 最后一行是 preview URL（例如 `https://litter.catbox.moe/abc123.gif`）。此 URL 1 小时后过期；无需 cleanup。

对多个 files（static screenshots tier），分别上传每个文件。

**如果 retry 后 upload 仍失败**，fallback 到使用 platform file-opener 打开 local file（macOS 上 `open`，Linux 上 `xdg-open`），让用户仍可 review。Destination choice question 中包含 local path，而不是 URL。

## Step 2：Destination Choice（目标位置选择）

向用户展示 preview URL，并询问如何处理 evidence。使用 platform 的 blocking question tool：Claude Code 中为 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`），Codex 中为 `request_user_input`，Gemini 中为 `ask_user`，Pi 中为 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或 call errors（例如 Codex edit modes）时，才 fallback 到 chat 中展示 options；不要因为需要 schema load 就 fallback。永远不要 silently skip question。

**Question（问题）：** "Evidence preview (1h link): [PREVIEW_URL]. Where should the evidence go?"

**Options（选项）：**
1. **Upload to R2 (public URL)** -- 上传到 Cloudflare R2，用于 permanent PR embedding（R2 env vars 设置后可用）
2. **Upload to catbox (public URL)** -- promote 到 catbox permanent hosting，用于 PR embedding
3. **Save locally** -- 保存到 stable OS-temp path（/tmp/compound-engineering/ce-demo-reel/）
4. **Recapture** -- 提供要修改什么的 instructions
5. **Proceed without evidence** -- 将 evidence 设为 null 并继续

如果 R2 env vars（`R2_ACCESS_KEY_ID`、`R2_BUCKET`、`R2_ENDPOINT`、`R2_PUBLIC_URL`）未设置，省略 option 1。

### On "Upload to R2 (public URL)"（选择上传到 R2）

进入 Step 3-R2：R2 Upload。

### On "Upload to catbox (public URL)"（选择上传到 catbox）

进入 Step 3：Promote to Permanent Hosting（catbox）。

### On "Save locally"（选择本地保存）

进入 Step 3b：Local Save。

### On "Recapture"（选择重新捕获）

返回 tier execution step。用户 instructions 指导下一次 capture attempt 要改什么。Recapture 后，上传 new preview，并重复 destination choice。

### On "Proceed without evidence"（选择不带 evidence 继续）

将 evidence 设为 null 并继续。Preview link 会自行过期。

## Step 3：Promote to Permanent Hosting（提升到 permanent hosting，catbox）

用户选择 "Upload to catbox" 后，上传到 permanent catbox hosting。Command 接受 preview URL（preferred）或 local file path（fallback）：

```bash
python3 scripts/capture-demo.py upload [PREVIEW_URL or ARTIFACT_PATH]
```

如果 Step 1 生成了 preview URL，在这里传入它；catbox 会直接从 litterbox copy，无需 re-upload。如果 Step 1 fallback 到 local review（无 preview URL），改为传入 local artifact path。

Output 最后一行是 permanent URL（例如 `https://files.catbox.moe/abc123.gif`）。在 output 中使用此 URL，不要使用 preview URL。

对多个 files，分别 promote。

## Step 3-R2：R2 Upload（R2 上传）

使用 AWS CLI 将 artifact 上传到 Cloudflare R2：

```bash
KEY="ce-demo-reel/$(date +%Y%m%d-%H%M%S)-$(basename [ARTIFACT_PATH])"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp [ARTIFACT_PATH] "s3://$R2_BUCKET/$KEY" \
  --endpoint-url "https://$R2_ENDPOINT" \
  --content-type "image/gif"
```

对 static screenshots，将 `--content-type` 调整为 `image/png`。

Permanent public URL 是：`$R2_PUBLIC_URL/$KEY`

**如果 upload 失败**（aws CLI 不可用、credentials invalid），fallback 到 catbox（Step 3），并注明 fallback reason。

对多个 files，用 unique key 分别上传。

## Step 3b：Local Save（本地保存）

用户选择 "Save locally" 后，使用 pipeline script 将 artifact 保存到 default OS-temp path：

```bash
python3 scripts/capture-demo.py save-local --file [ARTIFACT_PATH] --branch [BRANCH_NAME]
```

从 `git branch --show-current` 或 SKILL.md Step 0 发现的 PR context 确定 `[BRANCH_NAME]`。

Output 最后一行是 saved file 的 absolute path。在 output 中使用此 path。

对多个 files（static screenshots tier），分别保存每个文件。

**如果 save 失败**（permission denied、disk full），报告 error，并提供 retry 或 fallback 到 catbox upload（Step 3）。

## Step 4：Return Output（返回输出）

返回 SKILL.md Output section 中定义的 structured output：`Tier`、`Description`，以及 `URL`（permanent public URL）或 `Path`（local file path）。Caller 会将 evidence 格式化进 PR description。ce-demo-reel 不生成 markdown。

## Step 5：Cleanup（清理）

移除 `[RUN_DIR]` scratch directory 和所有 temporary files。不保留任何内容；evidence 位于 permanent URL，或已 copy 到 local save path。
