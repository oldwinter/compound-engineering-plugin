<overview>
Mobile 是 agent-native apps 的 first-class platform。它有 unique constraints 和 opportunities。本 guide 覆盖 mobile 为什么重要、iOS storage architecture、checkpoint/resume patterns，以及 cost-aware design。
</overview>

<why_mobile>
## Why Mobile Matters（为什么 Mobile 重要）

Mobile devices 为 agent-native apps 提供 unique advantages：

### A File System（文件系统）
Agents 可以自然地处理 files，使用与其他平台相同的 primitives。filesystem 是 universal interface。

### Rich Context（丰富 Context）
这是一个你可以获得 access 的 walled garden。Health data、location、photos、calendars，这些 context 在 desktop 或 web 上不存在。它支持 deeply personalized agent experiences。

### Local Apps（本地 Apps）
每个人都有自己的 app copy。这打开了尚未完全实现的 opportunities：apps 可以 modify themselves、fork themselves、按 user evolve。App Store policies 今天限制其中一些能力，但 foundation 已经存在。

### Cross-Device Sync（跨设备同步）
如果你结合 iCloud 使用 file system，所有 devices 共享同一个 file system。agent 在一台 device 上的 work 会出现在所有 devices 上；你无需构建 server。

### The Challenge（挑战）

**Agents 是 long-running 的。Mobile apps 不是。**

agent 可能需要 30 秒、5 分钟或 1 小时完成 task。但 iOS 会在几秒 inactivity 后 background app，并可能为了 reclaim memory 直接 kill。user 可能在 task 中途切换 app、接电话或锁屏。

这意味着 mobile agent apps 需要：
- **Checkpointing** — 保存 state，避免 work lost
- **Resuming** — interruption 后从 left off 处继续
- **Background execution** — 明智使用 iOS 给你的有限时间
- **On-device vs. cloud decisions** — 什么在 local 跑，什么需要 server
</why_mobile>

<ios_storage>
## iOS Storage Architecture（iOS 存储架构）

> **Needs validation：** 这是一个效果不错的 approach，但可能存在更好的 solutions。

对 agent-native iOS apps，使用 iCloud Drive 的 Documents folder 作为 shared workspace。这会提供**免费、automatic multi-device sync**，无需构建 sync layer 或运行 server。

### Why iCloud Documents?（为什么用 iCloud Documents？）

