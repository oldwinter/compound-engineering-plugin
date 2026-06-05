# Frontend - DHH Rails Style（前端）

<turbo_patterns>
## Turbo Patterns（Turbo 模式）

用于 partial updates 的 **Turbo Streams**：
```erb
<%# app/views/cards/closures/create.turbo_stream.erb %>
<%= turbo_stream.replace @card %>
```

用于 complex updates 的 **Morphing**：
```ruby
render turbo_stream: turbo_stream.morph(@card)
```

**Global morphing** - 在 layout 中启用：
```ruby
turbo_refreshes_with method: :morph, scroll: :preserve
```

使用 `cached: true` 的 **Fragment caching**：
```erb
<%= render partial: "card", collection: @cards, cached: true %>
```

**No ViewComponents** - standard partials 已经很好用。
</turbo_patterns>

<turbo_morphing>
## Turbo Morphing Best Practices（Turbo Morphing 最佳实践）

**Listen for morph events（监听 morph events）** 以 restore client state：
```javascript
document.addEventListener("turbo:morph-element", (event) => {
  // Restore any client-side state after morph
})
```

**Permanent elements（永久元素）** - 用 data attribute 跳过 morphing：
```erb
<div data-turbo-permanent id="notification-count">
  <%= @count %>
</div>
```

**Frame morphing（Frame morphing）** - 添加 refresh attribute：
```erb
<%= turbo_frame_tag :assignment, src: path, refresh: :morph %>
```

**Common issues and solutions（常见问题与解决方案）：**

| Problem（问题） | Solution（解决方案） |
|---------|----------|
| Timers not updating | Clear/restart in morph event listener |
| Forms resetting | Wrap form sections in turbo frames |
| Pagination breaking | Use turbo frames with `refresh: :morph` |
| Flickering on replace | Switch to morph instead of replace |
| localStorage loss | Listen to `turbo:morph-element`, restore state |
</turbo_morphing>

<turbo_frames>
## Turbo Frames（Turbo Frames）

带 spinner 的 **Lazy loading（懒加载）**：
```erb
<%= turbo_frame_tag "menu",
      src: menu_path,
      loading: :lazy do %>
  <div class="spinner">Loading...</div>
<% end %>
```

带 edit/view toggle 的 **Inline editing（内联编辑）**：
```erb
<%= turbo_frame_tag dom_id(card, :edit) do %>
  <%= link_to "Edit", edit_card_path(card),
        data: { turbo_frame: dom_id(card, :edit) } %>
<% end %>
```

不 hardcoding 的 **Target parent frame（目标父 frame）**：
```erb
<%= form_with model: @card, data: { turbo_frame: "_parent" } do |f| %>
```

**Real-time subscriptions（实时订阅）：**
```erb
<%= turbo_stream_from @card %>
<%= turbo_stream_from @card, :activity %>
```
</turbo_frames>

<stimulus_controllers>
## Stimulus Controllers（Stimulus Controllers）

Fizzy 中有 52 个 controllers，其中 62% reusable，38% domain-specific。

**Characteristics（特征）：**
- 每个 controller single responsibility
- 通过 values/classes 配置
- 通过 events communication
- 使用 # private methods
- 大多低于 50 lines

**Examples（示例）：**

```javascript
// copy-to-clipboard (25 lines)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { content: String }

  copy() {
    navigator.clipboard.writeText(this.contentValue)
    this.#showFeedback()
  }

  #showFeedback() {
    this.element.classList.add("copied")
    setTimeout(() => this.element.classList.remove("copied"), 1500)
  }
}
```

```javascript
// auto-click (7 lines)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.click()
  }
}
```

```javascript
// toggle-class (31 lines)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static classes = ["toggle"]
  static values = { open: { type: Boolean, default: false } }

  toggle() {
    this.openValue = !this.openValue
  }

  openValueChanged() {
    this.element.classList.toggle(this.toggleClass, this.openValue)
  }
}
```

```javascript
// auto-submit (28 lines) - debounced form submission
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { delay: { type: Number, default: 300 } }

  connect() {
    this.timeout = null
  }

  submit() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.element.requestSubmit()
    }, this.delayValue)
  }

  disconnect() {
    clearTimeout(this.timeout)
  }
}
```

```javascript
// dialog (45 lines) - native HTML dialog management
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  open() {
    this.element.showModal()
  }

  close() {
    this.element.close()
    this.dispatch("closed")
  }

  clickOutside(event) {
    if (event.target === this.element) this.close()
  }
}
```

```javascript
// local-time (40 lines) - relative time display
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { datetime: String }

  connect() {
    this.#updateTime()
  }

  #updateTime() {
    const date = new Date(this.datetimeValue)
    const now = new Date()
    const diffMinutes = Math.floor((now - date) / 60000)

    if (diffMinutes < 60) {
      this.element.textContent = `${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      this.element.textContent = `${Math.floor(diffMinutes / 60)}h ago`
    } else {
      this.element.textContent = `${Math.floor(diffMinutes / 1440)}d ago`
    }
  }
}
```
</stimulus_controllers>

<stimulus_best_practices>
## Stimulus Best Practices（Stimulus 最佳实践）

优先用 **Values API**，不要用 getAttribute：
```javascript
// Good
static values = { delay: { type: Number, default: 300 } }

