# Models - DHH Rails Style（Models 模型）

<model_concerns>
## 用 Concerns 承载 Horizontal Behavior

Models 大量使用 concerns。一个典型 Card model 包含 14+ concerns：

```ruby
class Card < ApplicationRecord
  include Assignable
  include Attachments
  include Broadcastable
  include Closeable
  include Colored
  include Eventable
  include Golden
  include Mentions
  include Multistep
  include Pinnable
  include Postponable
  include Readable
  include Searchable
  include Taggable
  include Watchable
end
```

每个 concern 都 self-contained，包含 associations、scopes 和 methods。

**Naming（命名）：** 使用描述 capability 的 adjectives（`Closeable`、`Publishable`、`Watchable`）
</model_concerns>

<state_records>
## State as Records, Not Booleans（用 Records 表达 State，而不是 Booleans）

不要用 boolean columns，而是创建 separate records：

```ruby
# Instead of:
closed: boolean
is_golden: boolean
postponed: boolean

# Create records:
class Card::Closure < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

class Card::Goldness < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

class Card::NotNow < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end
```

**Benefits（收益）：**
- Automatic timestamps（事情何时发生）
- Track 谁做了 changes
- 通过 joins 和 `where.missing` 轻松 filtering
- 支持展示 when/who 的 rich UI

**在 model 中：**
```ruby
module Closeable
  extend ActiveSupport::Concern

  included do
    has_one :closure, dependent: :destroy
  end

  def closed?
    closure.present?
  end

  def close(creator: Current.user)
    create_closure!(creator: creator)
  end

  def reopen
    closure&.destroy
  end
end
```

**Querying（查询）：**
```ruby
Card.joins(:closure)         # closed cards
Card.where.missing(:closure) # open cards
```
</state_records>

<callbacks>
## Callbacks - Used Sparingly（谨慎使用 Callbacks）

Fizzy 的 30 个 files 中只有 38 处 callback occurrences。Guidelines：

**Use for（适用）：**
- 用 `after_commit` 处理 async work
- 用 `before_save` 处理 derived data
- 用 `after_create_commit` 处理 side effects

**Avoid（避免）：**
- Complex callback chains（复杂 callback 链）
- callbacks 中的 business logic
- Synchronous external calls（同步 external calls）

```ruby
class Card < ApplicationRecord
  after_create_commit :notify_watchers_later
  before_save :update_search_index, if: :title_changed?

  private
    def notify_watchers_later
      NotifyWatchersJob.perform_later(self)
    end
end
```
</callbacks>

<scopes>
## Scope Naming（Scope 命名）

Standard scope names（标准 scope 名称）：

```ruby
class Card < ApplicationRecord
  scope :chronologically, -> { order(created_at: :asc) }
  scope :reverse_chronologically, -> { order(created_at: :desc) }
  scope :alphabetically, -> { order(title: :asc) }
  scope :latest, -> { reverse_chronologically.limit(10) }

  # Standard eager loading
  scope :preloaded, -> { includes(:creator, :assignees, :tags) }

  # Parameterized
  scope :indexed_by, ->(column) { order(column => :asc) }
  scope :sorted_by, ->(column, direction = :asc) { order(column => direction) }
end
```
</scopes>

<poros>
## Plain Old Ruby Objects（Plain Old Ruby Objects，纯 Ruby 对象）

POROs 放在 parent models namespace 下：

```ruby
# app/models/event/description.rb
class Event::Description
  def initialize(event)
    @event = event
  end

  def to_s
    # Presentation logic for event description
  end
end

# app/models/card/eventable/system_commenter.rb
class Card::Eventable::SystemCommenter
  def initialize(card)
    @card = card
  end

  def comment(message)
    # Business logic
  end
end

# app/models/user/filtering.rb
class User::Filtering
  # View context bundling
end
```

**不要用于 service objects。** Business logic 留在 models 中。
</poros>

<verbs_predicates>
## Method Naming（方法命名）

**Verbs（动词）** - 改变 state 的 actions：
```ruby
card.close
card.reopen
card.gild      # make golden
card.ungild
board.publish
board.archive
```