| Approach（方案） | Cost（成本） | Complexity（复杂度） | Offline（离线） | Multi-Device（多设备） |
|----------|------|------------|---------|--------------|
| Custom backend + sync | $$$ | High | Manual | Yes |
| CloudKit database | Free tier limits | Medium | Manual | Yes |
| **iCloud Documents** | Free (user's storage) | Low | Automatic | Automatic |

iCloud Documents：
- 使用 user 现有 iCloud storage（免费 5GB，多数 users 更多）
- 在 user 所有 devices 间 automatic sync
- offline 可用，online 时 sync
- Files 在 Files.app 中 visible，提供 transparency
- 无 server costs，无需维护 sync code

### Implementation：iCloud-First with Local Fallback（实现：iCloud 优先，本地 fallback）

```swift
// Get the iCloud Documents container
func iCloudDocumentsURL() -> URL? {
    FileManager.default.url(forUbiquityContainerIdentifier: nil)?
        .appendingPathComponent("Documents")
}

// Your shared workspace lives in iCloud
class SharedWorkspace {
    let rootURL: URL

    init() {
        // Use iCloud if available, fall back to local
        if let iCloudURL = iCloudDocumentsURL() {
            self.rootURL = iCloudURL
        } else {
            // Fallback to local Documents (user not signed into iCloud)
            self.rootURL = FileManager.default.urls(
                for: .documentDirectory,
                in: .userDomainMask
            ).first!
        }
    }

    // All file operations go through this root
    func researchPath(for bookId: String) -> URL {
        rootURL.appendingPathComponent("Research/\(bookId)")
    }

    func journalPath() -> URL {
        rootURL.appendingPathComponent("Journal")
    }
}
```

### Directory Structure in iCloud（iCloud 中的目录结构）

```
iCloud Drive/
└── YourApp/                          # Your app's container
    └── Documents/                    # Visible in Files.app
        ├── Journal/
        │   ├── user/
        │   │   └── 2025-01-15.md     # Syncs across devices
        │   └── agent/
        │       └── 2025-01-15.md     # Agent observations sync too
        ├── Research/
        │   └── {bookId}/
        │       ├── full_text.txt
        │       └── sources/
        ├── Chats/
        │   └── {conversationId}.json
        └── context.md                # Agent's accumulated knowledge
```

### Handling iCloud File States（处理 iCloud 文件状态）

iCloud files 可能未下载到 local。需要处理：

```swift
func readFile(at url: URL) throws -> String {
    // iCloud may create .icloud placeholder files
    if url.pathExtension == "icloud" {
        // Trigger download
        try FileManager.default.startDownloadingUbiquitousItem(at: url)
        throw FileNotYetAvailableError()
    }

    return try String(contentsOf: url, encoding: .utf8)
}

// For writes, use coordinated file access
func writeFile(_ content: String, to url: URL) throws {
    let coordinator = NSFileCoordinator()
    var error: NSError?

    coordinator.coordinate(
        writingItemAt: url,
        options: .forReplacing,
        error: &error
    ) { newURL in
        try? content.write(to: newURL, atomically: true, encoding: .utf8)
    }

    if let error = error { throw error }
}
```

### What iCloud Enables（iCloud 带来的能力）

1. **User starts experiment on iPhone** → Agent 创建 config file
2. **User opens app on iPad** → 同一个 experiment visible，不需要 sync code
3. **Agent logs observation on iPhone** → 自动 sync 到 iPad
4. **User edits journal on iPad** → iPhone 看到 edit

### Entitlements Required（所需 Entitlements）

添加到 app 的 entitlements：

```xml
<key>com.apple.developer.icloud-container-identifiers</key>
<array>
    <string>iCloud.com.yourcompany.yourapp</string>
</array>
<key>com.apple.developer.icloud-services</key>
<array>
    <string>CloudDocuments</string>
</array>
<key>com.apple.developer.ubiquity-container-identifiers</key>
<array>
    <string>iCloud.com.yourcompany.yourapp</string>
</array>
```

### When NOT to Use iCloud Documents（何时不该使用 iCloud Documents）

- **Sensitive data** - 改用 Keychain 或 encrypted local storage
- **High-frequency writes** - iCloud sync 有 latency；使用 local + periodic sync
- **Large media files** - 考虑 CloudKit Assets 或 on-demand resources
- **Shared between users** - iCloud Documents 是 single-user；sharing 使用 CloudKit
</ios_storage>

<background_execution>
## Background Execution & Resumption（后台执行与恢复）

> **Needs validation：** 这些 patterns 可用，但可能存在更好的 solutions。

Mobile apps 随时可能被 suspended 或 terminated。Agents 必须 graceful handle。

### The Challenge（挑战）

```
User starts research agent
     ↓
Agent begins web search
     ↓
User switches to another app
     ↓
iOS suspends your app
     ↓
Agent is mid-execution... what happens?
```

### Checkpoint/Resume Pattern（Checkpoint / Resume 模式）

backgrounding 前保存 agent state，foreground 时 restore：

```swift
class AgentOrchestrator: ObservableObject {
    @Published var activeSessions: [AgentSession] = []

    // Called when app is about to background
    func handleAppWillBackground() {
        for session in activeSessions {
            saveCheckpoint(session)
            session.transition(to: .backgrounded)
        }
    }

    // Called when app returns to foreground
    func handleAppDidForeground() {
        for session in activeSessions where session.state == .backgrounded {
            if let checkpoint = loadCheckpoint(session.id) {
                resumeFromCheckpoint(session, checkpoint)
            }
        }
    }

    private func saveCheckpoint(_ session: AgentSession) {
        let checkpoint = AgentCheckpoint(
            sessionId: session.id,
            conversationHistory: session.messages,
            pendingToolCalls: session.pendingToolCalls,
            partialResults: session.partialResults,
            timestamp: Date()
        )
        storage.save(checkpoint, for: session.id)
    }

    private func resumeFromCheckpoint(_ session: AgentSession, _ checkpoint: AgentCheckpoint) {
        session.messages = checkpoint.conversationHistory
        session.pendingToolCalls = checkpoint.pendingToolCalls

        // Resume execution if there were pending tool calls
        if !checkpoint.pendingToolCalls.isEmpty {
            session.transition(to: .running)
            Task { await executeNextTool(session) }
        }
    }
}
```

### State Machine for Agent Lifecycle（Agent 生命周期状态机）

```swift
enum AgentState {
    case idle           // Not running
    case running        // Actively executing
    case waitingForUser // Paused, waiting for user input
    case backgrounded   // App backgrounded, state saved
    case completed      // Finished successfully
    case failed(Error)  // Finished with error
}

class AgentSession: ObservableObject {
    @Published var state: AgentState = .idle

    func transition(to newState: AgentState) {
        let validTransitions: [AgentState: Set<AgentState>] = [
            .idle: [.running],
            .running: [.waitingForUser, .backgrounded, .completed, .failed],
            .waitingForUser: [.running, .backgrounded],
            .backgrounded: [.running, .completed],
        ]

        guard validTransitions[state]?.contains(newState) == true else {
            logger.warning("Invalid transition: \(state) → \(newState)")
            return
        }

        state = newState
    }
}
```

### Background Task Extension（iOS 后台任务扩展）

critical operations 中 backgrounded 时，request extra time：

```swift
class AgentOrchestrator {
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    func handleAppWillBackground() {
        // Request extra time for saving state
        backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.endBackgroundTask()
        }

        // Save all checkpoints
        Task {
            for session in activeSessions {
                await saveCheckpoint(session)
            }
            endBackgroundTask()
        }
    }

    private func endBackgroundTask() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }
}
```

### User Communication（用户沟通）

让 users 知道正在发生什么：

```swift
struct AgentStatusView: View {
    @ObservedObject var session: AgentSession

    var body: some View {
        switch session.state {
        case .backgrounded:
            Label("Paused (app in background)", systemImage: "pause.circle")
                .foregroundColor(.orange)
        case .running:
            Label("Working...", systemImage: "ellipsis.circle")
                .foregroundColor(.blue)
        case .waitingForUser:
            Label("Waiting for your input", systemImage: "person.circle")
                .foregroundColor(.green)
        // ...
        }
    }
}
```
</background_execution>

<permissions>
## Permission Handling（权限处理）

Mobile agents 可能需要 access system resources。应 graceful handle permission requests。

### Common Permissions（常见权限）

| Resource（资源） | iOS Permission | Use Case（使用场景） |
|----------|---------------|----------|
| Photo Library | PHPhotoLibrary | Profile generation from photos（基于照片生成 profile） |
| Files | Document picker | Reading user documents（读取用户 documents） |
| Camera | AVCaptureDevice | Scanning book covers（扫描书籍封面） |
| Location | CLLocationManager | Location-aware recommendations（位置感知推荐） |
| Network | (automatic) | Web search、API calls |

### Permission-Aware Tools（权限感知 Tools）

executing 前检查 permissions：

```swift
struct PhotoTools {
    static func readPhotos() -> AgentTool {
        tool(
            name: "read_photos",
            description: "Read photos from the user's photo library",
            parameters: [
                "limit": .number("Maximum photos to read"),
                "dateRange": .string("Date range filter").optional()
            ],
            execute: { params, context in
                // Check permission first
                let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)

                switch status {
                case .authorized, .limited:
                    // Proceed with reading photos
                    let photos = await fetchPhotos(params)
                    return ToolResult(text: "Found \(photos.count) photos", images: photos)

                case .denied, .restricted:
                    return ToolResult(
                        text: "Photo access needed. Please grant permission in Settings → Privacy → Photos.",
                        isError: true
                    )

                case .notDetermined:
                    return ToolResult(
                        text: "Photo permission required. Please try again.",
                        isError: true
                    )

                @unknown default:
                    return ToolResult(text: "Unknown permission status", isError: true)
                }
            }
        )
    }
}
```

### Graceful Degradation（优雅降级）

当 permissions 未 granted 时，提供 alternatives：

```swift
func readPhotos() async -> ToolResult {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)

    switch status {
    case .denied, .restricted:
        // Suggest alternative
        return ToolResult(
            text: """
            I don't have access to your photos. You can either:
            1. Grant access in Settings → Privacy → Photos
            2. Share specific photos directly in our chat

            Would you like me to help with something else instead?
            """,
            isError: false  // Not a hard error, just a limitation
        )
    // ...
    }
}
```

### Permission Request Timing（权限请求时机）

不要在需要前 request permissions：

```swift
// BAD: Request all permissions at launch
func applicationDidFinishLaunching() {
    requestPhotoAccess()
    requestCameraAccess()
    requestLocationAccess()
    // User is overwhelmed with permission dialogs
}

// GOOD: Request when the feature is used
tool("analyze_book_cover", async ({ image }) => {
    // Only request camera access when user tries to scan a cover
    let status = await AVCaptureDevice.requestAccess(for: .video)
    if status {
        return await scanCover(image)
    } else {
        return ToolResult(text: "Camera access needed for book scanning")
    }
})
```
</permissions>

<cost_awareness>
## Cost-Aware Design（成本感知设计）

Mobile users 可能在使用 cellular data，或关心 API costs。设计 agents 时要 efficient。

### Model Tier Selection（模型层级选择）

使用能达成 outcome 的最便宜 model：

```swift
enum ModelTier {
    case fast      // claude-3-haiku: ~$0.25/1M tokens
    case balanced  // claude-3-sonnet: ~$3/1M tokens
    case powerful  // claude-3-opus: ~$15/1M tokens

    var modelId: String {
        switch self {
        case .fast: return "claude-3-haiku-20240307"
        case .balanced: return "claude-3-sonnet-20240229"
        case .powerful: return "claude-3-opus-20240229"
        }
    }
}

// Match model to task complexity
let agentConfigs: [AgentType: ModelTier] = [
    .quickLookup: .fast,        // "What's in my library?"
    .chatAssistant: .balanced,  // General conversation
    .researchAgent: .balanced,  // Web search + synthesis
    .profileGenerator: .powerful, // Complex photo analysis
    .introductionWriter: .balanced,
]
```

### Token Budgets（Token 预算）

限制每个 agent session 的 tokens：

```swift
struct AgentConfig {
    let modelTier: ModelTier
    let maxInputTokens: Int
    let maxOutputTokens: Int
    let maxTurns: Int

    static let research = AgentConfig(
        modelTier: .balanced,
        maxInputTokens: 50_000,
        maxOutputTokens: 4_000,
        maxTurns: 20
    )

    static let quickChat = AgentConfig(
        modelTier: .fast,
        maxInputTokens: 10_000,
        maxOutputTokens: 1_000,
        maxTurns: 5
    )
}

class AgentSession {
    var totalTokensUsed: Int = 0

    func checkBudget() -> Bool {
        if totalTokensUsed > config.maxInputTokens {
            transition(to: .failed(AgentError.budgetExceeded))
            return false
        }
        return true
    }
}
```

### Network-Aware Execution（网络感知执行）

将 heavy operations defer 到 WiFi：

```swift
class NetworkMonitor: ObservableObject {
    @Published var isOnWiFi: Bool = false
    @Published var isExpensive: Bool = false  // Cellular or hotspot

    private let monitor = NWPathMonitor()

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isOnWiFi = path.usesInterfaceType(.wifi)
                self?.isExpensive = path.isExpensive
            }
        }
        monitor.start(queue: .global())
    }
}

class AgentOrchestrator {
    @ObservedObject var network = NetworkMonitor()

    func startResearchAgent(for book: Book) async {
        if network.isExpensive {
            // Warn user or defer
            let proceed = await showAlert(
                "Research uses data",
                message: "This will use approximately 1-2 MB of cellular data. Continue?"
            )
            if !proceed { return }
        }

        // Proceed with research
        await runAgent(ResearchAgent.create(book: book))
    }
}
```

### Batch API Calls（批量 API Calls）

合并多个 small requests：

```swift
// BAD: Many small API calls
for book in books {
    await agent.chat("Summarize \(book.title)")
}

// GOOD: Batch into one request
let bookList = books.map { $0.title }.joined(separator: ", ")
await agent.chat("Summarize each of these books briefly: \(bookList)")
```

### Caching（缓存）

Cache expensive operations（缓存昂贵操作）：

```swift
class ResearchCache {
    private var cache: [String: CachedResearch] = [:]

    func getCachedResearch(for bookId: String) -> CachedResearch? {
        guard let cached = cache[bookId] else { return nil }

        // Expire after 24 hours
        if Date().timeIntervalSince(cached.timestamp) > 86400 {
            cache.removeValue(forKey: bookId)
            return nil
        }

        return cached
    }

    func cacheResearch(_ research: Research, for bookId: String) {
        cache[bookId] = CachedResearch(
            research: research,
            timestamp: Date()
        )
    }
}

// In research tool
tool("web_search", async ({ query, bookId }) => {
    // Check cache first
    if let cached = cache.getCachedResearch(for: bookId) {
        return ToolResult(text: cached.research.summary, cached: true)
    }

    // Otherwise, perform search
    let results = await webSearch(query)
    cache.cacheResearch(results, for: bookId)
    return ToolResult(text: results.summary)
})
```

### Cost Visibility（成本可见性）

向 users 展示他们的 spending：

```swift
struct AgentCostView: View {
    @ObservedObject var session: AgentSession

    var body: some View {
        VStack(alignment: .leading) {
            Text("Session Stats")
                .font(.headline)

            HStack {
                Label("\(session.turnCount) turns", systemImage: "arrow.2.squarepath")
                Spacer()
                Label(formatTokens(session.totalTokensUsed), systemImage: "text.word.spacing")
            }

            if let estimatedCost = session.estimatedCost {
                Text("Est. cost: \(estimatedCost, format: .currency(code: "USD"))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
```
</cost_awareness>

<offline_handling>
## Offline Graceful Degradation（离线优雅降级）

Gracefully handle offline scenarios（优雅处理离线场景）：

```swift
class ConnectivityAwareAgent {
    @ObservedObject var network = NetworkMonitor()

    func executeToolCall(_ toolCall: ToolCall) async -> ToolResult {
        // Check if tool requires network
        let requiresNetwork = ["web_search", "web_fetch", "call_api"]
            .contains(toolCall.name)

        if requiresNetwork && !network.isConnected {
            return ToolResult(
                text: """
                I can't access the internet right now. Here's what I can do offline:
                - Read your library and existing research
                - Answer questions from cached data
                - Write notes and drafts for later

                Would you like me to try something that works offline?
                """,
                isError: false
            )
        }

        return await executeOnline(toolCall)
    }
}
```

### Offline-First Tools（离线优先 Tools）

某些 tools 应该 entirely offline 工作：

```swift
let offlineTools: Set<String> = [
    "read_file",
    "write_file",
    "list_files",
    "read_library",  // Local database
    "search_local",  // Local search
]

let onlineTools: Set<String> = [
    "web_search",
    "web_fetch",
    "publish_to_cloud",
]

let hybridTools: Set<String> = [
    "publish_to_feed",  // Works offline, syncs later
]
```

### Queued Actions（排队动作）

Queue 需要 connectivity 的 actions：

```swift
class OfflineQueue: ObservableObject {
    @Published var pendingActions: [QueuedAction] = []

    func queue(_ action: QueuedAction) {
        pendingActions.append(action)
        persist()
    }

    func processWhenOnline() {
        network.$isConnected
            .filter { $0 }
            .sink { [weak self] _ in
                self?.processPendingActions()
            }
    }

    private func processPendingActions() {
        for action in pendingActions {
            Task {
                try await execute(action)
                remove(action)
            }
        }
    }
}
```
</offline_handling>

<battery_awareness>
## Battery-Aware Execution（电量感知执行）

尊重 device battery state：

```swift
class BatteryMonitor: ObservableObject {
    @Published var batteryLevel: Float = 1.0
    @Published var isCharging: Bool = false
    @Published var isLowPowerMode: Bool = false

    var shouldDeferHeavyWork: Bool {
        return batteryLevel < 0.2 && !isCharging
    }

    func startMonitoring() {
        UIDevice.current.isBatteryMonitoringEnabled = true

        NotificationCenter.default.addObserver(
            forName: UIDevice.batteryLevelDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.batteryLevel = UIDevice.current.batteryLevel
        }

        NotificationCenter.default.addObserver(
            forName: NSNotification.Name.NSProcessInfoPowerStateDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.isLowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled
        }
    }
}

class AgentOrchestrator {
    @ObservedObject var battery = BatteryMonitor()

    func startAgent(_ config: AgentConfig) async {
        if battery.shouldDeferHeavyWork && config.isHeavy {
            let proceed = await showAlert(
                "Low Battery",
                message: "This task uses significant battery. Continue or defer until charging?"
            )
            if !proceed { return }
        }

        // Adjust model tier based on battery
        let adjustedConfig = battery.isLowPowerMode
            ? config.withModelTier(.fast)
            : config

        await runAgent(adjustedConfig)
    }
}
```
</battery_awareness>

<on_device_vs_cloud>
## On-Device vs. Cloud（端上与云端）

理解 mobile agent-native app 中什么在哪里运行：

| Component（组件） | On-Device（端上） | Cloud（云端） |
|-----------|-----------|-------|
| Orchestration | ✅ | |
| Tool execution | ✅ (file ops, photo access, HealthKit) | |
| LLM calls | | ✅ (Anthropic API) |
| Checkpoints | ✅ (local files) | Optional via iCloud |
| Long-running agents | Limited by iOS | Possible with server |

### Implications（影响）

**Network required for reasoning（reasoning 需要网络）：**
- app 需要 network connectivity 才能进行 LLM calls
- 设计 tools，让 network unavailable 时 graceful degrade
- 为 common queries 考虑 offline caching

**Data stays local（数据保留在本地）：**
- File operations 发生在 device 上
- 除非 explicitly synced，sensitive data 不会离开 device
- Privacy 默认 preserved

**Long-running agents（长时间运行的 agents）：**
对真正 long-running agents（数小时），考虑使用可 indefinite 运行的 server-side orchestrator，并让 mobile app 作为 viewer 和 input mechanism。
</on_device_vs_cloud>

<checklist>
## Mobile Agent-Native Checklist（Mobile Agent-Native 检查清单）

**iOS Storage（iOS 存储）：**
- [ ] iCloud Documents 作为 primary storage（或 conscious alternative）
- [ ] iCloud unavailable 时 fallback 到 Local Documents
- [ ] 处理 `.icloud` placeholder files（trigger download）
- [ ] 使用 NSFileCoordinator 做 conflict-safe writes

**Background Execution（后台执行）：**
- [ ] 所有 agent sessions 都实现 checkpoint/resume
- [ ] agent lifecycle 有 state machine（idle、running、backgrounded 等）
- [ ] critical saves 有 background task extension（30 秒窗口）
- [ ] backgrounded agents 有 user-visible status

**Permissions（权限）：**
- [ ] Permissions 仅在 needed 时 request，而不是 launch 时
- [ ] permissions denied 时 graceful degradation
- [ ] 带 Settings deep links 的 clear error messages
- [ ] permissions unavailable 时有 alternative paths

**Cost Awareness（成本感知）：**
- [ ] Model tier 匹配 task complexity
- [ ] 每个 session 有 token budgets
- [ ] Network-aware（网络感知：defer heavy work to WiFi）
- [ ] expensive operations 有 caching
- [ ] 对 users 有 cost visibility

**Offline Handling（离线处理）：**
- [ ] 已识别 offline-capable tools
- [ ] online-only features 有 graceful degradation
- [ ] online 时 sync 的 action queue
- [ ] 关于 offline state 有 clear user communication

**Battery Awareness（电量感知）：**
- [ ] heavy operations 有 battery monitoring
- [ ] Low power mode detection（低电量模式检测）
- [ ] 基于 battery state defer 或 downgrade
</checklist>
