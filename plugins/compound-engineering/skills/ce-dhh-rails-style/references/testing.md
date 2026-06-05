# Testing - DHH Rails Style（测试）

## Core Philosophy（核心理念）

"Minitest with fixtures - simple, fast, deterministic." 这个 approach 优先考虑 pragmatism，而不是 convention。

## Why Minitest Over RSpec（为什么用 Minitest 而不是 RSpec）

- **Simpler**：更少 DSL magic，plain Ruby assertions
- **Ships with Rails**：没有额外 dependencies
- **Faster boot times**：更少 overhead
- **Plain Ruby**：没有需要学习的 specialized syntax

## Fixtures as Test Data（将 Fixtures 作为测试数据）

fixtures 提供 preloaded data，而不是使用 factories：
- 加载一次，跨 tests 复用
- 没有 runtime object creation overhead
- relationship visibility 明确
- deterministic IDs 让 debugging 更容易

### Fixture Structure（Fixture 结构）
```yaml
# test/fixtures/users.yml
david:
  identity: david
  account: basecamp
  role: admin

jason:
  identity: jason
  account: basecamp
  role: member

# test/fixtures/rooms.yml
watercooler:
  name: Water Cooler
  creator: david
  direct: false

# test/fixtures/messages.yml
greeting:
  body: Hello everyone!
  room: watercooler
  creator: david
```

### Using Fixtures in Tests（在 Tests 中使用 Fixtures）
```ruby
test "sending a message" do
  user = users(:david)
  room = rooms(:watercooler)

  # Test with fixture data
end
```

### Dynamic Fixture Values（动态 Fixture 值）
ERB 支持 time-sensitive data：
```yaml
recent_card:
  title: Recent Card
  created_at: <%= 1.hour.ago %>

old_card:
  title: Old Card
  created_at: <%= 1.month.ago %>
```

## Test Organization（测试组织）

### Unit Tests（单元测试）
使用 setup blocks 和 standard assertions 验证 business logic：

```ruby
class CardTest < ActiveSupport::TestCase
  setup do
    @card = cards(:one)
    @user = users(:david)
  end

  test "closing a card creates a closure" do
    assert_difference -> { Card::Closure.count } do
      @card.close(creator: @user)
    end

    assert @card.closed?
    assert_equal @user, @card.closure.creator
  end

  test "reopening a card destroys the closure" do
    @card.close(creator: @user)

    assert_difference -> { Card::Closure.count }, -1 do
      @card.reopen
    end

    refute @card.closed?
  end
end
```

### Integration Tests（集成测试）
测试完整 request/response cycles：

```ruby
class CardsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:david)
    sign_in @user
  end

  test "closing a card" do
    card = cards(:one)

    post card_closure_path(card)

    assert_response :success
    assert card.reload.closed?
  end

  test "unauthorized user cannot close card" do
    sign_in users(:guest)
    card = cards(:one)

    post card_closure_path(card)

    assert_response :forbidden
    refute card.reload.closed?
  end
end
```

### System Tests（系统测试）
使用 Capybara 的 browser-based tests：

```ruby
class MessagesTest < ApplicationSystemTestCase
  test "sending a message" do
    sign_in users(:david)
    visit room_path(rooms(:watercooler))

    fill_in "Message", with: "Hello, world!"
    click_button "Send"

    assert_text "Hello, world!"
  end

  test "editing own message" do
    sign_in users(:david)
    visit room_path(rooms(:watercooler))

    within "#message_#{messages(:greeting).id}" do
      click_on "Edit"
    end

    fill_in "Message", with: "Updated message"
    click_button "Save"

    assert_text "Updated message"
  end

  test "drag and drop card to new column" do
    sign_in users(:david)
    visit board_path(boards(:main))

    card = find("#card_#{cards(:one).id}")
    target = find("#column_#{columns(:done).id}")

    card.drag_to target

    assert_selector "#column_#{columns(:done).id} #card_#{cards(:one).id}"
  end
end
```

## Advanced Patterns（高级 Patterns）

### Time Testing（时间测试）
使用 `travel_to` 编写 deterministic time-dependent assertions：

```ruby
test "card expires after 30 days" do
  card = cards(:one)

  travel_to 31.days.from_now do
    assert card.expired?
  end
end
```

### External API Testing with VCR（用 VCR 测试外部 API）
Record 并 replay HTTP interactions：

```ruby
test "fetches user data from API" do
  VCR.use_cassette("user_api") do
    user_data = ExternalApi.fetch_user(123)

    assert_equal "John", user_data[:name]
  end
end
```

### Background Job Testing（后台任务测试）
Assert job enqueueing 和 email delivery：

```ruby
test "closing card enqueues notification job" do
  card = cards(:one)

  assert_enqueued_with(job: NotifyWatchersJob, args: [card]) do
    card.close
  end
end

test "welcome email is sent on signup" do
  assert_emails 1 do
    Identity.create!(email: "new@example.com")
  end
end
```

### Testing Turbo Streams（测试 Turbo Streams）
```ruby
test "message creation broadcasts to room" do
  room = rooms(:watercooler)

  assert_turbo_stream_broadcasts [room, :messages] do
    room.messages.create!(body: "Test", creator: users(:david))
  end
end
```

## Testing Principles（测试原则）

### 1. Test Observable Behavior（测试可观察行为）
关注 code 做了什么，而不是它如何做到：

```ruby
# ❌ Testing implementation
test "calls notify method on each watcher" do
  card.expects(:notify).times(3)
  card.close
end

# ✅ Testing behavior
test "watchers receive notifications when card closes" do
  assert_difference -> { Notification.count }, 3 do
    card.close
  end
end
```

### 2. Don't Mock Everything（不要什么都 mock）

```ruby
# ❌ Over-mocked test
test "sending message" do
  room = mock("room")
  user = mock("user")
  message = mock("message")

  room.expects(:messages).returns(stub(create!: message))
  message.expects(:broadcast_create)

  MessagesController.new.create
end

# ✅ Test the real thing
test "sending message" do
  sign_in users(:david)
  post room_messages_url(rooms(:watercooler)),
    params: { message: { body: "Hello" } }

  assert_response :success
  assert Message.exists?(body: "Hello")
end
```

### 3. Tests Ship with Features（测试随功能一起交付）
同一个 commit，不是 TDD-first，而是 together。既不是提前（strict TDD），也不是事后（deferred testing）。

### 4. Security Fixes Always Include Regression Tests（安全修复始终包含回归测试）
每个 security fix 都必须包含一个本可捕获该 vulnerability 的 test。

### 5. Integration Tests Validate Complete Workflows（集成测试验证完整 workflow）
不要只测试 individual pieces；要测试它们能一起工作。

## File Organization（文件组织）

```
test/
├── controllers/         # Integration tests for controllers
├── fixtures/           # YAML fixtures for all models
├── helpers/            # Helper method tests
├── integration/        # API integration tests
├── jobs/               # Background job tests
├── mailers/            # Mailer tests
├── models/             # Unit tests for models
├── system/             # Browser-based system tests
└── test_helper.rb      # Test configuration
```

## Test Helper Setup（测试 helper 设置）

```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  fixtures :all

  parallelize(workers: :number_of_processors)
end

class ActionDispatch::IntegrationTest
  include SignInHelper
end

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome
end
```

## Sign In Helper（登录 helper）

```ruby
# test/support/sign_in_helper.rb
module SignInHelper
  def sign_in(user)
    session = user.identity.sessions.create!
    cookies.signed[:session_id] = session.id
  end
end
```