**Predicates（谓词）** - 从 state 派生的 queries：
```ruby
card.closed?    # closure.present?
card.golden?    # goldness.present?
board.published?
```

**Avoid（避免）** generic setters：
```ruby
# Bad
card.set_closed(true)
card.update_golden_status(false)

# Good
card.close
card.ungild
```
</verbs_predicates>

<validation_philosophy>
## Validation Philosophy（Validation 理念）

models 上只放 minimal validations。contextual validations 放在 form/operation objects 上：

```ruby
# Model - minimal
class User < ApplicationRecord
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end

# Form object - contextual
class Signup
  include ActiveModel::Model

  attr_accessor :email, :name, :terms_accepted

  validates :email, :name, presence: true
  validates :terms_accepted, acceptance: true

  def save
    return false unless valid?
    User.create!(email: email, name: name)
  end
end
```

对 data integrity，**prefer database constraints**，而不是 model validations：
```ruby
# migration
add_index :users, :email, unique: true
add_foreign_key :cards, :boards
```
</validation_philosophy>

<error_handling>
## Let It Crash Philosophy（让错误显式崩溃的哲学）

使用 failure 时 raise exceptions 的 bang methods：

```ruby
# Preferred - raises on failure
@card = Card.create!(card_params)
@card.update!(title: new_title)
@comment.destroy!

# Avoid - silent failures
@card = Card.create(card_params)  # returns false on failure
if @card.save
  # ...
end
```

让 errors 自然 propagate。Rails 会用 422 responses 处理 ActiveRecord::RecordInvalid。
</error_handling>

<default_values>
## Default Values with Lambdas（使用 Lambdas 设置默认值）

对带 Current 的 associations 使用 lambda defaults：

```ruby
class Card < ApplicationRecord
  belongs_to :creator, class_name: "User", default: -> { Current.user }
  belongs_to :account, default: -> { Current.account }
end

class Comment < ApplicationRecord
  belongs_to :commenter, class_name: "User", default: -> { Current.user }
end
```

Lambdas 确保在 creation time 做 dynamic resolution。
</default_values>

<rails_71_patterns>
## Rails 7.1+ Model Patterns（Rails 7.1+ Model 模式）

**Normalizes** - validation 前清理 data：
```ruby
class User < ApplicationRecord
  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :phone, with: ->(phone) { phone.gsub(/\D/, "") }
end
```

**Delegated Types** - 替代 polymorphic associations：
```ruby
class Message < ApplicationRecord
  delegated_type :messageable, types: %w[Comment Reply Announcement]
end

# Now you get:
message.comment?        # true if Comment
message.comment         # returns the Comment
Message.comments        # scope for Comment messages
```

**Store Accessor（Store 访问器）** - structured JSON storage：
```ruby
class User < ApplicationRecord
  store :settings, accessors: [:theme, :notifications_enabled], coder: JSON
end

user.theme = "dark"
user.notifications_enabled = true
```
</rails_71_patterns>

<concern_guidelines>
## Concern Guidelines（Concern 指南）

- 每个 concern **50-150 lines**（大多约 100）
- **Cohesive（内聚）** - 只放 related functionality
- **Named for capabilities（按能力命名）** - `Closeable`、`Watchable`，不是 `CardHelpers`
- **Self-contained** - associations、scopes、methods 放在一起
- **Not for mere organization** - 只有需要 genuine reuse 时才创建

用于 cache invalidation 的 **Touch chains**：
```ruby
class Comment < ApplicationRecord
  belongs_to :card, touch: true
end

class Card < ApplicationRecord
  belongs_to :board, touch: true
end
```

comment updates 时，card 的 `updated_at` 会变化，并 cascade 到 board。

用于 related updates 的 **Transaction wrapping**：
```ruby
class Card < ApplicationRecord
  def close(creator: Current.user)
    transaction do
      create_closure!(creator: creator)
      record_event(:closed)
      notify_watchers_later
    end
  end
end
```
</concern_guidelines>
