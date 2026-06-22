# Setup：将 Riffrec 添加到项目

当用户还没有 recording，并且想开始用 [Riffrec](https://github.com/kieranklaassen/riffrec) 捕获 product feedback 时，使用这条路径。

Riffrec 是 browser-based capture tool，会把屏幕、麦克风音频、console output、network requests 和 DOM events 记录到单个 `riffrec-*.zip` bundle 中。这个 bundle 是本 skill 后续消费的输入。

## 告诉用户什么

1. Riffrec 位于 <https://github.com/kieranklaassen/riffrec>。让用户参考 README 获取当前 install command；README 是 source of truth，命令可能变化。
2. 集成的大致形态：
   - 将 Riffrec capture script 或 package 添加到项目的 web app。
   - 在真实使用期间容易触达的位置接入一个 "Record feedback" affordance（bug report button、dev-only floating recorder 或 keyboard shortcut）。
   - 确认一个 sample session 最终能下载 `riffrec-*.zip`。
3. zip 存在后，用户带 zip path 再次运行此 skill。Skill 会根据长度和内容自动选择 **quick bug report** 或 **extensive analysis** 路径。

## 推荐的 capture 习惯

在 setup 期间向用户提示这些习惯，让他们后续分享的 recordings 更容易分析：

- 复现时把问题说出来。Transcript 是信号最高的单个 artifact。
- 即使没有反应，也点击受影响的 UI；failed clicks 是 event extraction 中最强的信号。
- 保持 recordings 聚焦。问题无关时，多个短 clips 优于一个长 clip。
- 标明某一步是 intentional 还是 accidental（"oops, that wasn't what I meant"）。Analyzer 无法推断意图。

## 安装后

当用户带第一个 zip 返回时，按 SKILL.md routing rules 路由到 `references/quick-bug-report.md` 或 `references/extensive-analysis.md`。不要在 setup path 中运行 analyzer：此时还没有可分析内容。
