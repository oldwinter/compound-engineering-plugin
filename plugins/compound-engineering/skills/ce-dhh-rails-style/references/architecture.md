# Architecture - DHH Rails Style（架构）

<routing>
## Routing（路由）

一切都映射到 CRUD。相关 actions 使用 nested resources：

```ruby
Rails.application.routes.draw do
  resources :boards do
    resources :cards do
      resource :closure
      resource :goldness
      resource :not_now
      resources :assignments
      resources :comments
    end
  end
end
```

**Verb-to-noun conversion（动词转名词）：**
| Action（动作） | Resource（资源） |
|--------|----------|
| close a card | `card.closure` |
| watch a board | `board.watching` |
| mark as golden | `card.goldness` |
| archive a card | `card.archival` |

**Shallow nesting（浅层嵌套）** - 避免 deep URLs：
```ruby
resources :boards do
  resources :cards, shallow: true  # /boards/:id/cards, but /cards/:id
end
```

用于 one-per-parent 的 **Singular resources**：
```ruby
resource :closure   # not resources
resource :goldness
```

用于 URL generation 的 **Resolve**：
```ruby
# config/routes.rb
resolve("Comment") { |comment| [comment.card, anchor: dom_id(comment)] }

# Now url_for(@comment) works correctly
```
</routing>

<multi_tenancy>
## Multi-Tenancy (Path-Based)（基于路径的多租户）

**Middleware 从 URL prefix 提取 tenant**：

```ruby
# lib/tenant_extractor.rb
class TenantExtractor
  def initialize(app)
    @app = app
  end

  def call(env)
    path = env["PATH_INFO"]
    if match = path.match(%r{^/(\d+)(/.*)?$})
      env["SCRIPT_NAME"] = "/#{match[1]}"
      env["PATH_INFO"] = match[2] || "/"
    end
    @app.call(env)
  end
end
```

按 tenant 做 **Cookie scoping**：
```ruby
# Cookies scoped to tenant path
cookies.signed[:session_id] = {
  value: session.id,
  path: "/#{Current.account.id}"
}
```

**Background job context（后台任务 context）** - serialize tenant：
```ruby
class ApplicationJob < ActiveJob::Base
  around_perform do |job, block|
    Current.set(account: job.arguments.first.account) { block.call }
  end
end
```

**Recurring jobs** 必须 iterate all tenants：
```ruby
class DailyDigestJob < ApplicationJob
  def perform
    Account.find_each do |account|
      Current.set(account: account) do
        send_digest_for(account)
      end
    end
  end
end
```

**Controller security（Controller 安全）** - 始终通过 tenant scope：
```ruby
# Good - scoped through user's accessible records
@card = Current.user.accessible_cards.find(params[:id])

# Avoid - direct lookup
@card = Card.find(params[:id])
```
</multi_tenancy>

<authentication>
## Authentication（认证）

Custom passwordless magic link auth（总计约 150 行）：

```ruby
# app/models/session.rb
class Session < ApplicationRecord
  belongs_to :user

  before_create { self.token = SecureRandom.urlsafe_base64(32) }
end

# app/models/magic_link.rb
class MagicLink < ApplicationRecord
  belongs_to :user

  before_create do
    self.code = SecureRandom.random_number(100_000..999_999).to_s
    self.expires_at = 15.minutes.from_now
  end

  def expired?
    expires_at < Time.current
  end
end
```

**为什么不用 Devise：**
- 约 150 行 vs massive dependency
- 没有 password storage liability
- 对 users 来说 UX 更简单
- 完全控制 flow

APIs 使用 **Bearer token**：
```ruby
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticate
  end

  private
    def authenticate
      if bearer_token = request.headers["Authorization"]&.split(" ")&.last
        Current.session = Session.find_by(token: bearer_token)
      else
        Current.session = Session.find_by(id: cookies.signed[:session_id])
      end

      redirect_to login_path unless Current.session
    end
end
```
</authentication>

<background_jobs>
## Background Jobs（后台任务）

Jobs 是调用 model methods 的 shallow wrappers：

```ruby
class NotifyWatchersJob < ApplicationJob
  def perform(card)
    card.notify_watchers
  end
end
```

**Naming convention（命名约定）：**
- async 使用 `_later` suffix：`card.notify_watchers_later`
- immediate 使用 `_now` suffix：`card.notify_watchers_now`

```ruby
module Watchable
  def notify_watchers_later
    NotifyWatchersJob.perform_later(self)
  end

  def notify_watchers_now
    NotifyWatchersJob.perform_now(self)
  end

  def notify_watchers
    watchers.each do |watcher|
      WatcherMailer.notification(watcher, self).deliver_later
    end
  end
end
```

用 Solid Queue 做 **Database-backed（数据库支持）**：
- 不需要 Redis
- 与你的 data 拥有相同 transactional guarantees
- 更简单的 infrastructure

