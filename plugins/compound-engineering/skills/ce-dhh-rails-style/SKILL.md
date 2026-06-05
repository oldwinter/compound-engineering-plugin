---
name: ce-dhh-rails-style
description: 编写 DHH 独特 37signals 风格的 Ruby 和 Rails 代码时使用此 skill。适用于编写 Ruby code、Rails applications、创建 models、controllers 或任何 Ruby file。Ruby/Rails code generation、refactoring requests、code review，或用户提到 DHH、37signals、Basecamp、HEY、Campfire style 时触发。体现 REST purity、fat models、thin controllers、Current attributes、Hotwire patterns，以及 "clarity over cleverness" 哲学。
---

<objective>
将 37signals/DHH Rails conventions 应用到 Ruby 和 Rails code。这个 skill 提供从分析 production 37signals codebases（Fizzy/Campfire）和 DHH code review patterns 中提取的综合 domain expertise。
</objective>

<essential_principles>
## 核心哲学

"The best code is the code you don't write. The second best is the code that's obviously correct."（最好的代码是不写的代码；第二好的代码是一眼就正确的代码。）

**Vanilla Rails is plenty（原生 Rails 已足够）：**
- Rich domain models 优于 service objects
- CRUD controllers 优于 custom actions
- 用 Concerns 做 horizontal code sharing
- 用 Records 表达 state，而不是 boolean columns
- 一切都由 database-backed（不用 Redis）
- 先构建 solutions，再考虑 gems

**他们刻意避免的东西：**
- devise（改用 custom ~150-line auth）
- pundit/cancancan（在 models 中做简单 role checks）
- sidekiq（Solid Queue 使用 database）
- redis（database for everything，一切都用 database）
- view_component（partials 就很好）
- GraphQL（REST with Turbo 已足够）
- factory_bot（fixtures 更简单）
- rspec（Minitest 随 Rails 提供）
- Tailwind（带 layers 的 native CSS）

**Development Philosophy（开发理念）：**
- Ship, Validate, Refine - 把 prototype-quality code 推到 production 中学习
- 修 root causes，不修 symptoms
- Write-time operations 优于 read-time computations
- Database constraints 优于 ActiveRecord validations
</essential_principles>

<intake>
你正在处理什么？

1. **Controllers（控制器）** - REST mapping、concerns、Turbo responses、API patterns
2. **Models（模型）** - Concerns、state records、callbacks、scopes、POROs
3. **Views & Frontend（视图与前端）** - Turbo、Stimulus、CSS、partials
4. **Architecture（架构）** - Routing、multi-tenancy、authentication、jobs、caching
5. **Testing（测试）** - Minitest、fixtures、integration tests
6. **Gems & Dependencies（Gems 与依赖）** - 该用什么、避免什么
7. **Code Review（代码审查）** - 按 DHH style review code
8. **General Guidance（通用指导）** - Philosophy 和 conventions

**指定编号，或描述你的任务。**
</intake>

<routing>

| Response（响应） | Reference to Read（要读取的 Reference） |
|----------|-------------------|
| 1, controller | `references/controllers.md` |
| 2, model | `references/models.md` |
| 3, view, frontend, turbo, stimulus, css | `references/frontend.md` |
| 4, architecture, routing, auth, job, cache | `references/architecture.md` |
| 5, test, testing, minitest, fixture | `references/testing.md` |
| 6, gem, dependency, library | `references/gems.md` |
| 7, review | Read all references, then review code |
| 8, general task | Read relevant references based on context |

**阅读相关 references 后，将 patterns 应用到用户代码。**
</routing>

<quick_reference>
## 命名约定

**Verbs（动词）：** `card.close`, `card.gild`, `board.publish`（不是 `set_style` methods）

**Predicates（谓词）：** `card.closed?`, `card.golden?`（从 related record 是否存在派生）

**Concerns：** 描述 capability 的形容词（`Closeable`、`Publishable`、`Watchable`）

**Controllers：** 与 resources 匹配的名词（`Cards::ClosuresController`）

**Scopes（作用域）：**
- `chronologically`, `reverse_chronologically`, `alphabetically`, `latest`
- `preloaded` (standard eager loading name)
- `indexed_by`, `sorted_by` (parameterized)
- `active`, `unassigned`（business terms，不是 SQL-ish）

## REST Mapping（REST 映射）

不要用 custom actions，创建新 resources：

```
POST /cards/:id/close    → POST /cards/:id/closure
DELETE /cards/:id/close  → DELETE /cards/:id/closure
POST /cards/:id/archive  → POST /cards/:id/archival
```

## Ruby Syntax Preferences（Ruby 语法偏好）

```ruby
# Symbol arrays with spaces inside brackets
before_action :set_message, only: %i[ show edit update destroy ]

# Private method indentation
  private
    def set_message
      @message = Message.find(params[:id])
    end

# Expression-less case for conditionals
case
when params[:before].present?
  messages.page_before(params[:before])
else
  messages.last_page
end

# Bang methods for fail-fast
@message = Message.create!(params)

# Ternaries for simple conditionals
@room.direct? ? @room.users : @message.mentionees
```

## Key Patterns（关键 Patterns）

**State as Records（用 records 表达 state）：**
```ruby
Card.joins(:closure)         # closed cards
Card.where.missing(:closure) # open cards
```

**Current Attributes（当前属性）：**
```ruby
belongs_to :creator, default: -> { Current.user }
```

**Authorization on Models（models 上的授权）：**
```ruby
class User < ApplicationRecord
  def can_administer?(message)
    message.creator == self || admin?
  end
end
```
</quick_reference>

<reference_index>
## Domain Knowledge（领域知识）

所有详细 patterns 都在 `references/`：

| File | Topics（主题） |
|------|--------|
| `references/controllers.md` | REST mapping、concerns、Turbo responses、API patterns、HTTP caching |
| `references/models.md` | Concerns、state records、callbacks、scopes、POROs、authorization、broadcasting |
| `references/frontend.md` | Turbo Streams、Stimulus controllers、CSS layers、OKLCH colors、partials |
| `references/architecture.md` | Routing、authentication、jobs、Current attributes、caching、database patterns |
| `references/testing.md` | Minitest、fixtures、unit/integration/system tests、testing patterns |
| `references/gems.md` | 他们用什么、避免什么、decision framework、Gemfile examples |
</reference_index>

<success_criteria>
代码符合 DHH style 的标准：
- Controllers 映射到 resources 上的 CRUD verbs
- Models 使用 concerns 表达 horizontal behavior
- State 通过 records 跟踪，而不是 booleans
- 没有不必要的 service objects 或 abstractions
- Database-backed solutions 优先于 external services
- Tests 使用 Minitest with fixtures
- 用 Turbo/Stimulus 做 interactivity（不用 heavy JS frameworks）
- 使用带现代特性的 native CSS（layers、OKLCH、nesting）
- Authorization logic 位于 User model
- Jobs 是调用 model methods 的 shallow wrappers
</success_criteria>

<credits>
基于 [Marc Köhlbrugge](https://x.com/marckohlbrugge) 的 [The Unofficial 37signals/DHH Rails Style Guide](https://github.com/marckohlbrugge/unofficial-37signals-coding-style-guide)，通过深入分析 Fizzy codebase 的 265 个 pull requests 生成。

**Important Disclaimers（重要免责声明）：**
- LLM-generated guide（LLM 生成的 guide）- 可能包含不准确之处
- 来自 Fizzy 的 code examples 按 O'Saasy License 授权
- 不隶属于 37signals，也未获得 37signals 背书
</credits>