// Avoid
this.element.getAttribute("data-delay")
```

在 disconnect 中 **Cleanup**：
```javascript
disconnect() {
  clearTimeout(this.timeout)
  this.observer?.disconnect()
  document.removeEventListener("keydown", this.boundHandler)
}
```

**Action filters（动作过滤器）** - `:self` prevents bubbling：
```erb
<div data-action="click->menu#toggle:self">
```

**Helper extraction（Helper 提取）** - shared utilities 放到 separate modules：
```javascript
// app/javascript/helpers/timing.js
export function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
```

用于 loose coupling 的 **Event dispatching**：
```javascript
this.dispatch("selected", { detail: { id: this.idValue } })
```
</stimulus_best_practices>

<view_helpers>
## View Helpers（Stimulus 集成）

**Dialog helper（对话框 helper）：**
```ruby
def dialog_tag(id, &block)
  tag.dialog(
    id: id,
    data: {
      controller: "dialog",
      action: "click->dialog#clickOutside keydown.esc->dialog#close"
    },
    &block
  )
end
```

**Auto-submit form helper（自动提交表单 helper）：**
```ruby
def auto_submit_form_with(model:, delay: 300, **options, &block)
  form_with(
    model: model,
    data: {
      controller: "auto-submit",
      auto_submit_delay_value: delay,
      action: "input->auto-submit#submit"
    },
    **options,
    &block
  )
end
```

**Copy button helper（复制按钮 helper）：**
```ruby
def copy_button(content:, label: "Copy")
  tag.button(
    label,
    data: {
      controller: "copy",
      copy_content_value: content,
      action: "click->copy#copy"
    }
  )
end
```
</view_helpers>

<css_architecture>
## CSS Architecture（CSS 架构）

使用带 modern features 的 Vanilla CSS，不用 preprocessors。

用于 cascade control 的 **CSS @layer**：
```css
@layer reset, base, components, modules, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer base {
  body { font-family: var(--font-sans); }
}

@layer components {
  .btn { /* button styles */ }
}

@layer modules {
  .card { /* card module styles */ }
}

@layer utilities {
  .hidden { display: none; }
}
```

用于 perceptual uniformity 的 **OKLCH color system**：
```css
:root {
  --color-primary: oklch(60% 0.15 250);
  --color-success: oklch(65% 0.2 145);
  --color-warning: oklch(75% 0.15 85);
  --color-danger: oklch(55% 0.2 25);
}
```

通过 CSS variables 实现 **Dark mode**：
```css
:root {
  --bg: oklch(98% 0 0);
  --text: oklch(20% 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: oklch(15% 0 0);
    --text: oklch(90% 0 0);
  }
}
```

**Native CSS nesting（原生 CSS 嵌套）：**
```css
.card {
  padding: var(--space-4);

  & .title {
    font-weight: bold;
  }

  &:hover {
    background: var(--bg-hover);
  }
}
```

**约 60 个 minimal utilities**，而不是 Tailwind 的数百个。

**使用的 modern features（现代特性）：**
- 用于 enter animations 的 `@starting-style`
- 用于 color manipulation 的 `color-mix()`
- 用于 parent selection 的 `:has()`
- Logical properties（逻辑属性：`margin-inline`、`padding-block`）
- Container queries（容器查询）
</css_architecture>

<view_patterns>
## View Patterns（View 模式）

**Standard partials（标准 partials）** - no ViewComponents：
```erb
<%# app/views/cards/_card.html.erb %>
<article id="<%= dom_id(card) %>" class="card">
  <%= render "cards/header", card: card %>
  <%= render "cards/body", card: card %>
  <%= render "cards/footer", card: card %>
</article>
```

**Fragment caching（片段缓存）：**
```erb
<% cache card do %>
  <%= render "cards/card", card: card %>
<% end %>
```

**Collection caching（集合缓存）：**
```erb
<%= render partial: "card", collection: @cards, cached: true %>
```

**Simple component naming（简单 component 命名）** - no strict BEM：
```css
.card { }
.card .title { }
.card .actions { }
.card.golden { }
.card.closed { }
```
</view_patterns>

<caching_with_personalization>
## User-Specific Content in Caches（Caches 中的用户特定内容）

将 personalization 移到 client-side JavaScript，以 preserve caching：

```erb
<%# Cacheable fragment %>
<% cache card do %>
  <article class="card"
           data-creator-id="<%= card.creator_id %>"
           data-controller="ownership"
           data-ownership-current-user-value="<%= Current.user.id %>">
    <button data-ownership-target="ownerOnly" class="hidden">Delete</button>
  </article>
<% end %>
```

```javascript
// Reveal user-specific elements after cache hit
export default class extends Controller {
  static values = { currentUser: Number }
  static targets = ["ownerOnly"]

  connect() {
    const creatorId = parseInt(this.element.dataset.creatorId)
    if (creatorId === this.currentUserValue) {
      this.ownerOnlyTargets.forEach(el => el.classList.remove("hidden"))
    }
  }
}
```

将 **dynamic content** extract 到 separate frames：
```erb
<% cache [card, board] do %>
  <article class="card">
    <%= turbo_frame_tag card, :assignment,
          src: card_assignment_path(card),
          refresh: :morph %>
  </article>
<% end %>
```

Assignment dropdown 独立 updates，不会 invalidate parent cache。
</caching_with_personalization>

<broadcasting>
## Broadcasting with Turbo Streams（使用 Turbo Streams 广播）

用于 real-time updates 的 **Model callbacks**：
```ruby
class Card < ApplicationRecord
  include Broadcastable

  after_create_commit :broadcast_created
  after_update_commit :broadcast_updated
  after_destroy_commit :broadcast_removed

  private
    def broadcast_created
      broadcast_append_to [Current.account, board], :cards
    end

    def broadcast_updated
      broadcast_replace_to [Current.account, board], :cards
    end

    def broadcast_removed
      broadcast_remove_to [Current.account, board], :cards
    end
end
```

使用 `[Current.account, resource]` pattern 按 tenant scope。
</broadcasting>