**Transaction safety（事务安全）：**
```ruby
# config/application.rb
config.active_job.enqueue_after_transaction_commit = true
```

按 type 做 **Error handling（错误处理）**：
```ruby
class DeliveryJob < ApplicationJob
  # Transient errors - retry with backoff
  retry_on Net::OpenTimeout, Net::ReadTimeout,
           Resolv::ResolvError,
           wait: :polynomially_longer

  # Permanent errors - log and discard
  discard_on Net::SMTPSyntaxError do |job, error|
    Sentry.capture_exception(error, level: :info)
  end
end
```

使用 continuable 做 **Batch processing**：
```ruby
class ProcessCardsJob < ApplicationJob
  include ActiveJob::Continuable

  def perform
    Card.in_batches.each_record do |card|
      checkpoint!  # Resume from here if interrupted
      process(card)
    end
  end
end
```
</background_jobs>

<database_patterns>
## Database Patterns（数据库模式）

**UUIDs as primary keys（UUID 作为主键）**（time-sortable UUIDv7）：
```ruby
# migration
create_table :cards, id: :uuid do |t|
  t.references :board, type: :uuid, foreign_key: true
end
```

Benefits：没有 ID enumeration、distributed-friendly、client-side generation。

**State as records（用 records 表示状态）**（not booleans）：
```ruby
# Instead of closed: boolean
class Card::Closure < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

# Queries become joins
Card.joins(:closure)          # closed
Card.where.missing(:closure)  # open
```

**Hard deletes（硬删除）** - no soft delete：
```ruby
# Just destroy
card.destroy!

# Use events for history
card.record_event(:deleted, by: Current.user)
```

简化 queries，并使用 event logs 做 auditing。

用于 performance 的 **Counter caches**：
```ruby
class Comment < ApplicationRecord
  belongs_to :card, counter_cache: true
end

# card.comments_count available without query
```

每张 table 都做 **Account scoping**：
```ruby
class Card < ApplicationRecord
  belongs_to :account
  default_scope { where(account: Current.account) }
end
```
</database_patterns>

<current_attributes>
## Current Attributes（当前属性）

使用 `Current` 存放 request-scoped state：

```ruby
# app/models/current.rb
class Current < ActiveSupport::CurrentAttributes
  attribute :session, :user, :account, :request_id

  delegate :user, to: :session, allow_nil: true

  def account=(account)
    super
    Time.zone = account&.time_zone || "UTC"
  end
end
```

在 controller 中设置：
```ruby
class ApplicationController < ActionController::Base
  before_action :set_current_request

  private
    def set_current_request
      Current.session = authenticated_session
      Current.account = Account.find(params[:account_id])
      Current.request_id = request.request_id
    end
end
```

在整个 app 中使用：
```ruby
class Card < ApplicationRecord
  belongs_to :creator, default: -> { Current.user }
end
```
</current_attributes>

<caching>
## Caching（缓存）

使用 ETags 的 **HTTP caching**：
```ruby
fresh_when etag: [@card, Current.user.timezone]
```

**Fragment caching（片段缓存）：**
```erb
<% cache card do %>
  <%= render card %>
<% end %>
```

**Russian doll caching（俄罗斯套娃缓存）：**
```erb
<% cache @board do %>
  <% @board.cards.each do |card| %>
    <% cache card do %>
      <%= render card %>
    <% end %>
  <% end %>
<% end %>
```

通过 `touch: true` 做 **Cache invalidation**：
```ruby
class Card < ApplicationRecord
  belongs_to :board, touch: true
end
```

**Solid Cache** - database-backed（数据库后端）：
- 不需要 Redis
- 与 application data consistent
- 更简单的 infrastructure
</caching>

<configuration>
## Configuration（配置）

带 defaults 的 **ENV.fetch**：
```ruby
# config/application.rb
config.active_job.queue_adapter = ENV.fetch("QUEUE_ADAPTER", "solid_queue").to_sym
config.cache_store = ENV.fetch("CACHE_STORE", "solid_cache").to_sym
```

**Multiple databases（多数据库）：**
```yaml
# config/database.yml
production:
  primary:
    <<: *default
  cable:
    <<: *default
    migrations_paths: db/cable_migrate
  queue:
    <<: *default
    migrations_paths: db/queue_migrate
  cache:
    <<: *default
    migrations_paths: db/cache_migrate
```

通过 ENV 在 SQLite 和 MySQL 之间切换：
```ruby
adapter = ENV.fetch("DATABASE_ADAPTER", "sqlite3")
```

通过 ENV 让 **CSP extensible**：
```ruby
config.content_security_policy do |policy|
  policy.default_src :self
  policy.script_src :self, *ENV.fetch("CSP_SCRIPT_SRC", "").split(",")
end
```
</configuration>

<testing>
## Testing（测试）

**Minitest**，不是 RSpec：
```ruby
class CardTest < ActiveSupport::TestCase
  test "closing a card creates a closure" do
    card = cards(:one)

    card.close

    assert card.closed?
    assert_not_nil card.closure
  end
end
```

