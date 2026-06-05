# Controllers - DHH Rails Style（Controllers 控制器）

<rest_mapping>
## 一切都映射到 CRUD

Custom actions 变成 new resources。不要在既有 resources 上加 verbs，而是创建 noun resources：

```ruby
# Instead of this:
POST /cards/:id/close
DELETE /cards/:id/close
POST /cards/:id/archive

# Do this:
POST /cards/:id/closure      # create closure
DELETE /cards/:id/closure    # destroy closure
POST /cards/:id/archival     # create archival
```

**来自 37signals 的真实 examples：**
```ruby
resources :cards do
  resource :closure       # closing/reopening
  resource :goldness      # marking important
  resource :not_now       # postponing
  resources :assignments  # managing assignees
end
```

每个 resource 都有自己的 controller，并使用 standard CRUD actions。
</rest_mapping>

<controller_concerns>
## 用 Concerns 共享 Behavior

Controllers 大量使用 concerns。常见 patterns：

**CardScoped** - 加载 @card、@board，并提供 render_card_replacement
```ruby
module CardScoped
  extend ActiveSupport::Concern

  included do
    before_action :set_card
  end

  private
    def set_card
      @card = Card.find(params[:card_id])
      @board = @card.board
    end

    def render_card_replacement
      render turbo_stream: turbo_stream.replace(@card)
    end
end
```

**BoardScoped** - 加载 @board
**CurrentRequest** - 用 request data 填充 Current
**CurrentTimezone** - 在用户 timezone 中包裹 requests
**FilterScoped** - 处理 complex filtering
**TurboFlash** - 通过 Turbo Stream 发送 flash messages
**ViewTransitions** - 在 page refresh 时禁用
**BlockSearchEngineIndexing** - 设置 X-Robots-Tag header
**RequestForgeryProtection** - Sec-Fetch-Site CSRF（modern browsers，现代浏览器）
</controller_concerns>

<authorization_patterns>
## Authorization Patterns（授权 Patterns）

Controllers 通过 before_action 检查 permissions，models 定义 permissions 的含义：

```ruby
# Controller concern
module Authorization
  extend ActiveSupport::Concern

  private
    def ensure_can_administer
      head :forbidden unless Current.user.admin?
    end

    def ensure_is_staff_member
      head :forbidden unless Current.user.staff?
    end
end

# Usage
class BoardsController < ApplicationController
  before_action :ensure_can_administer, only: [:destroy]
end
```

**Model-level authorization（Model 层授权）：**
```ruby
class Board < ApplicationRecord
  def editable_by?(user)
    user.admin? || user == creator
  end

  def publishable_by?(user)
    editable_by?(user) && !published?
  end
end
```

保持 authorization simple、readable，并与 domain colocated。
</authorization_patterns>

<security_concerns>
## Security Concerns（安全 Concerns）

**Sec-Fetch-Site CSRF Protection（Sec-Fetch-Site CSRF 防护）：**
Modern browsers 会发送 Sec-Fetch-Site header。将它用于 defense in depth：

```ruby
module RequestForgeryProtection
  extend ActiveSupport::Concern

  included do
    before_action :verify_request_origin
  end

  private
    def verify_request_origin
      return if request.get? || request.head?
      return if %w[same-origin same-site].include?(
        request.headers["Sec-Fetch-Site"]&.downcase
      )
      # Fall back to token verification for older browsers
      verify_authenticity_token
    end
end
```

**Rate Limiting（速率限制，Rails 8+）：**
```ruby
class MagicLinksController < ApplicationController
  rate_limit to: 10, within: 15.minutes, only: :create
end
```

应用于：auth endpoints、email sending、external API calls、resource creation。
</security_concerns>

<request_context>
## Request Context Concerns（请求 Context Concerns）

**CurrentRequest** - 用 HTTP metadata 填充 Current：
```ruby
module CurrentRequest
  extend ActiveSupport::Concern

  included do
    before_action :set_current_request
  end

  private
    def set_current_request
      Current.request_id = request.request_id
      Current.user_agent = request.user_agent
      Current.ip_address = request.remote_ip
      Current.referrer = request.referrer
    end
end
```

**CurrentTimezone** - 在用户 timezone 中包裹 requests：
```ruby
module CurrentTimezone
  extend ActiveSupport::Concern

  included do
    around_action :set_timezone
    helper_method :timezone_from_cookie
  end

  private
    def set_timezone
      Time.use_zone(timezone_from_cookie) { yield }
    end

    def timezone_from_cookie
      cookies[:timezone] || "UTC"
    end
end
```

**SetPlatform** - 检测 mobile/desktop：
```ruby
module SetPlatform
  extend ActiveSupport::Concern

  included do
    helper_method :platform
  end

  def platform
    @platform ||= request.user_agent&.match?(/Mobile|Android/) ? :mobile : :desktop
  end
end
```
</request_context>

<turbo_responses>
## Turbo Stream Responses（Turbo Stream 响应）

使用 Turbo Streams 做 partial updates：

```ruby
class Cards::ClosuresController < ApplicationController
  include CardScoped

  def create
    @card.close
    render_card_replacement
  end

  def destroy
    @card.reopen
    render_card_replacement
  end
end
```

对 complex updates，使用 morphing：
```ruby
render turbo_stream: turbo_stream.morph(@card)
```
</turbo_responses>

<api_patterns>
## API Design（API 设计）

相同 controllers，不同 format。responses 的 convention：

```ruby
def create
  @card = Card.create!(card_params)

  respond_to do |format|
    format.html { redirect_to @card }
    format.json { head :created, location: @card }
  end
end

def update
  @card.update!(card_params)

  respond_to do |format|
    format.html { redirect_to @card }
    format.json { head :no_content }
  end
end

def destroy
  @card.destroy

  respond_to do |format|
    format.html { redirect_to cards_path }
    format.json { head :no_content }
  end
end
```

**Status codes（状态码）：**
- Create（创建）：201 Created + Location header
- Update（更新）：204 No Content
- Delete（删除）：204 No Content
- Bearer token authentication（Bearer token 认证）
</api_patterns>

<http_caching>
## HTTP Caching（HTTP 缓存）

大量使用 ETags 和 conditional GETs：

```ruby
class CardsController < ApplicationController
  def show
    @card = Card.find(params[:id])
    fresh_when etag: [@card, Current.user.timezone]
  end

  def index
    @cards = @board.cards.preloaded
    fresh_when etag: [@cards, @board.updated_at]
  end
end
```

关键 insight：时间会在 server-side 按用户 timezone render，所以 timezone 必须影响 ETag，避免把错误时间提供给其他 timezones。

**ApplicationController global etag（ApplicationController 全局 etag）：**
```ruby
class ApplicationController < ActionController::Base
  etag { "v1" }  # Bump to invalidate all caches
end
```

在 associations 上使用 `touch: true` 做 cache invalidation。
</http_caching>
