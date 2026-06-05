# Gems - DHH Rails Style（DHH Rails 风格 Gems）

<what_they_use>
## 37signals 使用什么

**核心 Rails stack：**
- turbo-rails, stimulus-rails, importmap-rails
- propshaft (asset pipeline，资产 pipeline)

**Database-backed services（数据库后端 services，Solid suite）：**
- solid_queue - background jobs（后台 jobs）
- solid_cache - caching（缓存）
- solid_cable - WebSockets/Action Cable

**Authentication & Security（认证与安全）：**
- bcrypt（用于任何需要的 password hashing）

**他们自己的 gems：**
- geared_pagination（cursor-based pagination，基于 cursor 的分页）
- lexxy（rich text editor，富文本编辑器）
- mittens（mailer utilities，mailer 工具）

**Utilities（工具）：**
- rqrcode（QR code generation，二维码生成）
- redcarpet + rouge（Markdown rendering，Markdown 渲染）
- web-push（push notifications，push 通知）

**Deployment & Operations（部署与运维）：**
- kamal（Docker deployment，Docker 部署）
- thruster（HTTP/2 proxy，HTTP/2 代理）
- mission_control-jobs（job monitoring，job 监控）
- autotuner（GC tuning，GC 调优）
</what_they_use>

<what_they_avoid>
## 他们有意避免什么

**Authentication（认证）：**
```
devise → Custom ~150-line auth
```
原因：完全控制；使用 magic links 时没有 password liability；更简单。

**Authorization（授权）：**
```
pundit/cancancan → Simple role checks in models
```
原因：大多数 apps 不需要 policy objects。model 上一个方法就够了：
```ruby
class Board < ApplicationRecord
  def editable_by?(user)
    user.admin? || user == creator
  end
end
```

**Background Jobs（后台 Jobs）：**
```
sidekiq → Solid Queue
```
原因：Database-backed 意味着不需要 Redis，同时保留相同 transactional guarantees。

**Caching（缓存）：**
```
redis → Solid Cache
```
原因：Database 已经存在，infrastructure 更简单。

**Search（搜索）：**
```
elasticsearch → Custom sharded search
```
原因：只构建他们真正需要的东西，没有 external service dependency。

**View Layer（视图层）：**
```
view_component → Standard partials
```
原因：Partials 已经很好用。ViewComponents 对他们的 use case 增加 complexity，却没有明确收益。

**API：**
```
GraphQL → REST with Turbo
```
原因：当你控制两端时，REST 已经足够。GraphQL complexity 不值得。

**Factories（Fixtures 替代 factories）：**
```
factory_bot → Fixtures
```
原因：Fixtures 更简单、更快，并鼓励 upfront 思考 data relationships。

**Service Objects（避免 service objects）：**
```
Interactor, Trailblazer → Fat models
```
原因：Business logic 留在 models 中。使用 `card.close` 这样的方法，而不是 `CardCloser.call(card)`。

**Form Objects（表单对象）：**
```
Reform, dry-validation → params.expect + model validations
```
原因：Rails 7.1 的 `params.expect` 已足够 clean。在 model 上做 contextual validations。

**Decorators（装饰器）：**
```
Draper → View helpers + partials
```
原因：Helpers 和 partials 更简单。没有 decorator indirection。

**CSS：**
```
Tailwind, Sass → Native CSS
```
原因：Modern CSS 已有 nesting、variables、layers。不需要 build step。

**Frontend（前端）：**
```
React, Vue, SPAs → Turbo + Stimulus
```
原因：Server-rendered HTML 加少量 JS 点缀。SPA complexity 不值得。

**Testing（测试）：**
```
RSpec → Minitest
```
原因：更简单、boot 更快、DSL magic 更少，并随 Rails 一起提供。
</what_they_avoid>

<testing_philosophy>
## Testing Philosophy（测试理念）

**Minitest** - 更简单、更快：
```ruby
class CardTest < ActiveSupport::TestCase
  test "closing creates closure" do
    card = cards(:one)
    assert_difference -> { Card::Closure.count } do
      card.close
    end
    assert card.closed?
  end
end
```

**Fixtures** - 加载一次，deterministic：
```yaml
# test/fixtures/cards.yml
open_card:
  title: Open Card
  board: main
  creator: alice

closed_card:
  title: Closed Card
  board: main
  creator: bob
```

使用 ERB 的 **dynamic timestamps**：
```yaml
recent:
  title: Recent
  created_at: <%= 1.hour.ago %>

old:
  title: Old
  created_at: <%= 1.month.ago %>
```

用于 time-dependent tests 的 **time travel**：
```ruby
test "expires after 15 minutes" do
  magic_link = MagicLink.create!(user: users(:alice))

  travel 16.minutes

  assert magic_link.expired?
end
```

用于 external APIs 的 **VCR**：
```ruby
VCR.use_cassette("stripe/charge") do
  charge = Stripe::Charge.create(amount: 1000)
  assert charge.paid
end
```

**Tests 与 features 一起 ship** - 同一个 commit，不早不晚。
</testing_philosophy>

<decision_framework>
## Decision Framework（决策框架）

添加 gem 前，先问：

1. **vanilla Rails 能做到吗？**
   - ActiveRecord 能做 Sequel 能做的大多数事
   - ActionMailer 处理 email 没问题
   - ActiveJob 能满足大多数 job needs

2. **这份 complexity 值得吗？**
   - 150 行 custom code vs. 10,000 行 gem
   - 你会更理解自己的 code
   - 更少 upgrade headaches

3. **它会增加 infrastructure 吗？**
   - Redis？考虑 database-backed alternatives
   - External service？考虑 in-house 构建
   - 更简单的 infrastructure = 更少 failure modes

4. **它来自你信任的人吗？**
   - 37signals gems：在 scale 下 battle-tested
   - Well-maintained、focused gems：通常可以
   - Kitchen-sink gems：大概率 overkill

**The philosophy（核心理念）：**
> "Build solutions before reaching for gems."（先构建解决方案，再考虑引入 gems。）

不是 anti-gem，而是 pro-understanding。只有当 gems 真正解决你已经有的问题时才使用它们，而不是为可能会有的问题提前引入。
</decision_framework>

<gem_patterns>
## Gem Usage Patterns（Gem 使用模式）

**Pagination（分页）：**
```ruby
# geared_pagination - cursor-based
class CardsController < ApplicationController
  def index
    @cards = @board.cards.geared(page: params[:page])
  end
end
```

**Markdown（Markdown 渲染）：**
```ruby
# redcarpet + rouge
class MarkdownRenderer
  def self.render(text)
    Redcarpet::Markdown.new(
      Redcarpet::Render::HTML.new(filter_html: true),
      autolink: true,
      fenced_code_blocks: true
    ).render(text)
  end
end
```

**Background jobs（后台 jobs）：**
```ruby
# solid_queue - no Redis
class ApplicationJob < ActiveJob::Base
  queue_as :default
  # Just works, backed by database
end
```

**Caching（缓存）：**
```ruby
# solid_cache - no Redis
# config/environments/production.rb
config.cache_store = :solid_cache_store
```
</gem_patterns>