使用 **Fixtures**，不用 factories：
```yaml
# test/fixtures/cards.yml
one:
  title: First Card
  board: main
  creator: alice

two:
  title: Second Card
  board: main
  creator: bob
```

面向 controllers 的 **Integration tests**：
```ruby
class CardsControllerTest < ActionDispatch::IntegrationTest
  test "closing a card" do
    card = cards(:one)
    sign_in users(:alice)

    post card_closure_path(card)

    assert_response :success
    assert card.reload.closed?
  end
end
```

**Tests 与 features 一起 ship** - 同一个 commit，不是 TDD-first，而是 together。

**Security fixes 的 regression tests** - always。
</testing>

<events>
## Event Tracking（事件追踪）

Events 是 single source of truth：

```ruby
class Event < ApplicationRecord
  belongs_to :creator, class_name: "User"
  belongs_to :eventable, polymorphic: true

  serialize :particulars, coder: JSON
end
```

**Eventable concern（Eventable concern 模块）：**
```ruby
module Eventable
  extend ActiveSupport::Concern

  included do
    has_many :events, as: :eventable, dependent: :destroy
  end

  def record_event(action, particulars = {})
    events.create!(
      creator: Current.user,
      action: action,
      particulars: particulars
    )
  end
end
```

**Webhooks driven by events** - events 是 canonical source。
</events>

<email_patterns>
## Email Patterns（邮件模式）

**Multi-tenant URL helpers（多租户 URL helpers）：**
```ruby
class ApplicationMailer < ActionMailer::Base
  def default_url_options
    options = super
    if Current.account
      options[:script_name] = "/#{Current.account.id}"
    end
    options
  end
end
```

**Timezone-aware delivery（时区感知投递）：**
```ruby
class NotificationMailer < ApplicationMailer
  def daily_digest(user)
    Time.use_zone(user.timezone) do
      @user = user
      @digest = user.digest_for_today
      mail(to: user.email, subject: "Daily Digest")
    end
  end
end
```

**Batch delivery（批量投递）：**
```ruby
emails = users.map { |user| NotificationMailer.digest(user) }
ActiveJob.perform_all_later(emails.map(&:deliver_later))
```

**One-click unsubscribe（一键退订，RFC 8058）：**
```ruby
class ApplicationMailer < ActionMailer::Base
  after_action :set_unsubscribe_headers

  private
    def set_unsubscribe_headers
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
      headers["List-Unsubscribe"] = "<#{unsubscribe_url}>"
    end
end
```
</email_patterns>

<security_patterns>
## Security Patterns（安全模式）

**XSS prevention** - 在 helpers 中 escape：
```ruby
def formatted_content(text)
  # Escape first, then mark safe
  simple_format(h(text)).html_safe
end
```

**SSRF protection（SSRF 防护）：**
```ruby
# Resolve DNS once, pin the IP
def fetch_safely(url)
  uri = URI.parse(url)
  ip = Resolv.getaddress(uri.host)

  # Block private networks
  raise "Private IP" if private_ip?(ip)

  # Use pinned IP for request
  Net::HTTP.start(uri.host, uri.port, ipaddr: ip) { |http| ... }
end

def private_ip?(ip)
  ip.start_with?("127.", "10.", "192.168.") ||
    ip.match?(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
end
```

**Content Security Policy（内容安全策略）：**
```ruby
# config/initializers/content_security_policy.rb
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.script_src :self
    policy.style_src :self, :unsafe_inline
    policy.base_uri :none
    policy.form_action :self
    policy.frame_ancestors :self
  end
end
```

**ActionText sanitization（ActionText 清理）：**
```ruby
# config/initializers/action_text.rb
Rails.application.config.after_initialize do
  ActionText::ContentHelper.allowed_tags = %w[
    strong em a ul ol li p br h1 h2 h3 h4 blockquote
  ]
end
```
</security_patterns>

<active_storage>
## Active Storage Patterns（Active Storage 模式）

**Variant preprocessing（variant 预处理）：**
```ruby
class User < ApplicationRecord
  has_one_attached :avatar do |attachable|
    attachable.variant :thumb, resize_to_limit: [100, 100], preprocessed: true
    attachable.variant :medium, resize_to_limit: [300, 300], preprocessed: true
  end
end
```

**Direct upload expiry** - 为 slow connections 延长：
```ruby
# config/initializers/active_storage.rb
Rails.application.config.active_storage.service_urls_expire_in = 48.hours
```

**Avatar optimization** - redirect 到 blob：
```ruby
def show
  expires_in 1.year, public: true
  redirect_to @user.avatar.variant(:thumb).processed.url, allow_other_host: true
end
```

用于 migrations 的 **Mirror service**：
```yaml
# config/storage.yml
production:
  service: Mirror
  primary: amazon
  mirrors: [google]
```
</active_storage>
